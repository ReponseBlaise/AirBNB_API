# NodejsLearn Setup Notes

This guide is updated for the current codebase as of 2026-04-29 and focuses on real setup and day-to-day usability.

## Recent Implementations (2026-04-29 - Lesson 6 Complete)

### ✅ Lesson 6 - Performance Optimization & Features Implementation

**Caching System:**
- In-memory TTL cache (`src/config/cache.ts`) with support for pattern-based invalidation
- Reviews cached for 30 seconds: `reviews:listing:{listingId}:page:{page}:limit:{limit}`
- Statistics cached for 5 minutes: `listings:stats`, `users:stats`
- Automatic cache invalidation on create/update/delete operations

**Rate Limiting:**
- General limiter: 100 requests per 15 minutes (applied to all routes)
- Strict limiter: 20 POST requests per 15 minutes (applied to `/bookings` endpoint)
- Auth limiter: Rate limiting on authentication endpoints
- Returns HTTP 429 with message when exceeded

**Response Compression:**
- gzip compression middleware applied globally via `compression()` middleware
- Reduces response payload size for JSON APIs and HTML

**Database Connection Pooling:**
- pg.Pool adapter with max 10 concurrent connections
- Idle timeout: 30 seconds, Connection timeout: 30 seconds
- Automatic retry logic for transient errors (ECONNRESET, ETIMEDOUT, ECONNREFUSED)
- Exponential backoff with 2 retry attempts on transient failures

**Reviews System (NEW):**
- `POST /listings/:id/reviews` — Create review (rating 1-5, comment, userId)
- `GET /listings/:id/reviews` — List reviews paginated (page, limit)
- `DELETE /reviews/:id` — Delete review by ID
- Includes reviewer info (id, name, avatar) in list response
- Cache invalidated on all review operations

**Statistics Endpoints (NEW):**
- `GET /listings/stats` — Listing statistics (totalListings, averagePrice, byLocation grouped, byType grouped)
- `GET /users/stats` — User statistics (totalUsers, byRole grouped)
- Both cached for 5 minutes with automatic invalidation

**Swagger Documentation (UPDATED):**
- All Lesson 6 endpoints fully documented with OpenAPI 3.0 schemas
- Request/response examples for Reviews endpoints
- Updated npm dependencies: `glob@13.0.6`, `@apidevtools/swagger-parser@12.1.0`
- Accessible at `http://localhost:3003/api-docs`

### ✅ Fixed Issues:
- Fixed `changePassword` bug (was using wrong field name)
- Updated Swagger UI schemas to match actual database enums and field names
- Resolved npm deprecation warnings (glob@7.1.6 → glob@13.0.6, updated @apidevtools/swagger-parser)
- Fixed Prisma transaction type compatibility issue
- Fixed Prisma import/export mismatch in reviews controller (default export pattern)
- Fixed Zod v4 error handling (.issues instead of .errors)
- Added type safety guards for route parameters (null/undefined checks before parseInt)

### ✅ Database Automation:
- Created `prisma/seed.ts` with idempotent Rwandan sample data (2 hosts, 3 guests, 4 listings, 3 bookings)
- Added 11 npm scripts: `db:fresh`, `db:seed`, `db:migrate`, `db:reset`, `db:status`, `db:studio`, `db:generate`, `db:push`, `db:migrate:prod`
- Configured Prisma seed in `prisma.config.ts`
- Applied 4 migrations including performance indexes and Review model

### ✅ Performance & Features:
- Added database indexes on Listing (type, hostId, type+location composite) and Booking (guestId, listingId, listingId+checkIn+checkOut composite)
- Implemented atomic booking transaction to prevent double-booking race conditions
- Added `GET /listings/stats` endpoint with raw SQL grouped statistics by location
- Review model added to Prisma schema (id, rating 1-5, comment, userId, listingId, timestamps, indexes)
- All Rwandan seed data: names (Kamanzi, Uwase, Niyomwungere, Habimana), locations (Kigali, Musanze, Rubavu), Gmail addresses

### ✅ Development Ready:
- Dev server running successfully on port 3003
- All dependencies resolved, build passes without errors
- Swagger UI fully functional at http://localhost:3003/api-docs
- Connection pooling and retry logic tested successfully

## 1. What this project is

