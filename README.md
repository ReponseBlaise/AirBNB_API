# AirBNB API (Node.js + TypeScript)

A production-ready Airbnb-style backend API built with Express, TypeScript, Prisma, PostgreSQL, Swagger, and LangChain + Groq for AI-powered features.

## Project Overview

This API supports:
- User authentication and account management
- Listings management (create, update, search, stats)
- Booking workflow and status updates
- Reviews system for listings
- Profile management
- File uploads (avatars and listing photos)
- AI-powered endpoints (natural language search, description generation, chatbot)
- API documentation via Swagger
- Rate limiting, compression, and centralized error handling

## Covered Topics

### 1. Backend Architecture
- Express app setup with modular route organization
- Versioned API structure (`/api/v1`)
- Controller-based business logic
- Middleware composition and ordering

### 2. TypeScript in Node.js
- Strict typing across controllers, middleware, and configs
- ESM setup (`"type": "module"`)
- Build pipeline with `tsc`

### 3. Database with Prisma + PostgreSQL
- Prisma schema and migrations
- `prisma generate` and Prisma Client usage
- Production migration deployment (`prisma migrate deploy`)
- Seed support (`prisma db seed`)

### 4. Authentication & Authorization
- JWT-based auth
- Protected routes with `authenticate` middleware
- Role guards (guest/host logic where applicable)
- Auth flows:
  - Register
  - Login
  - Get current user (`/me`)
  - Change password
  - Forgot/reset password

### 5. Validation and Error Handling
- Request validation with Zod
- Prisma-aware error handling middleware
- 404 fallback handling (`Route not found`)

### 6. Core Business Features
- Users CRUD + stats
- Listings CRUD + filtering + statistics
- Bookings CRUD + status updates
- Reviews creation, listing reviews, and deletion
- Nested profile endpoints under users

### 7. Uploads & Media Management
- Multer for multipart uploads
- Cloudinary integration for image hosting
- Avatar upload/delete
- Listing photos upload/delete

### 8. API Documentation
- Swagger/OpenAPI integration
- Interactive docs exposed at `/api-docs`

### 9. Performance & Security Middleware
- Compression middleware
- Morgan request logging
- Route-specific and general rate limiting

### 10. AI Features (LangChain + Groq)
- Natural language listing search
- AI listing description generation
- Session-based chatbot with memory

## Tech Stack

- Node.js + Express
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT (`jsonwebtoken`)
- Zod
- Multer + Cloudinary
- Swagger (`swagger-jsdoc`, `swagger-ui-express`)
- LangChain (`@langchain/core`, `@langchain/groq`, `langchain`)

## Folder Structure

```text
src/
  config/         # prisma, swagger, email, cloudinary, multer, cache, ai
  controllers/    # auth, users, listings, bookings, reviews, profile, upload, ai
  middlewares/    # auth, error handler, deprecation, rate limiter
  routes/         # route modules and v1 route aggregator
  templates/      # email templates
  utils/          # helper utilities
  validators/     # zod validators
prisma/
  schema.prisma
  migrations/
```

## API Base URLs

- Root: `/`
- Health check: `/health`
- Swagger docs: `/api-docs`
- Versioned API base: `/api/v1`

## Main Route Map

### Auth (`/api/v1/auth`)
- `POST /register`
- `POST /login`
- `GET /me` (protected)
- `POST /change-password` (protected)
- `POST /forgot-password`
- `POST /reset-password/:token`

### Users (`/api/v1/users`)
- `GET /`
- `GET /stats`
- `GET /:id`
- `POST /`
- `PUT /:id`
- `DELETE /:id`
- `GET /:id/listings`
- `GET /:id/bookings`
- Profile nested under `/:id/profile`

### Listings (`/api/v1/listings`)
- `GET /`
- `GET /stats`
- `GET /:id`
- `POST /` (protected)
- `PUT /:id` (protected)
- `DELETE /:id` (protected)

### Bookings (`/api/v1/bookings`)
- `GET /`
- `GET /:id`
- `POST /` (protected, guest)
- `DELETE /:id` (protected)
- `PATCH /:id/status`

### Reviews
- `GET /api/v1/listings/:id/reviews`
- `POST /api/v1/listings/:id/reviews`
- `DELETE /api/v1/reviews/:id`

### Uploads
- `POST /users/:id/avatar` (protected)
- `DELETE /users/:id/avatar` (protected)
- `POST /listings/:id/photos` (protected)
- `DELETE /listings/:id/photos/:photoId` (protected)

### AI (`/api/v1/ai`)
- `POST /search`
- `POST /generate-description` (protected)
- `POST /chat`

## Environment Variables

Create `.env` from `.env.example` and configure:
- `DATABASE_URL`
- `PORT`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `API_URL`
- `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `GROQ_API_KEY`

Important:
- Do not commit real secrets to git.
- Rotate keys immediately if they were exposed.

## Local Setup

```bash
npm install
npm run build
npm run db:migrate
npm run dev
```

Useful database commands:

```bash
npm run db:generate
npm run db:status
npm run db:studio
npm run db:seed
npm run db:reset
```

## Production (Render) Notes

Build command:

```bash
npm install && npm run build && npx prisma generate && npx prisma migrate deploy
```

Start command:

```bash
npm start
```

## Quick Test Commands

```bash
curl https://airbnb-apis.onrender.com/
curl https://airbnb-apis.onrender.com/health
curl https://airbnb-apis.onrender.com/api-docs
```

## Scripts Reference

- `npm run dev` - Start dev server with tsx + nodemon
- `npm run build` - Generate Prisma client and compile TypeScript
- `npm run start` - Run compiled app from `dist`
- `npm run migrate` - Deploy migrations
- `npm run db:migrate` - Create/apply dev migration
- `npm run db:fresh` - Reset DB and seed

## Notes

- API currently returns a friendly JSON payload on `/`.
- If visiting unknown routes, the app responds with `{"error":"Route not found"}`.
- AI endpoints require a valid Groq API key at runtime.
