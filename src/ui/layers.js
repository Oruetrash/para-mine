import { $, $$ } from '../lib/dom.js';
import { get, set } from '../store/store.js';
import { MESES, SLOTS, fechaCorta } from '../lib/format.js';
import { toast } from './toast.js';
import { saveTextAction, doUpload, sendParaVos, saveLugar, saveCancion, saveAdviento } from '../services/data.js';

// ---------- Lightbox ----------
export function openLightbox(url) {
  if (!url) return;
  $('#lightbox-img').src = url;
  $('#lightbox').classList.remove('hidden');
}
function initLightbox() {
  $('#lightbox').addEventListener('click', (e) => {
    if (e.target.id === 'lightbox' || e.target.classList.contains('lightbox-close')) $('#lightbox').classList.add('hidden');
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
  $('#text-modal').classList.remove('hidden');
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
  $('#upload-modal').classList.remove('hidden');
}

// ---------- Modal "Para vos" ----------
export function openPvModal() {
  const para = get('who') === 'el' ? 'ella' : 'el';
  $('#pv-label').textContent = `Mandale una foto a ${para === 'el' ? 'Él' : 'Ella'}`;
  $('#pv-input').value = '';
  $('#pv-text').value = '';
  $('#pv-modal').classList.remove('hidden');
}

export function openLugarModal() {
  $('#lugar-nombre').value = '';
  $('#lugar-desc').value = '';
  $('#lugar-ubicacion').value = '';
  $('#lugar-modal').classList.remove('hidden');
}

export function openCancionModal() {
  $('#cancion-link').value = '';
  $('#cancion-msg').value = '';
  $('#cancion-modal').classList.remove('hidden');
}

export function openAdventModal(fecha, entry) {
  set('advFecha', fecha);
  $('#adviento-titulo').textContent = `Puerta del ${fechaCorta(fecha)}`;
  $('#adv-titulo').value = entry?.titulo || '';
  $('#adv-texto').value = entry?.tipo === 'texto' ? (entry.texto || '') : '';
  $('#adv-foto').value = '';
  $('#adv-cancion').value = entry?.tipo === 'cancion' ? (entry.url || '') : '';
  setAdvTipo(entry?.tipo || 'texto');
  $('#adviento-modal').classList.remove('hidden');
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

  $('#text-cancel').addEventListener('click', () => $('#text-modal').classList.add('hidden'));
  $('#text-save').addEventListener('click', async () => {
    const texto = $('#text-modal-text').value.trim();
    const extra = $('#text-modal-extra').value.trim();
    const { action, id } = get('modalCtx') || {};
    if (!texto && action !== 'respuesta') { toast.error('Escribí algo'); return; }
    try {
      await saveTextAction(action, texto, extra, id);
      $('#text-modal').classList.add('hidden');
    } catch (e) { toast.error(e.message || 'No se pudo guardar'); }
  });

  $('#upload-cancel').addEventListener('click', () => $('#upload-modal').classList.add('hidden'));
  $('#upload-do').addEventListener('click', async () => {
    const file = $('#upload-input').files[0];
    if (!file) { toast.error('Elegí una foto primero'); return; }
    const btn = $('#upload-do');
    btn.disabled = true;
    try {
      await doUpload(get('uploadContext'), file);
      $('#upload-modal').classList.add('hidden');
    } catch (e) { toast.error(e.message || 'No se pudo subir'); }
    finally { btn.disabled = false; }
  });

  $('#pv-cancel').addEventListener('click', () => $('#pv-modal').classList.add('hidden'));
  $('#pv-save').addEventListener('click', async () => {
    const file = $('#pv-input').files[0];
    if (!file) { toast.error('Elegí una foto primero'); return; }
    const msg = $('#pv-text').value.trim() || null;
    const btn = $('#pv-save');
    btn.disabled = true;
    try {
      await sendParaVos(file, msg);
      $('#pv-modal').classList.add('hidden');
    } catch (e) { toast.error(e.message || 'No se pudo enviar'); }
    finally { btn.disabled = false; }
  });

  $('#lugar-cancel').addEventListener('click', () => $('#lugar-modal').classList.add('hidden'));
  $('#lugar-save').addEventListener('click', async () => {
    const nombre = $('#lugar-nombre').value.trim();
    const desc = $('#lugar-desc').value.trim();
    const ubic = $('#lugar-ubicacion').value.trim();
    if (!nombre && !desc) { toast.error('Poné al menos un nombre o una descripción'); return; }
    try {
      await saveLugar(nombre, desc, ubic);
      $('#lugar-modal').classList.add('hidden');
    } catch (e) { toast.error(e.message || 'No se pudo guardar'); }
  });

  $('#cancion-cancel').addEventListener('click', () => $('#cancion-modal').classList.add('hidden'));
  $('#cancion-save').addEventListener('click', async () => {
    const link = $('#cancion-link').value.trim();
    const msg = $('#cancion-msg').value.trim() || null;
    try {
      await saveCancion(link, msg);
      $('#cancion-modal').classList.add('hidden');
    } catch (e) { toast.error(e.message || 'No se pudo agregar'); }
  });

  $$('#adv-tipo button').forEach((b) => b.addEventListener('click', () => setAdvTipo(b.dataset.tipo)));
  $('#adviento-cancel').addEventListener('click', () => $('#adviento-modal').classList.add('hidden'));
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
      $('#adviento-modal').classList.add('hidden');
    } catch (e) { toast.error(e.message || 'No se pudo guardar'); }
    finally { btn.disabled = false; }
  });

  $('#door-close').addEventListener('click', () => $('#door-modal').classList.add('hidden'));
  $('#door-modal').addEventListener('click', (e) => { if (e.target.id === 'door-modal') $('#door-modal').classList.add('hidden'); });
}
