import multer from 'multer';

const storage = multer.memoryStorage();

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const allowed = [
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/pdf',
    'application/octet-stream', // some xlsx uploads come through as octet-stream
  ];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(new Error('Only CSV, XLSX or PDF files are allowed'));
};

export const uploadImport = multer({ storage, fileFilter, limits: { fileSize: 20 * 1024 * 1024 } });
