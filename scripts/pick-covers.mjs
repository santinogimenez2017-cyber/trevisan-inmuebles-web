// Adds a `cover` field to every listing in src/data/properties.json: the highest-resolution landscape
// photo among the first CANDIDATES images (read from the JPEG header via a Range request, ~64 kB each).
// The CDN only serves one size per photo (max 1440 px wide), so "best quality" = the largest
// landscape frame. Thumbnail URLs (/thumb/, _thumb, small size tokens) are never considered, and
// frames narrower than MIN_WIDTH are treated as thumbnails too. Run after `npm run scrape`:  npm run covers
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const FILE = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/properties.json');
const CANDIDATES = 5;
const MIN_WIDTH = 800; // anything narrower is a thumbnail, not a cover
const THUMB_RE = /\/thumbs?\/|[_\-.](thumb|small|mini|min|xs|sm)\b|[?&](w|width|size)=\d{1,3}(&|$)|\/\d{2,3}x\d{2,3}\//i;
const CONCURRENCY = 8;

/** Reads width/height from the first SOFn marker of a JPEG buffer. */
function jpegSize(buf) {
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}

async function probe(url) {
  try {
    const res = await fetch(url, { headers: { Range: 'bytes=0-65535' } });
    const buf = Buffer.from(await res.arrayBuffer());
    return jpegSize(buf);
  } catch {
    return null;
  }
}

const list = JSON.parse(await readFile(FILE, 'utf8'));
let next = 0;
let landscape = 0;

async function worker() {
  while (next < list.length) {
    const p = list[next++];
    let best = null;
    const full = p.images.filter(u => !THUMB_RE.test(u));
    for (const url of (full.length ? full : p.images).slice(0, CANDIDATES)) {
      const s = await probe(url);
      if (!s || s.w < MIN_WIDTH) continue;
      const area = s.w * s.h;
      const score = s.w / s.h >= 1.2 ? area : area * 0.5; // landscape wins; portrait only as a fallback
      if (!best || score > best.score) best = { url, score, ...s };
    }
    if (best) {
      p.cover = best.url;
      p.coverRatio = +(best.w / best.h).toFixed(2);
      if (best.w / best.h >= 1.2) landscape++;
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
await writeFile(FILE, JSON.stringify(list, null, 2) + '\n', 'utf8');
console.log(`✓ cover set on ${list.filter(p => p.cover).length}/${list.length} listings (${landscape} landscape)`);
