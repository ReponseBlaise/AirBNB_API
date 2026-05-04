# Postman Testing Guide

Run the same requests against either local or cloud by changing only the base URL:

- Local versioned API: `http://localhost:3000/api/v1`
- Local upload API: `http://localhost:3000`
- Cloud versioned API: `https://airbnb-api.onrender.com/api/v1`
- Cloud upload API: `https://airbnb-api.onrender.com`

In Postman, create two environments or update the same environment:

- `rootUrl` = `http://localhost:3000` for local, or `https://airbnb-api.onrender.com` for cloud
- `apiBaseUrl` = `{{rootUrl}}/api/v1`

Seed data you can test with right away:

- Host login: `ishimwe.alice@gmail.com` / `password123`
- Guest login: `uwase.chantal@gmail.com` / `password123`

## Required Notes

- `Authorization: Bearer <token>` is required for protected routes.
- UUID values are used for `:id`, `:listingId`, `:bookingId`, `:reviewId`, and `:photoId`.
- For file uploads, use `multipart/form-data` and attach a real file.
- For cloud testing, use the deployed Render host in place of localhost everywhere in the base URL.

## Endpoint Tests

### System

`GET /`

No body required.

Local URL: `http://localhost:3000/`

Cloud URL: `https://airbnb-api.onrender.com/`

`GET /health`

No body required.

Local URL: `http://localhost:3000/health`

Cloud URL: `https://airbnb-api.onrender.com/health`

### Auth

`POST /api/v1/auth/register`

Required: `name`, `email`, `username`, `password`

Local URL: `http://localhost:3000/api/v1/auth/register`

Cloud URL: `https://airbnb-api.onrender.com/api/v1/auth/register`

```json
{
   "name": "Jane Host",
   "email": "jane@example.com",
   "username": "janehost",
   "password": "StrongPass123!",
   "role": "HOST"
}
```

`POST /api/v1/auth/login`

Required: `email`, `password`

Local URL: `http://localhost:3000/api/v1/auth/login`

Cloud URL: `api/v1/auth/login`

```json
{
   "email": "ishimwe.alice@gmail.com",
   "password": "password123"
}
```

`GET /api/v1/auth/me`

Required: bearer token only.

Local URL: `http://localhost:3000/api/v1/auth/me`

Cloud URL: `https://airbnb-api.onrender.com/api/v1/auth/me`

`POST /api/v1/auth/change-password`

Required: `currentPassword`, `newPassword`

Local URL: `http://localhost:3000/api/v1/auth/change-password`

Cloud URL: `https://airbnb-api.onrender.com/api/v1/auth/change-password`

```json
{
   "currentPassword": "password123",https://airbnb-api.onrender.com/
   "newPassword": "NewPass123!"
}
```

`POST /api/v1/auth/forgot-password`

Required: `email`

Local URL: `http://localhost:3000/api/v1/auth/forgot-password`

Cloud URL: `https://airbnb-api.onrender.com/api/v1/auth/forgot-password`

```json
{
   "email": "jane@example.com"
}
```

`POST /api/v1/auth/reset-password/:token`

Required: path `token`, body `password`

Local URL: `http://localhost:3000/api/v1/auth/reset-password/:token`

Cloud URL: `https://airbnb-api.onrender.com/api/v1/auth/reset-password/:token`

```json
{
   "password": "NewPass123!"
}
```

### Users

`GET /api/v1/users`

Required: bearer token. Query params optional: `page`, `limit`.

Local URL: `http://localhost:3000/api/v1/users`

Cloud URL: `https://airbnb-api.onrender.com/api/v1/users`

`GET /api/v1/users/stats`

Required: bearer token only.

Local URL: `http://localhost:3000/api/v1/users/stats`

Cloud URL: `https://airbnb-api.onrender.com/api/v1/users/stats`

`GET /api/v1/users/:id`

Required: bearer token, path `id`.

Local URL: `http://localhost:3000/api/v1/users/:id`

Cloud URL: `https://airbnb-api.onrender.com/api/v1/users/:id`

`POST /api/v1/users`

Required: `name`, `email`, `username`, `phone`, `password`, `role`

Local URL: `http://localhost:3000/api/v1/users`

Cloud URL: `https://airbnb-api.onrender.com/api/v1/users`

```json
{
   "name": "Samuel Guest",
   "email": "samuel.guest@example.com",
   "username": "samuel_guest",
   "phone": "+1-555-222-3333",
   "password": "StrongPass123!",
   "role": "GUEST",
   "avatar": "https://cdn.example.com/avatar.jpg"
}
```

`PUT /api/v1/users/:id`

