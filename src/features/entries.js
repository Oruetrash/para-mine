import { $ } from '../lib/dom.js';
import { get, on, getStatus } from '../store/store.js';
import { fechaCorta, todayStr, whoLabel, escapeHtml } from '../lib/format.js';
import { openLightbox, openUploadModal, openTextModal, openLugarModal } from '../ui/layers.js';
import { toggleHecho, removeEntry, sendTeQuiero, saveMood } from '../services/data.js';
import { skeleton } from '../ui/skeleton.js';
import { delegate } from '../ui/delegate.js';

// Listas genéricas estándar (id del contenedor = tabla).
const LISTS = [
  { id: 'razones', table: 'razones', addLabel: '+ Agregar una razón', title: 'Nueva razón', showAutor: true, showFecha: false, toggle: false },
  { id: 'diario', table: 'diario', addLabel: '+ Escribir una entrada', title: 'Nueva entrada', showAutor: true, showFecha: true, toggle: false },
  { id: 'planes', table: 'planes', addLabel: '+ Agregar un plan', title: 'Nuevo plan', showAutor: false, showFecha: false, toggle: true },
  { id: 'reto', table: 'reto', addLabel: '+ Proponer un reto', title: 'Nuevo reto', showAutor: false, showFecha: false, toggle: true },
  { id: 'cartas', table: 'cartas', addLabel: '+ Escribir una carta', title: 'Nueva carta', showAutor: true, showFecha: false, toggle: false },
];

function renderEntriesInto(wrap, items, opts) {
  items.forEach((it) => {
    const div = document.createElement('div');
    div.className = 'entry' + (it.hecho ? ' done' : '');
    let meta = '';
    if (opts.showAutor && it.autor) meta += whoLabel(it.autor);
    if (opts.showFecha && it.fecha) meta += (meta ? ' · ' : '') + fechaCorta(it.fecha);
    if (it.abre_en) meta += (meta ? ' · ' : '') + `se abre ${fechaCorta(it.abre_en)}`;
    if (it.titulo) meta = (meta ? meta + ' · ' : '') + escapeHtml(it.titulo);
    div.innerHTML = `<div class="entry-body"><div class="entry-texto">${escapeHtml(it.texto || it.descripcion || it.nombre)}</div>${meta ? `<div class="entry-meta">${meta}</div>` : ''}</div>
      ${opts.toggle ? `<button class="mini-btn" data-t="${it.id}">✓</button>` : ''}<button class="entry-del" data-d="${it.id}">🗑️</button>`;
    wrap.appendChild(div);
  });
}

function renderStandard(list) {
  const wrap = $('#' + list.id);
  const items = (get(list.table) || []).slice().reverse();
  if (getStatus(list.table) === 'loading' && !items.length) {
    wrap.innerHTML = '';
    skeleton('#' + list.id, 3);
    return;
  }
  wrap.innerHTML = `<button class="add-btn" data-a="${list.id}">${list.addLabel}</button>`;
  if (getStatus(list.table) === 'error' && !items.length) {
    wrap.insertAdjacentHTML('beforeend', '<p class="pv-empty">No se pudo cargar. Reintentá.</p>');
    return;
  }
  renderEntriesInto(wrap, items, list);
}

function renderCapsula() {
  const wrap = $('#capsula');
  const items = get('capsula') || [];
  if (getStatus('capsula') === 'loading' && !items.length) { wrap.innerHTML = ''; skeleton('#capsula', 3); return; }
  wrap.innerHTML = '<button class="add-btn" data-a="capsula">+ Guardar un mensaje</button>';
  const abiertas = items.filter((c) => c.abre_en && c.abre_en <= todayStr());
  const cerradas = items.filter((c) => !c.abre_en || c.abre_en > todayStr());
  renderEntriesInto(wrap, abiertas.slice().reverse(), { showAutor: true, showFecha: true });
  renderEntriesInto(wrap, cerradas.slice().reverse(), { showAutor: true });
}

function renderLugares() {
  const wrap = $('#lugares');
  const items = get('lugares') || [];
  if (getStatus('lugares') === 'loading' && !items.length) { wrap.innerHTML = ''; skeleton('#lugares', 3); return; }
  wrap.innerHTML = '<button class="add-btn" id="add-lugar">+ Agregar un lugar</button>';
  if (!items.length) { wrap.innerHTML += '<p class="pv-empty">Todavía no hay lugares guardados. 📍</p>'; }
  items.slice().reverse().forEach((l) => {
    const div = document.createElement('div');
    div.className = 'entry';
    let maps = '';
    if (l.ubicacion) {
      const q = encodeURIComponent(l.ubicacion);
      maps = `<a class="maps-link" href="https://www.google.com/maps/search/?api=1&query=${q}" target="_blank" rel="noopener">📍 Ver en Google Maps</a>`;
    }
    div.innerHTML = `<div class="entry-body">
        <div class="lugar-nombre">${escapeHtml(l.nombre || '')}</div>
        <div class="entry-texto">${escapeHtml(l.descripcion || '')}</div>
        ${maps}
      </div>
      <button class="entry-del" data-d="${l.id}">🗑️</button>`;
    wrap.appendChild(div);
  });
}

