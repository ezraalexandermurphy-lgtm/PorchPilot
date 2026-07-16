import { config } from '../config/env.js';
import { query } from '../db/pool.js';
import { emailParser } from './email-parser.js';

const MICROSOFT_AUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const MICROSOFT_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';

const SCOPES = [
  'offline_access',
  'Mail.Read',
  'User.Read',
].join(' ');

/**
 * Generate the Microsoft OAuth consent URL for a given user.
 */
export function getAuthUrl(userId: string): string {
  const params = new URLSearchParams({
    client_id: config.microsoft.clientId,
    response_type: 'code',
    redirect_uri: config.microsoft.redirectUri,
    scope: SCOPES,
    state: userId,
    prompt: 'consent',
  });

  return `${MICROSOFT_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange an authorization code for tokens and store them.
 */
export async function handleCallback(code: string, userId: string): Promise<{
  email: string;
  accessToken: string;
  refreshToken: string | null;
}> {
  // Exchange code for tokens
  const tokenParams = new URLSearchParams({
    client_id: config.microsoft.clientId,
    client_secret: config.microsoft.clientSecret,
    code,
    redirect_uri: config.microsoft.redirectUri,
    grant_type: 'authorization_code',
  });

  const tokenResponse = await fetch(MICROSOFT_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenParams.toString(),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`Microsoft token exchange failed: ${errorText}`);
  }

  const tokens = await tokenResponse.json() as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope?: string;
  };

  if (!tokens.access_token) {
    throw new Error('No access token returned from Microsoft');
  }

  // Get user info from Microsoft Graph
  const userResponse = await fetch(`${GRAPH_API_BASE}/me`, {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
    },
  });

  if (!userResponse.ok) {
    throw new Error('Failed to fetch Microsoft user profile');
  }

  const userInfo = await userResponse.json() as {
    mail?: string;
    userPrincipalName?: string;
    displayName?: string;
  };

  const email = userInfo.mail ?? userInfo.userPrincipalName ?? '';

  // Calculate token expiry
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  // Store tokens in the database
  await query(
    `INSERT INTO email_accounts (user_id, provider, email_address, access_token, refresh_token, token_expires_at, scope, is_active)
     VALUES ($1, 'microsoft', $2, $3, $4, $5, $6, true)
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
      expiresAt,
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
 * Get a fresh access token for a Microsoft email account, refreshing if needed.
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

  // Check if token is expired (with 5 minute buffer)
  if (account.token_expires_at && new Date(account.token_expires_at) <= new Date(Date.now() + 5 * 60 * 1000)) {
    if (!account.refresh_token) {
      throw new Error('Token expired and no refresh token available');
    }

    // Refresh the token
    const refreshParams = new URLSearchParams({
      client_id: config.microsoft.clientId,
      client_secret: config.microsoft.clientSecret,
      refresh_token: account.refresh_token,
      grant_type: 'refresh_token',
    });

    const refreshResponse = await fetch(MICROSOFT_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: refreshParams.toString(),
    });

    if (!refreshResponse.ok) {
      throw new Error('Failed to refresh Microsoft token');
    }

    const tokens = await refreshResponse.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    // Update stored tokens
    await query(
      `UPDATE email_accounts
       SET access_token = $1, refresh_token = COALESCE($2, refresh_token),
           token_expires_at = $3, updated_at = NOW()
       WHERE id = $4`,
      [
        tokens.access_token,
        tokens.refresh_token ?? null,
        expiresAt,
        emailAccountId,
      ],
    );

    return tokens.access_token;
  }

  return account.access_token;
}

/**
 * Fetch shipping confirmation emails from Outlook via Microsoft Graph and parse them.
 */
export async function syncEmails(emailAccountId: string, userId: string): Promise<{
  processed: number;
  ordersCreated: number;
  errors: string[];
}> {
  const accessToken = await getAccessToken(emailAccountId);

  const result = {
    processed: 0,
    ordersCreated: 0,
    errors: [] as string[],
  };

  // Search for shipping confirmation emails using Microsoft Graph's search/filter
  const searchQuery = 'shipped OR shipping OR "on its way" OR "out for delivery" OR "order confirmation"';

  try {
    const response = await fetch(
      `${GRAPH_API_BASE}/me/messages?` +
      `$search="${encodeURIComponent(searchQuery)}"` +
      `&$top=50` +
      `&$orderBy=receivedDateTime DESC` +
      `&$select=id,subject,from,bodyPreview,body,receivedDateTime`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'ConsistencyLevel': 'eventual',
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Microsoft Graph API error: ${errorText}`);
    }

    const data = await response.json() as {
      value?: Array<{
        id: string;
        subject: string;
        from: { emailAddress: { address: string; name: string } };
        bodyPreview: string;
        body: { content: string; contentType: string };
        receivedDateTime: string;
      }>;
    };

    const messages = data.value ?? [];

    for (const msg of messages) {
      try {
        const from = msg.from?.emailAddress?.address ?? '';
        const subject = msg.subject ?? '';
        const snippet = msg.bodyPreview ?? '';
        const bodyHtml = msg.body?.contentType === 'html' ? (msg.body?.content ?? '') : '';

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
  } catch (err) {
    throw new Error(`Failed to sync Outlook emails: ${err}`);
  }

  // Update last_synced_at
  await query(
    'UPDATE email_accounts SET last_synced_at = NOW(), updated_at = NOW() WHERE id = $1',
    [emailAccountId],
  );

  return result;
}

/**
 * Store a parsed order in the database.
 * Reuses the same logic as the Gmail service.
 */
async function storeParsedOrder(
  parsed: {
    retailer: string;
    retailerOrderId: string | null;
    orderDate: Date;
    estimatedDeliveryStart: Date | null;
    estimatedDeliveryEnd: Date | null;
    items: Array<{ name: string; quantity: number; price: number | null; currency: string | null; sku: string | null }>;
    shipments: Array<{ trackingNumber: string; carrier: string; estimatedDeliveryDate: Date | null; serviceLevel: string | null }>;
    totalAmount: number | null;
    currency: string | null;
    shippingAddress: string | null;
    rawSubject: string;
    rawSnippet: string;
  },
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