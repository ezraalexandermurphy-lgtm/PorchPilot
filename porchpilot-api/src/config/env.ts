import dotenv from 'dotenv';
import type { AppConfig } from '../types/index.js';

dotenv.config();

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] ?? defaultValue;
}

export const config: AppConfig = {
  port: parseInt(optionalEnv('PORT', '4000'), 10),
  host: optionalEnv('HOST', '0.0.0.0'),
  nodeEnv: optionalEnv('NODE_ENV', 'development'),
  databaseUrl: requiredEnv('DATABASE_URL'),
  jwtSecret: requiredEnv('JWT_SECRET'),
  jwtExpiresIn: optionalEnv('JWT_EXPIRES_IN', '7d'),
  google: {
    clientId: optionalEnv('GOOGLE_CLIENT_ID', ''),
    clientSecret: optionalEnv('GOOGLE_CLIENT_SECRET', ''),
    redirectUri: optionalEnv('GOOGLE_REDIRECT_URI', ''),
  },
  microsoft: {
    clientId: optionalEnv('MICROSOFT_CLIENT_ID', ''),
    clientSecret: optionalEnv('MICROSOFT_CLIENT_SECRET', ''),
    redirectUri: optionalEnv('MICROSOFT_REDIRECT_URI', ''),
  },
  rateLimit: {
    max: parseInt(optionalEnv('RATE_LIMIT_MAX', '100'), 10),
    windowMs: parseInt(optionalEnv('RATE_LIMIT_WINDOW_MS', '60000'), 10),
  },
};