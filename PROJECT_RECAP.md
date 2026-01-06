# AgencyMRR - Project Recap

**Last Updated**: Current session  
**Purpose**: Comprehensive context document for starting new conversation threads

---

## 🎯 Project Overview

**AgencyMRR** is a provider-agnostic public leaderboard for startups/agencies that automatically pulls financial metrics from payment providers (Stripe, Paddle, Braintree, Mollie, PayPal, etc.) via provider adapters.

**Tagline**: "Verified recurring revenue, direct from your payment provider."

**Key Concept**: Founders connect their payment provider (initially Stripe). The backend fetches real financial metrics (Total revenue, MRR, Revenue last 30 days) automatically. No manual revenue entry.

**Focus**: Initially Nordic/Scandinavian startups (FI, SE, NO, DK, IS) but globally extensible.

---

## 🛠 Tech Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Styling**: TailwindCSS + shadcn/ui components
- **Animations**: Framer Motion
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (admin only)
- **Payment Provider SDK**: Stripe SDK (v14.10.0, API version "2023-10-16")
- **Charts**: Recharts
- **Deployment**: Vercel-ready

---

## 🏗 Architecture

### Provider-Agnostic Adapter Pattern

The core architecture uses an **adapter pattern** to support multiple payment providers:

1. **Generic Interface** (`src/lib/providers/types.ts`):
   - `PaymentProviderAdapter` interface
   - `ProviderMetrics` interface (standardized output)
   - `ProviderName` type union

2. **Provider Registry** (`src/lib/providers/registry.ts`):
   - Central registry mapping provider names to adapters
   - Easy to add new providers

3. **Adapters** (`src/lib/providers/[provider]Adapter.ts`):
   - Each provider implements `PaymentProviderAdapter`
   - Fetches metrics from provider API
   - Returns standardized `ProviderMetrics`

**Current Status**:
- ✅ **Stripe** - Fully implemented with OAuth Connect (read_write scope)
- 🚧 **Paddle, Braintree, PayPal, Mollie** - Stubbed (ready for implementation)

### Adding a New Provider

1. Create adapter file: `src/lib/providers/[provider]Adapter.ts`
2. Implement `PaymentProviderAdapter` interface
3. Register in `src/lib/providers/registry.ts`
4. Add OAuth routes: `src/app/api/providers/[provider]/connect/route.ts` and `callback/route.ts`
5. Update UI in `src/app/connect/[startupId]/page.tsx`

---

## 📊 Database Schema

All tables defined in `supabase/schema.sql` with RLS policies:

### Core Tables

1. **`startups`** (public read)
   - Basic metadata: name, slug, website_url, country, category, description, logo_url
   - Indexes: country, category, slug

2. **`provider_connections`** (admin only)
   - Links startups to provider accounts
   - Fields: startup_id, provider, provider_account_id, status, connected_at, last_synced_at
   - Unique constraint: (startup_id, provider)

3. **`provider_tokens`** (admin only, RLS protected)
   - Server-only OAuth tokens
   - Fields: provider_connection_id, access_token, refresh_token, scope, expires_at
   - Never exposed to public

4. **`startup_metrics_current`** (public read)
   - Current snapshot: currency, mrr, total_revenue, last_30d_revenue, provider
   - Unique constraint: startup_id
   - Indexes: startup_id, mrr DESC, last_30d_revenue DESC, provider

5. **`startup_metrics_history`** (public read)
   - Time-series history for charts
   - Fields: startup_id, currency, mrr, total_revenue, last_30d_revenue, provider, snapshot_date

6. **`sponsorships`** (public read, see `supabase/migrations/sponsorships.sql`)
   - Paid sponsorships/featured listings
   - Fields: startup_id, type, category, status, stripe_customer_id, stripe_subscription_id, stripe_price_id, start_date, end_date
   - Types: "featured_listing", "category_hero", "homepage_sponsor"
   - Status: "pending", "active", "cancelled"

### Security (RLS Policies)

- **Public Read**: startups, startup_metrics_current, startup_metrics_history, sponsorships
- **Admin Only**: provider_connections, provider_tokens (service role only)
- **No FK Relationships Used**: Queries avoid relational expansion (e.g., `sponsorships(*)`) to prevent PGRST200 errors. Sponsorships are fetched separately and joined in application code.

---

## 🎨 Design & UX

- **Theme**: Dark theme by default
- **Visual Style**: Glassmorphism effects on cards, animated gradients in hero
- **Animations**: Framer Motion for micro-animations, hover effects, page transitions
- **Typography**: Bold, modern typography
- **Layout**: Card-based responsive grid

---

## 🔄 Core Flows

### 1. Founder Flow

1. **Submit Startup** (`/submit`)
   - Form: name, website_url, country, category, description
   - Creates startup record, generates slug
   - Redirects to `/connect/[startupId]`

2. **Connect Provider** (`/connect/[startupId]`)
   - Shows provider options (Stripe active, others "Coming soon")
   - Clicking "Connect Stripe" → `/api/providers/stripe/connect?startupId=...`
   - Redirects to Stripe OAuth (read_write scope)
   - State parameter contains `startup.id`

3. **OAuth Callback** (`/api/providers/stripe/callback`)
   - Receives code and state (startup.id)
   - Exchanges code for tokens
   - Stores: `provider_connections` row, `provider_tokens` row
   - Immediately fetches metrics via `stripeAdapter.fetchMetrics()`
   - Upserts into `startup_metrics_current`
   - Creates `startup_metrics_history` row
   - Redirects to `/startup/[slug]?connected=1`

### 2. Public Leaderboard

- **Home Page** (`/`)
  - Hero section with animated counters (total MRR, startup count)
  - Filterable leaderboard
  - Two-tier ranking: Sponsored startups first (by MRR), then non-sponsored (by MRR)
  - Filters: Country, Category, Provider, MRR bands
  - "Sponsored" badge on sponsored startup cards

- **Startup Detail** (`/startup/[slug]`)
  - Shows metrics: MRR, Last 30 days, Total revenue
  - Chart: MRR over time (from `startup_metrics_history`)
  - Provider info and last synced time
  - Sponsorship CTA (if no active sponsorship) or status (if active)

### 3. Admin Dashboard

- **Route**: `/admin`
- **Auth**: Password-protected (uses `ADMIN_PASSWORD` env var, cookie-based)
- **Features**:
  - View all startups with metrics and connection status
  - Manual sync trigger for any startup
  - View and manage sponsorships (deactivate)

### 4. Metrics Syncing

- **Automatic**: After OAuth connection, metrics fetched immediately
- **Cron Endpoint**: `/api/cron/sync-metrics`
  - Iterates over `provider_connections` with status "connected"
  - Calls `getProviderAdapter(provider).fetchMetrics()` for each
  - Updates `startup_metrics_current` and inserts into `startup_metrics_history`
  - Configured with: `export const dynamic = "force-dynamic"`, `export const runtime = "nodejs"`, `export const revalidate = 0`

### 5. Sponsorship Monetization

- **Route**: `/advertise`
- **Products**:
  - Featured Listing: €39/month
  - Category Hero: €79/month
  - Homepage Sponsor: €149/month
- **Flow**:
  1. Founder selects sponsorship type and startup slug
  2. Clicks "Buy [Type]" → `/api/stripe/sponsorship/checkout`
  3. Creates Stripe Checkout Session (subscription mode)
  4. Inserts `sponsorships` row with status "pending"
  5. After payment → Webhook activates sponsorship (status "active")
  6. Startup appears at top of leaderboard with "Sponsored" badge
- **Webhook** (`/api/stripe/webhook`):
  - Handles: `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted`
  - Activates/cancels sponsorships based on Stripe events

---

## 📁 Key File Structure

