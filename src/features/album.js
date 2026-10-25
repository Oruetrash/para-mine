import { $, $$ } from '../lib/dom.js';
import { get, on, set, getStatus } from '../store/store.js';
import { CONFIG } from '../config.js';
import { MESES, SLOTS, escapeHtml } from '../lib/format.js';
import { openUploadModal, openTextModal } from '../ui/layers.js';
import { toggleDestacada, deferredRemove } from '../services/data.js';
import { signMany } from '../services/storage.js';
import { skeleton } from '../ui/skeleton.js';
import { delegateMap } from '../ui/delegate.js';

let albumIO = null;

function getMonths() {
  const now = new Date();
  const endY = now.getFullYear(), endM = now.getMonth() + 1;
  const months = [];
  let y = CONFIG.INICIO.getFullYear(), m = CONFIG.INICIO.getMonth() + 1;
  while (y < endY || (y === endY && m <= endM)) { months.push({ anio: y, mes: m }); m++; if (m > 12) { m = 1; y++; } }
  return months.reverse();
}

function mediaTag(foto) {
  const isVideo = (foto.url || '').toLowerCase().endsWith('.mp4');
  if (isVideo) return `<video data-path="${foto.url}" preload="metadata" controls playsinline></video>`;
  const thumb = foto.thumb || foto.url;
  return `<img data-path="${thumb}" data-full="${foto.url}" loading="lazy" decoding="async" alt="foto" class="fade" />`;
}

// Firma en lote las fotos de las cards visibles (rootMargin 600px).
function setupLazySigning() {
  if (albumIO) albumIO.disconnect();
  albumIO = new IntersectionObserver((entries) => {
    const cards = entries.filter((e) => e.isIntersecting).map((e) => e.target);
    if (!cards.length) return;
    const paths = new Set();
    cards.forEach((card) => card.querySelectorAll('[data-path]').forEach((m) => { if (!m.src) paths.add(m.dataset.path); }));
    cards.forEach((card) => albumIO.unobserve(card));
    if (!paths.size) return;
    signMany([...paths]).then((map) => {
      cards.forEach((card) => card.querySelectorAll('[data-path]').forEach((m) => {
        const u = map[m.dataset.path];
        if (u && !m.src) m.src = u;
      }));
    }).catch(() => {});
  }, { rootMargin: '600px' });
  $$('#album .month-card, #album .mejor-card').forEach((c) => albumIO.observe(c));
}

function renderSlot(anio, mes, tipo, label, icono, foto, nota) {
  let inner = '';
  if (foto) {
    inner = mediaTag(foto);
    inner += `<div class="slot-actions">
      <button class="mini-btn star" data-action="star" data-id="${foto.id}">${foto.destacada ? '⭐' : '☆'}</button>
      <button class="mini-btn" data-action="add" data-anio="${anio}" data-mes="${mes}" data-tipo="${tipo}">➕</button>
      <button class="mini-btn" data-action="del" data-id="${foto.id}">🗑️</button></div>`;
  } else if (nota) {
    inner = `<div class="slot-note">${escapeHtml(nota.texto)}</div>
      <div class="slot-actions">
      <button class="mini-btn" data-action="add" data-anio="${anio}" data-mes="${mes}" data-tipo="${tipo}">➕</button>
      <button class="mini-btn" data-action="delnote" data-id="${nota.id}">🗑️</button></div>`;
  } else {
    inner = `<div class="slot-empty">${icono}<br/>Sin foto aún</div>
      <div class="slot-actions">
      <button class="mini-btn" data-action="add" data-anio="${anio}" data-mes="${mes}" data-tipo="${tipo}">📷</button>
      <button class="mini-btn" data-action="note" data-anio="${anio}" data-mes="${mes}" data-tipo="${tipo}">✍️</button></div>`;
  }
  return `<div class="slot ${tipo === 'ella' ? 'ella' : ''}"><span class="slot-label">${label}</span>${inner}</div>`;
}

