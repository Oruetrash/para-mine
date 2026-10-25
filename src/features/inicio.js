import { $ } from '../lib/dom.js';
import { get, on } from '../store/store.js';
import { CONFIG } from '../config.js';
import { MESES } from '../lib/format.js';
import { openLightbox } from '../ui/layers.js';

export function startCountdown() {
  const target = CONFIG.CUMPLE.getTime();
  const tick = () => {
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
  const fotos = (get('fotos') || []).filter((f) => !(f.url || '').toLowerCase().endsWith('.mp4'));
  if (fotos.length === 0) { wrap.innerHTML = ''; return; }
  const f = fotos[Math.floor(Math.random() * fotos.length)];
  const urls = get('signedUrls') || {};
  wrap.innerHTML = `<div class="rec-label">Recuerdo del día</div>
    <img src="${urls[f.url] || ''}" data-full="${urls[f.url] || ''}" />
    <div class="rec-cap">${MESES[f.mes - 1]} ${f.anio}</div>`;
  wrap.querySelector('img')?.addEventListener('click', (e) => openLightbox(e.target.dataset.full));
}

export function initInicio() {
  on('fotos', renderRecuerdo);
  on('signedUrls', renderRecuerdo);
}

// Render estático del Inicio (se llama al entrar a la app).
export function bootInicio() {
  renderTimeline();
  renderDiasJuntos();
  startCountdown();
}