function renderArte() {
  const wrap = $('#arte');
  const items = get('arte') || [];
  if (getStatus('arte') === 'loading' && !items.length) { wrap.innerHTML = ''; skeleton('#arte', 3); return; }
  wrap.innerHTML = '<button class="add-btn" data-arte="1">+ Subir un dibujo / plano</button><div class="arte-grid"></div>';
  const grid = wrap.querySelector('.arte-grid');
  const urls = get('signedUrls') || {};
  items.slice().reverse().forEach((a) => {
    const div = document.createElement('div');
    div.className = 'arte-item';
    div.innerHTML = `<img src="${urls[a.url] || ''}" data-full="${urls[a.url] || ''}" /><div class="arte-cap">${escapeHtml(a.titulo || '')}</div>`;
    div.querySelector('img').addEventListener('click', (e) => openLightbox(e.target.dataset.full));
    grid.appendChild(div);
  });
}

function renderTeQuiero() {
  const wrap = $('#tequiero');
  const count = get('teQuieroCount') || 0;
  const hoy = get('teQuieroToday') || 0;
  wrap.innerHTML = `<div class="tq-wrap">
    <div class="tq-count">${count}</div>
    <p class="section-sub" style="margin:4px 0 16px">"te quiero" enviados</p>
    <button class="tq-btn" id="tq-btn">Te<br/>quiero</button>
    <div class="tq-today">${hoy ? `Hoy ya se mandaron ${hoy} ❤️` : 'Mandale un "te quiero" hoy ❤️'}</div>
  </div>`;
  $('#tq-btn').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    if (btn.disabled) return;
    btn.disabled = true;
    try { await sendTeQuiero(); launchHearts(e); } catch (err) {} finally { btn.disabled = false; }
  });
}

function launchHearts(e) {
  const emojis = ['❤️', '💖', '💘', '💕', '💗'];
  for (let i = 0; i < 12; i++) {
    const s = document.createElement('span');
    s.className = 'tq-burst';
    s.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    s.style.left = ((e && e.clientX ? e.clientX : innerWidth / 2) + (Math.random() * 70 - 35)) + 'px';
    s.style.top = ((e && e.clientY ? e.clientY : innerHeight / 2) - 20) + 'px';
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 1000);
  }
}

function renderMood() {
  const wrap = $('#mood');
  const emojis = ['😍', '😊', '😐', '😔', '🥺'];
  const hoy = (get('mood') || []).filter((m) => m.fecha === todayStr());
  let html = '<div class="mood-grid">';
  emojis.forEach((e) => { html += `<button class="mood-btn" data-mood="${e}">${e}</button>`; });
  html += '</div><div class="mood-today">';
  if (hoy.length) html += `Hoy: ${hoy.map((h) => `${h.mood} (${whoLabel(h.autor)})`).join(' · ')}`;
  else html += 'Todavía nadie marcó cómo se siente hoy.';
  html += '</div>';
  wrap.innerHTML = html;
  wrap.querySelectorAll('[data-mood]').forEach((b) => b.addEventListener('click', () => {
    saveMood(b.dataset.mood).catch(() => {});
  }));
}

export function initEntries() {
  LISTS.forEach((list) => {
    const wrap = $('#' + list.id);
    delegate(wrap, '[data-a]', 'click', () => openTextModal(list.title, '', list.table));
    if (list.toggle) {
      delegate(wrap, '[data-t]', 'click', (el) => {
        const it = (get(list.table) || []).find((r) => r.id === el.dataset.t);
        if (it) toggleHecho(list.table, it.id, it.hecho).catch(() => {});
      });
    }
    delegate(wrap, '[data-d]', 'click', (el) => {
      if (confirm('¿Borrar?')) removeEntry(list.table, el.dataset.d).catch(() => {});
    });
    on(list.table, () => renderStandard(list));
    on(list.table + '.status', () => renderStandard(list));
  });

  delegate($('#capsula'), '[data-a]', 'click', () => openTextModal('Cápsula del tiempo', '', 'capsula'));
  delegate($('#capsula'), '[data-d]', 'click', (el) => { if (confirm('¿Borrar?')) removeEntry('capsula', el.dataset.d).catch(() => {}); });
  on('capsula', renderCapsula);
  on('capsula.status', renderCapsula);

  delegate($('#lugares'), '#add-lugar', 'click', () => openLugarModal());
  delegate($('#lugares'), '[data-d]', 'click', (el) => { if (confirm('¿Borrar este lugar?')) removeEntry('lugares', el.dataset.d).catch(() => {}); });
  on('lugares', renderLugares);
  on('lugares.status', renderLugares);

  delegate($('#arte'), '[data-arte]', 'click', () => openUploadModal({ tipo: 'arte' }));
  on('arte', renderArte);
  on('signedUrls', renderArte);
  on('arte.status', renderArte);

  on('teQuieroCount', renderTeQuiero);
  on('teQuieroToday', renderTeQuiero);
  on('mood', renderMood);
}
