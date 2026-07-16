-- ──────────────────────────────────────────────────────────────────────────
-- PorchPilot: Initial Schema
-- Version: 001
-- ──────────────────────────────────────────────────────────────────────────

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================================
-- USERS
-- =========================================================================
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255) NOT NULL UNIQUE,
  name            VARCHAR(255),
  avatar_url      TEXT,
  status          VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'inactive', 'suspended')),
  stripe_customer_id  VARCHAR(255),
  subscription_tier   VARCHAR(20)
                    CHECK (subscription_tier IN ('free', 'premium')),
  subscription_status VARCHAR(20)
                    CHECK (subscription_status IN ('active', 'canceled', 'past_due')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_stripe_customer ON users (stripe_customer_id);

-- =========================================================================
-- EMAIL ACCOUNTS (OAuth-connected inboxes)
-- =========================================================================
CREATE TABLE email_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider        VARCHAR(20) NOT NULL
                    CHECK (provider IN ('google', 'microsoft')),
  email_address   VARCHAR(255) NOT NULL,
  access_token    TEXT NOT NULL,
  refresh_token   TEXT,
  token_expires_at TIMESTAMPTZ,
  scope           TEXT,
  last_synced_at  TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One connection per email address per user per provider
  UNIQUE (user_id, provider, email_address)
);

CREATE INDEX idx_email_accounts_user ON email_accounts (user_id);
CREATE INDEX idx_email_accounts_active ON email_accounts (user_id, is_active);

-- =========================================================================
-- ORDERS
-- =========================================================================
CREATE TABLE orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_account_id UUID NOT NULL REFERENCES email_accounts(id) ON DELETE SET NULL,
  retailer        VARCHAR(255) NOT NULL,
  retailer_order_id VARCHAR(255),
  order_date      TIMESTAMPTZ NOT NULL,
  estimated_delivery_start TIMESTAMPTZ,
  estimated_delivery_end   TIMESTAMPTZ,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'shipped', 'delivered', 'cancelled', 'returned')),
  total_amount    DECIMAL(12, 2),
  currency        VARCHAR(3) DEFAULT 'USD',
  shipping_address TEXT,
  notes           TEXT,
  raw_email_subject   TEXT,
  raw_email_snippet   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_user ON orders (user_id);
CREATE INDEX idx_orders_status ON orders (status);
CREATE INDEX idx_orders_retailer ON orders (retailer);
CREATE INDEX idx_orders_date ON orders (order_date DESC);
CREATE INDEX idx_orders_user_status ON orders (user_id, status);
-- Partial index for active (non-delivered/cancelled) orders
CREATE INDEX idx_orders_active ON orders (user_id, order_date DESC)
  WHERE status NOT IN ('delivered', 'cancelled');

-- =========================================================================
-- ORDER ITEMS
-- =========================================================================
CREATE TABLE order_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  name            VARCHAR(500) NOT NULL,
  quantity        INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price           DECIMAL(12, 2),
  currency        VARCHAR(3) DEFAULT 'USD',
  image_url       TEXT,
  sku             VARCHAR(255),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items (order_id);

-- =========================================================================
-- SHIPMENTS
-- =========================================================================
CREATE TABLE shipments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  tracking_number VARCHAR(255) NOT NULL,
  carrier         VARCHAR(100) NOT NULL,
  estimated_delivery_date   DATE,
  estimated_delivery_start  DATE,
  estimated_delivery_end    DATE,
  status          VARCHAR(30) NOT NULL DEFAULT 'label_created'
                    CHECK (status IN (
                      'label_created', 'picked_up', 'in_transit',
                      'out_for_delivery', 'delivered', 'delayed',
                      'exception', 'cancelled'
                    )),
  status_detail   TEXT,
  service_level   VARCHAR(100),
  origin_location     TEXT,
  destination_location TEXT,
  weight_lbs      DECIMAL(8, 2),
  is_delivered    BOOLEAN NOT NULL DEFAULT FALSE,
  delivered_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (order_id, tracking_number, carrier)
);

CREATE INDEX idx_shipments_order ON shipments (order_id);
CREATE INDEX idx_shipments_tracking ON shipments (tracking_number);
CREATE INDEX idx_shipments_status ON shipments (status);
CREATE INDEX idx_shipments_delivery_date ON shipments (estimated_delivery_date);

-- =========================================================================
-- TRACKING EVENTS
-- =========================================================================
CREATE TABLE tracking_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id     UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  status          VARCHAR(30) NOT NULL
                    CHECK (status IN (
                      'label_created', 'picked_up', 'in_transit',
                      'out_for_delivery', 'delivered', 'delayed',
                      'exception', 'cancelled'
                    )),
  location        TEXT,
  description     TEXT,
  occurred_at     TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tracking_events_shipment ON tracking_events (shipment_id);
CREATE INDEX idx_tracking_events_occurred ON tracking_events (occurred_at DESC);

-- =========================================================================
-- FUNCTIONS & TRIGGERS
-- =========================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_email_accounts_updated_at
  BEFORE UPDATE ON email_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_shipments_updated_at
  BEFORE UPDATE ON shipments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- When the latest tracking event marks a shipment as delivered,
-- auto-update the shipment's is_delivered and delivered_at.
CREATE OR REPLACE FUNCTION auto_update_shipment_on_delivery()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'delivered' THEN
    UPDATE shipments
    SET is_delivered = TRUE,
        delivered_at = COALESCE(NEW.occurred_at, NOW()),
        status = 'delivered',
        updated_at = NOW()
    WHERE id = NEW.shipment_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tracking_events_auto_delivery
  AFTER INSERT ON tracking_events
  FOR EACH ROW
  WHEN (NEW.status = 'delivered')
  EXECUTE FUNCTION auto_update_shipment_on_delivery();

-- When all shipments for an order are delivered, auto-update order status
CREATE OR REPLACE FUNCTION auto_update_order_on_shipments_delivered()
RETURNS TRIGGER AS $$
DECLARE
  v_order_id UUID;
  v_total_shipments INT;
  v_delivered_shipments INT;
BEGIN
  SELECT order_id INTO v_order_id FROM shipments WHERE id = NEW.id;

  SELECT COUNT(*) INTO v_total_shipments
  FROM shipments WHERE order_id = v_order_id;

  SELECT COUNT(*) INTO v_delivered_shipments
  FROM shipments WHERE order_id = v_order_id AND is_delivered = TRUE;

  IF v_total_shipments > 0 AND v_total_shipments = v_delivered_shipments THEN
    UPDATE orders
    SET status = 'delivered', updated_at = NOW()
    WHERE id = v_order_id AND status != 'delivered';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_shipments_auto_order_status
  AFTER UPDATE OF is_delivered ON shipments
  FOR EACH ROW
  WHEN (NEW.is_delivered = TRUE AND OLD.is_delivered = FALSE)
  EXECUTE FUNCTION auto_update_order_on_shipments_delivered();