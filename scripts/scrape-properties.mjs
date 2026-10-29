// Scrapes real listings from https://trevisan.com.ar/ and writes src/data/properties.json
//
// trevisan.com.ar lists properties in paginated pages (propiedades.php) and embeds the
// detail sheet ("ficha") from ficha.amaira.com.ar in an iframe. We read the listing pages
// to discover slugs and then read each ficha directly for the full data set.
//
// Usage: npm run scrape

import * as cheerio from 'cheerio';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = 'https://trevisan.com.ar';
const FICHA = 'https://ficha.amaira.com.ar';
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/properties.json');
const CONCURRENCY = 5;
const MAX_PAGES = 20;

async function getHtml(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (TrevisanScraper)' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      if (attempt === retries) throw new Error(`${url}: ${err.message}`);
      await new Promise(r => setTimeout(r, 500 * attempt));
    }
  }
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }));
  return results;
}

const SLUG_RE = /^[a-z0-9-]*-ficha-trv(\d+)$/;

/** Collects property slugs (+ listing-card bedroom text) from every page of a listing. */
async function scrapeListing(ope) {
  const found = new Map();
  for (let p = 0; p < MAX_PAGES; p++) {
    const $ = cheerio.load(await getHtml(`${SITE}/propiedades.php?tipo=&p=${p}&ope=${ope}`));
    let added = 0;
    $('li.product').each((_, li) => {
      const href = $(li).find('a.woocommerce-LoopProduct-link').attr('href') ?? '';
      const slug = href.replace(/^\/+/, '').split(/[?#]/)[0];
      if (!SLUG_RE.test(slug) || found.has(slug)) return;
      const cardBedrooms = $(li).find('dl dd').toArray()
        .map(dd => $(dd).text().match(/(\d+)\s*dormitorio/i)?.[1])
        .find(Boolean);
      found.set(slug, { cardBedrooms: cardBedrooms ? Number(cardBedrooms) : undefined });
      added++;
    });
    if (added === 0) break;
  }
  return found;
}

async function scrapeFeaturedSlugs() {
  const $ = cheerio.load(await getHtml(`${SITE}/index.php`));
  const slugs = new Set();
  $('a[href]').each((_, a) => {
    const slug = ($(a).attr('href') ?? '').replace(/^\/+/, '').split(/[?#]/)[0];
    if (SLUG_RE.test(slug)) slugs.add(slug);
  });
  return slugs;
}

const num = (text) => {
  if (!text) return undefined;
  const m = text.replace(/\s/g, '').match(/\d+(?:[.,]\d+)?/);
  if (!m) return undefined;
  const n = parseFloat(m[0].replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : undefined;
};

const clean = (s) => s.replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim();

function detectType(slug) {
  const prefix = slug.split('-')[0];
  if (prefix === 'casa') return 'casa';
  if (prefix === 'departamento') return 'departamento';
  if (prefix === 'lote' || prefix === 'terreno') return 'terreno';
  if (prefix === 'ph') return 'ph';
  if (prefix === 'oficina') return 'oficina';
  return 'local'; // local, galpon
}

/** Plain-text description: paragraphs separated by blank lines, list items as bullets. */
function descriptionText($) {
  const root = $('#desc').clone();
  root.find('h4').remove();
  const parts = [];
  root.find('p, li').each((_, el) => {
    // skip wrappers that contain other blocks (avoid duplicated text)
    if ($(el).find('p, li').length) return;
    const t = clean($(el).text());
    if (!t) return;
    parts.push(el.tagName === 'li' ? `• ${t}` : t);
  });
  return parts.join('\n').trim();
}

/** The site's upload timestamp is the unix time in the image URL query (?1792759982). */
function dateFromImages(images) {
  for (const src of images) {
    const ts = Number(src.split('?')[1]);
    if (ts > 1.4e9 && ts < 2.2e9) return new Date(ts * 1000).toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

const STATUS_LABELS = [[/estrenar/i, 'A estrenar'], [/pozo/i, 'En pozo']];

async function scrapeFicha(slug, meta, featuredSlugs) {
  const code = slug.match(SLUG_RE)[1];
  const url = `${FICHA}/?ficha=trv${code}&urlcompleta=${encodeURIComponent(`${SITE}/${slug}`)}`;
  const $ = cheerio.load(await getHtml(url));

  if ($('body').text().includes('PROPIEDAD NO ENCONTRADA') && !$('.sli-tit').length) return null;

  const info = {};
  $('ul.info_details li').each((_, li) => {
    const label = clean($(li).find('strong').first().text()).replace(/:$/, '').toLowerCase();
    const value = clean($(li).find('span').first().text());
    if (label && value) info[label] = value;
  });
  const pick = (...keys) => keys.map(k => info[k]).find(Boolean);

  const tit = $('.sli-tit');
  const [cityRaw, ...hoodParts] = clean(tit.find('h1').text()).split(',').map(clean);
  const neighborhood = clean(pick('barrio') ?? hoodParts.join(', ')) || '';
  const city = clean(pick('localidad') ?? cityRaw) || 'Posadas';

  const priceText = clean(tit.find('h3').text());
  const priceMatch = priceText.match(/(U\$S|USD|\$)\s*([\d.,]+)/i);
  const price = priceMatch ? Number(priceMatch[2].replace(/[.,]/g, '')) : 0;
  const currency = priceMatch && /^\$$/.test(priceMatch[1]) ? 'ARS' : 'USD';

  const operationText = (pick('operación', 'operacion') ?? '').toLowerCase();
  const operation = operationText.includes('alquiler') || slug.includes('-en-alquiler') ? 'alquiler' : 'venta';

  const description = descriptionText($);

  const bedrooms = meta.cardBedrooms
    ?? num(pick('dormitorios'))
    ?? (() => { const m = description.match(/(\d+)\s*dormitorios?/i); return m ? Number(m[1]) : undefined; })();

  const totalArea = num(pick('superficie terreno', 'superficie de terreno', 'superficie', 'superficie total'));
  const coveredArea = num(pick('superficie cubierta', 'superficie construida'));
  const rooms = num(pick('ambientes'));

  const images = [];
  $('#fotos .sliprop').each((_, el) => {
    const m = ($(el).attr('style') ?? '').match(/url\(['"]?([^'")]+)['"]?\)/);
    if (m) images.push(new URL(m[1], url).href.replace(/^http:/, 'https:'));
  });
  if (!images.length) {
    const og = $('meta[property="og:image"]').attr('content');
    if (og) images.push(og);
  }

  const features = $('#caract li').toArray().map(li => clean($(li).text())).filter(Boolean);
  const statusRaw = [pick('estado'), pick('antigüedad'), tit.find('h2').text()].join(' ');
  const status = STATUS_LABELS.find(([re]) => re.test(statusRaw))?.[1];

  const title = clean($('title').text()) || clean(tit.find('h2').first().text());

  return {
    id: `trv${code}`,
    slug,
    operation,
    type: detectType(slug),
    title,
    address: clean(pick('dirección', 'direccion') ?? ''),
    neighborhood,
    city,
    province: 'Misiones',
    price,
    currency,
    ...(rooms !== undefined && { rooms }),
    ...(bedrooms !== undefined && { bedrooms }),
    ...(num(pick('baños')) !== undefined && { bathrooms: num(pick('baños')) }),
    ...(totalArea !== undefined && { area: totalArea }),
    ...(coveredArea !== undefined && { coveredArea }),
    ...(num(pick('cocheras', 'cochera', 'garage')) !== undefined && { parking: num(pick('cocheras', 'cochera', 'garage')) }),
    description,
    features,
    images,
    featured: featuredSlugs.has(slug),
    ...(status && { status }),
    sourceUrl: `${SITE}/${slug}`,
    createdAt: dateFromImages(images),
  };
}

async function main() {
  console.log('→ Reading listings from', SITE);
  const [ventas, alquileres, featuredSlugs] = await Promise.all([
    scrapeListing('V'), scrapeListing('A'), scrapeFeaturedSlugs(),
  ]);
  const all = new Map([...ventas, ...alquileres]);
  console.log(`  ${ventas.size} venta + ${alquileres.size} alquiler = ${all.size} listings`);

  const entries = [...all.entries()];
  const scraped = await mapLimit(entries, CONCURRENCY, async ([slug, meta], i) => {
    try {
      const p = await scrapeFicha(slug, meta, featuredSlugs);
      process.stdout.write(`\r  ficha ${i + 1}/${entries.length}`);
      return p;
    } catch (err) {
      console.warn(`\n  ! skipped ${slug}: ${err.message}`);
      return null;
    }
  });
  console.log();

  // Higher ficha code = more recent listing; keep newest first.
  const properties = scraped
    .filter(p => p && p.images.length > 0)
    .sort((a, b) => Number(b.id.slice(3)) - Number(a.id.slice(3)));

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(properties, null, 2) + '\n', 'utf8');
  console.log(`✓ ${properties.length} properties written to ${OUT}`);
}

main().catch(err => { console.error(err); process.exit(1); });
