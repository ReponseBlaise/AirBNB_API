#!/usr/bin/env node

/**
 * Setup script to create the NodeBackend database
 * Run with: node scripts/setup-db.js
 */

const { Client } = require('pg');
require('dotenv/config');

async function setupDatabase() {
  console.log('🔧 Setting up PostgreSQL database...\n');

  // Connect to the default postgres database first
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Mama@123',
    port: process.env.DB_PORT || 5432,
    database: 'postgres', // Connect to default postgres DB first
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL server');

    // Try to create the database
    try {
      await client.query('CREATE DATABASE NodeBackend;');
      console.log('✅ Database "NodeBackend" created successfully!\n');
    } catch (err) {
      if (err.code === '42P04') {
        console.log('ℹ️  Database "NodeBackend" already exists\n');
      } else {
        throw err;
      }
    }

    console.log('📋 Next steps:');
    console.log('1. Run: npx prisma db push');
    console.log('2. Run: npm run dev');
    console.log('3. Open: npx prisma studio (to add sample data)\n');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupDatabase();
