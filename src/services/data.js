import { db } from '../lib/supabase.js';
import { CONFIG } from '../config.js';
import { get, set, setStatus } from '../store/store.js';
import { todayStr, dateStr, whoLabel, extractSpotifyId, sanitizeBase, startOfLocalDayISO } from '../lib/format.js';
import { REPOS, fotosRepo, notasRepo, fotosDiaRepo, paraVosRepo, mensajesRepo, arteRepo, advientoRepo, propuestaRepo } from './repo.js';
import { signMany, signUrl, uploadFile, removeFiles } from './storage.js';
import { sendPush } from './push.js';
import { toast } from '../ui/toast.js';
import { toJpeg } from '../lib/images.js';

// ---------- Carga condicional por vista ----------
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return dateStr(d); };

const FILTERS = {
  fotos: (q) => q.order('creado_en'),
  notas: (q) => q.order('creado_en'),
  fotosDia: (q) => q.gte('fecha', daysAgo(14)),
  mensajes: (q) => q.eq('de', get('who') === 'el' ? 'ella' : 'el').order('creado_en', { ascending: false }).limit(10),
  capsula: (q) => q.order('abre_en'),
  adviento: (q) => q.order('fecha'),
  mood: (q) => q.eq('fecha', todayStr()),
  paraVos: (q) => q.eq('fecha', todayStr()),
};

async function fetchInto(table, query) {
  setStatus(table, 'loading');
  const rows = await REPOS[table].list(query);
  set(table, rows);
  setStatus(table, 'ready');
  return rows;
}

async function signInto(paths) {
  const arr = [...new Set(paths)].filter(Boolean);
  if (!arr.length) return;
  const map = await signMany(arr);
  set('signedUrls', { ...(get('signedUrls') || {}), ...map });
}

async function countOf(table) {
  const { count } = await db.from(table).select('*', { count: 'exact', head: true });
  return count || 0;
}

async function loadTeQuiero() {
  setStatus('teQuiero', 'loading');
  const [{ count: total }, hoyRes] = await Promise.all([
    db.from('te_quiero').select('*', { count: 'exact', head: true }),
    db.from('te_quiero').select('*', { count: 'exact', head: true }).gte('creado_en', startOfLocalDayISO()),
  ]);
  set('teQuieroCount', total || 0);
  set('teQuieroToday', hoyRes.count || 0);
  setStatus('teQuiero', 'ready');
}

const loaders = {
  historia: () => Promise.resolve(),
  inicio: async () => {
    const [fotos, paraVos] = await Promise.all([
      fotosRepo.list(FILTERS.fotos),
      paraVosRepo.list(FILTERS.paraVos),
    ]);
    set('fotos', fotos);
    set('paraVos', paraVos);
    setStatus('fotos', 'ready');
    setStatus('paraVos', 'ready');
    const cand = fotos.filter((f) => !(f.url || '').toLowerCase().endsWith('.mp4'));
    if (cand.length) {
      const foto = cand[Math.floor(Math.random() * cand.length)];
      set('recuerdo', foto);
      await signInto([foto.url]);
    }
    await signInto(paraVos.map((p) => p.url));
  },
  hoy: async () => {
    const [fotosDia, mensajes, paraVos] = await Promise.all([
      fotosDiaRepo.list(FILTERS.fotosDia),
      mensajesRepo.list(FILTERS.mensajes),
      paraVosRepo.list(FILTERS.paraVos),
    ]);
    set('fotosDia', fotosDia); set('mensajes', mensajes); set('paraVos', paraVos);
    setStatus('fotosDia', 'ready'); setStatus('mensajes', 'ready'); setStatus('paraVos', 'ready');
    const urls = new Set();
    fotosDia.forEach((f) => f.url && urls.add(f.url));
    paraVos.forEach((f) => f.url && urls.add(f.url));
    await signInto(urls);
  },
  album: async () => {
    const [fotos, notas] = await Promise.all([fotosRepo.list(FILTERS.fotos), notasRepo.list(FILTERS.notas)]);
    set('fotos', fotos); set('notas', notas);
    setStatus('fotos', 'ready'); setStatus('notas', 'ready');
  },
  cofre: async () => {
    const [adviento, propuesta] = await Promise.all([
      advientoRepo.list(FILTERS.adviento),
      propuestaRepo.list((q) => q.eq('id', 1)).then((r) => r[0] || null),
    ]);
    set('adviento', adviento); set('propuesta', propuesta);
    setStatus('adviento', 'ready');
  },
  canciones: async () => { await fetchInto('canciones'); },
  razones: async () => { await fetchInto('razones'); },
  diario: async () => { await fetchInto('diario'); },
  planes: async () => { await fetchInto('planes'); },
  reto: async () => { await fetchInto('reto'); },
  cartas: async () => { await fetchInto('cartas'); },
  capsula: async () => { await fetchInto('capsula', FILTERS.capsula); },
  lugares: async () => { await fetchInto('lugares'); },
  arte: async () => {
    const rows = await arteRepo.list();
    set('arte', rows); setStatus('arte', 'ready');
    await signInto(rows.map((a) => a.url));
  },
  tequiero: loadTeQuiero,
  mood: async () => { await fetchInto('mood', FILTERS.mood); },
  creador: async () => {
    const [adviento, stats] = await Promise.all([
      advientoRepo.list(FILTERS.adviento),
      Promise.all([countOf('fotos'), countOf('fotos_dia'), countOf('fotos_para_vos'), countOf('mensajes_diarios'), countOf('te_quiero'), countOf('razones')]),
    ]);
    set('adviento', adviento); setStatus('adviento', 'ready');
    set('stats', { fotos: stats[0], fotosDia: stats[1], paraVos: stats[2], mensajes: stats[3], teQuiero: stats[4], razones: stats[5] });
  },
};

