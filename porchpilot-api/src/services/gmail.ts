import { google, type gmail_v1 } from 'googleapis';
import { config } from '../config/env.js';
import { query } from '../db/pool.js';
import { emailParser } from './email-parser.js';
import type { ParsedOrder } from './email-parser.js';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

/**
 * Creates an OAuth2 client configured with the app's credentials.
 */
function createOAuth2Client() {
  return new google.auth.OAuth2({
    clientId: config.google.clientId,
    clientSecret: config.google.clientSecret,
    redirectUri: config.google.redirectUri,
  });
}

/**
 * Generate the Google OAuth consent URL for a given user.
 */
export function getAuthUrl(userId: string): string {
  const oauth2Client = createOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state: userId, // Pass user ID through state for callback
  });
}

/**
 * Exchange an authorization code for tokens and store them.
 */
export async function handleCallback(code: string, userId: string): Promise<{
  email: string;
  accessToken: string;
  refreshToken: string | null;
}> {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.access_token) {
    throw new Error('No access token returned from Google');
  }

  // Get user info from Google
  oauth2Client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data: userInfo } = await oauth2.userinfo.get();

  const email = userInfo.email!;

  // Store tokens in the database
  await query(
    `INSERT INTO email_accounts (user_id, provider, email_address, access_token, refresh_token, token_expires_at, scope, is_active)
     VALUES ($1, 'google', $2, $3, $4, $5, $6, true)
     ON CONFLICT (user_id, provider, email_address)
     DO UPDATE SET
       access_token = EXCLUDED.access_token,
       refresh_token = COALESCE(EXCLUDED.refresh_token, email_accounts.refresh_token),
       token_expires_at = EXCLUDED.token_expires_at,
       scope = EXCLUDED.scope,
       is_active = true,
       updated_at = NOW()`,
    [
      userId,
      email,
      tokens.access_token,
      tokens.refresh_token ?? null,
      tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
      tokens.scope ?? null,
    ],
  );

  return {
    email,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? null,
  };
}

/**
 * Get a fresh access token for an email account, refreshing if needed.
 */
export async function getAccessToken(emailAccountId: string): Promise<string> {
  const { rows } = await query(
    `SELECT access_token, refresh_token, token_expires_at
     FROM email_accounts WHERE id = $1 AND is_active = true`,
    [emailAccountId],
  );

  if (rows.length === 0) {
    throw new Error('Email account not found or inactive');
  }

  const account = rows[0];

  // Check if token is expired
  if (account.token_expires_at && new Date(account.token_expires_at) <= new Date()) {
    if (!account.refresh_token) {
      throw new Error('Token expired and no refresh token available');
    }

    // Refresh the token
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: account.refresh_token,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();

    // Update stored tokens
    await query(
      `UPDATE email_accounts
       SET access_token = $1, token_expires_at = $2, updated_at = NOW()
       WHERE id = $3`,
      [
        credentials.access_token!,
        credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : null,
        emailAccountId,
      ],
    );

    return credentials.access_token!;
  }

  return account.access_token;
}

/**
 * Fetch shipping confirmation emails from Gmail and parse them.
 */
export async function syncEmails(emailAccountId: string, userId: string): Promise<{
  processed: number;
  ordersCreated: number;
  errors: string[];
}> {
  const accessToken = await getAccessToken(emailAccountId);
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const result = {
    processed: 0,
    ordersCreated: 0,
    errors: [] as string[],
  };

  // Search for shipping confirmation emails from known retailers
  // We search for common shipping-related terms in the last 30 days
  const queryStr = '("shipped" OR "shipping" OR "on its way" OR "out for delivery" OR "order confirmation") newer_than:30d';

  let messages: gmail_v1.Schema$Message[] = [];
  try {
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      q: queryStr,
      maxResults: 50,
    });
    messages = listResponse.data.messages ?? [];
  } catch (err) {
    throw new Error(`Failed to list Gmail messages: ${err}`);
  }

  for (const msg of messages) {
    try {
      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id!,
        format: 'full',
      });

      const headers = detail.data.payload?.headers ?? [];
      const subject = headers.find((h) => h.name === 'Subject')?.value ?? '';
      const from = headers.find((h) => h.name === 'From')?.value ?? '';
      const snippet = detail.data.snippet ?? '';
      const bodyHtml = extractHtmlBody(detail.data);

      // Try to parse the email as a shipping confirmation
      const parsed = await emailParser.parseOrderEmail(bodyHtml, subject, snippet, from);

      if (parsed) {
        result.processed++;
        await storeParsedOrder(parsed, userId, emailAccountId);
        result.ordersCreated++;
      }
    } catch (err) {
      result.errors.push(`Error processing message ${msg.id}: ${err}`);
    }
  }

  // Update last_synced_at
  await query(
    'UPDATE email_accounts SET last_synced_at = NOW(), updated_at = NOW() WHERE id = $1',
    [emailAccountId],
  );

  return result;
}