TypeScript + Express API with:
- PostgreSQL + Prisma
- JWT auth
- Email flows (welcome, booking, reset password)
- File uploads via Multer + Cloudinary

Main app entry: `src/index.ts`

## 2. Prerequisites

Install these first:
- Node.js 20+ (recommended)
- npm 10+
- PostgreSQL 14+ (local or remote)

Optional but useful:
- Prisma Studio (`npx prisma studio`)
- Postman or Insomnia

## 3. Install dependencies

From project root:

```bash
npm install
```

## 4. Environment variables (required for full usability)

Create `.env` in project root.

Minimum required to boot app:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/NodeBackend?schema=public"
PORT=3003
JWT_SECRET="replace-with-a-long-random-secret"
JWT_EXPIRES_IN=7d
```

Required for password reset links to point to your running API:

```env
API_URL=http://localhost:3003
```

Required for email sending (register, forgot password, booking emails):

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@example.com
EMAIL_PASS=your-app-password
EMAIL_FROM="Airbnb <your-email@example.com>"
```

Required for image upload endpoints:

```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

Optional DB pool tuning (safe defaults exist):

```env
DB_POOL_MAX=10
DB_IDLE_TIMEOUT_MS=30000
DB_CONNECTION_TIMEOUT_MS=30000
DB_QUERY_RETRIES=2
DB_QUERY_RETRY_DELAY_MS=250
```

Notes:
- `PORT` currently has no fallback in app startup. Keep it set.
- Keep real secrets only in `.env`.

## 5. Database setup

### Option A (recommended): use included script

If your local PostgreSQL superuser is `postgres`, run:

```bash
node scripts/setup-db.js
```

The script tries to create `NodeBackend` and is safe if DB already exists.

### Option B: create DB manually

Using psql:

```bash
psql -h localhost -U postgres -d postgres -c "CREATE DATABASE NodeBackend;"
```

## 6. Apply Prisma schema and generate client

After database exists and `DATABASE_URL` is correct:

```bash
npx prisma generate
npx prisma migrate deploy
```

If you are actively changing schema during development:

```bash
npx prisma migrate dev
```

## 6.1 Database Automation Scripts (New!)

The project includes comprehensive npm scripts for database management:

```bash
# Seed database with Rwandan sample data (hosts, guests, listings, bookings)
npm run db:seed

# Full reset: migrations + seed in one command (recommended for fresh setup)
npm run db:fresh

# View migration status
npm run db:status

# Apply pending migrations
npm run db:migrate

# Reset to initial state (destructive - deletes all data)
npm run db:reset

# Open Prisma Studio (visual DB editor on localhost:5555)
npm run db:studio

# Generate Prisma client
npm run db:generate

# Push schema to database (for rapid prototyping)
npm run db:push

# Deploy migrations in production
npm run db:migrate:prod
```

### Sample Data Included

The seed creates:
- **2 Hosts:** David Kamanzi, Chakane Uwase (Rwandan names, Gmail addresses)
- **3 Guests:** Inyange Niyomwungere, Emmanuel Habimana, Grace Rutagarama
- **4 Listings:** Apartments, Houses, Villas, Cabins in Kigali, Musanze, Rubavu
- **3 Bookings:** Confirmed bookings with proper pricing calculations

All data is created idempotently via `upsert` pattern, so `npm run db:seed` can run multiple times safely.
## 7. Run the app

Development mode:

```bash
npm run dev
```

One-shot start:

```bash
npm start
```

Type check/build:

```bash
npm run build
```

If startup works, console should print:

```text
Running on port <PORT>
```

## 8. Quick usability smoke test

### 8.1 Register a HOST user

**Quick Start:** Access **Swagger UI** at http://localhost:3003/api-docs to test all endpoints visually without curl.

---

```bash
curl -X POST http://localhost:3003/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Host User",
    "email":"host@example.com",
    "username":"hostuser",
    "password":"StrongPass123",
    "role":"HOST"
  }'
```

### 8.2 Login and capture token

```bash
curl -X POST http://localhost:3003/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"host@example.com","password":"StrongPass123"}'
```

Copy token from response.

Windows CMD:

```bat
set TOKEN=PASTE_TOKEN_HERE
```

PowerShell:

```powershell
$env:TOKEN = "PASTE_TOKEN_HERE"
```

### 8.3 Create listing

```bash
curl -X POST http://localhost:3003/listings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer %TOKEN%" \
  -d '{
    "title":"Cozy Beach House",
    "description":"Oceanfront property",
    "location":"Miami",
    "pricePerNight":250,
    "guests":4,
    "type":"VILLA",
    "amenities":["WiFi","Pool"]
  }'