Required: bearer token, path `id`. Body is optional fields.

Local URL: `http://localhost:3000/api/v1/users/:id`

Cloud URL: `https://airbnb-api.onrender.com/api/v1/users/:id`

```json
{
   "name": "Samuel Guest Updated",
   "phone": "+1-555-222-4444"
}
```

`DELETE /api/v1/users/:id`

Required: bearer token, path `id`.

Local URL: `http://localhost:3000/api/v1/users/:id`

Cloud URL: `https://airbnb-api.onrender.com/api/v1/users/:id`

`GET /api/v1/users/:id/listings`

Required: bearer token, path `id`.

Local URL: `http://localhost:3000/api/v1/users/:id/listings`

Cloud URL: `https://airbnb-api.onrender.com/api/v1/users/:id/listings`

`GET /api/v1/users/:id/bookings`

Required: bearer token, path `id`.

Local URL: `http://localhost:3000/api/v1/users/:id/bookings`

Cloud URL: `https://airbnb-api.onrender.com/api/v1/users/:id/bookings`

`GET /api/v1/users/:id/profile`

Required: path `id`.

Local URL: `http://localhost:3000/api/v1/users/:id/profile`

Cloud URL: `https://airbnb-api.onrender.com/api/v1/users/:id/profile`

`POST /api/v1/users/:id/profile`

Required: path `id`.

Local URL: `http://localhost:3000/api/v1/users/:id/profile`

Cloud URL: `https://airbnb-api.onrender.com/api/v1/users/:id/profile`

```json
{
   "bio": "Traveler and amateur chef.",
   "website": "https://jane.example.com",
   "country": "Kenya"
}
```

`PUT /api/v1/users/:id/profile`

Required: path `id`.

Local URL: `http://localhost:3000/api/v1/users/:id/profile`

Cloud URL: `https://airbnb-api.onrender.com/api/v1/users/:id/profile`

```json
{
   "bio": "Updated bio.",
   "website": "https://jane.example.com",
   "country": "Kenya"
}
```

### Listings

`GET /api/v1/listings`

Required: none. Query params optional: `page`, `limit`, `location`, `type`, `minPrice`, `maxPrice`, `guests`.

Local URL: `http://localhost:3000/api/v1/listings`

Cloud URL: `https://airbnb-api.onrender.com/api/v1/listings`

`GET /api/v1/listings/search`

Required: none. Same query params as `GET /api/v1/listings`.

Local URL: `http://localhost:3000/api/v1/listings/search`

Cloud URL: `https://airbnb-api.onrender.com/api/v1/listings/search`

`GET /api/v1/listings/stats`

Required: none.

Local URL: `http://localhost:3000/api/v1/listings/stats`

Cloud URL: `https://airbnb-api.onrender.com/api/v1/listings/stats`

`GET /api/v1/listings/:id`

Required: path `id`.

Local URL: `http://localhost:3000/api/v1/listings/:id`

Cloud URL: `https://airbnb-api.onrender.com/api/v1/listings/:id`

`POST /api/v1/listings`

Required: `title`, `description`, `location`, `pricePerNight`, `guests`, `type`, `amenities`

Local URL: `http://localhost:3000/api/v1/listings`

Cloud URL: `https://airbnb-api.onrender.com/api/v1/listings`

```json
{
   "title": "Downtown Loft",
   "description": "Bright loft close to transit and restaurants.",
   "location": "Nairobi",
   "pricePerNight": 89.99,
   "guests": 3,
   "type": "APARTMENT",
   "amenities": ["WiFi", "Kitchen", "Air conditioning"]
}
```

`PUT /api/v1/listings/:id`

Required: bearer token, path `id`. Body is optional fields.

Local URL: `http://localhost:3000/api/v1/listings/:id`

Cloud URL: `https://airbnb-api.onrender.com/api/v1/listings/:id`

```json
{
   "title": "Updated Loft Title",
   "description": "Updated description.",
   "location": "Nairobi",
   "pricePerNight": 99.5,
   "guests": 4,
   "type": "HOUSE",
   "amenities": ["WiFi", "Kitchen"]
}
```

`DELETE /api/v1/listings/:id`

Required: bearer token, path `id`.

Local URL: `http://localhost:3000/api/v1/listings/:id`

Cloud URL: `https://airbnb-api.onrender.com/api/v1/listings/:id`

### Bookings

`GET /api/v1/bookings`

Required: bearer token. Query params optional: `page`, `limit`.

Local URL: `http://localhost:3000/api/v1/bookings`

Cloud URL: `https://airbnb-api.onrender.com/api/v1/bookings`

`GET /api/v1/bookings/:id`

