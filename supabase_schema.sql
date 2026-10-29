-- Trevisan Inmuebles — Módulo C: manual listings table.
-- Run once: Supabase Dashboard → SQL Editor → New query → paste this file → Run.
-- The site reads this table with the public anon key (see src/lib/supabase.ts) and merges the rows
-- with the scraped catalogue (src/data/properties.json). Add listings from Table Editor → properties.

create table if not exists public.properties (
  id          uuid primary key default gen_random_uuid(),
  title       text        not null,
  price       numeric     not null default 0,                 -- 0 = "Consultar precio"
  location    text        not null default '',                -- e.g. 'Villa Cabello, Posadas'
  operation   text        not null check (operation in ('venta', 'alquiler')),
  type        text        not null check (type in ('casa', 'departamento', 'terreno', 'local', 'ph', 'oficina')),
  images      text[]      not null default '{}',              -- public image URLs; the first one is the cover
  created_at  timestamptz not null default now(),

  -- Optional extras used by the listing cards / detail page
  currency    text        not null default 'USD' check (currency in ('USD', 'ARS')),
  description text        not null default '',
  bedrooms    int,
  bathrooms   int,
  area        numeric,                                        -- m²
  featured    boolean     not null default false
);

create index if not exists properties_created_at_idx on public.properties (created_at desc);

-- Row Level Security: anyone (anon key) can READ; only the dashboard / service_role can write.
alter table public.properties enable row level security;

drop policy if exists "Public read access" on public.properties;
create policy "Public read access"
  on public.properties for select
  to anon, authenticated
  using (true);

-- Example row (delete after testing):
-- insert into public.properties (title, price, location, operation, type, images, currency, bedrooms, bathrooms, area, featured)
-- values ('Casa moderna con pileta', 185000, 'Villa Cabello, Posadas', 'venta', 'casa',
--         array['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=85'],
--         'USD', 3, 2, 240, true);
