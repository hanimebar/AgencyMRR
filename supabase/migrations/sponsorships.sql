-- Sponsorships table for monetization
-- This table tracks paid sponsorships/featured listings

CREATE TABLE IF NOT EXISTS public.sponsorships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'featured_listing', 'category_hero', 'homepage_sponsor'
  category TEXT, -- For category-specific sponsorships
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'active', 'cancelled', 'expired'
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  stripe_checkout_session_id TEXT,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sponsorships_startup ON public.sponsorships(startup_id);
CREATE INDEX IF NOT EXISTS idx_sponsorships_type ON public.sponsorships(type);
CREATE INDEX IF NOT EXISTS idx_sponsorships_status ON public.sponsorships(status);
CREATE INDEX IF NOT EXISTS idx_sponsorships_active ON public.sponsorships(startup_id, type, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_sponsorships_subscription ON public.sponsorships(stripe_subscription_id);

-- Enable RLS
ALTER TABLE public.sponsorships ENABLE ROW LEVEL SECURITY;

-- Public read policy (anyone can see active sponsorships)
CREATE POLICY IF NOT EXISTS "Public read sponsorships"
ON public.sponsorships
FOR SELECT
USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sponsorships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_sponsorships_updated_at ON public.sponsorships;
CREATE TRIGGER update_sponsorships_updated_at
  BEFORE UPDATE ON public.sponsorships
  FOR EACH ROW
  EXECUTE FUNCTION update_sponsorships_updated_at();
