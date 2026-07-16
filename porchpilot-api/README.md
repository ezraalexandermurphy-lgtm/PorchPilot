# PorchPilot API

A Node.js/TypeScript backend for the PorchPilot app — automatically detects shipping confirmations from your email inbox and tracks all your deliveries in one place.

## Tech Stack

- **Runtime**: Node.js 22 (TypeScript)
- **Framework**: [Fastify](https://fastify.dev/) v5
- **Database**: PostgreSQL (via `pg` + `kysely`)
- **Auth**: OAuth 2.0 (Google, Microsoft)
- **Migrations**: Custom SQL-based migration runner
- **CI**: GitHub Actions (lint, typecheck, test)

## Project Structure

```
src/
├── index.ts                # Entry point — starts the server
├── app.ts                  # Fastify app factory (plugins, routes, error handling)
├── config/
│   └── env.ts              # Environment variable validation & typing
├── db/
│   ├── pool.ts             # PostgreSQL connection pool
│   ├── migrate.ts          # Migration runner
│   ├── rollback.ts         # Rollback runner
│   ├── seed.ts             # Development seed data
│   └── migrations/
│       └── 001_initial_schema.sql
├── routes/
│   ├── health.ts           # Health check endpoint
│   └── auth.ts             # OAuth routes (Google, Microsoft)
├── services/
│   ├── email-parser.ts     # Email parsing & retailer detection
│   └── tracking.ts         # Carrier detection & tracking URL generation
├── middleware/
│   └── auth.ts             # JWT auth middleware (placeholder)
└── types/
    └── index.ts            # TypeScript interfaces & types
```

## Database Schema

### Tables

| Table | Purpose |
|-------|---------|
| `users` | User accounts with subscription management |
| `email_accounts` | Connected email inboxes (OAuth tokens per provider) |
| `orders` | Orders extracted from shipping confirmation emails |
| `order_items` | Individual items within an order |
| `shipments` | Shipments with tracking numbers and carrier info |
| `tracking_events` | Tracking status history for each shipment |

### Entity Relationships

```
users 1─∞ email_accounts
users 1─∞ orders
orders 1─∞ order_items
orders 1─∞ shipments
shipments 1─∞ tracking_events
```

### Key Design Decisions

- **UUID primary keys** for distributed-friendliness
- **Cascading deletes** from users/orders down to children
- **Partial index** on `orders` for active (non-delivered/cancelled) orders
- **Auto-update triggers** propagate `updated_at` timestamps
- **Auto-delivery detection**: inserting a `tracking_event` with `status='delivered'` automatically updates the parent shipment and order

## Getting Started

### Prerequisites

- Node.js 22+
- PostgreSQL 15+
- npm

### Setup

```bash
# Clone and install
cd porchpilot-api
npm install

# Copy environment and configure
cp .env.example .env
# Edit .env with your DATABASE_URL, JWT_SECRET, and OAuth credentials

# Run migrations
npm run migrate

# (Optional) Seed sample data
npm run seed

# Start development server
npm run dev
```

### Environment Variables

See `.env.example` for all required variables. Key ones:

- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — Secret for signing JWT tokens
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth credentials
- `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` — Microsoft OAuth credentials

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check (DB status, version) |
| GET | `/api/auth/google/url` | Get Google OAuth URL |
| GET | `/api/auth/google/callback` | Google OAuth callback |
| GET | `/api/auth/microsoft/url` | Get Microsoft OAuth URL |
| GET | `/api/auth/microsoft/callback` | Microsoft OAuth callback |
| POST | `/api/auth/refresh` | Refresh OAuth tokens |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier |
| `npm run format:check` | Check formatting |
| `npm run migrate` | Run pending migrations |
| `npm run migrate:rollback` | Roll back last migration |
| `npm run seed` | Seed development data |
| `npm test` | Run tests |