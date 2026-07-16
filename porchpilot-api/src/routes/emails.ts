import type { FastifyInstance } from 'fastify';
import type { FastifyRequest } from 'fastify';
import { syncEmails as syncGmail } from '../services/gmail.js';
import { syncEmails as syncOutlook } from '../services/outlook.js';
import { query } from '../db/pool.js';

export async function emailRoutes(app: FastifyInstance) {
  /**
   * POST /api/emails/sync
   * Triggers a sync of the user's connected inbox.
   * Supports both Google and Microsoft providers.
   * Requires a valid JWT token in the Authorization header.
   * Optional query param: provider (google|microsoft) — syncs first of that type if omitted.
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

      const { provider } = request.query as { provider?: string };
      const validProviders = ['google', 'microsoft'];

      // If provider specified, use it; otherwise find first active account
      let providerFilter = '';
      const params: unknown[] = [decoded.userId];

      if (provider && validProviders.includes(provider)) {
        providerFilter = ` AND provider = $2`;
        params.push(provider);
      }

      const { rows: accounts } = await query(
        `SELECT id, provider FROM email_accounts
         WHERE user_id = $1 AND is_active = true${providerFilter}
         ORDER BY last_synced_at ASC NULLS FIRST
         LIMIT 1`,
        params,
      );

      if (accounts.length === 0) {
        const msg = provider
          ? `No connected ${provider} account found. Please connect via OAuth first.`
          : 'No connected email account found. Please connect via OAuth first.';
        return reply.status(400).send({
          success: false,
          error: msg,
        });
      }

      const emailAccountId = accounts[0].id;
      const accountProvider = accounts[0].provider as string;

      // Route to the correct sync service
      let result: { processed: number; ordersCreated: number; errors: string[] };
      if (accountProvider === 'google') {
        result = await syncGmail(emailAccountId, decoded.userId);
      } else {
        result = await syncOutlook(emailAccountId, decoded.userId);
      }

      reply.send({
        success: true,
        data: {
          provider: accountProvider,
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