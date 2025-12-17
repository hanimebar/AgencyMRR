-- AgencyMRR Database Schema
-- Provider-agnostic leaderboard for verified startup MRR metrics

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. startups
-- Basic metadata about each listed startup/agency
-- ============================================================================
CREATE TABLE startups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  website_url TEXT NOT NULL,
  country TEXT NOT NULL, -- ISO country code (e.g. FI, SE, NO, DK, IS)
  category TEXT NOT NULL, -- e.g. SaaS, App, Agency, Service
  description TEXT, -- Short pitch, nullable
  logo_url TEXT, -- Optional logo URL
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_startups_country ON startups(country);
CREATE INDEX idx_startups_category ON startups(category);
CREATE INDEX idx_startups_slug ON startups(slug);

-- ============================================================================
-- 2. provider_connections
-- One row per startup per provider account
-- ============================================================================
CREATE TABLE provider_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- e.g. stripe, paddle, braintree, paypal, mollie
  provider_account_id TEXT NOT NULL, -- e.g. Stripe account ID
  status TEXT NOT NULL DEFAULT 'connected', -- connected, revoked, error
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(startup_id, provider)
);

CREATE INDEX idx_provider_connections_startup ON provider_connections(startup_id);
CREATE INDEX idx_provider_connections_provider ON provider_connections(provider);
CREATE INDEX idx_provider_connections_status ON provider_connections(status);

-- ============================================================================
-- 3. provider_tokens
-- Server-only table for storing encrypted provider API credentials
-- RLS will restrict access to service_role only
-- ============================================================================
CREATE TABLE provider_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_connection_id UUID NOT NULL REFERENCES provider_connections(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL, -- Encrypted or protected by RLS
  refresh_token TEXT, -- Optional refresh token
  scope TEXT, -- OAuth scopes granted
  expires_at TIMESTAMPTZ, -- Token expiration if applicable
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider_connection_id)
);

CREATE INDEX idx_provider_tokens_connection ON provider_tokens(provider_connection_id);

-- ============================================================================
-- 4. startup_metrics_current
-- Current snapshot of metrics per startup
-- ============================================================================
CREATE TABLE startup_metrics_current (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'EUR', -- e.g. EUR, SEK, USD
  mrr NUMERIC NOT NULL DEFAULT 0, -- Monthly Recurring Revenue
  total_revenue NUMERIC NOT NULL DEFAULT 0, -- All-time revenue
  last_30d_revenue NUMERIC NOT NULL DEFAULT 0, -- Revenue in last 30 days
  provider TEXT NOT NULL, -- Which provider this data came from
  provider_last_synced_at TIMESTAMPTZ, -- When we last synced from provider
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(startup_id)
);

CREATE INDEX idx_metrics_startup ON startup_metrics_current(startup_id);
CREATE INDEX idx_metrics_mrr ON startup_metrics_current(mrr DESC);
CREATE INDEX idx_metrics_last_30d ON startup_metrics_current(last_30d_revenue DESC);
CREATE INDEX idx_metrics_provider ON startup_metrics_current(provider);

-- ============================================================================
-- 5. startup_metrics_history
-- Time-series history for charts and trends
-- ============================================================================
CREATE TABLE startup_metrics_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'EUR',
  mrr NUMERIC NOT NULL DEFAULT 0,
  total_revenue NUMERIC NOT NULL DEFAULT 0,
  last_30d_revenue NUMERIC NOT NULL DEFAULT 0,
  provider TEXT NOT NULL,
  snapshot_date DATE NOT NULL, -- Daily snapshots
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_history_startup_date ON startup_metrics_history(startup_id, snapshot_date DESC);
CREATE INDEX idx_history_date ON startup_metrics_history(snapshot_date DESC);

-- ============================================================================
-- 6. Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE startups ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE startup_metrics_current ENABLE ROW LEVEL SECURITY;
ALTER TABLE startup_metrics_history ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- startups: Public read, admin write
-- ============================================================================
-- Allow anonymous users to read startups (public leaderboard)
CREATE POLICY "startups_select_anon" ON startups
  FOR SELECT
  TO anon
  USING (true);

-- Allow authenticated users to read startups
CREATE POLICY "startups_select_auth" ON startups
  FOR SELECT
  TO authenticated
  USING (true);

-- Deny all writes to anon/auth (only service_role can write)
-- No policy needed - RLS denies by default

-- ============================================================================
-- startup_metrics_current: Public read, admin write
-- ============================================================================
CREATE POLICY "metrics_current_select_anon" ON startup_metrics_current
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "metrics_current_select_auth" ON startup_metrics_current
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- startup_metrics_history: Public read, admin write
-- ============================================================================
CREATE POLICY "metrics_history_select_anon" ON startup_metrics_history
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "metrics_history_select_auth" ON startup_metrics_history
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- provider_connections: Deny all to anon/auth (service_role only)
-- ============================================================================
-- No policies for anon/auth - RLS denies by default
-- Service role bypasses RLS, so it can access directly

-- ============================================================================
-- provider_tokens: Deny all to anon/auth (service_role only)
-- ============================================================================
-- No policies for anon/auth - RLS denies by default
-- Service role bypasses RLS, so it can access directly
-- This table contains sensitive credentials and should NEVER be accessible to public

-- ============================================================================
-- 7. Helper Functions
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_startups_updated_at
  BEFORE UPDATE ON startups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_provider_connections_updated_at
  BEFORE UPDATE ON provider_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_provider_tokens_updated_at
  BEFORE UPDATE ON provider_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_startup_metrics_current_updated_at
  BEFORE UPDATE ON startup_metrics_current
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
