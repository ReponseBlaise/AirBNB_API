import request from 'supertest';
import express, { Express } from 'express';
import authRouter from '../src/routes/auth.routes';
import { prisma } from '../src/config/prisma';
import bcrypt from 'bcryptjs';

let app: Express;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use('/api/v1/auth', authRouter);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Authentication Endpoints', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'Test@123456',
    name: 'Test User',
  };

  beforeEach(async () => {
    // Clean up test user
    await prisma.user.deleteMany({
      where: { email: testUser.email },
    });
  });

  describe('POST /register', () => {
    it('should register a new user with valid credentials', async () => {
      const response = await request(app).post('/api/v1/auth/register').send(testUser);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.status).toBe('DRAFT');
    });

    it('should reject registration with weak password', async () => {
      const response = await request(app).post('/api/v1/auth/register').send({
        email: testUser.email,
        password: 'weak',
        name: testUser.name,
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject registration with duplicate email', async () => {
      // Create first user
      await request(app).post('/api/v1/auth/register').send(testUser);

      // Try to create duplicate
      const response = await request(app).post('/api/v1/auth/register').send(testUser);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /login', () => {
    beforeEach(async () => {
      // Create verified user
      await prisma.user.create({
        data: {
          email: testUser.email,
          passwordHash: await bcrypt.hash(testUser.password, 10),
          name: testUser.name,
          status: 'ACTIVE',
          emailVerified: true,
          profile: { create: {} },
        },
      });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app).post('/api/v1/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should reject login with wrong password', async () => {
      const response = await request(app).post('/api/v1/auth/login').send({
        email: testUser.email,
        password: 'WrongPassword@123',
      });

      expect(response.status).toBe(401);
    });

    it('should reject login for unverified email', async () => {
      await prisma.user.update({
        where: { email: testUser.email },
        data: { emailVerified: false },
      });

      const response = await request(app).post('/api/v1/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });

      expect(response.status).toBe(403);
    });
  });
});