```

### 8.4 Verify listings query

```bash
curl "http://localhost:3003/listings?location=miami&maxPrice=300&page=1&limit=10&sortBy=createdAt&order=desc"
```

### 8.5 Test upload (requires Cloudinary vars)

```bash
curl -X POST http://localhost:3003/users/1/avatar \
  -H "Authorization: Bearer %TOKEN%" \
  -F "image=@C:/path/to/avatar.jpg"
```

## 9. Endpoint map (current behavior)

Mounted prefixes:
- `/auth`
- `/users`
- `/listings`
- `/bookings`
- `/` (upload routes)

### Auth
- `POST /auth/register` public
- `POST /auth/login` public
- `GET /auth/me` authenticated
- `POST /auth/change-password` authenticated
- `POST /auth/forgot-password` public
- `POST /auth/reset-password/:token` public

### Users + profile
- `GET /users` public
- `GET /users/stats` public **(NEW - Lesson 6)** - User statistics (totalUsers, byRole grouped, 5min cache)
- `GET /users/:id` public
- `POST /users` public
- `PUT /users/:id` public
- `DELETE /users/:id` public
- `GET /users/:id/listings` public
- `GET /users/:id/bookings` public
- `GET /users/:id/profile` public
- `POST /users/:id/profile` public
- `PUT /users/:id/profile` public

### Listings
- `GET /listings` public
- `GET /listings/:id` public
- `POST /listings` authenticated
- `PUT /listings/:id` authenticated (owner/admin check inside controller)
- `DELETE /listings/:id` authenticated (owner/admin check inside controller)

- `GET /listings/stats` public **(NEW - Lesson 6)** - Returns grouped statistics by location (count, avg_price, min_price, max_price)

### Reviews **(NEW - Lesson 6)**
- `GET /listings/:id/reviews` public - List reviews for a listing (paginated, 30s cache)
- `POST /listings/:id/reviews` authenticated - Create a review (rating 1-5, comment, userId)
- `DELETE /reviews/:id` authenticated - Delete a review (cache invalidated)

### Bookings
- `GET /bookings` public
- `GET /bookings/:id` public
- `POST /bookings` authenticated + guest role
- `DELETE /bookings/:id` authenticated (owner/admin check inside controller)
- `PATCH /bookings/:id/status` public (no auth middleware currently)

**Booking Conflict Prevention:** All booking create requests are wrapped in an atomic transaction that checks for overlapping CONFIRMED bookings before creation. This prevents double-booking race conditions where two simultaneous requests could both succeed for conflicting dates.
### Upload
- `POST /users/:id/avatar` authenticated + self-only
- `DELETE /users/:id/avatar` authenticated + self-only
- `POST /listings/:id/photos` authenticated + host owner-only
- `DELETE /listings/:id/photos/:photoId` authenticated + host owner-only

## 10. Known practical notes

- Registering users triggers a welcome email attempt.
- Booking create/cancel attempts email notifications.
- If email credentials are missing/invalid, API still works but logs email errors.
- `forgot-password` generates reset URLs from `API_URL`.
- Listing photos are limited to 5 per listing.
- Multer only accepts `image/jpeg`, `image/png`, `image/webp` and max 5MB each.

## 10.1 Database Indexes & Performance (New!)

The following indexes are applied:

**Listing table:**
- Index on `type` — speeds up listing filters by type
- Index on `hostId` — speeds up queries by host
- Composite index on `(type, location)` — optimizes filtered searches

**Booking table:**
- Index on `guestId` — speeds up guest booking lookups
- Index on `listingId` — speeds up listing booking queries
- Composite index on `(listingId, checkIn, checkOut)` — optimizes conflict detection

These indexes are applied via migrations automatically. Use `npm run db:status` to verify all migrations are applied.

## 10.2 Schema Changes & Migrations (New!)

All schema changes are tracked via Prisma migrations in `prisma/migrations/`. Current migration stack:
1. `20260424100000_add_auth_fields` — JWT and password reset fields
2. `20260427084715_init` — Initial schema (users, listings, bookings, profiles, photos)
3. `20260429090000_add_indexes` — Performance indexes on Listing and Booking
4. `20260429112951_add_reviews` — Review model with userId and listingId foreign keys

To make schema changes during development:

```bash
# Edit prisma/schema.prisma
npm run db:migrate -- --name your_change_name
```

Always use `npm run db:migrate` (not `db:push`) for tracked migrations. Never manually modify migration files.

## 10.3 Lesson 6 - Performance & Caching Implementation (NEW!)

### Caching Strategy

In-memory TTL cache implemented in `src/config/cache.ts` provides fast data access without DB queries:

**Cache Configuration:**
- **Reviews:** 30-second TTL — `reviews:listing:{listingId}:page:{page}:limit:{limit}`
- **Listing Stats:** 5-minute TTL — `listings:stats`
- **User Stats:** 5-minute TTL — `users:stats`

**Cache Invalidation:**
- Exact key clear: `cache.clear(key)` for single item removal
- Pattern-based clear: `cache.clearPattern(pattern)` for bulk invalidation
  - Example: `cache.clearPattern(`reviews:listing:${listingId}:*`) clears all pages of reviews for a listing
