import 'dotenv/config';
import prisma from '../src/config/prisma';
import bcrypt from 'bcrypt';

async function main() {
  console.log('🌱 Seeding database with test data...');

  try {
    // Clear existing data in proper dependency order
    console.log('Cleaning database...');
    await prisma.auditLog.deleteMany().catch(() => {});
    await prisma.adminAction.deleteMany().catch(() => {});
    await prisma.message.deleteMany().catch(() => {});
    await prisma.messageThread.deleteMany().catch(() => {});
    await prisma.review.deleteMany().catch(() => {});
    await prisma.dispute.deleteMany().catch(() => {});
    await prisma.payment.deleteMany().catch(() => {});
    await prisma.booking.deleteMany().catch(() => {});
    await prisma.listingAvailability.deleteMany().catch(() => {});
    await prisma.listingPhoto.deleteMany().catch(() => {});
    await prisma.listing.deleteMany().catch(() => {});
    await prisma.session.deleteMany().catch(() => {});
    await prisma.paymentMethod_.deleteMany().catch(() => {});
    await prisma.profile.deleteMany().catch(() => {});
    await prisma.user.deleteMany().catch(() => {});

    console.log('Creating users...');
    
    // Create admin user
    const admin = await prisma.user.create({
      data: {
        email: 'admin@bookingapp.com',
        password: await bcrypt.hash('Admin@123456', 10),
        name: 'Admin User',
        role: 'ADMIN',
        emailVerified: true,
      },
    });

    // Create host users
    const hosts = [];
    for (let i = 1; i <= 3; i++) {
      const host = await prisma.user.create({
        data: {
          email: `host${i}@bookingapp.com`,
          password: await bcrypt.hash('Host@123456', 10),
          name: `Host ${i}`,
          role: 'HOST',
          emailVerified: true,
          preferredRole: 'HOST',
          phone: `+1234567890${i}`,
        },
      });
      hosts.push(host);

      // Create profile separately
      await prisma.profile.create({
        data: {
          userId: host.id,
          country: 'USA',
          responseRate: 100,
        },
      });
    }

    // Create guest users
    const guests = [];
    for (let i = 1; i <= 5; i++) {
      const guest = await prisma.user.create({
        data: {
          email: `guest${i}@bookingapp.com`,
          password: await bcrypt.hash('Guest@123456', 10),
          name: `Guest ${i}`,
          role: 'GUEST',
          emailVerified: true,
          preferredRole: 'GUEST',
        },
      });
      guests.push(guest);

      // Create profile separately
      await prisma.profile.create({
        data: {
          userId: guest.id,
          country: 'USA',
        },
      });
    }

    // Create admin profile
    await prisma.profile.create({
      data: {
        userId: admin.id,
        country: 'USA',
      },
    });

    console.log('Creating listings...');
    
    const listingData = [
      {
        title: 'Luxury Downtown Apartment',
        description: 'Beautiful modern apartment in the heart of the city',
        address: '123 Main St, Downtown',
        city: 'New York',
        country: 'USA',
        listingType: 'APARTMENT',
        bedrooms: 2,
        beds: 2,
        bathrooms: 2,
        maxGuests: 4,
        basePricePerNight: 150,
        checkInMethod: 'SELF_CHECKIN',
        latitude: 40.7128,
        longitude: -74.006,
      },
      {
        title: 'Cozy Beach House',
        description: 'Peaceful beachfront cottage',
        address: '456 Ocean Ave, Beach',
        city: 'Los Angeles',
        country: 'USA',
        listingType: 'HOUSE',
        bedrooms: 3,
        beds: 3,
        bathrooms: 2,
        maxGuests: 6,
        basePricePerNight: 200,
        checkInMethod: 'HOST_CHECKIN',
        latitude: 34.0522,
        longitude: -118.2437,
      },
      {
        title: 'Mountain Cabin',
        description: 'Private cabin in mountains',
        address: '789 Pine Rd, Mountains',
        city: 'Denver',
        country: 'USA',
        listingType: 'CABIN',
        bedrooms: 2,
        beds: 2,
        bathrooms: 1,
        maxGuests: 4,
        basePricePerNight: 120,
        checkInMethod: 'SELF_CHECKIN',
        latitude: 39.7392,
        longitude: -104.9903,
      },
    ];

    const listings = [];
    for (let i = 0; i < listingData.length; i++) {
      const listing = await prisma.listing.create({
        data: {
          ...listingData[i],
          hostId: hosts[i % hosts.length].id,
          status: 'ACTIVE',
          instantBook: true,
          cleaningFee: 25,
          serviceFeeGuest: 0.15,
          serviceFeeHost: 0.03,
          cancellationPolicy: 'FLEXIBLE',
          publishedAt: new Date(),
        },
      });
      listings.push(listing);
    }

    console.log('Creating availability calendar...');
    for (const listing of listings) {
      const today = new Date();
      // Create 30 days of availability instead of 365 for faster seeding
      for (let j = 0; j < 30; j++) {
        const date = new Date(today);
        date.setDate(date.getDate() + j);
        
        // 2 out of 3 days available
        const isAvailable = j % 3 !== 0;

        await prisma.listingAvailability.create({
          data: {
            listingId: listing.id,
            date,
            isAvailable,
            minStay: 1,
            maxStay: 30,
          },
        });
      }
    }

    console.log('Creating bookings...');
    for (let i = 0; i < 3; i++) {
      const guest = guests[i % guests.length];
      const listing = listings[i % listings.length];

      const checkIn = new Date();
      checkIn.setDate(checkIn.getDate() + 5 + i * 2);

      const checkOut = new Date(checkIn);
      checkOut.setDate(checkOut.getDate() + 3);

      const numberOfNights = 3;
      const nightlyRate = listing.basePricePerNight || 100;
      const cleaningFee = listing.cleaningFee || 0;
      const subtotal = nightlyRate * numberOfNights;
      const serviceFeeGuest = subtotal * 0.15;
      const tax = (subtotal + serviceFeeGuest) * 0.1;
      const totalCostGuest = subtotal + cleaningFee + serviceFeeGuest + tax;
      const totalPayoutHost = subtotal - subtotal * 0.03;

      await prisma.booking.create({
        data: {
          listingId: listing.id,
          guestId: guest.id,
          hostId: listing.hostId,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          numberOfGuests: 2,
          numberOfNights,
          status: 'CONFIRMED',
          instantBook: true,
          nightlyRate,
          cleaningFee,
          serviceFeeGuest,
          tax,
          subtotalBeforeFees: subtotal,
          totalCostGuest,
          totalPayoutHost,
          cancellationPolicy: 'FLEXIBLE',
          paymentStatus: 'CAPTURED',
        },
      });
    }

  console.log('Creating reviews...');
  const bookings = await prisma.booking.findMany({
    where: { status: { in: ['CHECKED_OUT'] } },
  });

  for (let i = 0; i < Math.min(5, bookings.length); i++) {
    const booking = bookings[i];
    const reviewDate = new Date(booking.checkOutDate);
    reviewDate.setDate(reviewDate.getDate() + 5);

    // Guest reviews host
    await prisma.review.create({
      data: {
        bookingId: booking.id,
        authorId: booking.guestId,
        isGuestReview: true,
        targetId: booking.hostId,
        rating: Math.floor(Math.random() * 5) + 1,
        comment: 'Great host! Clean property and excellent communication.',
        isPublished: true,
        publishedAt: reviewDate,
      },
    });

    // Host reviews guest
    await prisma.review.create({
      data: {
        bookingId: booking.id,
        authorId: booking.hostId,
        isGuestReview: false,
        targetId: booking.guestId,
        rating: Math.floor(Math.random() * 5) + 1,
        comment: 'Wonderful guest! Left the property in excellent condition.',
        isPublished: true,
        publishedAt: reviewDate,
      },
    });
  }

  console.log('Creating messages...');
  const messageParticipants = [
    { guest: guests[0], host: hosts[0] },
    { guest: guests[1], host: hosts[1] },
    { guest: guests[2], host: hosts[2] },
  ];

  for (const pair of messageParticipants) {
    const thread = await prisma.messageThread.create({
      data: {
        participants: {
          connect: [{ id: pair.guest.id }, { id: pair.host.id }],
        },
      },
    });

    for (let i = 0; i < 3; i++) {
      const sender = i % 2 === 0 ? pair.guest : pair.host;
      await prisma.message.create({
        data: {
          threadId: thread.id,
          senderId: sender.id,
          content: `Hello! I'm interested in your property. Can you tell me more about ${i + 1}?`,
          readAt: i < 2 ? new Date() : null,
        },
      });
    }

    await prisma.messageThread.update({
      where: { id: thread.id },
      data: { lastMessageAt: new Date() },
    });
  }

  console.log('✅ Database seeded successfully!');
  console.log('\n📝 Test Credentials:');
  console.log('Admin:', { email: 'admin@bookingapp.com', password: 'Admin@123456' });
  console.log('Host 1:', { email: 'host1@bookingapp.com', password: 'Host@123456' });
  console.log('Guest 1:', { email: 'guest1@bookingapp.com', password: 'Guest@123456' });
}

main()
  .catch(error => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });