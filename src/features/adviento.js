import { $ } from '../lib/dom.js';
import { get, on } from '../store/store.js';
import { CONFIG } from '../config.js';
import { fechaCorta, dateStr, hoyStr, escapeHtml } from '../lib/format.js';
import { openAdventModal } from '../ui/layers.js';
import { signUrl } from '../services/storage.js';
import { mountSpotifyFacades } from '../ui/spotify.js';
import { startReveal } from './cofre.js';

function previewCumple() {
  return new URLSearchParams(location.search).get('preview') === '1' && get('serverWho') === 'el';
}

function getAdventDays() {
  const days = [];
  const d = new Date(CONFIG.ADVIENTO_INICIO);
  const end = new Date(CONFIG.CUMPLE);
  while (d <= end) { days.push(new Date(d)); d.setDate(d.getDate() + 1); }
  return days;
}

function renderCalendario() {
  const wrap = $('#calendario');
  if (!wrap) return;
  const days = getAdventDays();
  const hoy = hoyStr();
  const esPreview = previewCumple();
  const cumpleStr = dateStr(CONFIG.CUMPLE);
  let html = '<div class="cal-grid">';
  days.forEach((d, i) => {
    const ds = dateStr(d);
    const n = i + 1;
    const esHoy = ds === hoy;
    const abierta = esPreview || ds < hoy || esHoy;
    const esFinal = ds === cumpleStr;
    const entry = (get('adviento') || []).find((a) => a.fecha === ds);
    if (esFinal) {
      html += `<button class="cal-door cal-final ${abierta ? 'open' : 'locked'}" data-day="${ds}">
        <span class="cal-num">${n}</span><span class="cal-ico">${abierta ? '🎁' : '🔒'}</span>
        <span class="cal-txt">${abierta ? 'Tu regalo' : 'Se abre el ' + CONFIG.CUMPLE_TEXTO}</span></button>`;
    } else if (!abierta) {
      html += `<div class="cal-door locked"><span class="cal-num">${n}</span><span class="cal-ico">🔒</span><span class="cal-txt">${fechaCorta(ds)}</span></div>`;
    } else {
      const ico = entry ? (entry.tipo === 'foto' ? '📷' : entry.tipo === 'cancion' ? '🎵' : '💌') : '✨';
      html += `<button class="cal-door open ${esHoy && !esPreview ? 'today' : ''}" data-day="${ds}">
        <span class="cal-num">${n}</span><span class="cal-ico">${ico}</span>
        <span class="cal-txt">${esPreview ? fechaCorta(ds) : (esHoy ? '¡Hoy!' : fechaCorta(ds))}</span></button>`;
    }
  });
  html += '</div>';
  wrap.innerHTML = html;
  wrap.querySelectorAll('.cal-door[data-day]').forEach((b) => b.addEventListener('click', () => openDoor(b.dataset.day)));
}

async function openDoor(fecha) {
  if (fecha === dateStr(CONFIG.CUMPLE)) { startReveal(); return; }
  const entry = (get('adviento') || []).find((a) => a.fecha === fecha);
  const c = $('#door-content');
  c.innerHTML = `<div class="door-fecha">${fechaCorta(fecha)}</div>`;
  if (!entry) {
    c.innerHTML += `<div class="door-empty">Todavía no hay nada acá para este día… 😉</div>`;
  } else if (entry.tipo === 'foto') {
    const u = await signUrl(entry.url);
    c.innerHTML += `${entry.titulo ? `<div class="door-titulo">${escapeHtml(entry.titulo)}</div>` : ''}<img src="${u || ''}" alt="sorpresa" />`;
  } else if (entry.tipo === 'cancion') {
    c.innerHTML += `${entry.titulo ? `<div class="door-titulo">${escapeHtml(entry.titulo)}</div>` : ''}<div class="sp-mount" data-spotify="${entry.url}" data-label="${escapeHtml(entry.titulo || 'Reproducir')}"></div>`;
  } else {
    c.innerHTML += `${entry.titulo ? `<div class="door-titulo">${escapeHtml(entry.titulo)}</div>` : ''}<div class="door-texto">${escapeHtml(entry.texto || '')}</div>`;
  }
  $('#door-modal').classList.remove('hidden');
  mountSpotifyFacades($('#door-content'));
}

export function renderAdventAdmin() {
  const wrap = $('#adv-admin');
  if (!wrap) return;
  const days = getAdventDays();
  wrap.innerHTML = '';
  days.forEach((d, i) => {
    const ds = dateStr(d);
    const esFinal = i === days.length - 1;
    if (esFinal) {
      const row = document.createElement('div');
      row.className = 'adv-row';
      row.innerHTML = `<span class="adv-dia">Día ${i + 1}</span><span class="adv-resumen">🎁 El cofre (se abre solo ese día)</span>`;
      wrap.appendChild(row);
      return;
    }
    const entry = (get('adviento') || []).find((a) => a.fecha === ds);
    const resumen = entry
      ? (entry.tipo === 'foto' ? '📷 ' + (entry.titulo || 'Foto') : entry.tipo === 'cancion' ? '🎵 Canción' : '💬 ' + ((entry.texto || '').slice(0, 26)))
      : '— vacío —';
    const row = document.createElement('div');
    row.className = 'adv-row';
    row.innerHTML = `<span class="adv-dia">Día ${i + 1}</span><span class="adv-resumen">${escapeHtml(resumen)} · ${fechaCorta(ds)}</span><button class="mini-btn" data-adv="${ds}">✏️</button>`;
    row.querySelector('[data-adv]').addEventListener('click', () => openAdventModal(ds, entry));
    wrap.appendChild(row);
  });
}

export function initAdviento() {
  on('adviento', renderCalendario);
  on('serverToday', renderCalendario);
  on('serverWho', renderCalendario);
  on('adviento', renderAdventAdmin);
}