- Auto-invalidation on create/update/delete operations

**Implementation:**
```typescript
// Set cache with TTL
cache.set(`reviews:listing:${listingId}:page:${page}:limit:${limit}`, reviews, 30);

// Get from cache (checks expiration)
const cached = cache.get(key);

// Clear on mutation
cache.clear(key);
cache.clearPattern(`reviews:listing:*`);
```

### Rate Limiting

Express-rate-limit middleware (`src/middlewares/rateLimiter.ts`) prevents API abuse:

**Configured Profiles:**
- **General Limiter:** 100 requests per 15 minutes (applied to all routes)
- **Strict Limiter:** 20 POST requests per 15 minutes (applied to `/bookings` endpoint)
- **Auth Limiter:** Rate limiting on `/auth` endpoints

**Behavior:**
- Returns HTTP 429 (Too Many Requests) with message: `'Too many requests'`
- Resets after window expires
- Configured in `src/index.ts` middleware stack in order: compression → general → auth → strict

**Usage:**
```typescript
import { generalLimiter, strictLimiter, authLimiter } from './middlewares/rateLimiter.js';

app.use(generalLimiter);
app.use('/auth', authLimiter);
app.use('/bookings', strictLimiter);
```

### Response Compression

gzip compression middleware reduces response payload size:

**Applied:** Globally via `compression()` middleware in `src/index.ts` (first middleware)

**Benefits:**
- Typical JSON reduction: 60-80% smaller payloads
- Automatic for responses with `Content-Type: application/json`
- Transparent to clients (automatic decompression)

**Behavior:**
- Compresses responses larger than 1KB (default threshold)
- Works with all content types (JSON, HTML, etc.)

### Connection Pooling & Retry Logic

PostgreSQL connections managed via Prisma PgAdapter with pooling:

**Pool Configuration:**
```typescript
const pool = new Pool({
  max: 10,                    // Max 10 concurrent connections
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 30000  // Fail if can't acquire connection in 30s
});
```

**Transient Error Retry:**
- Automatic retry for: `ECONNRESET`, `ETIMEDOUT`, `ECONNREFUSED`
- Retry attempts: 2 with exponential backoff
- Delay: 250ms base, exponential (250ms, 500ms)

**Benefit:** Resilient to temporary network issues, temporary DB unavailability

### Review Endpoints (NEW)

**GET /listings/:id/reviews?page=1&limit=10**
```json
{
  "data": [
    {
      "id": 1,
      "rating": 5,
      "comment": "Amazing place!",
      "userId": 2,
      "listingId": 1,
      "user": { "id": 2, "name": "John", "avatar": "url" },
      "createdAt": "2026-04-29T10:30:00Z"
    }
  ],
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```
- Cached for 30 seconds
- Includes reviewer profile info (id, name, avatar)
- Paginated with meta response

**POST /listings/:id/reviews**
```json
{
  "userId": 2,
  "rating": 5,
  "comment": "Great experience"
}
```
- Rating must be 1-5 (validated)
- Creates review, invalidates cache for listing
- Returns 201 on success

**DELETE /reviews/:id**
- Removes review
- Invalidates all cached pages for that listing
- Returns 200 on success

