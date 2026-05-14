import type { NextFunction, Request, Response } from 'express';

const unsupported = (_req: Request, res: Response) => res.status(501).json({ error: 'Payments are not modeled in the current Prisma schema' });

export const authorizePayment = async (req: Request, res: Response, _next: NextFunction) => unsupported(req, res);
export const capturePayment = async (req: Request, res: Response, _next: NextFunction) => unsupported(req, res);
export const refundPayment = async (req: Request, res: Response, _next: NextFunction) => unsupported(req, res);
export const getPayment = async (req: Request, res: Response, _next: NextFunction) => unsupported(req, res);
export const getBookingPayments = async (req: Request, res: Response, _next: NextFunction) => unsupported(req, res);
export const getUserPayments = async (req: Request, res: Response, _next: NextFunction) => unsupported(req, res);