/**
 * Extract HTML body from a Gmail message payload.
 */
function extractHtmlBody(message: gmail_v1.Schema$Message): string {
  let html = '';

  function walkParts(parts: gmail_v1.Schema$MessagePart[] | undefined) {
    if (!parts) return;
    for (const part of parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        html += Buffer.from(part.body.data, 'base64url').toString('utf-8');
      }
      if (part.mimeType === 'multipart/alternative' || part.mimeType === 'multipart/mixed') {
        walkParts(part.parts);
      }
    }
  }

  // Check the top-level payload first
  if (message.payload?.mimeType === 'text/html' && message.payload.body?.data) {
    html += Buffer.from(message.payload.body.data, 'base64url').toString('utf-8');
  }

  // Then walk all parts
  walkParts(message.payload?.parts);

  return html;
}

/**
 * Store a parsed order in the database.
 */
async function storeParsedOrder(
  parsed: ParsedOrder,
  userId: string,
  emailAccountId: string,
): Promise<void> {
  // Check for duplicate by retailer order ID
  if (parsed.retailerOrderId) {
    const { rows: existing } = await query(
      `SELECT id FROM orders WHERE retailer_order_id = $1 AND user_id = $2`,
      [parsed.retailerOrderId, userId],
    );
    if (existing.length > 0) {
      return; // Already imported
    }
  }

  // Insert the order
  const { rows: orders } = await query(
    `INSERT INTO orders (user_id, email_account_id, retailer, retailer_order_id,
       order_date, estimated_delivery_start, estimated_delivery_end,
       status, total_amount, currency, shipping_address,
       raw_email_subject, raw_email_snippet)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING id`,
    [
      userId,
      emailAccountId,
      parsed.retailer,
      parsed.retailerOrderId,
      parsed.orderDate.toISOString(),
      parsed.estimatedDeliveryStart?.toISOString() ?? null,
      parsed.estimatedDeliveryEnd?.toISOString() ?? null,
      'shipped',
      parsed.totalAmount,
      parsed.currency ?? 'USD',
      parsed.shippingAddress,
      parsed.rawSubject,
      parsed.rawSnippet,
    ],
  );
  const orderId = orders[0].id;

  // Insert order items
  for (const item of parsed.items) {
    await query(
      `INSERT INTO order_items (order_id, name, quantity, price, currency, sku)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [orderId, item.name, item.quantity, item.price, item.currency ?? 'USD', item.sku],
    );
  }

  // Insert shipments
  for (const shipment of parsed.shipments) {
    const { rows: shipments } = await query(
      `INSERT INTO shipments (order_id, tracking_number, carrier,
         estimated_delivery_date, service_level, status, is_delivered)
       VALUES ($1, $2, $3, $4, $5, 'label_created', false)
       RETURNING id`,
      [
        orderId,
        shipment.trackingNumber,
        shipment.carrier,
        shipment.estimatedDeliveryDate?.toISOString().split('T')[0] ?? null,
        shipment.serviceLevel,
      ],
    );
    const shipmentId = shipments[0].id;

    // Add initial tracking event
    await query(
      `INSERT INTO tracking_events (shipment_id, status, description, occurred_at)
       VALUES ($1, 'label_created', 'Shipping label created', $2)`,
      [shipmentId, parsed.orderDate.toISOString()],
    );
  }
}

/**
 * Get the user's profile info from Google.
 */
export async function getUserProfile(accessToken: string): Promise<{
  email: string;
  name: string;
  picture: string;
}> {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();

  return {
    email: data.email!,
    name: data.name ?? data.email!,
    picture: data.picture ?? '',
  };
}