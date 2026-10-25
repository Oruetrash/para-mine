import { $, $$ } from '../lib/dom.js';
import { get, set } from '../store/store.js';
import { MESES, SLOTS, fechaCorta } from '../lib/format.js';
import { toast } from './toast.js';
import { saveTextAction, doUpload, sendParaVos, saveLugar, saveCancion, saveAdviento, ensure } from '../services/data.js';

// ---------- Capas + History API (el botón Atrás cierra la capa superior) ----------
const layers = [];
let view = 'inicio';

export const getView = () => view;
export const setView = (v) => { view = v; };
export const layersCount = () => layers.length;

export function openLayer(el, onClose) {
  if (el.tagName === 'DIALOG') el.showModal();
  else el.classList.remove('hidden');
  layers.push({ el, onClose });
  history.pushState({ layer: layers.length }, '');
}

export function closeTop() { if (layers.length) history.back(); }

export function closeLayerTop() {
  const top = layers.pop();
  if (top) {
    if (top.el.tagName === 'DIALOG') top.el.close();
    else top.el.classList.add('hidden');
    top.onClose?.();
  }
  return !!top;
}

export function dismissAllLayers() {
  let closed = false;
  while (layers.length) { closeLayerTop(); closed = true; }
  if (closed && history.state && history.state.layer != null) history.replaceState({ view }, '');
  return closed;
}

export function initHistory(onView) {
  addEventListener('popstate', (e) => {
    const st = e.state || {};
    if (layers.length > (st.layer ?? 0)) {
      closeLayerTop();
    } else {
      view = st.view || 'inicio';
      onView && onView(view);
      ensure(view);
    }
  });
  // ESC: los <dialog> lo manejan vía el evento `cancel`; acá cubrimos lightbox/mas-menu.
  addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const top = layers[layers.length - 1];
    if (top && top.el.tagName !== 'DIALOG') closeTop();
  });
}

// ---------- Lightbox ----------
export function openLightbox(url) {
  if (!url) return;
  $('#lightbox-img').src = url;
  openLayer($('#lightbox'));
}
function initLightbox() {
  $('#lightbox').addEventListener('click', (e) => {
    if (e.target.id === 'lightbox' || e.target.classList.contains('lightbox-close')) closeTop();
  });
}

// ---------- Modal de texto genérico ----------
export function openTextModal(title, placeholder, action, id) {
  set('modalCtx', { action, id: id || null });
  $('#text-modal-title').textContent = title;
  $('#text-modal-text').value = '';
  $('#text-modal-text').placeholder = placeholder || 'Escribí acá…';
  const extra = $('#text-modal-extra');
  extra.classList.add('hidden');
  if (action === 'capsula') { extra.classList.remove('hidden'); extra.type = 'date'; extra.placeholder = 'Fecha de apertura'; }
  else if (action === 'cartas') { extra.classList.remove('hidden'); extra.type = 'text'; extra.placeholder = 'Título (opcional)'; }
  else if (action === 'lugares') { extra.classList.remove('hidden'); extra.type = 'text'; extra.placeholder = 'Nombre del lugar'; }
  openLayer($('#text-modal'));
}

// ---------- Modal de subir foto ----------
export function openUploadModal(ctx) {
  set('uploadContext', ctx);
  let label;
  if (ctx.tipo === 'dia') label = 'Foto juntos de hoy';
  else if (ctx.tipo === 'arte') label = 'Subir un dibujo / plano';
  else label = `${SLOTS.find((s) => s.tipo === ctx.slot)?.label || 'Extra'} · ${MESES[ctx.mes - 1]} ${ctx.anio}`;
  $('#upload-slot-label').textContent = label;
  $('#upload-input').value = '';
  openLayer($('#upload-modal'));
}

// ---------- Modal "Para vos" ----------
export function openPvModal() {
  const para = get('who') === 'el' ? 'ella' : 'el';
  $('#pv-label').textContent = `Mandale una foto a ${para === 'el' ? 'Él' : 'Ella'}`;
  $('#pv-input').value = '';
  $('#pv-text').value = '';
  openLayer($('#pv-modal'));
}

export function openLugarModal() {
  $('#lugar-nombre').value = '';
  $('#lugar-desc').value = '';
  $('#lugar-ubicacion').value = '';
  openLayer($('#lugar-modal'));
}

export function openCancionModal() {
  $('#cancion-link').value = '';
  $('#cancion-msg').value = '';
  openLayer($('#cancion-modal'));
}

export function openAdventModal(fecha, entry) {
  set('advFecha', fecha);
  $('#adviento-titulo').textContent = `Puerta del ${fechaCorta(fecha)}`;
  $('#adv-titulo').value = entry?.titulo || '';
  $('#adv-texto').value = entry?.tipo === 'texto' ? (entry.texto || '') : '';
  $('#adv-foto').value = '';
  $('#adv-cancion').value = entry?.tipo === 'cancion' ? (entry.url || '') : '';
  setAdvTipo(entry?.tipo || 'texto');
  openLayer($('#adviento-modal'));
}

export function setAdvTipo(tipo) {
  set('advTipo', tipo);
  $$('#adv-tipo button').forEach((b) => b.classList.toggle('active', b.dataset.tipo === tipo));
  $('#adv-texto').classList.toggle('hidden', tipo !== 'texto');
  $('#adv-foto').classList.toggle('hidden', tipo !== 'foto');
  $('#adv-cancion').classList.toggle('hidden', tipo !== 'cancion');
}

export function initLayers() {
  initLightbox();

  // ESC en un <dialog> dispara `cancel`; lo convertimos en cierre por la pila de capas.
  $$('dialog').forEach((dlg) => dlg.addEventListener('cancel', (e) => { e.preventDefault(); closeTop(); }));

  $('#text-cancel').addEventListener('click', closeTop);
  $('#text-save').addEventListener('click', async () => {
    const texto = $('#text-modal-text').value.trim();
    const extra = $('#text-modal-extra').value.trim();
    const { action, id } = get('modalCtx') || {};
    if (!texto && action !== 'respuesta') { toast.error('Escribí algo'); return; }
    try {
      await saveTextAction(action, texto, extra, id);
      closeTop();
    } catch (e) { toast.error(e.message || 'No se pudo guardar'); }
  });

  $('#upload-cancel').addEventListener('click', closeTop);
  $('#upload-do').addEventListener('click', async () => {
    const file = $('#upload-input').files[0];
    if (!file) { toast.error('Elegí una foto primero'); return; }
    const btn = $('#upload-do');
    btn.disabled = true;
    try {
      await doUpload(get('uploadContext'), file);
      closeTop();
    } catch (e) { toast.error(e.message || 'No se pudo subir'); }
    finally { btn.disabled = false; }
  });

  $('#pv-cancel').addEventListener('click', closeTop);
  $('#pv-save').addEventListener('click', async () => {
    const file = $('#pv-input').files[0];
    if (!file) { toast.error('Elegí una foto primero'); return; }
    const msg = $('#pv-text').value.trim() || null;
    const btn = $('#pv-save');
    btn.disabled = true;
    try {
      await sendParaVos(file, msg);
      closeTop();
    } catch (e) { toast.error(e.message || 'No se pudo enviar'); }
    finally { btn.disabled = false; }
  });

  $('#lugar-cancel').addEventListener('click', closeTop);
  $('#lugar-save').addEventListener('click', async () => {
    const nombre = $('#lugar-nombre').value.trim();
    const desc = $('#lugar-desc').value.trim();
    const ubic = $('#lugar-ubicacion').value.trim();
    if (!nombre && !desc) { toast.error('Poné al menos un nombre o una descripción'); return; }
    try {
      await saveLugar(nombre, desc, ubic);
      closeTop();
    } catch (e) { toast.error(e.message || 'No se pudo guardar'); }
  });

  $('#cancion-cancel').addEventListener('click', closeTop);
  $('#cancion-save').addEventListener('click', async () => {
    const link = $('#cancion-link').value.trim();
    const msg = $('#cancion-msg').value.trim() || null;
    try {
      await saveCancion(link, msg);
      closeTop();
    } catch (e) { toast.error(e.message || 'No se pudo agregar'); }
  });

  $$('#adv-tipo button').forEach((b) => b.addEventListener('click', () => setAdvTipo(b.dataset.tipo)));
  $('#adviento-cancel').addEventListener('click', closeTop);
  $('#adviento-save').addEventListener('click', async () => {
    const fecha = get('advFecha');
    const tipo = get('advTipo');
    const titulo = $('#adv-titulo').value.trim() || null;
    const texto = $('#adv-texto').value.trim();
    const url = $('#adv-cancion').value;
    const file = $('#adv-foto').files[0] || null;
    const existing = (get('adviento') || []).find((a) => a.fecha === fecha);
    const btn = $('#adviento-save');
    btn.disabled = true;
    try {
      await saveAdviento(fecha, tipo, titulo, texto, url, file, existing);
      closeTop();
    } catch (e) { toast.error(e.message || 'No se pudo guardar'); }
    finally { btn.disabled = false; }
  });

  $('#door-close').addEventListener('click', closeTop);
  $('#door-modal').addEventListener('click', (e) => { if (e.target.id === 'door-modal') closeTop(); });
}
