import type { NextFunction, Request, Response } from 'express';

const unsupported = (_req: Request, res: Response) => res.status(501).json({ error: 'Admin moderation features are not modeled in the current Prisma schema' });

export const requireAdmin = async (req: Request, res: Response, _next: NextFunction) => unsupported(req, res);
export const suspendUser = async (req: Request, res: Response, _next: NextFunction) => unsupported(req, res);
export const banUser = async (req: Request, res: Response, _next: NextFunction) => unsupported(req, res);
export const suspendListing = async (req: Request, res: Response, _next: NextFunction) => unsupported(req, res);
export const manualRefund = async (req: Request, res: Response, _next: NextFunction) => unsupported(req, res);
export const getAuditLogs = async (req: Request, res: Response, _next: NextFunction) => unsupported(req, res);
export const getDisputes = async (req: Request, res: Response, _next: NextFunction) => unsupported(req, res);
export const resolveDispute = async (req: Request, res: Response, _next: NextFunction) => unsupported(req, res);
export const getAdminStats = async (req: Request, res: Response, _next: NextFunction) => unsupported(req, res);
