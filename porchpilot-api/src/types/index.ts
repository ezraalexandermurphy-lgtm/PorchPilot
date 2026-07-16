// ─── Database Model Types ───────────────────────────────────────────────

/** Supported OAuth email providers */
export type EmailProvider = 'google' | 'microsoft';

/** User account status */
export type UserStatus = 'active' | 'inactive' | 'suspended';

/** Order-level status */
export type OrderStatus = 'pending' | 'shipped' | 'delivered' | 'cancelled' | 'returned';

/** Shipment-level status */
export type ShipmentStatus =
  | 'label_created'
  | 'picked_up'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'delayed'
  | 'exception'
  | 'cancelled';

// ─── Entity Interfaces ──────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  status: UserStatus;
  stripe_customer_id: string | null;
  subscription_tier: 'free' | 'premium' | null;
  subscription_status: 'active' | 'canceled' | 'past_due' | null;
  created_at: string;
  updated_at: string;
}

export interface EmailAccount {
  id: string;
  user_id: string;
  provider: EmailProvider;
  email_address: string;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  scope: string | null;
  last_synced_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  email_account_id: string;
  retailer: string;
  retailer_order_id: string | null;
  order_date: string;
  estimated_delivery_start: string | null;
  estimated_delivery_end: string | null;
  status: OrderStatus;
  total_amount: number | null;
  currency: string | null;
  shipping_address: string | null;
  notes: string | null;
  raw_email_subject: string | null;
  raw_email_snippet: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  name: string;
  quantity: number;
  price: number | null;
  currency: string | null;
  image_url: string | null;
  sku: string | null;
  created_at: string;
}

export interface Shipment {
  id: string;
  order_id: string;
  tracking_number: string;
  carrier: string;
  estimated_delivery_date: string | null;
  estimated_delivery_start: string | null;
  estimated_delivery_end: string | null;
  status: ShipmentStatus;
  status_detail: string | null;
  service_level: string | null;
  origin_location: string | null;
  destination_location: string | null;
  weight_lbs: number | null;
  is_delivered: boolean;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrackingEvent {
  id: string;
  shipment_id: string;
  status: ShipmentStatus;
  location: string | null;
  description: string | null;
  occurred_at: string;
  created_at: string;
}

// ─── API Request/Response Types ─────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ─── Configuration Types ────────────────────────────────────────────────

export interface AppConfig {
  port: number;
  host: string;
  nodeEnv: string;
  databaseUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  google: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };
  microsoft: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };
  rateLimit: {
    max: number;
    windowMs: number;
  };
}