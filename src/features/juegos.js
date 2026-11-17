import { $ } from '../lib/dom.js';
import { CONFIG } from '../config.js';
import { escapeHtml } from '../lib/format.js';
import { go } from '../ui/router.js';
import { closeTop, openLayer } from '../ui/layers.js';
import { mountSandBlast } from '../juegos/sandblast.js';
import { mountWatermelon } from '../juegos/watermelon.js';
import { formatScore, getRecord } from '../juegos/records.js';

const GAME_MOUNTS = {
  sandblast: mountSandBlast,
  watermelon: mountWatermelon,
};

let gameCleanup = null;

function clearGame() {
  if (!gameCleanup) return;
  const fn = gameCleanup;
  gameCleanup = null;
  try { fn(); } catch (e) {}
}

function esIOS() {
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function esAndroid() {
  return /Android/i.test(navigator.userAgent || '');
}

function tiendas(juego) {
  const orden = esIOS() ? ['ios', 'android'] : ['android', 'ios'];
  return orden
    .map((tipo) => {
      if (tipo === 'ios' && juego.ios) return { url: juego.ios, label: 'App Store', icono: '🍎' };
      if (tipo === 'android' && juego.android) return { url: juego.android, label: 'Google Play', icono: '▶️' };
      return null;
    })
    .filter(Boolean);
}

function abrirJuego(id) {
  const mount = GAME_MOUNTS[id];
  if (!mount) return;
  clearGame();
  const content = $('#game-content');
  const modal = $('#game-modal');
  if (!content || !modal) return;
  content.innerHTML = '<div class="arcade-mount"></div>';
  modal.dataset.game = id;
  gameCleanup = mount(content.querySelector('.arcade-mount'), { onExit: closeTop });
  openLayer(modal, () => {
    delete modal.dataset.game;
    clearGame();
    renderJuegos();
  });
}

function renderJuegos() {
  const wrap = $('#juegos');
  if (!wrap) return;
  const juegos = CONFIG.JUEGOS || [];
  wrap.innerHTML = '';

  const grid = document.createElement('div');
  grid.className = 'juegos-grid';
  juegos.forEach((juego, i) => {
    const links = tiendas(juego);
    const record = getRecord(juego.id);
    const jugable = !!GAME_MOUNTS[juego.id];
    const card = document.createElement('article');
    card.className = 'juego-card ' + (i % 2 ? 'juego-watermelon' : 'juego-sand');
    const enlaces = links.map((l) => `
      <a class="juego-link" href="${escapeHtml(l.url)}" target="_blank" rel="noopener noreferrer"
        aria-label="Abrir ${escapeHtml(juego.nombre)} en ${l.label}">
        <span aria-hidden="true">${l.icono}</span>${l.label}
      </a>`).join('');
    card.innerHTML = `
      <div class="juego-top">
        <span class="juego-emoji" aria-hidden="true">${escapeHtml(juego.emoji)}</span>
        <div><span class="juego-tag">${escapeHtml(juego.tag || 'Su juego')}</span><h3>${escapeHtml(juego.nombre)}</h3></div>
      </div>
      <p class="juego-desc">${escapeHtml(juego.descripcion || '')}</p>
      <div class="juego-record">${record ? '🏆 Récord: ' + formatScore(record) : '🏆 Todavía sin récord'}</div>
      ${jugable ? `<button type="button" class="juego-play" data-play="${escapeHtml(juego.id)}">▶ Jugar acá</button>` : ''}
      <div class="juego-stores"><span class="juego-stores-label">O en tu tienda:</span>${enlaces}</div>`;
    grid.appendChild(card);
  });
  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-play]');
    if (btn) abrirJuego(btn.dataset.play);
  });
  wrap.appendChild(grid);

  const bonus = document.createElement('button');
  bonus.type = 'button';
  bonus.className = 'juego-bonus';
  bonus.innerHTML = `<span class="juego-bonus-emoji" aria-hidden="true">🎁</span>
    <span><strong>¿Sabías que…?</strong> Hay un mini juego escondido en el calendario.</span>
    <span class="juego-bonus-arrow" aria-hidden="true">→</span>`;
  bonus.addEventListener('click', () => go('cofre'));
  wrap.appendChild(bonus);

  const pie = document.createElement('p');
  pie.className = 'juegos-foot';
  pie.textContent = 'Se juegan acá mismo, sin salir de la página. El récord queda guardado en este dispositivo.';
  wrap.appendChild(pie);
}

export function initJuegos() {
  renderJuegos();
  $('#game-close')?.addEventListener('click', closeTop);
  $('#game-modal')?.addEventListener('click', (e) => { if (e.target.id === 'game-modal') closeTop(); });
}
