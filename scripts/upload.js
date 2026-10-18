const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');

const URL = 'https://sswyltqxarvkvpcpbqrf.supabase.co';
const KEY = 'sb_publishable_6pqP08gApFgrWTmW-s8h0Q_JCdrEU0C';
const supabase = createClient(URL, KEY, { realtime: { transport: WebSocket } });

const root = __dirname.replace(/scripts$/, '');
const dir = fs.readdirSync(root).find((d) => d.startsWith('fotoscon'));
const photosDir = path.join(root, dir);
const mapping = JSON.parse(fs.readFileSync(path.join(__dirname, 'mapping.json'), 'utf8'));

function sanitize(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/g, 'n')
    .replace(/[^a-zA-Z0-9.-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function contentType(ext) {
  if (ext === '.mp4') return 'video/mp4';
  if (ext === '.png') return 'image/png';
  return 'image/jpeg';
}

(async () => {
  await supabase.auth.signInWithPassword({ email: 'mili@nosotros.com', password: '211623' });

  // limpiar test.txt del bucket
  await supabase.storage.from('fotos').remove(['test.txt']);

  // guard: no duplicar si ya subimos
  const { data: existing } = await supabase.from('fotos').select('id').eq('subido_por', 'vos').limit(1);
  if (existing && existing.length > 0) {
    console.log('Ya hay fotos subidas (subido_por=vos). Borralas de la tabla o borrá la guard para re-subir.');
    process.exit(0);
  }

  let ok = 0, fail = 0;
  for (const m of mapping) {
    const filePath = path.join(photosDir, m.file);
    const base = m.file.slice(0, m.file.length - path.extname(m.file).length);
    const safeName = sanitize(base);
    const storagePath = `${m.anio}/${m.mes}/${m.tipo}/${safeName}${m.ext}`;

    try {
      const buf = fs.readFileSync(filePath);
      const { error: upErr } = await supabase.storage
        .from('fotos')
        .upload(storagePath, buf, { contentType: contentType(m.ext), upsert: true });
      if (upErr) throw upErr;

      const { error: inErr } = await supabase.from('fotos').insert({
        anio: m.anio,
        mes: m.mes,
        tipo: m.tipo,
        url: storagePath,
        subido_por: 'vos',
      });
      if (inErr) throw inErr;

      ok++;
      console.log(`OK   ${m.anio}-${String(m.mes).padStart(2, '0')} ${m.tipo.padEnd(9)} ${m.file}`);
    } catch (e) {
      fail++;
      console.error(`FAIL ${m.file}: ${e.message}`);
    }
  }
  console.log(`\nTerminado. OK=${ok} FAIL=${fail}`);
  process.exit(0);
})();
