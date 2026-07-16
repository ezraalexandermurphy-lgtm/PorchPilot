import type { FastifyInstance } from 'fastify';

export async function authRoutes(app: FastifyInstance) {
  // ─── Google OAuth ─────────────────────────────────────────────────────
  app.get('/google/url', async (_request, reply) => {
    // Placeholder — will be implemented with Google OAuth2
    reply.send({
      success: true,
      message: 'Google OAuth URL endpoint — not yet implemented',
    });
  });

  app.get('/google/callback', async (_request, reply) => {
    reply.send({
      success: true,
      message: 'Google OAuth callback — not yet implemented',
    });
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
  app.post('/refresh', async (_request, reply) => {
    reply.send({
      success: true,
      message: 'Token refresh endpoint — not yet implemented',
    });
  });
}