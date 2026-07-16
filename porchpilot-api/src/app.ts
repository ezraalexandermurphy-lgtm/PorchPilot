import Fastify, { type FastifyError } from 'fastify';
import fjwt from '@fastify/jwt';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { config } from './config/env.js';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { emailRoutes } from './routes/emails.js';

export async function buildApp() {
  const app = Fastify({
    logger: config.nodeEnv !== 'test',
  });

  // ─── Plugins ──────────────────────────────────────────────────────────
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: true,
    credentials: true,
  });
  await app.register(rateLimit, {
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.windowMs,
  });

  // JWT for session tokens
  await app.register(fjwt, {
    secret: config.jwtSecret,
  });

  // ─── Routes ───────────────────────────────────────────────────────────
  await app.register(healthRoutes, { prefix: '/api/health' });
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(emailRoutes, { prefix: '/api/emails' });

  // ─── Global error handler ─────────────────────────────────────────────
  app.setErrorHandler((error: FastifyError, _request, reply) => {
    app.log.error(error);

    const statusCode = error.statusCode ?? 500;
    const message = statusCode === 500 ? 'Internal server error' : error.message;

    reply.status(statusCode).send({
      success: false,
      error: message,
    });
  });

  // ─── 404 handler ──────────────────────────────────────────────────────
  app.setNotFoundHandler((_request, reply) => {
    reply.status(404).send({
      success: false,
      error: 'Route not found',
    });
  });

  return app;
}