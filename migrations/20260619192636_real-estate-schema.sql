-- ============================================================
-- INVESTORS & CRITERIA
-- ============================================================
CREATE TABLE public.investors (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.investor_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES public.investors(id) ON DELETE CASCADE,
  label TEXT DEFAULT 'default',
  markets TEXT[] DEFAULT '{}',
  min_beds INT,
  max_beds INT,
  min_price NUMERIC,
  max_price NUMERIC,
  min_cap_rate NUMERIC,
  property_types TEXT[] DEFAULT '{}',
  strategy TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LISTINGS
-- ============================================================
CREATE TABLE public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT UNIQUE,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT,
  beds INT,
  baths NUMERIC(3,1),
  sqft INT,
  lot_sqft INT,
  year_built INT,
  property_type TEXT DEFAULT 'single_family',
  list_price NUMERIC NOT NULL,
  rent_estimate NUMERIC,
  arv_estimate NUMERIC,
  rehab_estimate NUMERIC DEFAULT 0,
  hoa_monthly NUMERIC DEFAULT 0,
  taxes_annual NUMERIC DEFAULT 0,
  insurance_annual NUMERIC DEFAULT 0,
  photo_url TEXT,
  photo_key TEXT,
  status TEXT DEFAULT 'active',
  lat NUMERIC,
  lng NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX listings_city_state_idx ON public.listings(city, state);
CREATE INDEX listings_price_idx ON public.listings(list_price);
CREATE INDEX listings_status_idx ON public.listings(status);

-- ============================================================
-- AREA STATS
-- ============================================================
CREATE TABLE public.area_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT,
  crime_index NUMERIC,
  violent_crime_rate NUMERIC,
  property_crime_rate NUMERIC,
  median_income NUMERIC,
  population INT,
  school_rating NUMERIC,
  rent_growth_yoy NUMERIC,
  appreciation_yoy NUMERIC,
  vacancy_rate NUMERIC,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (city, state, zip)
);

-- ============================================================
-- WATCHLIST
-- ============================================================
CREATE TABLE public.watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES public.investors(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  notes TEXT,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (investor_id, listing_id)
);

-- ============================================================
-- CONVERSATIONS
-- ============================================================
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID REFERENCES public.investors(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  vapi_call_id TEXT,
  transcript TEXT,
  summary TEXT,
  tools_used TEXT[] DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.area_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "listings_public_read" ON public.listings
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "area_stats_public_read" ON public.area_stats
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "investors_select_own" ON public.investors
  FOR SELECT TO authenticated USING (id = (SELECT auth.uid()));

CREATE POLICY "investors_insert_own" ON public.investors
  FOR INSERT TO authenticated WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "investors_update_own" ON public.investors
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "criteria_select_own" ON public.investor_criteria
  FOR SELECT TO authenticated USING (investor_id = (SELECT auth.uid()));

CREATE POLICY "criteria_insert_own" ON public.investor_criteria
  FOR INSERT TO authenticated WITH CHECK (investor_id = (SELECT auth.uid()));

CREATE POLICY "criteria_update_own" ON public.investor_criteria
  FOR UPDATE TO authenticated
  USING (investor_id = (SELECT auth.uid()))
  WITH CHECK (investor_id = (SELECT auth.uid()));

CREATE POLICY "watchlist_select_own" ON public.watchlist
  FOR SELECT TO authenticated USING (investor_id = (SELECT auth.uid()));

CREATE POLICY "watchlist_insert_own" ON public.watchlist
  FOR INSERT TO authenticated WITH CHECK (investor_id = (SELECT auth.uid()));

CREATE POLICY "watchlist_delete_own" ON public.watchlist
  FOR DELETE TO authenticated USING (investor_id = (SELECT auth.uid()));

CREATE POLICY "conversations_select_own" ON public.conversations
  FOR SELECT TO authenticated USING (investor_id = (SELECT auth.uid()));

-- Grants
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.listings, public.area_stats TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investors TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investor_criteria TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.watchlist TO authenticated;
GRANT SELECT ON public.conversations TO authenticated;

-- updated_at triggers
CREATE TRIGGER investors_updated_at BEFORE UPDATE ON public.investors
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();
CREATE TRIGGER investor_criteria_updated_at BEFORE UPDATE ON public.investor_criteria
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();
CREATE TRIGGER listings_updated_at BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();
CREATE TRIGGER area_stats_updated_at BEFORE UPDATE ON public.area_stats
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();