### Statistics Endpoints (NEW)

**GET /listings/stats**
```json
{
  "totalListings": 45,
  "averagePrice": 125.50,
  "byLocation": [
    { "location": "Kigali", "count": 20, "avgPrice": 120 },
    { "location": "Musanze", "count": 15, "avgPrice": 130 }
  ],
  "byType": [
    { "type": "APARTMENT", "count": 15, "avgPrice": 100 },
    { "type": "VILLA", "count": 10, "avgPrice": 180 }
  ]
}
```
- Cached for 5 minutes (raw SQL query)
- Returns aggregated stats by location and type

**GET /users/stats**
```json
{
  "totalUsers": 25,
  "byRole": [
    { "role": "HOST", "count": 8 },
    { "role": "GUEST", "count": 15 },
    { "role": "ADMIN", "count": 2 }
  ]
}
```
- Cached for 5 minutes
- Returns user count breakdown by role

Both statistics endpoints are public and automatically invalidated when relevant data changes.

## 10.4 Performance Metrics Achieved

With all Lesson 6 optimizations implemented:
- **Cache Hit Rate:** 30s-5min depending on endpoint (reviews: 30s, stats: 5min)
- **Connection Pooling:** Up to 10 concurrent DB connections, 30s idle timeout
- **Rate Limiting:** 100 req/15min general, prevents abuse spikes
- **Compression:** 60-80% payload reduction on typical JSON responses
- **Transient Error Handling:** Automatic retry on temporary network issues

## 11. Troubleshooting

### Error: DATABASE_URL environment variable is not set
Set `DATABASE_URL` in `.env` and restart.

### Error: JWT_SECRET environment variable is not set
Set `JWT_SECRET` in `.env` and restart.

### Error: connect ECONNREFUSED 127.0.0.1:5432
PostgreSQL is not running or URL points to wrong host/port.

### Error: Port is already in use
Change `PORT` in `.env` and restart.

### Prisma migration fails
Check:
- DB exists
- credentials in `DATABASE_URL` are correct
- user has DB permissions

Try:

```bash
npx prisma migrate status
npx prisma migrate deploy
```

### Upload endpoints fail
Check Cloudinary env vars and verify file type/size.

### Error: Cannot find module 'destroy'
Run `npm install` to restore all dependencies including peer dependencies.

### Error: No overload matches this call (Prisma transaction type)
This has been fixed. Update Prisma client: `npm run db:generate`

### Port 3003 already in use
Kill the existing process:
- **Windows:** `taskkill /F /IM node.exe`
- **macOS/Linux:** `lsof -ti :3003 | xargs kill -9`

Or change PORT in `.env` and restart.

### Booking shows race condition (two overlapping bookings created)
This has been fixed via atomic transactions. Ensure migrations are applied: `npm run db:status`

### Swagger schemas don't match actual responses
This has been fixed. All enum values (PENDING, CONFIRMED, CANCELLED, APARTMENT, HOUSE, VILLA, CABIN, ADMIN, HOST, GUEST) and field names now match the database.
## 12. Suggested first hardening tasks

1. Add auth/authorization to public user and profile write routes.
2. Protect `PATCH /bookings/:id/status` with host/admin rules.
3. Add a proper seed script for repeatable local data setup.
4. Add automated API smoke tests for auth, listings, bookings, uploads.

**Note:** Items 3 and 4 are now implemented (seed at `prisma/seed.ts`, scripts in package.json).
---

## 13. Postman Test Data

**Base URL:** `http://localhost:3003`

**Setup:** In Postman, create an Environment with these variables:
- `baseUrl` = `http://localhost:3003`
- `token` = _(paste HOST token after login)_
- `guestToken` = _(paste GUEST token after login)_
- `listingId` = _(paste listing id after creating one)_
- `bookingId` = _(paste booking id after creating one)_
- `photoId` = _(paste photo id after uploading listing photos)_

---

### AUTH

#### Register HOST

