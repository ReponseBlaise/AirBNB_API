# Production Deployment Guide

## Prerequisites
- GitHub account with repo pushed (✅ Done)
- Render.com account
- Neon PostgreSQL database URL

## Step 1: Create Render Account & Connect GitHub
1. Go to **render.com**
2. Sign up with GitHub
3. Authorize Render to access your repositories

## Step 2: Create PostgreSQL Database
1. In Render Dashboard: **New +** → **PostgreSQL**
2. **Name:** `airbnb-db`
3. **Plan:** Free
4. **Region:** Choose closest to you (e.g., us-east-1)
5. Click **Create Database**
6. Copy the **Internal Database URL** (you'll use this)

## Step 3: Create Web Service
1. **New +** → **Web Service**
2. **Connect Repository:** Select `AirBNB_API` (or your repo)
3. **Name:** `airbnb-api`
4. **Environment:** Node
5. **Region:** Same as database
6. **Branch:** main
7. **Build Command:**
   ```
   npm install && npm run build && npx prisma generate && npx prisma migrate deploy
   ```
8. **Start Command:**
   ```
   npm start
   ```
9. Click **Create Web Service**

## Step 4: Set Environment Variables
While Web Service is building:
1. Go to **Settings** tab
2. **Environment** → Add these variables:

```
DATABASE_URL=postgresql://neondb_owner:npg_2LQHhazbZiN3@ep-little-hill-amicuu3y-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

JWT_SECRET=<GENERATE NEW: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">

JWT_EXPIRES_IN=7d

NODE_ENV=production

PORT=3000

API_URL=https://airbnb-api.onrender.com

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=mushimiyumukizab@gmail.com
EMAIL_PASS=pwhtnkrzbknrgbok
EMAIL_FROM=Airbnb <mushimiyumukizab@gmail.com>

CLOUDINARY_CLOUD_NAME=dcv1ljiwn
CLOUDINARY_API_KEY=649948185854428
CLOUDINARY_API_SECRET=ZlHlGPVBWQHD_MOCJyATXRGOuIY
```

3. Click **Save**

## Step 5: Wait for Build & Deploy
- Watch the **Logs** tab
- Should see:
  ```
  npm run build
  npx prisma generate
  npx prisma migrate deploy
  npm start
  Database connected
  Server running on http://localhost:3000
  ```
- Once deployed, your app is live at `https://airbnb-api.onrender.com`

## Step 6: Test Production Endpoints

### Health Check
```bash
curl https://airbnb-api.onrender.com/health
```
Expected: `{"status":"ok","uptime":...}`

### Register User
```bash
curl -X POST https://airbnb-api.onrender.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Jane Doe",
    "email":"jane@example.com",
    "username":"janedoe",
    "phone":"1234567890",
    "password":"password123",
    "role":"GUEST"
  }'
```
Expected: User object with UUID `id`

### Login & Get Token
```bash
curl -X POST https://airbnb-api.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"jane@example.com",
    "password":"password123"
  }'
```
Expected: `{"token":"eyJ..."}`

### Get Listings (v1 versioned)
```bash
curl https://airbnb-api.onrender.com/api/v1/listings
```
Expected: Array of listings with UUID `id`

### Swagger UI
```
https://airbnb-api.onrender.com/api-docs
```

## Step 7: Continuous Deployment
Every `git push origin main` triggers auto-redeploy:
1. Render pulls latest code
2. Runs build command (migrations auto-apply)
3. Restarts app
4. New version live in 2-3 minutes

## Troubleshooting

### Build Fails with TypeScript Errors
- Run locally: `npm run build`
- Fix errors, commit, push

### Migrations Fail
- Check Logs for error message
- Common: Missing `NODE_ENV=production`
- Verify `DATABASE_URL` format is correct

### App Crashes on Startup
- Check Logs for errors
- Verify all env vars are set
- Check PORT is 3000 (not hardcoded)

### Database Connection Limit
Add to `DATABASE_URL`:
```
?connection_limit=5
```

### 404 on All Routes
- Server might not be starting
- Check Logs
- Verify `npm start` works locally

## Checklist
- [ ] GitHub repo pushed
- [ ] Render account created
- [ ] PostgreSQL database created in Render
- [ ] Web Service created
- [ ] Environment variables set
- [ ] Build succeeded
- [ ] Health check returns 200
- [ ] Can register & login on `/api/v1/`
- [ ] Listings endpoint works
- [ ] Swagger UI loads
