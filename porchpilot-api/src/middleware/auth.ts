import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Placeholder auth middleware.
 * Will verify JWT tokens and attach user info to the request.
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.status(401).send({
      success: false,
      error: 'Missing or invalid authorization header',
    });
    return;
  }

  // TODO: Verify JWT token and attach user to request
  authHeader.substring(7);

  // Placeholder — always passes in dev
  if (process.env.NODE_ENV === 'development') {
    return;
  }

  reply.status(401).send({
    success: false,
    error: 'Invalid token',
  });
}