function renderMejores(wrap) {
  const d = (get('fotos') || []).filter((f) => f.destacada);
  if (!d.length) { wrap.innerHTML = '<p style="text-align:center;color:var(--marron-claro);padding:20px">Todavía no destacaron fotos. En "Mes a mes", tocá la ⭐.</p>'; return; }
  const porMes = {};
  d.forEach((f) => { const k = `${f.anio}-${f.mes}`; (porMes[k] = porMes[k] || []).push(f); });
  Object.keys(porMes).sort((a, b) => (a < b ? 1 : -1)).forEach((k) => {
    const [anio, mes] = k.split('-').map(Number);
    const t = document.createElement('div');
    t.className = 'mejor-month-title';
    t.textContent = `${MESES[mes - 1].charAt(0).toUpperCase() + MESES[mes - 1].slice(1)} ${anio}`;
    wrap.appendChild(t);
    const g = document.createElement('div');
    g.className = 'mejores-grid';
    let cardsHtml = '';
    porMes[k].forEach((f) => { cardsHtml += `<div class="mejor-card">${mediaTag(f)}<div class="mejor-tag">⭐</div></div>`; });
    g.innerHTML = cardsHtml;
    wrap.appendChild(g);
  });
}

function renderAlbum() {
  const wrap = $('#album');
  if (getStatus('fotos') === 'loading' && !(get('fotos') || []).length) {
    wrap.innerHTML = skeleton(8, '');
    return;
  }
  wrap.innerHTML = '';
  if (get('albumMode') === 'mejores') { renderMejores(wrap); setupLazySigning(); return; }
  const fotos = get('fotos') || [];
  const notas = get('notas') || [];
  const fotosPorClave = {}, notasPorClave = {};
  fotos.forEach((f) => { const k = `${f.anio}-${f.mes}-${f.tipo}`; (fotosPorClave[k] = fotosPorClave[k] || []).push(f); });
  notas.forEach((n) => { const k = `${n.anio}-${n.mes}-${n.tipo}`; (notasPorClave[k] = notasPorClave[k] || []).push(n); });
  getMonths().forEach(({ anio, mes }) => {
    const card = document.createElement('div');
    card.className = 'month-card';
    const mesNombre = MESES[mes - 1];
    let html = `<div class="month-head"><h3>${mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1)}</h3><span class="year">${anio}</span></div><div class="slot-row">`;
    SLOTS.forEach((s) => {
      const k = `${anio}-${mes}-${s.tipo}`;
      html += renderSlot(anio, mes, s.tipo, s.label, s.icono, (fotosPorClave[k] || [])[0] || null, (notasPorClave[k] || [])[0] || null);
    });
    html += '</div>';
    const extras = [];
    (fotosPorClave[`${anio}-${mes}-extra`] || []).forEach((f) => extras.push(f));
    SLOTS.forEach((s) => { const arr = fotosPorClave[`${anio}-${mes}-${s.tipo}`] || []; for (let i = 1; i < arr.length; i++) extras.push(arr[i]); });
    if (extras.length) {
      html += `<div class="extras-row"><div class="extra-title">Más recuerdos</div><div class="extra-grid">`;
      extras.forEach((f) => { html += mediaTag(f); });
      html += '</div></div>';
    }
    card.innerHTML = html;
    wrap.appendChild(card);
  });
  setupLazySigning();
}

function openNote(anio, mes, tipo) {
  set('noteContext', { anio: parseInt(anio), mes: parseInt(mes), tipo });
  openTextModal('¿Por qué falta esta foto?', '', 'note');
}

export function initAlbum() {
  $$('.album-tab').forEach((t) => t.addEventListener('click', () => {
    set('albumMode', t.dataset.mode);
    $$('.album-tab').forEach((x) => x.classList.toggle('active', x === t));
  }));

  delegateMap($('#album'), {
    add: (d) => openUploadModal({ tipo: 'album', anio: parseInt(d.anio), mes: parseInt(d.mes), slot: d.tipo }),
    note: (d) => openNote(d.anio, d.mes, d.tipo),
    del: (d) => {
      const f = (get('fotos') || []).find((x) => x.id === d.id);
      if (f) deferredRemove('fotos', 'fotos', f.id, { label: 'Foto borrada', paths: [f.url, f.thumb].filter(Boolean) });
    },
    delnote: (d) => deferredRemove('notas', 'notas', d.id, { label: 'Nota borrada' }),
    star: (d) => toggleDestacada(d.id).catch(() => {}),
  });

  on('fotos', renderAlbum);
  on('notas', renderAlbum);
  on('albumMode', renderAlbum);
}