const loaded = new Map();

export function ensure(view) {
  if (!loaders[view]) return Promise.resolve();
  if (!loaded.has(view)) {
    const p = loaders[view]().catch((e) => { loaded.delete(view); throw e; });
    loaded.set(view, p);
  }
  return loaded.get(view);
}

export function invalidate(view) { loaded.delete(view); }
export function invalidateAll() { loaded.clear(); }

export async function refetchTable(t) {
  const r = REPOS[t];
  if (!r) return;
  setStatus(t, 'loading');
  try {
    const rows = await r.list(FILTERS[t]);
    set(t, rows);
    setStatus(t, 'ready');
  } catch (e) {
    setStatus(t, 'error');
    throw e;
  }
}

export async function refetchTeQuiero() { await loadTeQuiero(); }

// Mutación optimista: aplica `optimistic`, corre `remote`, y revierte si falla.
export async function mutate(table, optimistic, remote) {
  const prev = get(table);
  try {
    set(table, optimistic(prev));
    await remote();
  } catch (e) {
    set(table, prev);
    toast.error(e.message || 'No se pudo');
    throw e;
  }
}

async function addSignedUrl(path) {
  const u = await signUrl(path);
  if (u) set('signedUrls', { ...(get('signedUrls') || {}), [path]: u });
}

// Borrado diferido: quita optimista, muestra toast con "Deshacer" y commitea al expirar.
export function deferredRemove(storeKey, table, id, { label = 'Borrado', paths = [] } = {}) {
  const prev = get(storeKey);
  set(storeKey, (prev || []).filter((x) => x.id !== id));
  let committed = false;
  let finish;
  const timer = setTimeout(async () => {
    committed = true;
    finish?.();
    try {
      if (paths.length) await removeFiles(paths);
      const { error } = await db.from(table).delete().eq('id', id);
      if (error) { toast.error('No se pudo borrar'); await refetchTable(storeKey); }
    } catch (e) { toast.error('No se pudo borrar'); await refetchTable(storeKey); }
  }, 5000);
  finish = toast.undo(label, () => {
    clearTimeout(timer);
    if (!committed) set(storeKey, prev);
  });
}

// ---------- Acciones ----------
export async function saveTextAction(action, texto, extra, id) {
  const who = get('who');
  const hoy = todayStr();
  let table;
  switch (action) {
    case 'note': {
      const ctx = get('noteContext') || {};
      const { error } = await db.from('notas').insert({ anio: ctx.anio, mes: ctx.mes, tipo: ctx.tipo, texto, autor: who });
      if (error) throw error; table = 'notas'; break;
    }
    case 'notadia': {
      const { error } = await db.from('fotos_dia').upsert({ fecha: hoy, url: null, nota: texto }, { onConflict: 'fecha' });
      if (error) throw error; table = 'fotosDia'; break;
    }
    case 'envio': await sendEnvio(texto, get('envFranja')); return;
    case 'respuesta': {
      const { error } = await db.from('mensajes_diarios').update({ respuesta: texto }).eq('id', id);
      if (error) throw error; table = 'mensajes'; break;
    }
    case 'paravos': {
      const { error } = await db.from('fotos_para_vos').insert({ fecha: hoy, remitente: who, url: null, mensaje: texto });
      if (error) throw error; table = 'paraVos'; break;
    }
    case 'razones': {
      const { error } = await db.from('razones').insert({ texto, autor: who });
      if (error) throw error; table = 'razones'; break;
    }
    case 'diario': {
      const { error } = await db.from('diario').insert({ texto, autor: who, fecha: hoy });
      if (error) throw error; table = 'diario'; break;
    }
    case 'planes': {
      const { error } = await db.from('planes').insert({ texto, hecho: false });
      if (error) throw error; table = 'planes'; break;
    }
    case 'reto': {
      const { error } = await db.from('reto').insert({ texto, hecho: false });
      if (error) throw error; table = 'reto'; break;
    }
    case 'cartas': {
      const { error } = await db.from('cartas').insert({ titulo: extra || null, texto, autor: who });
      if (error) throw error; table = 'cartas'; break;
    }
    case 'lugares': {
      const { error } = await db.from('lugares').insert({ nombre: extra || null, descripcion: texto });
      if (error) throw error; table = 'lugares'; break;
    }
    case 'capsula': {
      const { error } = await db.from('capsula').insert({ texto, autor: who, abre_en: extra || null });
      if (error) throw error; table = 'capsula'; break;
    }
    default: return;
  }
  if (action === 'paravos') { const para = who === 'el' ? 'ella' : 'el'; sendPush(para, '💌', 'Tenés una foto/mensaje nuevo.'); }
  await refetchTable(table);
}

