import type { FastifyInstance } from 'fastify';
import type { FastifyRequest } from 'fastify';
import { syncEmails } from '../services/gmail.js';
import { query } from '../db/pool.js';

export async function emailRoutes(app: FastifyInstance) {
  /**
   * POST /api/emails/sync
   * Triggers a sync of the user's connected Gmail inbox.
   * Requires a valid JWT token in the Authorization header.
   */
  app.post('/sync', async (request: FastifyRequest, reply) => {
    try {
      // Verify JWT
      const authHeader = request.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({
          success: false,
          error: 'Missing or invalid authorization header',
        });
      }

      const decoded = app.jwt.verify<{ userId: string }>(
        authHeader.substring(7),
      );

      // Find the user's active Google email account
      const { rows: accounts } = await query(
        `SELECT id FROM email_accounts
         WHERE user_id = $1 AND provider = 'google' AND is_active = true
         LIMIT 1`,
        [decoded.userId],
      );

      if (accounts.length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'No connected Gmail account found. Please connect via OAuth first.',
        });
      }

      const emailAccountId = accounts[0].id;

      // Run the sync
      const result = await syncEmails(emailAccountId, decoded.userId);

      reply.send({
        success: true,
        data: {
          processed: result.processed,
          ordersCreated: result.ordersCreated,
          errors: result.errors.length > 0 ? result.errors : undefined,
        },
      });
    } catch (err) {
      request.log.error(err);
      const message = err instanceof Error ? err.message : 'Sync failed';
      reply.status(500).send({
        success: false,
        error: message,
      });
    }
  });

  /**
   * GET /api/emails
   * List the user's synced orders.
   */
  app.get('/', async (request: FastifyRequest, reply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({
          success: false,
          error: 'Missing or invalid authorization header',
        });
      }

      const decoded = app.jwt.verify<{ userId: string }>(
        authHeader.substring(7),
      );

      const { rows: orders } = await query(
        `SELECT o.id, o.retailer, o.retailer_order_id, o.order_date,
                o.estimated_delivery_start, o.estimated_delivery_end,
                o.status, o.total_amount, o.currency,
                o.raw_email_subject,
                s.tracking_number, s.carrier, s.estimated_delivery_date,
                s.status as shipment_status
         FROM orders o
         LEFT JOIN LATERAL (
           SELECT tracking_number, carrier, estimated_delivery_date, status
           FROM shipments
           WHERE order_id = o.id
           ORDER BY created_at DESC
           LIMIT 1
         ) s ON true
         WHERE o.user_id = $1
         ORDER BY o.order_date DESC
         LIMIT 50`,
        [decoded.userId],
      );

      reply.send({
        success: true,
        data: orders,
      });
    } catch (err) {
      request.log.error(err);
      reply.status(500).send({
        success: false,
        error: 'Failed to fetch orders',
      });
    }
  });
}