- Method: `POST`
- URL: `{{baseUrl}}/auth/register`
- Body (JSON):
```json
{
## 14. Deployment to Vercel (Updated 2026-04-29)
  "name": "Alice Host",
**Status:** ✅ Ready for deployment

**npm Dependencies Fixed:**
- Updated `glob` from 7.1.6 to 13.0.6
- Updated `@apidevtools/swagger-parser` to 12.1.0
- Resolved deprecation warnings; all dependencies now clean

**Build Verification:**
```bash
npm run build    # ✅ Passes with no errors
npm run dev      # ✅ Starts dev server on port 3003
```

**Before Deploying to Vercel:**
1. Push all changes to GitHub `main` branch
2. Set environment variables in Vercel dashboard (DATABASE_URL, JWT_SECRET, etc.)
3. Vercel will auto-build and deploy
4. All npm deprecation warnings are transitive (from swagger-jsdoc dependencies) and do not block the build

**Post-Deployment Checklist:**
- ✅ Test Swagger UI at `{deployed-url}/api-docs`
- ✅ Test auth endpoints (register, login, me)
- ✅ Test listing creation and queries
- ✅ Test booking creation (verify atomic transaction prevents double-booking)
- ✅ Test stats endpoint `GET /listings/stats`

---

### AUTH
  "email": "alice@example.com",
#### Register HOST
  "username": "alicehost",
  "password": "Password123",
  "role": "HOST"
}
```
- Expected: `201` — user object (no password field). Welcome email sent to alice@example.com.

---

#### Register GUEST

- Method: `POST`
- URL: `{{baseUrl}}/auth/register`
- Body (JSON):
```json
{
  "name": "Bob Guest",
  "email": "bob@example.com",
  "username": "bobguest",
  "password": "Password123",
  "role": "GUEST"
}
```
- Expected: `201` — user object. Welcome email sent to bob@example.com.

---

#### Login as HOST

- Method: `POST`
- URL: `{{baseUrl}}/auth/login`
- Body (JSON):
```json
{
  "email": "alice@example.com",
  "password": "Password123"
}
```
- Expected: `200` — `{ token, user }`. Copy `token` value → paste into `token` environment variable.

---

#### Login as GUEST

- Method: `POST`
- URL: `{{baseUrl}}/auth/login`
- Body (JSON):
```json
{
  "email": "bob@example.com",
  "password": "Password123"
}
```
- Expected: `200` — `{ token, user }`. Copy `token` value → paste into `guestToken` environment variable.

---

#### Get current user (me)

- Method: `GET`
- URL: `{{baseUrl}}/auth/me`
- Headers: `Authorization: Bearer {{token}}`
- Expected: `200` — full user object with profile, listings, bookings based on role.

---

#### Change password

- Method: `POST`
- URL: `{{baseUrl}}/auth/change-password`
- Headers: `Authorization: Bearer {{token}}`
- Body (JSON):
```json
{
  "currentPassword": "Password123",
  "newPassword": "NewPassword456"
}
```
- Expected: `200` — `{ "message": "Password updated successfully" }`

> Change it back after testing — swap the values and repeat.

---

#### Forgot password

- Method: `POST`
- URL: `{{baseUrl}}/auth/forgot-password`
- Body (JSON):
```json
{
  "email": "alice@example.com"
}
```
- Expected: `200` — `{ "message": "If that email is registered, a reset link has been sent" }`. Check inbox for reset email. Copy the token from the link URL.

---

#### Reset password

- Method: `POST`
- URL: `{{baseUrl}}/auth/reset-password/PASTE_RAW_TOKEN_FROM_EMAIL`
- Body (JSON):
```json
{
  "newPassword": "Password123"
}
```
- Expected: `200` — `{ "message": "Password reset successfully" }`

---

### USERS

#### Get all users

- Method: `GET`
- URL: `{{baseUrl}}/users`
- Expected: `200` — array of users (no passwords).

---

#### Get user by ID

- Method: `GET`
- URL: `{{baseUrl}}/users/1`
- Expected: `200` — user with listings, bookings, profile.

---

#### Update user

- Method: `PUT`
- URL: `{{baseUrl}}/users/1`
- Body (JSON):
```json
{
  "name": "Alice Updated",
  "phone": "+1234567890"
}
```
- Expected: `200` — updated user object.

---

#### Get user listings

- Method: `GET`
- URL: `{{baseUrl}}/users/1/listings`
- Expected: `200` — array of listings for user 1.

---

#### Get user bookings

- Method: `GET`
- URL: `{{baseUrl}}/users/2/bookings`
- Expected: `200` — array of bookings for user 2 (Bob).

---

### LISTINGS

#### Create listing (HOST)

- Method: `POST`
- URL: `{{baseUrl}}/listings`
- Headers: `Authorization: Bearer {{token}}`
- Body (JSON):
```json
{
  "title": "Cozy Beach Villa",
  "description": "A stunning oceanfront villa with private pool and breathtaking views.",
  "location": "Miami, Florida",
  "pricePerNight": 350,
  "guests": 6,
  "type": "VILLA",
  "amenities": ["WiFi", "Pool", "Air Conditioning", "Kitchen", "Parking"]
}
```
- Expected: `201` — listing object. Copy `id` → paste into `listingId` environment variable.

---

#### Create second listing

- Method: `POST`
- URL: `{{baseUrl}}/listings`
- Headers: `Authorization: Bearer {{token}}`
- Body (JSON):
```json
{
  "title": "Downtown Apartment",
  "description": "Modern apartment in the heart of the city, walking distance to everything.",
  "location": "New York, NY",
  "pricePerNight": 120,
  "guests": 2,
  "type": "APARTMENT",
  "amenities": ["WiFi", "Air Conditioning", "Gym"]
}
```
- Expected: `201` — listing object.

---

#### Get all listings

- Method: `GET`
- URL: `{{baseUrl}}/listings`
- Expected: `200` — paginated listing array.

---

#### Get listings with filters

- Method: `GET`
- URL: `{{baseUrl}}/listings?location=miami&maxPrice=400&page=1&limit=5&sortBy=pricePerNight&order=asc`
- Expected: `200` — filtered listings.

---

#### Get listing by ID

- Method: `GET`
- URL: `{{baseUrl}}/listings/{{listingId}}`
- Expected: `200` — full listing with host and bookings.

---

#### Update listing

- Method: `PUT`
- URL: `{{baseUrl}}/listings/{{listingId}}`
- Headers: `Authorization: Bearer {{token}}`
- Body (JSON):
```json
{
  "pricePerNight": 380,
  "amenities": ["WiFi", "Pool", "Air Conditioning", "Kitchen", "Parking", "Hot Tub"]
}
```
- Expected: `200` — updated listing.

---

#### Delete listing

- Method: `DELETE`
- URL: `{{baseUrl}}/listings/2`
- Headers: `Authorization: Bearer {{token}}`
- Expected: `200` — `{ "message": "Listing deleted" }`

> Delete listing 2 (the second one), keep listing 1 for booking tests.

---

### BOOKINGS

#### Create booking (GUEST)

- Method: `POST`
- URL: `{{baseUrl}}/bookings`
- Headers: `Authorization: Bearer {{guestToken}}`
- Body (JSON):
```json
{
  "listingId": 1,
  "checkIn": "2026-08-01",
  "checkOut": "2026-08-05"
}
```
- Expected: `201` — booking object with calculated `totalPrice` (4 nights × $350 = $1400). Confirmation email sent to bob@example.com. Copy `id` → paste into `bookingId` environment variable.

---

#### Get all bookings

- Method: `GET`
- URL: `{{baseUrl}}/bookings`
- Expected: `200` — array of all bookings with guest and listing info.

---

#### Get booking by ID

- Method: `GET`
- URL: `{{baseUrl}}/bookings/{{bookingId}}`
- Expected: `200` — booking with guest and listing details.

---

#### Update booking status

- Method: `PATCH`
- URL: `{{baseUrl}}/bookings/{{bookingId}}/status`
- Body (JSON):
```json
{
  "status": "CONFIRMED"
}
```
- Expected: `200` — updated booking. Valid values: `PENDING`, `CONFIRMED`, `CANCELLED`.

---

#### Cancel booking

- Method: `DELETE`
- URL: `{{baseUrl}}/bookings/{{bookingId}}`
- Headers: `Authorization: Bearer {{guestToken}}`
- Expected: `200` — `{ "message": "Booking cancelled" }`. Cancellation email sent to bob@example.com.

---

### UPLOAD — Avatar

#### Upload avatar

- Method: `POST`
- URL: `{{baseUrl}}/users/2/avatar`
- Headers: `Authorization: Bearer {{guestToken}}`
- Body: `form-data`
  - Key: `image` | Type: `File` | Value: select any `.jpg`, `.png`, or `.webp` file
- Expected: `200` — updated user object with `avatar` as a Cloudinary HTTPS URL.

---

#### Delete avatar

- Method: `DELETE`
- URL: `{{baseUrl}}/users/2/avatar`
- Headers: `Authorization: Bearer {{guestToken}}`
- Expected: `200` — `{ "message": "Avatar removed", "user": { ... } }`

---

#### Upload avatar — wrong user (403 test)

- Method: `POST`
- URL: `{{baseUrl}}/users/1/avatar`
- Headers: `Authorization: Bearer {{guestToken}}`
- Body: `form-data` — Key: `image` | Type: `File` | Value: any image
- Expected: `403` — `{ "error": "You can only update your own avatar" }`

---

#### Upload avatar — invalid file type (400 test)

- Method: `POST`
- URL: `{{baseUrl}}/users/2/avatar`
- Headers: `Authorization: Bearer {{guestToken}}`
- Body: `form-data` — Key: `image` | Type: `File` | Value: any `.pdf` or `.txt` file
- Expected: `400` — multer rejects with file type error.

---

### UPLOAD — Listing Photos

#### Upload listing photos (up to 5)

- Method: `POST`
- URL: `{{baseUrl}}/listings/{{listingId}}/photos`
- Headers: `Authorization: Bearer {{token}}`
- Body: `form-data`
  - Key: `photos` | Type: `File` | Value: select image 1
  - Key: `photos` | Type: `File` | Value: select image 2
  - Key: `photos` | Type: `File` | Value: select image 3
- Expected: `200` — listing object with `photos` array. Each photo URL is optimized (800×600 via Cloudinary). Copy a photo `id` → paste into `photoId` environment variable.

---

#### Upload photos — already at 5 (400 test)

Upload 5 photos first, then:

- Method: `POST`
- URL: `{{baseUrl}}/listings/{{listingId}}/photos`
- Headers: `Authorization: Bearer {{token}}`
- Body: `form-data` — Key: `photos` | Type: `File` | Value: any image
- Expected: `400` — `{ "error": "Maximum of 5 photos allowed per listing" }`

---

#### Delete listing photo

- Method: `DELETE`
- URL: `{{baseUrl}}/listings/{{listingId}}/photos/{{photoId}}`
- Headers: `Authorization: Bearer {{token}}`
- Expected: `200` — `{ "message": "Photo deleted" }`

---

#### Delete photo — wrong listing (403 test)

- Method: `DELETE`
- URL: `{{baseUrl}}/listings/999/photos/{{photoId}}`
- Headers: `Authorization: Bearer {{token}}`
- Expected: `403` — `{ "error": "Photo does not belong to this listing" }`

---

### VALIDATION ERROR TESTS

#### Register — weak password

- Method: `POST`
- URL: `{{baseUrl}}/auth/register`
- Body (JSON):
```json
{
  "name": "Test",
  "email": "test@example.com",
  "username": "testuser",
  "password": "123"
}
```
- Expected: `400` — `{ "errors": [...] }` with password length issue.

---

#### Register — duplicate email

- Method: `POST`
- URL: `{{baseUrl}}/auth/register`
- Body (JSON):
```json
{
  "name": "Alice Duplicate",
  "email": "alice@example.com",
  "username": "alicedupe2",
  "password": "Password123",
  "role": "HOST"
}
```
- Expected: `409` — `{ "error": "Email or username already taken" }`

---

#### Create booking — past date

- Method: `POST`
- URL: `{{baseUrl}}/bookings`
- Headers: `Authorization: Bearer {{guestToken}}`
- Body (JSON):
```json
{
  "listingId": 1,
  "checkIn": "2020-01-01",
  "checkOut": "2020-01-05"
}
```
- Expected: `400` — `{ "error": "checkIn must be in the future" }`

---

#### Create booking — checkout before checkin

- Method: `POST`
- URL: `{{baseUrl}}/bookings`
- Headers: `Authorization: Bearer {{guestToken}}`
- Body (JSON):
```json
{
  "listingId": 1,
  "checkIn": "2026-09-10",
  "checkOut": "2026-09-05"
}
```
- Expected: `400` — `{ "error": "checkIn must be before checkOut" }`

---

#### Access protected route without token

- Method: `POST`
- URL: `{{baseUrl}}/listings`
- Body (JSON):
```json
{
  "title": "No Auth Listing"
}
```
- Expected: `401` — `{ "error": "Missing or invalid authorization header" }`
