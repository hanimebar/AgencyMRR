# AgencyMRR

**Verified recurring revenue, direct from your payment provider.**

A public leaderboard of startups/agencies whose financial metrics are pulled automatically from payment providers (Stripe, Paddle, Braintree, Mollie, PayPal, etc.) via provider adapters.

## Architecture Overview

### Provider-Agnostic Design

AgencyMRR uses an **adapter pattern** to support multiple payment providers. Adding a new provider requires:

1. **Create an adapter** (`src/lib/providers/[provider]Adapter.ts`)
   - Implement the `PaymentProviderAdapter` interface
   - Fetch metrics from the provider's API
   - Return standardized `ProviderMetrics`

2. **Register the adapter** (`src/lib/providers/registry.ts`)
   - Add to the `adapters` record
   - The system automatically handles routing

3. **Wire up OAuth** (if needed)
   - Add OAuth routes in `src/app/api/providers/[provider]/`
   - Follow the Stripe example pattern

### Current Providers

- ✅ **Stripe** - Fully implemented with OAuth Connect
- 🚧 **Paddle, Braintree, PayPal, Mollie** - Stubbed (ready for implementation)

### Database Schema

All tables and RLS policies are defined in `supabase/schema.sql`:

- `startups` - Basic startup metadata (public read)
- `provider_connections` - Links startups to provider accounts (admin only)
- `provider_tokens` - Encrypted OAuth tokens (admin only, RLS protected)
- `startup_metrics_current` - Current metrics snapshot (public read)
- `startup_metrics_history` - Time-series history for charts (public read)

**Security**: RLS policies ensure:
- Public users can read startups and metrics
- Only service role can write/update
- Provider tokens are never exposed to public

## Setup Instructions

### 1. Database Setup

Run the schema in your Supabase project:

```bash
# In Supabase SQL Editor, run:
supabase/schema.sql
```

Or via Supabase CLI:
```bash
supabase db push
```

### 2. Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
STRIPE_PLATFORM_SECRET_KEY=sk_live_...
STRIPE_CLIENT_ID=ca_...
APP_BASE_URL=http://localhost:3000
ADMIN_PASSWORD=your-secure-admin-password
CRON_SECRET=optional-secret-for-cron-endpoint
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

## Key Features

### Founder Flow

1. **Submit Startup** (`/submit`) - Basic metadata form
2. **Connect Provider** (`/connect/[startupId]`) - OAuth connection
3. **Automatic Sync** - Metrics fetched immediately after connection

### Public Leaderboard

- **Home Page** (`/`) - Hero section + filtered leaderboard
- **Startup Detail** (`/startup/[slug]`) - Individual metrics and charts
- **Filters** - Country, category, provider, MRR bands

### Admin Dashboard

- **Password Protected** (`/admin`) - Uses `ADMIN_PASSWORD` env var
- **Manual Sync** - Trigger metrics sync for any startup
- **View All** - See all startups and their connection status

### Metrics Syncing

**Automatic**: After OAuth connection, metrics are fetched immediately.

**Cron Endpoint**: `/api/cron/sync-metrics`

Call this endpoint periodically (daily recommended) to refresh all metrics:

```bash
# Example cron job
curl -X GET "https://your-domain.com/api/cron/sync-metrics" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Or use Vercel Cron:
```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/sync-metrics",
    "schedule": "0 2 * * *"
  }]
}
```

## Adding a New Payment Provider

### Step 1: Create Adapter

Create `src/lib/providers/paddleAdapter.ts`:

```typescript
import type { PaymentProviderAdapter, ProviderMetrics, ProviderConnectionConfig } from "./types";

export const paddleAdapter: PaymentProviderAdapter = {
  name: "paddle",
  
  async fetchMetrics(config: ProviderConnectionConfig): Promise<ProviderMetrics> {
    // 1. Use config.accessToken to authenticate with Paddle API
    // 2. Fetch subscription/revenue data
    // 3. Calculate MRR, total revenue, last 30 days
    // 4. Return standardized metrics
    
    return {
      currency: "EUR",
      mrr: 0,
      totalRevenue: 0,
      last30dRevenue: 0,
    };
  },
};
```

### Step 2: Register Adapter

In `src/lib/providers/registry.ts`:

```typescript
import { paddleAdapter } from "./paddleAdapter";

const adapters: Partial<Record<ProviderName, PaymentProviderAdapter>> = {
  stripe: stripeAdapter,
  paddle: paddleAdapter, // Add here
  // ...
};
```

### Step 3: Add OAuth Routes (if needed)

Create `src/app/api/providers/paddle/connect/route.ts` and `callback/route.ts` following the Stripe pattern.

### Step 4: Update UI

Add Paddle to the provider selection UI in `src/app/connect/[startupId]/page.tsx`.

## Tech Stack

- **Next.js 14** (App Router) + TypeScript
- **TailwindCSS** + **shadcn/ui** components
- **Framer Motion** for animations
- **Supabase** (Postgres + Auth)
- **Stripe SDK** (first provider)
- **Recharts** for metrics charts

## Design Principles

- **Dark theme** by default
- **Glassmorphism** effects on cards
- **Animated gradients** in hero section
- **Micro-animations** on hover/interaction
- **Nordic focus** (FI, SE, NO, DK, IS) but globally extensible

## Security Notes

1. **Service Role Key**: Never expose `SUPABASE_SERVICE_ROLE_KEY` to client
2. **Provider Tokens**: Stored server-side only, protected by RLS
3. **Admin Password**: Use a strong password in production
4. **Cron Secret**: Optional but recommended for `/api/cron/sync-metrics`

## Development

```bash
# Type checking
npm run build

# Linting
npm run lint
```

## Deployment

1. Deploy to Vercel/Netlify
2. Set environment variables in dashboard
3. Run database migrations in Supabase
4. Set up cron job for metrics syncing

## License

MIT
