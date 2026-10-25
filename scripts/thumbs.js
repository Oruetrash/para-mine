// Genera thumbs (480px) para las fotos del álbum ya subidas y llena la columna `thumb`.
// Uso:
//   SUPABASE_SERVICE_ROLE_KEY=<service_role> node scripts/thumbs.js
// Requiere: npm install (sharp ya está en devDependencies).
const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');
const WebSocket = require('ws');

const URL = process.env.SUPABASE_URL || 'https://sswyltqxarvkvpcpbqrf.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_KEY) {
  console.error('Falta SUPABASE_SERVICE_ROLE_KEY (Settings → API → service_role).');
  process.exit(1);
}
const supabase = createClient(URL, SERVICE_KEY, { auth: { persistSession: false }, realtime: { transport: WebSocket } });

async function main() {
  const { data: fotos, error } = await supabase.from('fotos').select('id, url, thumb');
  if (error) throw error;

  let ok = 0, fail = 0, skip = 0;
  for (const f of fotos) {
    if (f.thumb) { skip++; continue; }
    if (!f.url || f.url.toLowerCase().endsWith('.mp4')) { skip++; continue; }
    try {
      const { data: blob, error: dlErr } = await supabase.storage.from('fotos').download(f.url);
      if (dlErr) throw dlErr;
      const buf = Buffer.from(await blob.arrayBuffer());
      const thumb = await sharp(buf).rotate().resize({ width: 480, withoutEnlargement: true }).jpeg({ quality: 75 }).toBuffer();
      const thumbPath = `thumbs/${f.url.replace(/\.[^.]+$/, '')}.jpg`;
      const { error: upErr } = await supabase.storage.from('fotos').upload(thumbPath, thumb, { contentType: 'image/jpeg', upsert: true });
      if (upErr) throw upErr;
      const { error: updErr } = await supabase.from('fotos').update({ thumb: thumbPath }).eq('id', f.id);
      if (updErr) throw updErr;
      ok++;
      console.log(`OK   ${f.url}`);
    } catch (e) {
      fail++;
      console.error(`FAIL ${f.url}: ${e.message}`);
    }
  }
  console.log(`\nTerminado. OK=${ok} FAIL=${fail} SKIP=${skip}`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
