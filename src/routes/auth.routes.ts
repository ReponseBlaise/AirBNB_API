/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required: [id, name, email, username, phone, role, createdAt]
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         name:
 *           type: string
 *           example: Jane Host
 *         email:
 *           type: string
 *           format: email
 *           example: jane@example.com
 *         username:
 *           type: string
 *           example: janehost
 *         phone:
 *           type: string
 *           example: '+1-555-123-4567'
 *         role:
 *           type: string
 *           enum: [host, guest, admin]
 *           example: host
 *         avatar:
 *           type: string
 *           nullable: true
 *           example: https://cdn.example.com/avatar.jpg
 *         bio:
 *           type: string
 *           nullable: true
 *           example: Loves cozy city stays.
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: '2026-04-28T10:00:00.000Z'
 *     Profile:
 *       type: object
 *       required: [id, userId]
 *       properties:
 *         id:
 *           type: integer
 *           example: 9
 *         bio:
 *           type: string
 *           nullable: true
 *           example: Traveler and amateur chef.
 *         website:
 *           type: string
 *           nullable: true
 *           example: https://jane.example.com
 *         country:
 *           type: string
 *           nullable: true
 *           example: Kenya
 *         userId:
 *           type: integer
 *           example: 1
 *     Listing:
 *       type: object
 *       required: [id, title, description, location, pricePerNight, guests, type, amenities, userId, host, createdAt]
 *       properties:
 *         id:
 *           type: integer
 *           example: 12
 *         title:
 *           type: string
 *           example: Downtown Loft
 *         description:
 *           type: string
 *           example: Bright loft close to transit and restaurants.
 *         location:
 *           type: string
 *           example: Nairobi
 *         pricePerNight:
 *           type: number
 *           example: 89.99
 *         guests:
 *           type: integer
 *           example: 3
 *         type:
 *           type: string
 *           enum: [apartment, house, villa, cabin]
 *           example: apartment
 *         amenities:
 *           type: array
 *           items:
 *             type: string
 *           example: [WiFi, Kitchen, Air conditioning]
 *         rating:
 *           type: number
 *           nullable: true
 *           example: 4.8
 *         userId:
 *           type: integer
 *           example: 1
 *         host:
 *           $ref: '#/components/schemas/User'
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: '2026-04-28T10:00:00.000Z'
 *     Booking:
 *       type: object
 *       required: [id, checkIn, checkOut, total, status, userId, listingId, user, listing, createdAt]
 *       properties:
 *         id:
 *           type: integer
 *           example: 100
 *         checkIn:
 *           type: string
 *           format: date-time
 *           example: '2026-05-01T14:00:00.000Z'
 *         checkOut:
 *           type: string
 *           format: date-time
 *           example: '2026-05-05T11:00:00.000Z'
 *         total:
 *           type: number
 *           example: 359.96
 *         status:
 *           type: string
 *           enum: [confirmed, cancelled, pending]
 *           example: confirmed
 *         userId:
 *           type: integer
 *           example: 2
 *         listingId:
 *           type: integer
 *           example: 12
 *         user:
 *           $ref: '#/components/schemas/User'
 *         listing:
 *           $ref: '#/components/schemas/Listing'
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: '2026-04-28T10:00:00.000Z'
 *     Review:
 *       type: object
 *       required: [id, rating, comment, userId, listingId, user, createdAt]
 *       properties:
 *         id:
 *           type: integer
 *           example: 7
 *         rating:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           example: 5
 *         comment:
 *           type: string
 *           example: Perfect weekend stay.
 *         userId:
 *           type: integer
 *           example: 2
 *         listingId:
 *           type: integer
 *           example: 12
 *         user:
 *           $ref: '#/components/schemas/User'
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: '2026-04-28T10:00:00.000Z'
 *     CreateUserInput:
 *       type: object
 *       required: [name, email, username, phone, password, role]
 *       properties:
 *         name:
 *           type: string
 *           example: Jane Host
 *         email:
 *           type: string
 *           format: email
 *           example: jane@example.com
 *         username:
 *           type: string
 *           example: janehost
 *         phone:
 *           type: string
 *           example: '+1-555-123-4567'
 *         password:
 *           type: string
 *           example: StrongPass123!
 *         role:
 *           type: string
 *           enum: [host, guest]
 *           example: host
 *         avatar:
 *           type: string
 *           nullable: true
 *           example: https://cdn.example.com/avatar.jpg
 *     UpdateUserInput:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: Jane Host
 *         email:
 *           type: string
 *           format: email
 *           example: jane@example.com
 *         username:
 *           type: string
 *           example: janehost
 *         phone:
 *           type: string
 *           example: '+1-555-123-4567'
 *         password:
 *           type: string
 *           example: StrongPass123!
 *         avatar:
 *           type: string
 *           nullable: true
 *           example: https://cdn.example.com/avatar.jpg
 *         role:
 *           type: string
 *           enum: [host, guest]
 *           example: host
 *     RegisterInput:
 *       type: object
 *       required: [name, email, username, phone, password, role]
 *       properties:
 *         name:
 *           type: string
 *           example: Jane Host
 *         email:
 *           type: string
 *           format: email
 *           example: jane@example.com
 *         username:
 *           type: string
 *           example: janehost
 *         phone:
 *           type: string
 *           example: '+1-555-123-4567'
 *         password:
 *           type: string
 *           example: StrongPass123!
 *         role:
 *           type: string
 *           enum: [host, guest]
 *           example: host
 *     LoginInput:
 *       type: object
 *       required: [email, password]
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: jane@example.com
 *         password:
 *           type: string
 *           example: StrongPass123!
 *     ChangePasswordInput:
 *       type: object
 *       required: [currentPassword, newPassword]
 *       properties:
 *         currentPassword:
 *           type: string
 *           example: OldPass123!
 *         newPassword:
 *           type: string
 *           example: NewPass123!
 *     ForgotPasswordInput:
 *       type: object
 *       required: [email]
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: jane@example.com
 *     ResetPasswordInput:
 *       type: object
 *       required: [password]
 *       properties:
 *         password:
 *           type: string
 *           example: NewPass123!
 *     CreateListingInput:
 *       type: object
 *       required: [title, description, location, pricePerNight, guests, type, amenities]
 *       properties:
 *         title:
 *           type: string
 *           example: Downtown Loft
 *         description:
 *           type: string
 *           example: Bright loft close to transit and restaurants.
 *         location:
 *           type: string
 *           example: Nairobi
 *         pricePerNight:
 *           type: number
 *           example: 89.99
 *         guests:
 *           type: integer
 *           example: 3
 *         type:
 *           type: string
 *           enum: [apartment, house, villa, cabin]
 *           example: apartment
 *         amenities:
 *           type: array
 *           items:
 *             type: string
 *           example: [WiFi, Kitchen, Air conditioning]
 *     UpdateListingInput:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           example: Updated Loft Title
 *         description:
 *           type: string
 *           example: Updated description.
 *         location:
 *           type: string
 *           example: Nairobi
 *         pricePerNight:
 *           type: number
 *           example: 99.5
 *         guests:
 *           type: integer
 *           example: 4
 *         type:
 *           type: string
 *           enum: [apartment, house, villa, cabin]
 *           example: house
 *         amenities:
 *           type: array
 *           items:
 *             type: string
 *           example: [WiFi, Kitchen]
 *     CreateBookingInput:
 *       type: object
 *       required: [listingId, userId, checkIn, checkOut]
 *       properties:
 *         listingId:
 *           type: integer
 *           example: 12
 *         userId:
 *           type: integer
 *           example: 2
 *         checkIn:
 *           type: string
 *           format: date-time
 *           example: '2026-05-01T14:00:00.000Z'
 *         checkOut:
 *           type: string
 *           format: date-time
 *           example: '2026-05-05T11:00:00.000Z'
 *     CreateReviewInput:
 *       type: object
 *       required: [userId, rating, comment]
 *       properties:
 *         userId:
 *           type: integer
 *           example: 2
 *         rating:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           example: 5
 *         comment:
 *           type: string
 *           example: Excellent host and very clean space.
 *     CreateProfileInput:
 *       type: object
 *       properties:
 *         bio:
 *           type: string
 *           example: Traveler and amateur chef.
 *         website:
 *           type: string
 *           example: https://jane.example.com
 *         country:
 *           type: string
 *           example: Kenya
 *     UpdateProfileInput:
 *       type: object
 *       properties:
 *         bio:
 *           type: string
 *           example: Updated bio.
 *         website:
 *           type: string
 *           example: https://jane.example.com
 *         country:
 *           type: string
 *           example: Kenya
 *     UpdateBookingStatusInput:
 *       type: object
 *       required: [status]
 *       properties:
 *         status:
 *           type: string
 *           enum: [pending, confirmed, cancelled]
 *           example: confirmed
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           example: Resource not found
 *     AuthResponse:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *         user:
 *           $ref: '#/components/schemas/User'
 *     MessageResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: Success
 */
/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterInput'
 *     responses:
 *       201:
 *         description: User created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Email already in use
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in and get a JWT
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginInput'
 *     responses:
 *       200:
 *         description: Login succeeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get the current authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     tags: [Auth]
 *     summary: Change the current password
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangePasswordInput'
 *     responses:
 *       200:
 *         description: Password updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request a password reset link
 *     description: Returns the same response whether or not the email exists.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForgotPasswordInput'
 *     responses:
 *       200:
 *         description: Reset email request accepted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 */
/**
 * @swagger
 * /auth/reset-password/{token}:
 *   post:
 *     tags: [Auth]
 *     summary: Reset a password with a token
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPasswordInput'
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       400:
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { changePassword, forgotPassword, getMe, login, register, resetPassword } from '../controllers/auth.controller.js';

const router = Router();

router.post('/register', register);// register route should be public, no authentication required
router.post('/login', login);
router.get('/me', authenticate, getMe);
router.post('/change-password', authenticate, changePassword);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

export default router;