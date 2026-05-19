import type { NextFunction, Request, Response } from 'express';
import prisma from '../config/prisma.js';
import type { AuthRequest } from '../middlewares/auth.middleware.js';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

// Admin auth helper moved to `middlewares/auth.middleware.ts` to centralize auth logic.

export const suspendUser = async (_req: Request, res: Response) => res.status(501).json({ error: 'Not implemented' });
export const banUser = async (_req: Request, res: Response) => res.status(501).json({ error: 'Not implemented' });
export const suspendListing = async (_req: Request, res: Response) => res.status(501).json({ error: 'Not implemented' });
export const manualRefund = async (_req: Request, res: Response) => res.status(501).json({ error: 'Not implemented' });
export const getAuditLogs = async (_req: Request, res: Response) => res.status(501).json({ error: 'Not implemented' });
export const getDisputes = async (_req: Request, res: Response) => res.status(501).json({ error: 'Not implemented' });
export const resolveDispute = async (_req: Request, res: Response) => res.status(501).json({ error: 'Not implemented' });

export const getAdminStats = async (_req: AuthRequest, res: Response, next: NextFunction) => {
	try {
		const users = await prisma.user.count();
		const listings = await prisma.listing.count();
		const bookings = await prisma.booking.count();
		const payments = await prisma.payment.count();
		return res.json({ users, listings, bookings, payments });
	} catch (err) { next(err); }
};

function sendBufferAsFile(res: Response, buffer: Buffer, filename: string, contentType: string) {
	res.setHeader('Content-Type', contentType);
	res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
	res.send(buffer);
}

export const exportBookings = async (_req: AuthRequest, res: Response, next: NextFunction) => {
	try {
		const rows = await prisma.booking.findMany({ include: { listing: true, guest: true } });
		const qs = rows.map(r => ({ id: r.id, listing: r.listing?.title ?? '', guest: r.guest?.name ?? '', checkIn: r.checkIn.toISOString(), checkOut: r.checkOut.toISOString(), totalPrice: r.totalPrice, status: r.status }));

		// CSV
		if (String(_req.query.format || 'csv') === 'csv') {
			const header = 'id,listing,guest,checkIn,checkOut,totalPrice,status\n';
			const body = qs.map(q => `${q.id},"${q.listing}","${q.guest}",${q.checkIn},${q.checkOut},${q.totalPrice},${q.status}`).join('\n');
			return sendBufferAsFile(res, Buffer.from(header + body), 'bookings.csv', 'text/csv');
		}

		// XLSX
		if (String(_req.query.format) === 'xlsx') {
			const wb = new ExcelJS.Workbook();
			const ws = wb.addWorksheet('Bookings');
			ws.addRow(['id','listing','guest','checkIn','checkOut','totalPrice','status']);
			qs.forEach(q => ws.addRow([q.id,q.listing,q.guest,q.checkIn,q.checkOut,q.totalPrice,q.status]));
			const buf = await wb.xlsx.writeBuffer();
			return sendBufferAsFile(res, Buffer.from(buf), 'bookings.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
		}

		// PDF
		if (String(_req.query.format) === 'pdf') {
			const doc = new PDFDocument({ size: 'A4', margin: 30 });
			const chunks: Buffer[] = [];
			doc.on('data', (c) => chunks.push(c));
			doc.on('end', () => sendBufferAsFile(res, Buffer.concat(chunks), 'bookings.pdf', 'application/pdf'));
			doc.fontSize(14).text('Bookings Export', { align: 'center' });
			doc.moveDown();
			qs.forEach(q => {
				doc.fontSize(10).text(`${q.id} | ${q.listing} | ${q.guest} | ${q.checkIn} - ${q.checkOut} | ${q.totalPrice} | ${q.status}`);
			});
			doc.end();
			return;
		}

		return res.status(400).json({ error: 'Invalid format' });
	} catch (err) { next(err); }
};

export const exportUsers = async (_req: AuthRequest, res: Response, next: NextFunction) => {
	try {
		const rows = await prisma.user.findMany();
		const qs = rows.map(r => ({ id: r.id, name: r.name, email: r.email, username: r.username, role: r.role }));
		const header = 'id,name,email,username,role\n';
		const body = qs.map(q => `${q.id},"${q.name}","${q.email}","${q.username}",${q.role}`).join('\n');
		return sendBufferAsFile(res, Buffer.from(header + body), 'users.csv', 'text/csv');
	} catch (err) { next(err); }
};
