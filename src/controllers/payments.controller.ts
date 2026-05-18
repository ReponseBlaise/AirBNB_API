import type { NextFunction, Response, Request } from 'express';
import type { AuthRequest } from '../middlewares/auth.middleware.js';
import prisma from '../config/prisma.js';
import { initiateMtnPayment, verifyMtnTransaction } from '../services/mtn.service.js';

export const initiateMtn = async (req: AuthRequest, res: Response, _next: NextFunction) => {
	try {
		const { bookingId, amount, callbackUrl } = req.body;
		if (!bookingId || !amount) return res.status(400).json({ error: 'bookingId and amount are required' });

		const booking = await prisma.booking.findUnique({ where: { id: String(bookingId) } });
		if (!booking) return res.status(404).json({ error: 'Booking not found' });

		// Only the guest can initiate payment
		if (!req.userId || req.userId !== booking.guestId) return res.status(403).json({ error: 'Only the booking guest may initiate payment' });

		if (booking.status !== 'CONFIRMED') return res.status(400).json({ error: 'Booking must be CONFIRMED before initiating payment' });

		const cb = callbackUrl || String(process.env.MTN_CALLBACK_URL || '')

		const providerResp = await initiateMtnPayment(booking.id, Number(amount), cb)

		const payment = await prisma.payment.create({
			data: {
				bookingId: booking.id,
				amount: Number(amount),
				currency: 'RWF',
				provider: 'MTN',
				transactionId: providerResp.transactionId,
				status: 'PENDING',
				metadata: { checkoutUrl: providerResp.checkoutUrl ?? null },
			},
		})

		return res.status(201).json({ payment, providerResp })
	} catch (error) {
		return _next(error as Error)
	}
}

export const capturePayment = async (req: AuthRequest, res: Response, _next: NextFunction) => {
	try {
		const { paymentId } = req.params
		const payment = await prisma.payment.findUnique({ where: { id: String(paymentId) }, include: { booking: true } })
		if (!payment) return res.status(404).json({ error: 'Payment not found' })

		// Only guest who created booking may capture
		if (!req.userId || req.userId !== payment.booking.guestId) return res.status(403).json({ error: 'Not authorized' })

		if (payment.status !== 'AUTHORIZED' && payment.status !== 'PENDING') return res.status(400).json({ error: 'Payment cannot be captured' })

		const updated = await prisma.payment.update({ where: { id: payment.id }, data: { status: 'CAPTURED' } })
		return res.json(updated)
	} catch (error) {
		return _next(error as Error)
	}
}

export const refundPayment = async (req: AuthRequest, res: Response, _next: NextFunction) => {
	try {
		const { paymentId } = req.params
		const { amount, reason } = req.body
		const payment = await prisma.payment.findUnique({ where: { id: String(paymentId) }, include: { booking: { include: { listing: true } } } })
		if (!payment) return res.status(404).json({ error: 'Payment not found' })

		if (payment.status !== 'CAPTURED') return res.status(400).json({ error: 'Only captured payments can be refunded' })

		const isHost = req.userId && payment.booking.listing.hostId === req.userId
		const isAdmin = req.role === 'ADMIN'
		if (!isHost && !isAdmin) return res.status(403).json({ error: 'Not authorized to refund' })

		const metadata = payment.metadata && typeof payment.metadata === 'object' && !Array.isArray(payment.metadata)
			? (payment.metadata as Record<string, unknown>)
			: {}
		const updated = await prisma.payment.update({ where: { id: payment.id }, data: { status: 'REFUNDED', metadata: { ...metadata, refundReason: reason ?? null, refundedAmount: amount ?? payment.amount } } })

		return res.status(201).json({ payment: updated, refundedAmount: amount ?? payment.amount })
	} catch (error) {
		return _next(error as Error)
	}
}

export const getPayment = async (req: AuthRequest, res: Response, _next: NextFunction) => {
	try {
		const { paymentId } = req.params
		const payment = await prisma.payment.findUnique({ where: { id: String(paymentId) }, include: { booking: { include: { listing: true } } } })
		if (!payment) return res.status(404).json({ error: 'Payment not found' })

		const isRelated = req.userId && (req.userId === payment.booking.guestId || req.userId === payment.booking.listing.hostId) || req.role === 'ADMIN'
		if (!isRelated) return res.status(403).json({ error: 'Not authorized to view this payment' })

		return res.json(payment)
	} catch (error) {
		return _next(error as Error)
	}
}

export const getBookingPayments = async (req: AuthRequest, res: Response, _next: NextFunction) => {
	try {
		const { bookingId } = req.params
		const booking = await prisma.booking.findUnique({ where: { id: String(bookingId) }, include: { listing: true } })
		if (!booking) return res.status(404).json({ error: 'Booking not found' })

		const isRelated = req.userId && (req.userId === booking.guestId || req.userId === booking.listing.hostId) || req.role === 'ADMIN'
		if (!isRelated) return res.status(403).json({ error: 'Not authorized' })

		const list = await prisma.payment.findMany({ where: { bookingId: String(bookingId) } })
		return res.json(list)
	} catch (error) {
		return _next(error as Error)
	}
}

export const getUserPayments = async (req: AuthRequest, res: Response, _next: NextFunction) => {
	try {
		if (!req.userId) return res.status(401).json({ error: 'Unauthorized' })
		// payments for bookings they created (guest)
		const list = await prisma.payment.findMany({ where: { booking: { guestId: req.userId } }, include: { booking: true } })
		return res.json(list)
	} catch (error) {
		return _next(error as Error)
	}
}

// Public webhook for MTN callbacks
export const mtnWebhook = async (req: Request, res: Response, _next: NextFunction) => {
	try {
		const { transactionId, status } = req.body
		if (!transactionId) return res.status(400).json({ error: 'transactionId required' })

		const payment = await prisma.payment.findUnique({ where: { transactionId: String(transactionId) }, include: { booking: true } })
		if (!payment) return res.status(404).json({ error: 'Payment not found' })

		let newStatus: any = 'FAILED'
		if (String(status).toLowerCase() === 'success' || String(status).toLowerCase() === 'captured') newStatus = 'CAPTURED'
		if (String(status).toLowerCase() === 'pending') newStatus = 'PENDING'

		const updated = await prisma.payment.update({ where: { id: payment.id }, data: { status: newStatus } })

		// Optionally, if captured, you may want to mark booking as confirmed/paid — keep business logic separate

		return res.status(200).json({ ok: true, updated })
	} catch (error) {
		return _next(error as Error)
	}
}
