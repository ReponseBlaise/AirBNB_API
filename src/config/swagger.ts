import type { Express, Request, Response } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const port = process.env.PORT || 3000;
const baseUrl = `http://localhost:${port}`;

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Airbnb API',
      version: '1.0.0',
      description: 'Interactive API documentation for the Airbnb clone, including auth, users, listings, bookings, profile, and uploads.',
    },
    servers: [{ url: baseUrl, description: 'Development server' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
});

export function setupSwagger(app: Express) {
  const port = process.env.PORT || 3000;
  const baseUrl = `http://localhost:${port}`;
  
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api-docs.json', (_req: Request, res: Response) => {
    res.json(swaggerSpec);
  });

  console.log(`Swagger docs available at ${baseUrl}/api-docs`);
}