export async function doUpload(ctx, file) {
  const ext = '.' + (file.name.split('.').pop() || 'jpg').toLowerCase();
  const safe = sanitizeBase(file.name);
  const ct = file.type || (ext === '.mp4' ? 'video/mp4' : 'image/jpeg');
  let storagePath, insert, table;
  if (ctx.tipo === 'dia') {
    storagePath = `foto_dia/${todayStr()}_${Date.now()}${ext}`;
    insert = () => db.from('fotos_dia').upsert({ fecha: todayStr(), url: storagePath, nota: null }, { onConflict: 'fecha' });
    table = 'fotosDia';
  } else if (ctx.tipo === 'arte') {
    storagePath = `arte/${safe}_${Date.now()}${ext}`;
    insert = () => db.from('arte').insert({ url: storagePath, titulo: file.name.replace(/\.[^.]+$/, '') });
    table = 'arte';
  } else {
    // Álbum: para imágenes generamos full (2048) + thumb (480) y guardamos ambos.
    const { anio, mes, slot } = ctx;
    table = 'fotos';
    if (file.type && file.type.startsWith('image/')) {
      let full = null, thumb = null;
      try { [full, thumb] = await Promise.all([toJpeg(file, 2048, 0.82), toJpeg(file, 480, 0.75)]); } catch (e) {}
      if (full) {
        const stamp = Date.now();
        const fullPath = `${anio}/${mes}/${slot}/${safe}_${stamp}.jpg`;
        const { error: upErr } = await uploadFile(fullPath, full, 'image/jpeg');
        if (upErr) throw upErr;
        let thumbPath = null;
        if (thumb) {
          thumbPath = `thumbs/${anio}/${mes}/${slot}/${safe}_${stamp}.jpg`;
          const { error: tErr } = await uploadFile(thumbPath, thumb, 'image/jpeg');
          if (tErr) throw tErr;
        }
        const { error: inErr } = await db.from('fotos').insert({ anio, mes, tipo: slot, url: fullPath, thumb: thumbPath, subido_por: 'app' });
        if (inErr) throw inErr;
        await refetchTable('fotos');
        return;
      }
    }
    storagePath = `${anio}/${mes}/${slot}/${safe}_${Date.now()}${ext}`;
    insert = () => db.from('fotos').insert({ anio, mes, tipo: slot, url: storagePath, subido_por: 'app' });
  }
  const { error: upErr } = await uploadFile(storagePath, file, ct);
  if (upErr) throw upErr;
  const { error: inErr } = await insert();
  if (inErr) throw inErr;
  await refetchTable(table);
  await addSignedUrl(storagePath);
}

export async function sendParaVos(file, msg) {
  const who = get('who');
  if ((get('paraVos') || []).some((p) => p.remitente === who)) throw new Error('Ya enviaste tu foto hoy');
  const ext = '.' + (file.name.split('.').pop() || 'jpg').toLowerCase();
  const safe = sanitizeBase(file.name);
  const storagePath = `para_vos/${safe}_${Date.now()}${ext}`;
  const { error: upErr } = await uploadFile(storagePath, file, file.type || 'image/jpeg');
  if (upErr) throw upErr;
  const { error: inErr } = await db.from('fotos_para_vos').insert({ fecha: todayStr(), remitente: get('who'), url: storagePath, mensaje: msg || null });
  if (inErr) throw inErr;
  await refetchTable('paraVos');
  await addSignedUrl(storagePath);
  const para = get('who') === 'el' ? 'ella' : 'el';
  sendPush(para, '💌 Foto para vos', whoLabel(get('who')) + ' te mandó una foto.');
}

