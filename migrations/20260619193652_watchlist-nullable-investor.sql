-- Allow hackathon demo watchlist saves without authenticated investor
ALTER TABLE public.watchlist ALTER COLUMN investor_id DROP NOT NULL;
