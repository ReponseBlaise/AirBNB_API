import 'dotenv/config';
import prisma from '../src/config/prisma';
import bcrypt from 'bcrypt';

async function main() {
  console.log('🌱 Seeding database with test data...');

  // Clear existing data
  console.log('Cleaning database...');
  await prisma.message.deleteMany();
  await prisma.messageThread.deleteMany();
  await prisma.review.deleteMany();
  await prisma.dispute.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.listingAvailability.deleteMany();
  await prisma.listingPhoto.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.session.deleteMany();
  await prisma.adminAction.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();

  console.log('Creating users...');
  // Create admin user
  const admin = await prisma.user.create({
    data: {
      email: 'admin@bookingapp.com',
      password: await bcrypt.hash('Admin@123456', 10),
      name: 'Admin User',
      role: 'ADMIN',
      emailVerified: true,
      profile: {
        create: {
          bio: 'Platform administrator',
          languages: ['English'],
        },
      },
    },
  });

  // Create host users
  const hosts = [];
  for (let i = 1; i <= 5; i++) {
    const host = await prisma.user.create({
      data: {
        email: `host${i}@bookingapp.com`,
        passwordHash: await bcrypt.hash('Host@123456', 10),
        name: `Host ${i}`,
        role: 'HOST',
        status: 'ACTIVE',
        emailVerified: true,
        preferredRole: 'HOST',
        profile: {
          create: {
            bio: `Professional host with ${i} years experience`,
            languages: ['English'],
            phone: `+1234567890${i}`,
          },
        },
      },
    });
    hosts.push(host);
  }

  // Create guest users
  const guests = [];
  for (let i = 1; i <= 10; i++) {
    const guest = await prisma.user.create({
      data: {
        email: `guest${i}@bookingapp.com`,
        passwordHash: await bcrypt.hash('Guest@123456', 10),
        name: `Guest ${i}`,
        role: 'GUEST',
        status: 'ACTIVE',
        emailVerified: true,
        preferredRole: 'GUEST',
        profile: {
          create: {
            bio: `Traveler interested in exploring new places`,
            languages: ['English'],
          },
        },
      },
    });
    guests.push(guest);
  }

  console.log('Creating listings...');
  const listings = [];
  const listingData = [
    {
      title: 'Luxury Downtown Apartment',
      description: 'Beautiful modern apartment in the heart of the city with stunning views',
      address: '123 Main St, Downtown',
      city: 'New York',
      country: 'USA',
      type: 'APARTMENT',
      bedrooms: 2,
      bathrooms: 2,
      maxGuests: 4,
      basePricePerNight: 150,
    },
    {
      title: 'Cozy Beach House',
      description: 'Peaceful beachfront cottage perfect for relaxation and sunsets',
      address: '456 Ocean Ave, Beachside',
      city: 'Los Angeles',
      country: 'USA',
      type: 'HOUSE',
      bedrooms: 3,
      bathrooms: 2,
      maxGuests: 6,
      basePricePerNight: 200,
    },
    {
      title: 'Mountain Cabin Retreat',
      description: 'Private cabin nestled in mountains with hiking trails nearby',
      address: '789 Pine Road, Mountains',
      city: 'Denver',
      country: 'USA',
      type: 'CABIN',
      bedrooms: 2,
      bathrooms: 1,
      maxGuests: 4,
      basePricePerNight: 120,
    },
    {
      title: 'Modern Loft with City Views',
      description: 'Industrial-style loft with floor-to-ceiling windows overlooking the city',
      address: '321 Industrial Blvd, Arts District',
      city: 'Chicago',
      country: 'USA',
      type: 'LOFT',
      bedrooms: 1,
      bathrooms: 1,
      maxGuests: 2,
      basePricePerNight: 100,
    },
    {
      title: 'Spacious Garden Villa',
      description: 'Elegant villa with private garden, pool, and guest house',
      address: '654 Garden Lane, Suburbia',
      city: 'Miami',
      country: 'USA',
      type: 'VILLA',
      bedrooms: 4,
      bathrooms: 3,
      maxGuests: 8,
      basePricePerNight: 250,
    },
  ];

  for (let i = 0; i < listingData.length; i++) {
    const listing = await prisma.listing.create({
      data: {
        ...listingData[i],
        hostId: hosts[i % hosts.length].id,
        status: 'ACTIVE',
        instantBook: i % 2 === 0,
        cleaningFee: 25,
        serviceFeeGuest: 0.15,
        serviceFeeHost: 0.03,
        cancellationPolicy: ['FLEXIBLE', 'MODERATE', 'STRICT', 'NON_REFUNDABLE'][i % 4] as any,
        publishedAt: new Date(),
      },
    });
    listings.push(listing);
  }

  console.log('Creating availability for listings...');
  for (const listing of listings) {
    const today = new Date();
    for (let j = 0; j < 365; j++) {
      const date = new Date(today);
      date.setDate(date.getDate() + j);

      // Random 70% availability
      const isAvailable = Math.random() > 0.3;

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
  for (let i = 0; i < 10; i++) {
    const guest = guests[i % guests.length];
    const listing = listings[i % listings.length];

    const checkIn = new Date();
    checkIn.setDate(checkIn.getDate() + Math.floor(Math.random() * 30) + 5);

    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + Math.floor(Math.random() * 7) + 2);

    const numberOfNights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    const nightlyRate = listing.basePricePerNight;
    const cleaningFee = listing.cleaningFee || 0;
    const subtotal = nightlyRate * numberOfNights;
    const serviceFeeGuest = subtotal * (listing.serviceFeeGuest || 0.15);
    const tax = (subtotal + serviceFeeGuest) * 0.1;
    const totalCostGuest = subtotal + cleaningFee + serviceFeeGuest + tax;
    const totalPayoutHost = subtotal - subtotal * (listing.serviceFeeHost || 0.03);

    const booking = await prisma.booking.create({
      data: {
        listingId: listing.id,
        guestId: guest.id,
        hostId: listing.hostId,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        numberOfGuests: Math.floor(Math.random() * listing.maxGuests) + 1,
        numberOfNights,
        status: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED'][i % 4] as any,
        instantBook: Math.random() > 0.5,
        nightlyRate,
        cleaningFee,
        serviceFeeGuest,
        tax,
        subtotalBeforeFees: subtotal,
        totalCostGuest,
        totalPayoutHost,
        cancellationPolicy: listing.cancellationPolicy,
        paymentStatus: ['AUTHORIZED', 'CAPTURED', 'REFUNDED'][i % 3] as any,
        checkedInAt: i % 3 !== 0 ? new Date(checkIn.getTime() + 60 * 60 * 1000) : null,
        checkedOutAt: i % 4 === 0 ? new Date(checkOut.getTime() + 60 * 60 * 1000) : null,
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