-- Trevisan Inmuebles — Módulo C: manual listings table.
-- Run once: Supabase Dashboard → SQL Editor → New query → paste this file → Run.
-- It is idempotent: safe on an empty project AND on a project that already has the first version of
-- the table (columns `type` / `area` are renamed in place, existing rows are kept).
-- The site reads this table with the public anon key (see src/lib/supabase.ts) and merges the rows
-- with the scraped catalogue (src/data/properties.json). Add listings from Table Editor → properties.

create table if not exists public.properties (
  id            uuid primary key default gen_random_uuid(),
  title         text        not null,
  slug          text,                                          -- optional; a trigger generates it from the title when empty
  operation     text        not null check (operation in ('venta', 'alquiler')),
  property_type text        not null check (property_type in ('casa', 'departamento', 'terreno', 'local', 'ph', 'oficina')),
  price         numeric     not null default 0,                -- 0 = "Consultar precio"
  currency      text        not null default 'USD' check (currency in ('USD', 'ARS')),
  location      text        not null default '',               -- e.g. 'Villa Cabello, Posadas'
  address       text,
  neighborhood  text        not null default '',               -- barrio, e.g. 'Centro' (used by the barrio filter); falls back to `location`
  city          text        not null default '',               -- e.g. 'Posadas'
  bedrooms      int         not null default 0,
  bathrooms     int         not null default 0,
  covered_area  numeric,                                       -- m² cubiertos
  total_area    numeric     not null default 0,                -- m² totales
  description   text        not null default '',
  images        text[]      not null default '{}',             -- public image URLs; the first one is the cover
  features      text[]      not null default '{}',             -- amenities list, e.g. {Piscina,Quincho}
  parking       int         not null default 0,                -- cocheras
  featured      boolean     not null default false,
  badge         text,                                          -- optional card badge, e.g. 'A estrenar', 'En pozo'
  status        text        not null default 'disponible',     -- the site only shows 'disponible'; use e.g. 'reservado' / 'vendido' / 'alquilado' to hide a listing
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
alter table public.properties add column if not exists neighborhood text not null default '';
alter table public.properties add column if not exists city         text not null default '';
alter table public.properties add column if not exists features     text[] not null default '{}';
alter table public.properties add column if not exists parking      int  not null default 0;
alter table public.properties add column if not exists badge        text;
alter table public.properties add column if not exists status       text not null default 'disponible';
alter table public.properties add column if not exists latitude     numeric;
alter table public.properties add column if not exists longitude    numeric;

-- status is now the publication state (the site filters status = 'disponible'): empty values become 'disponible'.
update public.properties set status = 'disponible' where status is null or btrim(status) = '';
alter table public.properties alter column status set default 'disponible';

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

-- Slug: generated from the title (+ 8 chars of the id) whenever it is left empty, so every listing has a unique URL.
create or replace function public.properties_set_slug() returns trigger
language plpgsql as $$
begin
  if new.slug is null or btrim(new.slug) = '' then
    new.slug := trim(both '-' from regexp_replace(
                  lower(translate(new.title, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')), '[^a-z0-9]+', '-', 'g'))
                || '-' || substr(new.id::text, 1, 8);
  end if;
  return new;
end $$;

drop trigger if exists properties_set_slug on public.properties;
create trigger properties_set_slug
  before insert or update of slug on public.properties
  for each row execute function public.properties_set_slug();

-- Backfill rows that were created without a slug (fires the trigger).
update public.properties set slug = null where slug is null or btrim(slug) = '';

create index if not exists properties_created_at_idx on public.properties (created_at desc);
create index if not exists properties_status_idx on public.properties (status);
create unique index if not exists properties_slug_key on public.properties (slug) where slug is not null and slug <> '';

-- status is the publication state. NOT VALID: enforced for new/edited rows without re-checking old ones.
alter table public.properties drop constraint if exists properties_status_check;
alter table public.properties add constraint properties_status_check
  check (status in ('disponible', 'reservado', 'vendido', 'alquilado')) not valid;

-- ── Admin panel (/admin) ─────────────────────────────────────────────────────────────────────
-- Who can write is decided HERE, in the database (the anon key is public, so hiding buttons in the UI
-- protects nothing). Admins are Supabase Auth users listed in public.admins.
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.admins enable row level security;   -- no policies: not readable through the API

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid())
$$;
revoke all on function public.is_admin() from public;
revoke execute on function public.is_admin() from anon;
grant execute on function public.is_admin() to authenticated;

-- Row Level Security on properties:
--   · anyone (anon key) can READ only the 'disponible' listings (what the public site shows);
--   · admins can read ALL statuses and insert / update / delete.
alter table public.properties enable row level security;

grant select on public.properties to anon;
grant select, insert, update, delete on public.properties to authenticated;

drop policy if exists "Public read access"    on public.properties;
drop policy if exists "Public read available" on public.properties;
drop policy if exists "Admin read all"         on public.properties;
drop policy if exists "Admin insert"           on public.properties;
drop policy if exists "Admin update"           on public.properties;
drop policy if exists "Admin delete"           on public.properties;

create policy "Public read available" on public.properties for select to anon, authenticated
  using (status = 'disponible');
create policy "Admin read all"  on public.properties for select to authenticated using (public.is_admin());
create policy "Admin insert"    on public.properties for insert to authenticated with check (public.is_admin());
create policy "Admin update"    on public.properties for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admin delete"    on public.properties for delete to authenticated using (public.is_admin());

-- Make yourself an admin (once): 1) Authentication → Users → Add user (email + password, "Auto Confirm"),
-- 2) run, with your email:
--   insert into public.admins (user_id) select id from auth.users where email = 'tu@email.com' on conflict do nothing;

-- ── Photos: Storage bucket `property-images` (admin panel uploads) ───────────────────────────────
-- Public bucket: anyone can read an image by its URL (no select policy => the file list stays private).
-- Only admins can upload / replace / delete. Existing external image URLs in properties.images keep working.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('property-images', 'property-images', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = 10485760, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "Admin upload property images" on storage.objects;
drop policy if exists "Admin update property images" on storage.objects;
drop policy if exists "Admin delete property images" on storage.objects;
create policy "Admin upload property images" on storage.objects for insert to authenticated
  with check (bucket_id = 'property-images' and public.is_admin());
create policy "Admin update property images" on storage.objects for update to authenticated
  using (bucket_id = 'property-images' and public.is_admin()) with check (bucket_id = 'property-images' and public.is_admin());
create policy "Admin delete property images" on storage.objects for delete to authenticated
  using (bucket_id = 'property-images' and public.is_admin());

-- ── Contact requests (forms "Dejanos tu consulta" and "Solicitar información") ─────────────────────
-- Visitors (anon key) can only INSERT; reading and managing them is for admins. The length checks are the
-- database-side guard against oversized / junk payloads (the anon key is public).
create table if not exists public.contacts (
  id          uuid        primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text        not null check (char_length(btrim(name)) between 1 and 120),
  email       text        not null check (char_length(btrim(email)) between 3 and 254 and email like '%_@_%'),
  phone       text        check (phone is null or char_length(phone) <= 40),
  message     text        not null default '' check (char_length(message) <= 4000),
  property_id uuid        references public.properties (id) on delete set null,  -- set when sent from a listing page
  status      text        not null default 'nuevo' check (status in ('nuevo', 'leido', 'respondido', 'archivado'))
);

create index if not exists contacts_created_at_idx on public.contacts (created_at desc);
create index if not exists contacts_status_idx     on public.contacts (status);

alter table public.contacts enable row level security;

grant insert on public.contacts to anon;
grant select, insert, update, delete on public.contacts to authenticated;

drop policy if exists "Public insert contact" on public.contacts;
drop policy if exists "Admin read contacts"   on public.contacts;
drop policy if exists "Admin update contacts" on public.contacts;
drop policy if exists "Admin delete contacts" on public.contacts;

-- Visitors can only create NEW requests (they cannot pre-set another status). No SELECT policy for them.
create policy "Public insert contact" on public.contacts for insert to anon, authenticated
  with check (status = 'nuevo');
create policy "Admin read contacts"   on public.contacts for select to authenticated using (public.is_admin());
create policy "Admin update contacts" on public.contacts for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admin delete contacts" on public.contacts for delete to authenticated using (public.is_admin());

-- Example row (delete after testing):
-- insert into public.properties
--   (title, slug, operation, property_type, price, currency, location, address, bedrooms, bathrooms,
--    covered_area, total_area, description, images, featured, status)
-- values
--   ('Casa moderna con pileta', 'casa-moderna-con-pileta', 'venta', 'casa', 185000, 'USD', 'Villa Cabello, Posadas',
--    'Av. Ejemplo 1234', 3, 2, 180, 240, 'Casa de tres dormitorios con pileta y quincho.',
--    array['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=85'],
--    true, 'disponible');
