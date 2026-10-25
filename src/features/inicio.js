import { $ } from '../lib/dom.js';
import { get, on } from '../store/store.js';
import { CONFIG } from '../config.js';
import { MESES, whoLabel, escapeHtml } from '../lib/format.js';

export function startCountdown() {
  const target = CONFIG.CUMPLE.getTime();
  const tick = () => {
    if (document.hidden) return;
    const view = $('#view-inicio');
    if (view && !view.classList.contains('active')) return;
    let diff = target - Date.now();
    if (diff < 0) diff = 0;
    $('#cd-dias').textContent = Math.floor(diff / 86400000);
    $('#cd-horas').textContent = Math.floor((diff % 86400000) / 3600000);
    $('#cd-min').textContent = Math.floor((diff % 3600000) / 60000);
    $('#cd-seg').textContent = Math.floor((diff % 60000) / 1000);
  };
  tick();
  setInterval(tick, 1000);
}

export function renderDiasJuntos() {
  const d = Math.floor((Date.now() - CONFIG.INICIO.getTime()) / 86400000);
  $('#dias-juntos').innerHTML = `Hace <strong>${d}</strong> días que mi mundo gira alrededor tuyo.`;
}

export function renderTimeline() {
  const tl = $('#timeline');
  tl.innerHTML = '';
  CONFIG.HISTORIA.forEach((cap) => {
    const item = document.createElement('div');
    item.className = 'tl-item';
    item.innerHTML = `<div class="tl-card"><span class="tl-icono">${cap.icono}</span><h3>${cap.titulo}</h3><p>${cap.texto}</p></div>`;
    tl.appendChild(item);
  });
}

export function renderRecuerdo() {
  const wrap = $('#recuerdo-del-dia');
  const f = get('recuerdo');
  if (!f) { wrap.innerHTML = ''; return; }
  const urls = get('signedUrls') || {};
  wrap.innerHTML = `<div class="rec-label">Recuerdo del día</div>
    <img src="${urls[f.url] || ''}" data-full="${urls[f.url] || ''}" class="fade" />
    <div class="rec-cap">${MESES[f.mes - 1]} ${f.anio}</div>`;
}

export function renderPvInicio() {
  const wrap = $('#pv-inicio');
  const who = get('who');
  const para = who === 'el' ? 'ella' : 'el';
  const suya = (get('paraVos') || []).find((f) => f.remitente === para);
  if (!suya) { wrap.innerHTML = ''; return; }
  const urls = get('signedUrls') || {};
  const url = urls[suya.url] || '';
  const isVideo = (suya.url || '').toLowerCase().endsWith('.mp4');
  wrap.innerHTML = `<div class="pv-inicio-card">
    <div class="pv-inicio-label">📸 ${whoLabel(para)} te mandó una foto hoy</div>
    ${isVideo ? `<video src="${url}" controls playsinline preload="metadata"></video>` : `<img src="${url}" data-full="${url}" class="fade" />`}
    ${suya.mensaje ? `<div class="pv-inicio-msg">"${escapeHtml(suya.mensaje)}"</div>` : ''}
  </div>`;
}

export function initInicio() {
  on('recuerdo', renderRecuerdo);
  on('signedUrls', renderRecuerdo);
  on('paraVos', renderPvInicio);
  on('signedUrls', renderPvInicio);
  on('who', renderPvInicio);
}

// Render estático del Inicio (se llama al entrar a la app).
export function bootInicio() {
  renderTimeline();
  renderDiasJuntos();
  startCountdown();
}
