import type { FastifyInstance } from 'fastify';
import { pool } from '../db/pool.js';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/', async (_request, reply) => {
    let dbStatus = 'ok';
    try {
      await pool.query('SELECT 1');
    } catch {
      dbStatus = 'error';
    }

    reply.send({
      success: true,
      data: {
        status: 'ok',
        version: '0.1.0',
        timestamp: new Date().toISOString(),
        database: dbStatus,
      },
    });
  });
}