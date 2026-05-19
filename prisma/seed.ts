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
    name: 'Aline Mukamana',
    email: 'admin@boking.rw',
    username: 'admin_rwanda',
    phone: '+250788000001',
    role: 'ADMIN',
    password: 'Admin@123456',
  },
  {
    name: 'Immaculée Mukamana',
    email: 'ops-admin@boking.rw',
    username: 'adminops',
    phone: '+250788000008',
    role: 'ADMIN',
    password: 'Admin@123456',
  },
  {
    name: 'Emmanuel Nshimiyimana',
    email: 'host1@boking.rw',
    username: 'hostkigali',
    phone: '+250788000002',
    role: 'HOST',
    password: 'Host@123456',
  },
  {
    name: 'Claire Uwase',
    email: 'host2@boking.rw',
    username: 'hostrubavu',
    phone: '+250788000003',
    role: 'HOST',
    password: 'Host@123456',
  },
  {
    name: 'Jean Bosco Harerimana',
    email: 'guest1@boking.rw',
    username: 'guestkigali',
    phone: '+250788000004',
    role: 'GUEST',
    password: 'Guest@123456',
  },
  {
    name: 'Odette Mukandayisenga',
    email: 'guest2@boking.rw',
    username: 'guesthuye',
    phone: '+250788000005',
    role: 'GUEST',
    password: 'Guest@123456',
  },
  {
    name: 'Patrick Bizimana',
    email: 'guest3@boking.rw',
    username: 'guestmusanze',
    phone: '+250788000006',
    role: 'GUEST',
    password: 'Guest@123456',
  },
  {
    name: 'Sandrine Uwineza',
    email: 'guest4@boking.rw',
    username: 'guestkibuye',
    phone: '+250788000007',
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

  const hostOne = createdUsers.get('hostkigali');
  const hostTwo = createdUsers.get('hostrubavu');
  const guestOne = createdUsers.get('guestkigali');
  const guestTwo = createdUsers.get('guesthuye');
  const guestThree = createdUsers.get('guestmusanze');
  const guestFour = createdUsers.get('guestkibuye');

  if (!hostOne || !hostTwo || !guestOne || !guestTwo || !guestThree || !guestFour) {
    throw new Error('Failed to create seed users');
  }

  const listings = [
    {
      title: 'Kigali City Loft',
      description: 'A bright city loft in Kigali with fast WiFi, a quiet workspace, and easy access to dining in Kimihurura and Kacyiru.',
      pricePerNight: 120,
      guest: 4,
      location: 'Kigali, Rwanda',
      type: 'APARTMENT' as const,
      amenities: ['WiFi', 'Air conditioning', 'Kitchen', 'Workspace'],
      hostId: hostOne.id,
      status: 'ACTIVE' as const,
    },
    {
      title: 'Lake Kivu Family House',
      description: 'A spacious family house overlooking Lake Kivu in Rubavu with a quiet backyard, warm interiors, and room for a weekend stay.',
      pricePerNight: 185,
      guest: 6,
      location: 'Rubavu, Rwanda',
      type: 'HOUSE' as const,
      amenities: ['Parking', 'Washer', 'Dryer', 'Backyard'],
      hostId: hostOne.id,
      status: 'ACTIVE' as const,
    },
    {
      title: 'Musanze Mountain Cabin',
      description: 'A cozy cabin near Volcanoes National Park in Musanze with a fireplace, tea terrace, and peaceful mountain views.',
      pricePerNight: 160,
      guest: 5,
      location: 'Musanze, Rwanda',
      type: 'CABIN' as const,
      amenities: ['Fireplace', 'Hot tub', 'Mountain view', 'Kitchen'],
      hostId: hostTwo.id,
      status: 'PENDING' as const,
    },
    {
      title: 'Rubavu Hills Villa',
      description: 'A modern villa above the Lake Kivu shoreline in Rubavu with lake views, a private patio, and space for a relaxed family stay.',
      pricePerNight: 290,
      guest: 8,
      location: 'Rubavu, Rwanda',
      type: 'VILLA' as const,
      amenities: ['Pool', 'Ocean view', 'Private patio', 'Parking'],
      hostId: hostTwo.id,
      status: 'ACTIVE' as const,
    },
    {
      title: 'Huye Heritage Suite',
      description: 'An elegant suite in Huye with heritage character, a dedicated workspace, and easy access to university life around the district.',
      pricePerNight: 145,
      guest: 3,
      location: 'Huye, Rwanda',
      type: 'APARTMENT' as const,
      amenities: ['WiFi', 'Washer', 'Dedicated workspace', 'Balcony'],
      hostId: hostOne.id,
      status: 'REJECTED' as const,
    },
    {
      title: 'Nyamata Orchard House',
      description: 'A calm countryside house in Nyamata near orchards and open fields, ideal for longer stays with family or team retreats.',
      pricePerNight: 135,
      guest: 5,
      location: 'Nyamata, Rwanda',
      type: 'HOUSE' as const,
      amenities: ['Garden', 'Fire pit', 'Free parking', 'Kitchen'],
      hostId: hostTwo.id,
      status: 'ACTIVE' as const,
    },
    {
      title: 'Kibuye Lake Bungalow',
      description: 'A charming lakeside bungalow in Kibuye with sunrise views, direct shoreline access, and a peaceful atmosphere.',
      pricePerNight: 210,
      guest: 4,
      location: 'Kibuye, Rwanda',
      type: 'HOUSE' as const,
      amenities: ['Beach access', 'Outdoor shower', 'Deck', 'Parking'],
      hostId: hostOne.id,
      status: 'ACTIVE' as const,
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
    'https://picsum.photos/seed/rwanda-kigali-loft/800/600.jpg',
    'https://picsum.photos/seed/rwanda-lake-kivu-house/800/600.jpg',
    'https://picsum.photos/seed/rwanda-musanze-cabin/800/600.jpg',
    'https://picsum.photos/seed/rwanda-rubavu-villa/800/600.jpg',
    'https://picsum.photos/seed/rwanda-huye-suite/800/600.jpg',
    'https://picsum.photos/seed/rwanda-nyamata-house/800/600.jpg',
    'https://picsum.photos/seed/rwanda-kibuye-bungalow/800/600.jpg',
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
    {
      listing: createdListings[3],
      guest: guestFour,
      startOffsetDays: 24,
      nights: 5,
      status: 'CONFIRMED' as const,
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
      {
        listingId: createdListings[3].id,
        userId: guestFour.id,
        rating: 5,
        comment: 'Beautiful lake views and a very peaceful stay.',
      },
    ],
  });

  console.log(
    `Seed complete: ${createdUsers.size} users, ${createdListings.length} listings, ${createdBookings.length} bookings, 4 reviews.`
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