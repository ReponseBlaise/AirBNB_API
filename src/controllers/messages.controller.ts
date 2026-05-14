import type { NextFunction, Request, Response } from 'express';

const unsupported = (_req: Request, res: Response) => res.status(501).json({ error: 'Messaging is not modeled in the current Prisma schema' });

export const sendMessage = async (req: Request, res: Response, _next: NextFunction) => unsupported(req, res);
export const getThreads = async (req: Request, res: Response, _next: NextFunction) => unsupported(req, res);
export const getThreadMessages = async (req: Request, res: Response, _next: NextFunction) => unsupported(req, res);
export const flagMessage = async (req: Request, res: Response, _next: NextFunction) => unsupported(req, res);
export const deleteMessage = async (req: Request, res: Response, _next: NextFunction) => unsupported(req, res);
export const markThreadAsRead = async (req: Request, res: Response, _next: NextFunction) => unsupported(req, res);
