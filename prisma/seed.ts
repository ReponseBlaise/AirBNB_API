import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import pg from 'pg';

const { Pool } = pg;

const connectionString = process.env['DATABASE_URL'];

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding with UUID data...');

  await prisma.review.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.listingPhoto.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash('password123', 10);

  const alice = await prisma.user.upsert({
    where: { email: 'ishimwe.alice@gmail.com' },
    update: {},
    create: {
      name: 'Ishimwe Alice',
      email: 'ishimwe.alice@gmail.com',
      username: 'ishimwe_alice',
      phone: '0788000001',
      password: hashedPassword,
      role: 'HOST',
    },
  });

  const brian = await prisma.user.upsert({
    where: { email: 'habimana.jeanp@gmail.com' },
    update: {},
    create: {
      name: 'Habimana Jean Paul',
      email: 'habimana.jeanp@gmail.com',
      username: 'habimana_jeanpaul',
      phone: '0788000002',
      password: hashedPassword,
      role: 'HOST',
    },
  });

  const chloe = await prisma.user.upsert({
    where: { email: 'uwase.chantal@gmail.com' },
    update: {},
    create: {
      name: 'Uwase Chantal',
      email: 'uwase.chantal@gmail.com',
      username: 'uwase_chantal',
      phone: '0788000101',
      password: hashedPassword,
      role: 'GUEST',
    },
  });

  const david = await prisma.user.upsert({
    where: { email: 'niyomugabo.patrick@gmail.com' },
    update: {},
    create: {
      name: 'Niyomugabo Patrick',
      email: 'niyomugabo.patrick@gmail.com',
      username: 'niyomugabo_patrick',
      phone: '0788000102',
      password: hashedPassword,
      role: 'GUEST',
    },
  });

  const emma = await prisma.user.upsert({
    where: { email: 'umutoni.aline@gmail.com' },
    update: {},
    create: {
      name: 'Umutoni Aline',
      email: 'umutoni.aline@gmail.com',
      username: 'umutoni_aline',
      phone: '0788000103',
      password: hashedPassword,
      role: 'GUEST',
    },
  });

  await prisma.listing.createMany({
    data: [
      {
        title: 'Kigali Heights Apartment',
        description: 'Bright apartment in Kigali near restaurants and transit.',
        location: 'Kigali',
        pricePerNight: 75,
        guests: 2,
        type: 'APARTMENT',
        amenities: ['WiFi', 'Kitchen', 'Air conditioning'],
        hostId: alice.id,
      },
      {
        title: 'Nyamirambo Family House',
        description: 'Quiet family house with a private garden and parking in Kigali.',
        location: 'Kigali',
        pricePerNight: 110,
        guests: 4,
        type: 'HOUSE',
        amenities: ['WiFi', 'Parking', 'Garden'],
        hostId: brian.id,
      },
      {
        title: 'Lake Kivu Villa',
        description: 'Luxury villa with Lake Kivu views and a pool.',
        location: 'Rubavu',
        pricePerNight: 240,
        guests: 6,
        type: 'VILLA',
        amenities: ['Pool', 'WiFi', 'Kitchen', 'Balcony'],
        hostId: alice.id,
      },
      {
        title: 'Volcano View Cabin',
        description: 'Cozy cabin near the Volcanoes National Park with fresh air.',
        location: 'Musanze',
        pricePerNight: 95,
        guests: 3,
        type: 'CABIN',
        amenities: ['Fireplace', 'WiFi', 'Parking'],
        hostId: brian.id,
      },
    ],
    skipDuplicates: true,
  });

  const listings = await prisma.listing.findMany({
    where: {
      title: {
        in: ['Kigali Heights Apartment', 'Nyamirambo Family House', 'Lake Kivu Villa', 'Volcano View Cabin'],
      },
    },
    orderBy: { id: 'asc' },
  });

  const [skylineApartment, gardenHouse, lakeviewVilla, forestCabin] = listings;

  if (!skylineApartment || !gardenHouse || !lakeviewVilla || !forestCabin) {
    throw new Error('Seed listings were not created correctly');
  }

  const bookingOneCheckIn = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);
  const bookingOneCheckOut = new Date(Date.now() + 1000 * 60 * 60 * 24 * 17);
  const bookingTwoCheckIn = new Date(Date.now() + 1000 * 60 * 60 * 24 * 21);
  const bookingTwoCheckOut = new Date(Date.now() + 1000 * 60 * 60 * 24 * 24);
  const bookingThreeCheckIn = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
  const bookingThreeCheckOut = new Date(Date.now() + 1000 * 60 * 60 * 24 * 34);

  const nights = (checkIn: Date, checkOut: Date) =>
    Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

  await prisma.booking.create({
    data: {
      guestId: chloe.id,
      listingId: skylineApartment.id,
      checkIn: bookingOneCheckIn,
      checkOut: bookingOneCheckOut,
      totalPrice: nights(bookingOneCheckIn, bookingOneCheckOut) * skylineApartment.pricePerNight,
      status: 'CONFIRMED',
    },
  });

  await prisma.booking.create({
    data: {
      guestId: david.id,
      listingId: gardenHouse.id,
      checkIn: bookingTwoCheckIn,
      checkOut: bookingTwoCheckOut,
      totalPrice: nights(bookingTwoCheckIn, bookingTwoCheckOut) * gardenHouse.pricePerNight,
      status: 'PENDING',
    },
  });

  await prisma.booking.create({
    data: {
      guestId: emma.id,
      listingId: forestCabin.id,
      checkIn: bookingThreeCheckIn,
      checkOut: bookingThreeCheckOut,
      totalPrice: nights(bookingThreeCheckIn, bookingThreeCheckOut) * forestCabin.pricePerNight,
      status: 'CONFIRMED',
    },
  });

  // Create profiles for users
  await prisma.profile.createMany({
    data: [
      {
        userId: alice.id,
        bio: 'Passionate host welcoming travelers to Kigali',
        website: 'https://alice-travels.com',
        country: 'Rwanda',
      },
      {
        userId: brian.id,
        bio: 'Family-oriented host with experience',
        website: null,
        country: 'Rwanda',
      },
      {
        userId: chloe.id,
        bio: 'Adventurous traveler exploring Africa',
        website: null,
        country: 'Rwanda',
      },
      {
        userId: david.id,
        bio: 'Business traveler seeking comfort and WiFi',
        website: null,
        country: 'Rwanda',
      },
      {
        userId: emma.id,
        bio: 'Nature lover and hiking enthusiast',
        website: null,
        country: 'Rwanda',
      },
    ],
    skipDuplicates: true,
  });

  // Create reviews
  await prisma.review.createMany({
    data: [
      {
        userId: chloe.id,
        listingId: skylineApartment.id,
        rating: 5,
        comment: 'Amazing apartment! Clean, modern, and great location near restaurants.',
      },
      {
        userId: david.id,
        listingId: gardenHouse.id,
        rating: 4,
        comment: 'Beautiful house with great amenities. Host was very responsive.',
      },
      {
        userId: emma.id,
        listingId: forestCabin.id,
        rating: 5,
        comment: 'Perfect cabin for a nature retreat. Loved the fireplace and peaceful surroundings.',
      },
      {
        userId: chloe.id,
        listingId: lakeviewVilla.id,
        rating: 5,
        comment: 'Luxury villa exceeded expectations! Pool and lake views were spectacular.',
      },
      {
        userId: david.id,
        listingId: skylineApartment.id,
        rating: 4,
        comment: 'Good apartment. WiFi could be stronger but overall pleasant stay.',
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Seeding complete with 5 users, 4 listings, 3 bookings, 5 profiles, and 5 reviews!');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });