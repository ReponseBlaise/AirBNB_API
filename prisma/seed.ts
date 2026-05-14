import 'dotenv/config';
import bcrypt from 'bcrypt';
import prisma from '../src/config/prisma.js';

type UserSeed = {
  name: string;
  email: string;
  username: string;
  phone: string;
  role: 'ADMIN' | 'HOST' | 'GUEST';
  password: string;
};

const users: UserSeed[] = [
  {
    name: 'Admin User',
    email: 'admin@bookingapp.com',
    username: 'admin',
    phone: '+15550000001',
    role: 'ADMIN',
    password: 'Admin@123456',
  },
  {
    name: 'Host One',
    email: 'host1@bookingapp.com',
    username: 'hostone',
    phone: '+15550000002',
    role: 'HOST',
    password: 'Host@123456',
  },
  {
    name: 'Host Two',
    email: 'host2@bookingapp.com',
    username: 'hosttwo',
    phone: '+15550000003',
    role: 'HOST',
    password: 'Host@123456',
  },
  {
    name: 'Guest One',
    email: 'guest1@bookingapp.com',
    username: 'guestone',
    phone: '+15550000004',
    role: 'GUEST',
    password: 'Guest@123456',
  },
  {
    name: 'Guest Two',
    email: 'guest2@bookingapp.com',
    username: 'guesttwo',
    phone: '+15550000005',
    role: 'GUEST',
    password: 'Guest@123456',
  },
  {
    name: 'Guest Three',
    email: 'guest3@bookingapp.com',
    username: 'guestthree',
    phone: '+15550000006',
    role: 'GUEST',
    password: 'Guest@123456',
  },
];

