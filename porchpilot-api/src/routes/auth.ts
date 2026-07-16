import type { FastifyInstance } from 'fastify';
import type { FastifyRequest } from 'fastify';
import { getAuthUrl, handleCallback } from '../services/gmail.js';

export async function authRoutes(app: FastifyInstance) {
  // ─── Google OAuth ─────────────────────────────────────────────────────

  /**
   * GET /api/auth/google/url
   * Generates the Google OAuth consent URL. The client must provide their
   * user ID as a query parameter so we can associate the OAuth account.
   */
  app.get('/google/url', async (request: FastifyRequest, reply) => {
    const { userId } = request.query as { userId?: string };

    if (!userId) {
      return reply.status(400).send({
        success: false,
        error: 'Missing required query parameter: userId',
      });
    }

    const url = getAuthUrl(userId);

    reply.send({
      success: true,
      data: { url },
    });
  });

  /**
   * GET /api/auth/google/callback
   * Handles the Google OAuth callback. Exchanges the auth code for tokens,
   * stores them, and returns a JWT for the session.
   */
  app.get('/google/callback', async (request: FastifyRequest, reply) => {
    const { code, state } = request.query as { code?: string; state?: string };

    if (!code) {
      return reply.status(400).send({
        success: false,
        error: 'Missing authorization code',
      });
    }

    if (!state) {
      return reply.status(400).send({
        success: false,
        error: 'Missing state parameter (user ID)',
      });
    }

    try {
      const account = await handleCallback(code, state);

      // Generate a JWT for the user session
      const token = app.jwt.sign(
        {
          userId: state,
          email: account.email,
          provider: 'google',
        },
        { expiresIn: '7d' },
      );

      reply.send({
        success: true,
        data: {
          token,
          email: account.email,
          hasRefreshToken: !!account.refreshToken,
        },
      });
    } catch (err) {
      request.log.error(err);
      reply.status(500).send({
        success: false,
        error: 'OAuth callback failed. Please try again.',
      });
    }
  });

  // ─── Microsoft OAuth ──────────────────────────────────────────────────
  app.get('/microsoft/url', async (_request, reply) => {
    reply.send({
      success: true,
      message: 'Microsoft OAuth URL endpoint — not yet implemented',
    });
  });

  app.get('/microsoft/callback', async (_request, reply) => {
    reply.send({
      success: true,
      message: 'Microsoft OAuth callback — not yet implemented',
    });
  });

  // ─── Session / Token Refresh ──────────────────────────────────────────
  app.post('/refresh', async (request: FastifyRequest, reply) => {
    try {
      // Verify the existing token
      const decoded = request.server.jwt.verify<{ userId: string; email: string }>(
        request.headers.authorization?.replace('Bearer ', '') ?? '',
      );

      // Issue a new token
      const token = request.server.jwt.sign(
        { userId: decoded.userId, email: decoded.email },
        { expiresIn: '7d' },
      );

      reply.send({
        success: true,
        data: { token },
      });
    } catch {
      reply.status(401).send({
        success: false,
        error: 'Invalid or expired token',
      });
    }
  });
}