import type { NextFunction, Response, Request } from 'express';
import prisma from '../config/prisma.js';
import fs from 'fs/promises';
import path from 'path';
import ExcelJS from 'exceljs';

type ImportTarget = 'users' | 'listings' | 'bookings';

const parseCsv = (buf: Buffer<ArrayBufferLike>) => {
  const text = buf.toString('utf8').replace(/\r\n/g, '\n');
  const lines = text.split('\n').filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };
  const firstLine = lines[0];
  if (!firstLine) return { headers: [], rows: [] };
  const headers = firstLine.split(',').map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    const cols = line.split(',');
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = (cols[i] ?? '').trim() });
    return obj;
  });
  return { headers, rows };
};

const parseXlsx = async (buf: Buffer<ArrayBufferLike>) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(buf));
  const sheet = workbook.worksheets[0];
  if (!sheet) return { headers: [], rows: [] };
  const headerRow = sheet.getRow(1).values as Array<string>;
  const headers = headerRow.slice(1).map(h => String(h || '').trim());
  const rows: Record<string, string>[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const vals = row.values as Array<unknown>;
    const r: Record<string, string> = {};
    headers.forEach((h, i) => { r[h] = String(vals[i + 1] ?? '').trim() });
    rows.push(r);
  });
  return { headers, rows };
};

// canonical field aliases used to match uploaded headers to expected fields
const FIELD_ALIASES: Record<ImportTarget, Record<string, string[]>> = {
  users: {
    email: ['email', 'e-mail', 'useremail', 'user_email'],
    name: ['name', 'fullname', 'full name', 'fullName'],
    username: ['username', 'user', 'user_name'],
    phone: ['phone', 'phonenumber', 'telephone', 'tel'],
    role: ['role'],
    password: ['password', 'pwd'],
  },
  listings: {
    title: ['title', 'name'],
    description: ['description', 'desc'],
    location: ['location', 'address'],
    pricePerNight: ['pricepernight', 'price_per_night', 'price'],
    hostId: ['hostid', 'host_id'],
    hostEmail: ['hostemail', 'host_email', 'host'],
    guest: ['guest', 'guests', 'guestcount', 'capacity'],
    type: ['type', 'listingtype', 'category'],
    amenities: ['amenities', 'amenity', 'features'],
  },
  bookings: {
    listingId: ['listingid', 'listing_id'],
    guestEmail: ['guestemail', 'guest_email', 'guest'],
    checkIn: ['checkin', 'check_in', 'startdate'],
    checkOut: ['checkout', 'check_out', 'enddate'],
    totalPrice: ['totalprice', 'total_price', 'price'],
    status: ['status'],
  },
};

const findValueFromRow = (row: Record<string,string>, aliases?: readonly string[]) => {
  if (!aliases || aliases.length === 0) return '';
  const lowMap: Record<string,string> = {};
  for (const k of Object.keys(row)) {
    lowMap[k.trim().toLowerCase()] = k;
  }
  for (const a of aliases) {
    const key = lowMap[a.trim().toLowerCase()];
    if (key) return String(row[key] ?? '').trim();
  }
  // fallback: try partial matches
  for (const k of Object.keys(row)) {
    const lk = k.trim().toLowerCase();
    for (const a of aliases) {
      if (lk.includes(a.trim().toLowerCase())) return String(row[k] ?? '').trim();
    }
  }
  return '';
};