Required: bearer token, path `id`.

Local URL: `http://localhost:3000/api/v1/bookings/:id`

Cloud URL: `https://airbnb-api.onrender.com/api/v1/bookings/:id`

`POST /api/v1/bookings`

Required: bearer token, `listingId`, `checkIn`, `checkOut`

Local URL: `http://localhost:3000/api/v1/bookings`

Cloud URL: `https://airbnb-api.onrender.com/api/v1/bookings`

```json
{
   "listingId": "{{listingId}}",
   "checkIn": "2026-05-20T14:00:00.000Z",
   "checkOut": "2026-05-24T11:00:00.000Z"
}
```

`DELETE /api/v1/bookings/:id`

Required: bearer token, path `id`.

Local URL: `http://localhost:3000/api/v1/bookings/:id`

Cloud URL: `https://airbnb-api.onrender.com/api/v1/bookings/:id`

`PATCH /api/v1/bookings/:id/status`

Required: path `id`, body `status`

Local URL: `http://localhost:3000/api/v1/bookings/:id/status`

Cloud URL: `https://airbnb-api.onrender.com/api/v1/bookings/:id/status`

```json
{
   "status": "CONFIRMED"
}
```

### Reviews

`GET /api/v1/listings/:id/reviews`

Required: path `id`. Query params optional: `page`, `limit`.

Local URL: `http://localhost:3000/api/v1/listings/:id/reviews`

Cloud URL: `https://airbnb-api.onrender.com/api/v1/listings/:id/reviews`

`POST /api/v1/listings/:id/reviews`

Required: path `id`, `userId`, `rating`, `comment`

Local URL: `http://localhost:3000/api/v1/listings/:id/reviews`

Cloud URL: `https://airbnb-api.onrender.com/api/v1/listings/:id/reviews`

```json
{
   "userId": "{{userId}}",
   "rating": 5,
   "comment": "Excellent host and very clean space."
}
```

`DELETE /api/v1/reviews/:id`

Required: path `id`.

Local URL: `http://localhost:3000/api/v1/reviews/:id`

Cloud URL: `https://airbnb-api.onrender.com/api/v1/reviews/:id`

### Uploads

`POST /users/:id/avatar`

Required: bearer token, path `id`, form-data field `image`

Local URL: `http://localhost:3000/users/:id/avatar`

Cloud URL: `https://airbnb-api.onrender.com/users/:id/avatar`

`DELETE /users/:id/avatar`

Required: bearer token, path `id`.

Local URL: `http://localhost:3000/users/:id/avatar`

Cloud URL: `https://airbnb-api.onrender.com/users/:id/avatar`

`POST /listings/:id/photos`

Required: bearer token, path `id`, form-data field `photos` with one or more files

Local URL: `http://localhost:3000/listings/:id/photos`

Cloud URL: `https://airbnb-api.onrender.com/listings/:id/photos`

`DELETE /listings/:id/photos/:photoId`

Required: bearer token, path `id`, path `photoId`.

Local URL: `http://localhost:3000/listings/:id/photos/:photoId`

Cloud URL: `https://airbnb-api.onrender.com/listings/:id/photos/:photoId`

### AI

`POST /api/v1/ai/search`

Required: `query`

Local URL: `http://localhost:3000/api/v1/ai/search`

Cloud URL: `https://airbnb-api.onrender.com/api/v1/ai/search`

```json
{
   "query": "cozy apartment in Kigali for 2 people under $150"
}
```

`POST /api/v1/ai/generate-description`

Required: bearer token, `title`, `location`, `type`, `guests`, `amenities`, `price`

Local URL: `http://localhost:3000/api/v1/ai/generate-description`

Cloud URL: `https://airbnb-api.onrender.com/api/v1/ai/generate-description`

```json
{
   "title": "Beachfront Villa",
   "location": "Miami, FL",
   "type": "VILLA",
   "guests": 6,
   "amenities": ["Pool", "WiFi", "BBQ"],
   "price": 250
}
```

`POST /api/v1/ai/chat`

Required: `message`, `sessionId`

Local URL: `http://localhost:3000/api/v1/ai/chat`

Cloud URL: `https://airbnb-api.onrender.com/api/v1/ai/chat`

```json
{
   "message": "What listings do you have in Nairobi?",
   "sessionId": "demo-session-001"
}
```

## Quick Test Order

1. Login as host.
2. Login as guest.
3. Fetch users and listings to capture IDs.
4. Create a listing.
5. Create a booking.
6. Add a review.
7. Test upload endpoints with a real file.
8. Repeat the same requests after switching `rootUrl` and `apiBaseUrl` from localhost to the cloud host.
