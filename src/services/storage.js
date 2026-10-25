import { db } from '../lib/supabase.js';

export async function signUrls(paths) {
  const map = {};
  await Promise.all([...paths].map(async (p) => {
    const { data } = await db.storage.from('fotos').createSignedUrl(p, 604800);
    if (data) map[p] = data.signedUrl;
  }));
  return map;
}

export async function signUrl(path) {
  const { data } = await db.storage.from('fotos').createSignedUrl(path, 604800);
  return data ? data.signedUrl : null;
}

export async function uploadFile(path, file, contentType) {
  return db.storage.from('fotos').upload(path, file, { contentType: contentType || file.type || 'image/jpeg', upsert: false });
}

export async function removeFiles(paths) {
  return db.storage.from('fotos').remove(paths);
}
