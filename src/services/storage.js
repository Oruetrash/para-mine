import { db } from '../lib/supabase.js';

const KEY = 'su:v1';
const TTL = 604800; // 7 días, para que el HTTP cache pegue entre visitas

let cache = {};
try { cache = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { cache = {}; }

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch (e) {}
}

// Firma en lote (1 request) y persiste las URLs firmadas para reusarlas.
export async function signMany(paths, ttl = TTL) {
  const now = Date.now();
  const unique = [...new Set(paths)];
  const need = unique.filter((p) => !(cache[p]?.exp > now + 36e5));
  if (need.length) {
    const { data } = await db.storage.from('fotos').createSignedUrls(need, ttl);
    if (data) {
      data.forEach((d) => { if (d.signedUrl && d.path) cache[d.path] = { u: d.signedUrl, exp: now + ttl * 1000 }; });
      persist();
    }
  }
  return Object.fromEntries(unique.map((p) => [p, cache[p]?.u]));
}

// Firma una sola (para subidas nuevas); también se cachea.
export async function signUrl(path, ttl = TTL) {
  const now = Date.now();
  if (cache[path]?.exp > now + 36e5) return cache[path].u;
  const { data } = await db.storage.from('fotos').createSignedUrl(path, ttl);
  if (data?.signedUrl) { cache[path] = { u: data.signedUrl, exp: now + ttl * 1000 }; persist(); }
  return data?.signedUrl || null;
}

export function clearSignedCache() {
  cache = {};
  try { localStorage.removeItem(KEY); } catch (e) {}
}

export async function uploadFile(path, file, contentType) {
  return db.storage.from('fotos').upload(path, file, { contentType: contentType || file.type || 'image/jpeg', upsert: false });
}

export async function removeFiles(paths) {
  return db.storage.from('fotos').remove(paths);
}
