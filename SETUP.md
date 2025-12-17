# Quick Setup Guide

## 1. Database Setup

Run the SQL schema in your Supabase project:

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase/schema.sql`
4. Execute the SQL

This creates all necessary tables with proper RLS policies.

## 2. Environment Variables

Create `.env.local` in the project root:

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

### Getting Stripe Credentials

1. **STRIPE_PLATFORM_SECRET_KEY**: Your Stripe secret key (starts with `sk_live_` or `sk_test_`)
2. **STRIPE_CLIENT_ID**: Your Stripe Connect client ID (starts with `ca_`)
   - Get this from: https://dashboard.stripe.com/settings/applications
   - Create a new Connect application if needed

## 3. Install & Run

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`

## 4. Set Up Cron Job (Optional)

To automatically sync metrics daily, set up a cron job:

### Vercel

Create `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/cron/sync-metrics",
    "schedule": "0 2 * * *"
  }]
}
```

### External Cron Service

Call this endpoint daily:
```
GET https://your-domain.com/api/cron/sync-metrics
Authorization: Bearer YOUR_CRON_SECRET
```

## 5. Test the Flow

1. Visit `/submit` to create a startup
2. Connect Stripe via OAuth
3. Metrics will sync automatically
4. View on the leaderboard at `/`

## Troubleshooting

### "Table not found" errors
- Make sure you've run `supabase/schema.sql` in your Supabase project

### Stripe OAuth errors
- Verify `STRIPE_CLIENT_ID` is correct
- Check that your Stripe Connect app redirect URI matches: `{APP_BASE_URL}/api/providers/stripe/callback`

### Build errors
- Ensure all environment variables are set
- Run `npm install` to ensure all dependencies are installed
