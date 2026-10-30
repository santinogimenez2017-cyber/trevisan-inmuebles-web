-- Trevisan Inmuebles — Módulo C: manual listings table.
-- Run once: Supabase Dashboard → SQL Editor → New query → paste this file → Run.
-- It is idempotent: safe on an empty project AND on a project that already has the first version of
-- the table (columns `type` / `area` are renamed in place, existing rows are kept).
-- The site reads this table with the public anon key (see src/lib/supabase.ts) and merges the rows
-- with the scraped catalogue (src/data/properties.json). Add listings from Table Editor → properties.

create table if not exists public.properties (
  id            uuid primary key default gen_random_uuid(),
  title         text        not null,
  slug          text,                                          -- optional; generated from the title when empty
  operation     text        not null check (operation in ('venta', 'alquiler')),
  property_type text        not null check (property_type in ('casa', 'departamento', 'terreno', 'local', 'ph', 'oficina')),
  price         numeric     not null default 0,                -- 0 = "Consultar precio"
  currency      text        not null default 'USD' check (currency in ('USD', 'ARS')),
  location      text        not null default '',               -- e.g. 'Villa Cabello, Posadas'
  address       text,
  bedrooms      int         not null default 0,
  bathrooms     int         not null default 0,
  covered_area  numeric,                                       -- m² cubiertos
  total_area    numeric     not null default 0,                -- m² totales
  description   text        not null default '',
  images        text[]      not null default '{}',             -- public image URLs; the first one is the cover
  featured      boolean     not null default false,
  status        text        not null default '',               -- badge text, e.g. 'A estrenar', 'En pozo'
  created_at    timestamptz not null default now()
);

-- ── Upgrade from the first version of the table (type/area → property_type/total_area) ─────────────
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'properties' and column_name = 'type') then
    alter table public.properties rename column type to property_type;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'properties' and column_name = 'area') then
    alter table public.properties rename column area to total_area;
  end if;
end $$;

alter table public.properties add column if not exists slug         text;
alter table public.properties add column if not exists address      text;
alter table public.properties add column if not exists covered_area numeric;
alter table public.properties add column if not exists status       text not null default '';

-- bedrooms / bathrooms / total_area were nullable in the first version: normalise, then enforce defaults.
update public.properties set bedrooms   = 0 where bedrooms   is null;
update public.properties set bathrooms  = 0 where bathrooms  is null;
update public.properties set total_area = 0 where total_area is null;
alter table public.properties alter column bedrooms   set default 0;
alter table public.properties alter column bedrooms   set not null;
alter table public.properties alter column bathrooms  set default 0;
alter table public.properties alter column bathrooms  set not null;
alter table public.properties alter column total_area set default 0;
alter table public.properties alter column total_area set not null;

create index if not exists properties_created_at_idx on public.properties (created_at desc);
create unique index if not exists properties_slug_key on public.properties (slug) where slug is not null and slug <> '';

-- Row Level Security: anyone (anon key) can READ; only the dashboard / service_role can write.
alter table public.properties enable row level security;

drop policy if exists "Public read access" on public.properties;
create policy "Public read access"
  on public.properties for select
  to anon, authenticated
  using (true);

-- Example row (delete after testing):
-- insert into public.properties
--   (title, slug, operation, property_type, price, currency, location, address, bedrooms, bathrooms,
--    covered_area, total_area, description, images, featured, status)
-- values
--   ('Casa moderna con pileta', 'casa-moderna-con-pileta', 'venta', 'casa', 185000, 'USD', 'Villa Cabello, Posadas',
--    'Av. Ejemplo 1234', 3, 2, 180, 240, 'Casa de tres dormitorios con pileta y quincho.',
--    array['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=85'],
--    true, 'A estrenar');