export async function saveLugar(nombre, desc, ubic) {
  const { error } = await db.from('lugares').insert({ nombre: nombre || null, descripcion: desc || null, ubicacion: ubic || null });
  if (error) throw error;
  await refetchTable('lugares');
}

export async function saveCancion(link, msg) {
  const id = extractSpotifyId(link);
  if (!id) throw new Error('Pegá un link de Spotify válido');
  let titulo = null;
  try {
    const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent('https://open.spotify.com/track/' + id)}`);
    if (res.ok) { const j = await res.json(); titulo = j.title || null; }
  } catch (e) {}
  const { error } = await db.from('canciones').insert({ spotify_id: id, de: get('who'), mensaje: msg || null, titulo });
  if (error) throw error;
  await refetchTable('canciones');
  const para = get('who') === 'el' ? 'ella' : 'el';
  sendPush(para, '🎵 Nueva canción', whoLabel(get('who')) + ' te dedicó una canción. ¡Escuchala!');
}

export async function saveAdviento(fecha, tipo, titulo, texto, url, file, existing) {
  let textoOut = null, urlOut = null;
  if (tipo === 'texto') {
    textoOut = texto;
    if (!textoOut) throw new Error('Escribí la sorpresa');
  } else if (tipo === 'foto') {
    if (file) {
      const ext = '.' + (file.name.split('.').pop() || 'jpg').toLowerCase();
      const safe = sanitizeBase(file.name);
      urlOut = `adviento/${fecha}_${Date.now()}${ext}`;
      const { error: upErr } = await uploadFile(urlOut, file, file.type || 'image/jpeg');
      if (upErr) throw upErr;
    } else if (existing && existing.url) {
      urlOut = existing.url;
    } else throw new Error('Elegí una foto');
  } else if (tipo === 'cancion') {
    const id = extractSpotifyId(url);
    if (!id) throw new Error('Pegá un link de Spotify válido');
    urlOut = id;
  }
  const payload = { fecha, tipo, titulo, texto: textoOut, url: urlOut };
  const { error } = existing
    ? await db.from('adviento').update(payload).eq('id', existing.id)
    : await db.from('adviento').insert(payload);
  if (error) throw error;
  await refetchTable('adviento');
  if (tipo === 'foto' && urlOut) await addSignedUrl(urlOut);
}

export async function sendTeQuiero() {
  const { error } = await db.from('te_quiero').insert({ autor: get('who') });
  if (error) throw error;
  await loadTeQuiero();
  const para = get('who') === 'el' ? 'ella' : 'el';
  sendPush(para, '❤️', 'Alguien te mandó un "te quiero".');
}

export async function saveMood(mood) {
  const { error } = await db.from('mood').insert({ fecha: todayStr(), mood, autor: get('who') });
  if (error) throw error;
  await refetchTable('mood');
}

export function toggleHecho(table, id, value) {
  return mutate(table,
    (rows) => (rows || []).map((r) => (r.id === id ? { ...r, hecho: !value } : r)),
    () => db.from(table).update({ hecho: !value }).eq('id', id)
  );
}

export function toggleDestacada(id) {
  const f = (get('fotos') || []).find((x) => x.id === id);
  if (!f) return Promise.resolve();
  return mutate('fotos',
    (rows) => (rows || []).map((r) => (r.id === id ? { ...r, destacada: !f.destacada } : r)),
    () => db.from('fotos').update({ destacada: !f.destacada }).eq('id', id)
  );
}

export async function sendEnvio(texto, franja) {
  const who = get('who');
  const tipo = get('envTipo');
  const para = who === 'el' ? 'ella' : 'el';
  const { error } = await db.from('mensajes_diarios').insert({ fecha: todayStr(), tipo, texto, de: who, franja: franja || null });
  if (error) throw error;
  sendPush(para, tipo === 'quiz' ? 'Nuevo quiz de ' + whoLabel(who) : 'Un mensaje de ' + whoLabel(who), texto);
  await refetchTable('mensajes');
}

export async function answerProposal() {
  const esElla = get('serverWho') === 'ella' || (!get('serverWho') && get('who') === 'ella');
  if (esElla) {
    const { error } = await db.from('propuesta').update({ respuesta: 'si', respondido_en: new Date().toISOString() }).eq('id', 1);
    if (error) throw error;
    sendPush('el', '🎉 ¡Dijo que SÍ!', CONFIG.NOMBRE + ' aceptó la propuesta. ❤️');
  }
  set('propuesta', { ...(get('propuesta') || {}), respuesta: 'si' });
}