async function main() {
  console.log('Seeding database with test data...');

  await prisma.review.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.listingPhoto.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.user.deleteMany();

  const createdUsers = new Map<string, Awaited<ReturnType<typeof prisma.user.create>>>();

  for (const user of users) {
    const createdUser = await prisma.user.create({
      data: {
        name: user.name,
        email: user.email,
        username: user.username,
        phone: user.phone,
        role: user.role,
        password: await bcrypt.hash(user.password, 10),
        avatar: null,
        avatarPublicId: null,
      },
    });

    createdUsers.set(user.username, createdUser);
  }

  const hostOne = createdUsers.get('hostone');
  const hostTwo = createdUsers.get('hosttwo');
  const guestOne = createdUsers.get('guestone');
  const guestTwo = createdUsers.get('guesttwo');
  const guestThree = createdUsers.get('guestthree');

  if (!hostOne || !hostTwo || !guestOne || !guestTwo || !guestThree) {
    throw new Error('Failed to create seed users');
  }

  const listings = [
    {
      title: 'Downtown Loft',
      description: 'A bright downtown loft with fast WiFi, walkable dining, and an easy transit connection.',
      pricePerNight: 145,
      guest: 4,
      location: 'New York, USA',
      type: 'APARTMENT' as const,
      amenities: ['WiFi', 'Air conditioning', 'Kitchen', 'Workspace'],
      hostId: hostOne.id,
    },
    {
      title: 'Lakeview Family House',
      description: 'A spacious family house overlooking the lake, with a quiet backyard and room for everyone.',
      pricePerNight: 220,
      guest: 6,
      location: 'Chicago, USA',
      type: 'HOUSE' as const,
      amenities: ['Parking', 'Washer', 'Dryer', 'Backyard'],
      hostId: hostOne.id,
    },
    {
      title: 'Mountain Escape Cabin',
      description: 'A cozy mountain cabin with a fireplace, hot tub, and peaceful views for a reset getaway.',
      pricePerNight: 175,
      guest: 5,
      location: 'Denver, USA',
      type: 'CABIN' as const,
      amenities: ['Fireplace', 'Hot tub', 'Mountain view', 'Kitchen'],
      hostId: hostTwo.id,
    },
    {
      title: 'Ocean View Villa',
      description: 'A modern villa with panoramic ocean views, a private patio, and plenty of space to relax.',
      pricePerNight: 380,
      guest: 8,
      location: 'San Diego, USA',
      type: 'VILLA' as const,
      amenities: ['Pool', 'Ocean view', 'Private patio', 'Parking'],
      hostId: hostTwo.id,
    },
    {
      title: 'Brooklyn Brownstone Suite',
      description: 'An elegant brownstone suite with character details, a dedicated workspace, and city convenience.',
      pricePerNight: 190,
      guest: 3,
      location: 'Brooklyn, New York, USA',
      type: 'APARTMENT' as const,
      amenities: ['WiFi', 'Washer', 'Dedicated workspace', 'Balcony'],
      hostId: hostOne.id,
    },
    {
      title: 'Countryside Orchard House',
      description: 'A calm countryside house near orchards and open space, ideal for longer stays with family.',
      pricePerNight: 160,
      guest: 5,
      location: 'Austin, Texas, USA',
      type: 'HOUSE' as const,
      amenities: ['Garden', 'Fire pit', 'Free parking', 'Kitchen'],
      hostId: hostTwo.id,
    },
    {
      title: 'Coastal Beach Bungalow',
      description: 'A charming beachfront bungalow with sandy views, direct beach access, and a relaxed atmosphere.',
      pricePerNight: 250,
      guest: 4,
      location: 'Malibu, California, USA',
      type: 'HOUSE' as const,
      amenities: ['Beach access', 'Outdoor shower', 'Deck', 'Parking'],
      hostId: hostOne.id,
    },
  ];

  const createdListings = [];

  for (const listing of listings) {
    createdListings.push(
      await prisma.listing.create({
        data: listing,
      })
    );
  }

  // Real placeholder images from picsum.photos
  const placeholderImages = [
    'https://picsum.photos/seed/listing1/800/600.jpg',
    'https://picsum.photos/seed/listing2/800/600.jpg',
    'https://picsum.photos/seed/listing3/800/600.jpg',
    'https://picsum.photos/seed/listing4/800/600.jpg',
    'https://picsum.photos/seed/listing5/800/600.jpg',
    'https://picsum.photos/seed/listing6/800/600.jpg',
    'https://picsum.photos/seed/listing7/800/600.jpg',
  ];

  for (const [index, listing] of createdListings.entries()) {
    await prisma.listingPhoto.createMany({
      data: [
        {
          listingId: listing.id,
          url: placeholderImages[index] || `https://picsum.photos/seed/listing${index + 1}/800/600.jpg`,
          publicId: `seed-listing-${index + 1}-1`,
        },
        {
          listingId: listing.id,
          url: `https://picsum.photos/seed/listing${index + 1}b/800/600.jpg`,
          publicId: `seed-listing-${index + 1}-2`,
        },
      ],
    });
  }

  const today = new Date();
  const bookingSeeds = [
    {
      listing: createdListings[0],
      guest: guestOne,
      startOffsetDays: 7,
      nights: 3,
      status: 'CONFIRMED' as const,
      priceMultiplier: 1,
    },
    {
      listing: createdListings[1],
      guest: guestTwo,
      startOffsetDays: 12,
      nights: 4,
      status: 'PENDING' as const,
      priceMultiplier: 1,
    },
    {
      listing: createdListings[2],
      guest: guestThree,
      startOffsetDays: 18,
      nights: 2,
      status: 'CANCELLED' as const,
      priceMultiplier: 1,
    },
  ];

  const createdBookings = [];

  for (const bookingSeed of bookingSeeds) {
    const checkIn = new Date(today);
    checkIn.setDate(checkIn.getDate() + bookingSeed.startOffsetDays);
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + bookingSeed.nights);

    createdBookings.push(
      await prisma.booking.create({
        data: {
          listingId: bookingSeed.listing.id,
          guestId: bookingSeed.guest.id,
          checkIn,
          checkOut,
          totalPrice: bookingSeed.listing.pricePerNight * bookingSeed.nights * bookingSeed.priceMultiplier,
          status: bookingSeed.status,
        },
      })
    );
  }

  await prisma.review.createMany({
    data: [
      {
        listingId: createdListings[0].id,
        userId: guestOne.id,
        rating: 5,
        comment: 'Clean place, smooth check-in, and exactly as described.',
      },
      {
        listingId: createdListings[1].id,
        userId: guestTwo.id,
        rating: 4,
        comment: 'Great location and comfortable stay.',
      },
      {
        listingId: createdListings[2].id,
        userId: guestThree.id,
        rating: 5,
        comment: 'Quiet cabin with an excellent view.',
      },
    ],
  });

  console.log(
    `Seed complete: ${createdUsers.size} users, ${createdListings.length} listings, ${createdBookings.length} bookings, 3 reviews.`
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });