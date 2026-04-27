# NodejsLearn Setup Notes

This guide is updated for the current codebase as of 2026-04-27 and focuses on real setup and day-to-day usability.

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

### Bookings
- `GET /bookings` public
- `GET /bookings/:id` public
- `POST /bookings` authenticated + guest role
- `DELETE /bookings/:id` authenticated (owner/admin check inside controller)
- `PATCH /bookings/:id/status` public (no auth middleware currently)

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

## 12. Suggested first hardening tasks

1. Add auth/authorization to public user and profile write routes.
2. Protect `PATCH /bookings/:id/status` with host/admin rules.
3. Add a proper seed script for repeatable local data setup.
4. Add automated API smoke tests for auth, listings, bookings, uploads.

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
  "name": "Alice Host",
  "email": "alice@example.com",
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
