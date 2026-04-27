CREATE TYPE "Role" AS ENUM ('ADMIN', 'HOST', 'GUEST');
CREATE TYPE "ListingType" AS ENUM ('APARTMENT', 'HOUSE', 'VILLA', 'CABIN');
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

CREATE TABLE "User" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'GUEST',
  "password" TEXT NOT NULL,
  "avatar" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resetToken" TEXT,
  "resetTokenExpiry" TIMESTAMP(3),

  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Profile" (
  "id" SERIAL NOT NULL,
  "bio" TEXT,
  "website" TEXT,
  "country" TEXT,
  "userId" INTEGER NOT NULL,

  CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Listing" (
  "id" SERIAL NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "pricePerNight" DOUBLE PRECISION NOT NULL,
  "guests" INTEGER NOT NULL,
  "type" "ListingType" NOT NULL,
  "amenities" TEXT[] NOT NULL,
  "rating" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "hostId" INTEGER NOT NULL,

  CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Booking" (
  "id" SERIAL NOT NULL,
  "checkIn" TIMESTAMP(3) NOT NULL,
  "checkOut" TIMESTAMP(3) NOT NULL,
  "totalPrice" DOUBLE PRECISION NOT NULL,
  "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "guestId" INTEGER NOT NULL,
  "listingId" INTEGER NOT NULL,

  CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");
CREATE INDEX "Listing_location_idx" ON "Listing"("location");
CREATE INDEX "Listing_pricePerNight_idx" ON "Listing"("pricePerNight");

ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