```
AgencyMRR/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Homepage (hero + leaderboard)
│   │   ├── submit/page.tsx              # Founder submission form
│   │   ├── connect/[startupId]/page.tsx # Provider connection page
│   │   ├── startup/[slug]/page.tsx     # Startup detail page
│   │   ├── advertise/page.tsx          # Sponsorship packages
│   │   ├── admin/page.tsx              # Admin dashboard
│   │   └── api/
│   │       ├── providers/stripe/
│   │       │   ├── connect/route.ts    # Stripe OAuth URL builder
│   │       │   └── callback/route.ts   # Stripe OAuth callback handler
│   │       ├── stripe/
│   │       │   ├── sponsorship/checkout/route.ts # Create Checkout Session
│   │       │   └── webhook/route.ts    # Stripe webhook handler
│   │       ├── cron/sync-metrics/route.ts # Metrics sync endpoint
│   │       ├── startups/create/route.ts # Create startup API
│   │       └── admin/                   # Admin API routes
│   ├── components/
│   │   ├── HeroSection.tsx              # Animated hero with counters
│   │   ├── StartupCard.tsx              # Leaderboard card component
│   │   ├── LeaderboardFilters.tsx      # Filter UI (client component)
│   │   ├── StartupMetricsChart.tsx     # Recharts MRR history
│   │   ├── SponsorshipCTA.tsx           # "Get Featured Listing" CTA
│   │   ├── ConnectProviderClient.tsx   # Provider selection UI
│   │   └── ui/                          # shadcn/ui components
│   └── lib/
│       ├── providers/
│       │   ├── types.ts                 # Provider interfaces
│       │   ├── registry.ts              # Provider registry
│       │   └── stripeAdapter.ts         # Stripe adapter implementation
│       ├── supabase/
│       │   ├── server.ts                # supabaseAdmin client (service role)
│       │   ├── client.ts                # Public Supabase client
│       │   └── queries.ts               # Server-side query functions
│       └── utils.ts                     # Utility functions (formatting, etc.)
├── supabase/
│   ├── schema.sql                       # Main database schema + RLS
│   └── migrations/
│       └── sponsorships.sql            # Sponsorships table migration
├── package.json
├── README.md                            # Full documentation
└── PROJECT_RECAP.md                     # This file
```

---

## 🔑 Environment Variables

Required in `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe
STRIPE_PLATFORM_SECRET_KEY=sk_live_... (or sk_test_...)
STRIPE_CLIENT_ID=ca_... (Stripe Connect client ID)
STRIPE_WEBHOOK_SECRET=whsec_... (from Stripe webhook config)

# App Configuration
APP_BASE_URL=http://localhost:3000 (or production URL)
ADMIN_PASSWORD=your-secure-admin-password
CRON_SECRET=optional-secret-for-cron-endpoint

# Sponsorship Price IDs (from Stripe Dashboard > Products)
FEATURED_LISTING_PRICE_ID=price_xxx
CATEGORY_HERO_PRICE_ID=price_xxx
HOMEPAGE_SPONSOR_PRICE_ID=price_xxx
```

**Important Notes**:
- `SUPABASE_SERVICE_ROLE_KEY` is server-only (never exposed to client)
- `APP_BASE_URL` must be absolute (used for OAuth redirects)
- Stripe API version: "2023-10-16" (hardcoded in adapters)

---

## 🐛 Recent Fixes & Important Notes

### 1. Sponsorships Relational Expansion Fix (Latest)

**Issue**: PGRST200 error - "Searched for a foreign key relationship between 'startups' and 'sponsorships'"

**Solution**: Removed all `sponsorships(*)` relational expansions from queries. Now:
- Fetch startups with metrics (no sponsorships in select)
- Fetch active sponsorships separately using `.in("startup_id", startupIds)`
- Build a `Map<startup_id, sponsorship>` for efficient lookup
- Attach sponsorship data in application code

**Files Changed**:
- `src/lib/supabase/queries.ts`:
  - `getStartupsWithMetrics()` - Fetches sponsorships separately
  - `getStartupBySlug()` - Fetches sponsorship separately
- `src/app/api/admin/sponsorships/route.ts` - Fetches startup names separately

**Why**: Avoids PGRST200 errors even if FK relationship is missing or misconfigured. More explicit and easier to debug.

### 2. Stripe Connect OAuth Flow

- **Scope**: `read_write` (not `read_only`)
- **State Parameter**: Contains `startup.id` (UUID)
- **Redirect URIs**: Always use `APP_BASE_URL` env var (never hardcoded localhost)
- **Error Handling**: Callback returns `NextResponse` with descriptive errors (not redirects to `/submit` on internal failures)
- **Database Operations**: Explicit `maybeSingle()`, `update()`, `insert()` for `provider_connections` (not `upsert`)