export const importData = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const target = String(req.query['type'] || 'users') as ImportTarget;
    const dryRun = String(req.query['dryRun'] || 'false').toLowerCase() === 'true';
    if (!req.file || !req.file.buffer) return res.status(400).json({ error: 'File is required' });

    const mimetype = req.file.mimetype;
    let parsed: { headers: string[]; rows: Record<string, string>[] } = { headers: [], rows: [] };

    if (mimetype === 'text/csv') {
      parsed = parseCsv(req.file.buffer);
    } else if (mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || mimetype === 'application/octet-stream') {
      parsed = await parseXlsx(req.file.buffer);
    } else {
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    const results: { created: number; skipped: number; wouldCreate: number; errors: Array<{ row: number; error: string }>; preview: Record<string,string>[] } = {
      created: 0,
      skipped: 0,
      wouldCreate: 0,
      errors: [],
      preview: [],
    };

    const validateRow = async (row: Record<string,string>, rowIndex: number) : Promise<{ valid: boolean; errors: string[]; normalized?: Record<string, unknown> }> => {
      const errs: string[] = [];
      const norm: Record<string, unknown> = {};
      if (target === 'users') {
        const aliases = FIELD_ALIASES.users;
        const email = findValueFromRow(row, aliases.email);
        if (!email) errs.push('email is required (column: email)');
        if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errs.push('email format invalid');
        norm.email = email;
        norm.name = findValueFromRow(row, aliases.name) || '';
        norm.username = findValueFromRow(row, aliases.username) || '';
        norm.phone = findValueFromRow(row, aliases.phone) || '';
        norm.role = findValueFromRow(row, aliases.role) || 'GUEST';
      } else if (target === 'listings') {
        const aliases = FIELD_ALIASES.listings;
        const title = findValueFromRow(row, aliases.title);
        if (!title) errs.push('title is required (column: title)');
        let hostId = findValueFromRow(row, aliases.hostId) || '';
        const hostEmail = findValueFromRow(row, aliases.hostEmail) || '';
        if (!hostId && hostEmail) {
          const host = await prisma.user.findUnique({ where: { email: hostEmail } });
          if (host) hostId = host.id;
        }
        if (!hostId) errs.push('hostId or hostEmail is required and must match an existing user');
        norm.title = title;
        norm.description = findValueFromRow(row, aliases.description) || '';
        norm.location = findValueFromRow(row, aliases.location) || '';
        norm.pricePerNight = Number(findValueFromRow(row, aliases.pricePerNight) || 0) || 0;
        norm.hostId = hostId;
        norm.guest = Number(findValueFromRow(row, aliases.guest) || 1) || 1;
        norm.type = findValueFromRow(row, aliases.type) || 'APARTMENT';
        norm.amenities = findValueFromRow(row, aliases.amenities)
          .split('|')
          .map(item => item.trim())
          .filter(Boolean);
      } else if (target === 'bookings') {
        const aliases = FIELD_ALIASES.bookings;
        const listingId = findValueFromRow(row, aliases.listingId);
        const guestEmail = findValueFromRow(row, aliases.guestEmail);
        if (!listingId) errs.push('listingId is required (column: listingId)');
        if (!guestEmail) errs.push('guestEmail is required (column: guestEmail)');
        let guest = null;
        if (guestEmail) guest = await prisma.user.findUnique({ where: { email: guestEmail } });
        if (guestEmail && !guest) errs.push(`guest with email ${guestEmail} not found`);
        const checkInStr = findValueFromRow(row, aliases.checkIn);
        const checkOutStr = findValueFromRow(row, aliases.checkOut);
        const checkIn = new Date(checkInStr || '');
        const checkOut = new Date(checkOutStr || '');
        if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) errs.push('invalid checkIn/checkOut dates');
        if (checkIn >= checkOut) errs.push('checkIn must be before checkOut');
        norm.listingId = listingId;
        norm.guestId = guest?.id ?? null;
        norm.checkIn = checkIn;
        norm.checkOut = checkOut;
        norm.totalPrice = Number(findValueFromRow(row, aliases.totalPrice) || 0) || 0;
        norm.status = findValueFromRow(row, aliases.status) || 'PENDING';
      }
      return { valid: errs.length === 0, errors: errs, normalized: norm };
    };

    for (let i = 0; i < parsed.rows.length; i++) {
      const row = parsed.rows[i];
      if (!row) continue;
      const rowNum = i + 2; // account for header row
      try {
        const { valid, errors: vErrs, normalized } = await validateRow(row, rowNum);
        if (!valid) {
          results.errors.push({ row: rowNum, error: vErrs.join('; ') });
          results.skipped++;
          continue;
        }

        // collect preview up to 5 rows
        if (results.preview.length < 5) results.preview.push(Object.fromEntries(Object.entries(row).slice(0, 10)));

        if (dryRun) {
          results.wouldCreate++;
          continue;
        }

        // perform actual create
        if (target === 'users') {
          const email = String(normalized?.email ?? '');
          const existing = await prisma.user.findUnique({ where: { email } });
          if (existing) { results.skipped++; continue; }
          await prisma.user.create({ data: {
            name: String(normalized?.name ?? ''),
            email,
            username: String(normalized?.username ?? ''),
            phone: String(normalized?.phone ?? ''),
            role: String(normalized?.role ?? 'GUEST') as any,
            password: Math.random().toString(36).slice(2,10),
          } });
          results.created++;
        } else if (target === 'listings') {
          await prisma.listing.create({ data: {
            title: String(normalized?.title ?? ''),
            description: String(normalized?.description ?? ''),
            location: String(normalized?.location ?? ''),
            pricePerNight: Number(normalized?.pricePerNight ?? 0) || 0,
            hostId: String(normalized?.hostId ?? ''),
            guest: Number(normalized?.guest ?? 1) || 1,
            type: String(normalized?.type ?? 'APARTMENT') as any,
            amenities: Array.isArray(normalized?.amenities) ? normalized.amenities as string[] : [],
          } });
          results.created++;
        } else if (target === 'bookings') {
          await prisma.booking.create({ data: {
            listingId: String(normalized?.listingId ?? ''),
            guestId: String(normalized?.guestId ?? ''),
            checkIn: normalized?.checkIn as Date,
            checkOut: normalized?.checkOut as Date,
            totalPrice: Number(normalized?.totalPrice ?? 0) || 0,
            status: String(normalized?.status ?? 'PENDING') as any,
          } });
          results.created++;
        }
      } catch (err) {
        results.errors.push({ row: rowNum, error: String(err) });
      }
    }

    return res.json({ ok: true, target, dryRun, summary: results });
  } catch (error) {
    return next(error as Error);
  }
};

export const getImportTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.params;
    if (!name) return res.status(400).json({ error: 'template name required' });
    const safe = path.basename(name);
    const filePath = path.resolve(process.cwd(), 'src', 'data', 'import_templates', safe);
    try {
      const data = await fs.readFile(filePath);
      // infer content-type by extension
      if (safe.endsWith('.csv')) res.setHeader('Content-Type', 'text/csv');
      else if (safe.endsWith('.xlsx')) res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      else res.setHeader('Content-Type', 'application/octet-stream');
      return res.send(data);
    } catch (err) {
      return res.status(404).json({ error: 'template not found' });
    }
  } catch (error) {
    return next(error as Error);
  }
};
