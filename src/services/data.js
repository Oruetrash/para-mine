import { db } from '../lib/supabase.js';
import { CONFIG } from '../config.js';
import { get, set, setStatus } from '../store/store.js';
import { todayStr, whoLabel, extractSpotifyId, sanitizeBase } from '../lib/format.js';
import { REPOS, ORDERS, fotosRepo, notasRepo, fotosDiaRepo, paraVosRepo, mensajesRepo, arteRepo, teQuieroRepo, advientoRepo, propuestaRepo } from './repo.js';
import { signUrls, signUrl, uploadFile, removeFiles } from './storage.js';
import { sendPush } from './push.js';
import { toast } from '../ui/toast.js';

// ---------- Carga ----------
let loadToken = 0;
const ALL_TABLES = Object.keys(REPOS);

export async function loadData() {
  const token = ++loadToken;
  setStatus('app', 'loading');
  ALL_TABLES.forEach((t) => setStatus(t, 'loading'));
  try {
    const [fotos, notas, fotosDia, paraVos, mensajes, razones, arte, teQuiero, diario, planes, capsula, cartas, lugares, reto, mood, adviento, canciones] = await Promise.all([
      fotosRepo.list((q) => q.order('creado_en')),
      notasRepo.list((q) => q.order('creado_en')),
      fotosDiaRepo.list((q) => q.order('fecha')),
      paraVosRepo.list(),
      mensajesRepo.list(),
      REPOS.razones.list(),
      arteRepo.list(),
      teQuieroRepo.list(),
      REPOS.diario.list(),
      REPOS.planes.list(),
      REPOS.capsula.list((q) => q.order('abre_en')),
      REPOS.cartas.list(),
      REPOS.lugares.list(),
      REPOS.reto.list(),
      REPOS.mood.list(),
      advientoRepo.list((q) => q.order('fecha')),
      REPOS.canciones.list(),
    ]);
    const propuesta = await propuestaRepo.list((q) => q.eq('id', 1)).then((r) => r[0] || null);
    if (token !== loadToken) return;

    set('fotos', fotos); set('notas', notas); set('fotosDia', fotosDia); set('paraVos', paraVos);
    set('mensajes', mensajes); set('razones', razones); set('arte', arte); set('teQuiero', teQuiero);
    set('diario', diario); set('planes', planes); set('capsula', capsula); set('cartas', cartas);
    set('lugares', lugares); set('reto', reto); set('mood', mood); set('adviento', adviento);
    set('canciones', canciones); set('propuesta', propuesta);

    const paths = new Set();
    [...fotos, ...fotosDia, ...paraVos, ...arte].forEach((f) => { if (f.url) paths.add(f.url); });
    adviento.forEach((a) => { if (a.tipo === 'foto' && a.url) paths.add(a.url); });
    const urls = await signUrls(paths);
    if (token !== loadToken) return;

    set('signedUrls', urls);
    ALL_TABLES.forEach((t) => setStatus(t, 'ready'));
    setStatus('app', 'ready');
  } catch (e) {
    if (token === loadToken) {
      ALL_TABLES.forEach((t) => setStatus(t, 'error'));
      setStatus('app', 'error');
      toast.error(e.message || 'No se pudo cargar');
    }
  }
}

export async function refetchTable(t) {
  const r = REPOS[t];
  if (!r) return;
  setStatus(t, 'loading');
  try {
    const rows = await r.list(ORDERS[t]);
    set(t, rows);
    setStatus(t, 'ready');
  } catch (e) {
    setStatus(t, 'error');
    throw e;
  }
}

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
    case 'envio': await sendEnvio(texto); return;
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
    const { anio, mes, slot } = ctx;
    storagePath = `${anio}/${mes}/${slot}/${safe}_${Date.now()}${ext}`;
    insert = () => db.from('fotos').insert({ anio, mes, tipo: slot, url: storagePath, subido_por: 'app' });
    table = 'fotos';
  }
  const { error: upErr } = await uploadFile(storagePath, file, ct);
  if (upErr) throw upErr;
  const { error: inErr } = await insert();
  if (inErr) throw inErr;
  await refetchTable(table);
  await addSignedUrl(storagePath);
}

export async function sendParaVos(file, msg) {
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
  const { error } = await db.from('canciones').insert({ spotify_id: id, de: get('who'), mensaje: msg || null });
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
  await refetchTable('teQuiero');
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

export function removeEntry(table, id) {
  return mutate(table,
    (rows) => (rows || []).filter((r) => r.id !== id),
    () => db.from(table).delete().eq('id', id)
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

export async function removeFoto(id) {
  const f = (get('fotos') || []).find((x) => x.id === id);
  if (f && f.url) await removeFiles([f.url]);
  const { error } = await db.from('fotos').delete().eq('id', id);
  if (error) throw error;
  await refetchTable('fotos');
}

export async function removeNota(id) {
  const { error } = await db.from('notas').delete().eq('id', id);
  if (error) throw error;
  await refetchTable('notas');
}

export async function removeDia(id) {
  const e = (get('fotosDia') || []).find((f) => f.id === id);
  if (e && e.url) await removeFiles([e.url]);
  const { error } = await db.from('fotos_dia').delete().eq('id', id);
  if (error) throw error;
  await refetchTable('fotosDia');
}

export async function removeParaVos(id) {
  const f = (get('paraVos') || []).find((x) => x.id === id);
  if (f && f.url) await removeFiles([f.url]);
  const { error } = await db.from('fotos_para_vos').delete().eq('id', id);
  if (error) throw error;
  await refetchTable('paraVos');
}

export async function removeCancion(id) {
  const { error } = await db.from('canciones').delete().eq('id', id);
  if (error) throw error;
  await refetchTable('canciones');
}

export async function sendEnvio(texto) {
  const who = get('who');
  const tipo = get('envTipo');
  const para = who === 'el' ? 'ella' : 'el';
  const { error } = await db.from('mensajes_diarios').insert({ fecha: todayStr(), tipo, texto, de: who });
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