### 3. Next.js App Router Configuration

Routes that need dynamic behavior:
- `export const dynamic = "force-dynamic"` - Disable static generation
- `export const runtime = "nodejs"` - Use Node.js runtime (for API routes with Stripe)
- `export const revalidate = 0` - No revalidation (for cron routes)

Applied to:
- `/` (homepage)
- `/startup/[slug]` (startup detail)
- `/api/cron/sync-metrics` (cron endpoint)
- `/api/stripe/webhook` (webhook handler)

### 4. Contact Email

- Contact email: `reachout@actvli.com`
- Used in: `/submit` page, `/advertise` page

---

## 🚀 Setup Instructions

1. **Clone & Install**:
   ```bash
   npm install
   ```

2. **Database Setup**:
   - Run `supabase/schema.sql` in Supabase SQL Editor
   - Run `supabase/migrations/sponsorships.sql`

3. **Environment Variables**:
   - Copy `.env.local.example` (if exists) or create `.env.local`
   - Fill in all required variables (see above)

4. **Stripe Setup**:
   - Create Stripe Connect app (get `STRIPE_CLIENT_ID`)
   - Create 3 products for sponsorships (get Price IDs)
   - Configure webhook: `https://your-domain.com/api/stripe/webhook`
   - Events: `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted`

5. **Run Development**:
   ```bash
   npm run dev
   ```

6. **Build**:
   ```bash
   npm run build
   ```

---

## 📝 Key Implementation Details

### Query Pattern (No Relational Expansion)

```typescript
// ❌ OLD (causes PGRST200):
const { data } = await supabase
  .from("startups")
  .select("*, sponsorships(*)");

// ✅ NEW (separate queries):
const { data: startups } = await supabase
  .from("startups")
  .select("*");

const startupIds = startups.map(s => s.id);
const { data: sponsorships } = await supabase
  .from("sponsorships")
  .select("startup_id, type, status")
  .in("startup_id", startupIds)
  .eq("status", "active");

const sponsoredByStartupId = new Map(
  sponsorships.map(s => [s.startup_id, s])
);
```

### Stripe Adapter Pattern

```typescript
// src/lib/providers/stripeAdapter.ts
export const stripeAdapter: PaymentProviderAdapter = {
  name: "stripe",
  async fetchMetrics(config: ProviderConnectionConfig): Promise<ProviderMetrics> {
    // Use config.accessToken to authenticate
    // Fetch subscriptions, invoices, etc.
    // Calculate MRR, total revenue, last 30 days
    // Return standardized metrics
  }
};
```

### Sponsorship Ranking Logic

```typescript
// In getStartupsWithMetrics():
const sponsored = allStartups.filter(s => s.sponsorship?.status === "active");
const nonSponsored = allStartups.filter(s => !s.sponsorship || s.sponsorship.status !== "active");

// Sort each group by MRR (or other sortBy param)
sponsored.sort((a, b) => (b.metrics?.mrr || 0) - (a.metrics?.mrr || 0));
nonSponsored.sort((a, b) => (b.metrics?.mrr || 0) - (a.metrics?.mrr || 0));

return [...sponsored, ...nonSponsored];
```

---

## 🔒 Security Considerations

1. **Service Role Key**: Never exposed to client, only used server-side
2. **Provider Tokens**: Stored in `provider_tokens` table, RLS protected, never exposed
3. **Admin Password**: Simple cookie-based auth (consider upgrading to proper session auth in production)
4. **Webhook Verification**: Stripe webhook signature verified using `STRIPE_WEBHOOK_SECRET`
5. **RLS Policies**: All tables have appropriate RLS policies (public read for public data, service role only for sensitive data)

---

## 🎯 Next Steps / Future Enhancements

- [ ] Add more payment providers (Paddle, Braintree, etc.)
- [ ] Implement proper session-based admin auth
- [ ] Add email notifications for founders
- [ ] Implement category-specific leaderboards
- [ ] Add more sponsorship types/features
- [ ] Add analytics dashboard
- [ ] Implement search functionality
- [ ] Add export functionality (CSV, JSON)

---

## 📞 Support

- **Contact**: reachout@actvli.com
- **Documentation**: See `README.md` for full details

---

**End of Recap**
