import { $, $$ } from '../lib/dom.js';
import { get, on, set } from '../store/store.js';
import { CONFIG } from '../config.js';
import { fechaCorta, whoLabel, escapeHtml } from '../lib/format.js';
import { openCancionModal } from '../ui/layers.js';
import { removeCancion } from '../services/data.js';

function renderCanciones() {
  const wrap = $('#canciones');
  wrap.innerHTML = '';
  Object.values(CONFIG.CANCIONES).forEach((block) => {
    const div = document.createElement('div');
    div.className = 'music-block';
    div.innerHTML = `<h3>${block.titulo}</h3><p class="music-desc">${block.descripcion}</p>`;
    block.tracks.forEach((t) => {
      const iframe = document.createElement('iframe');
      iframe.src = `https://open.spotify.com/embed/track/${t.id}`;
      iframe.width = '100%';
      iframe.height = '152';
      iframe.frameBorder = '0';
      iframe.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
      iframe.loading = 'lazy';
      div.appendChild(iframe);
    });
    wrap.appendChild(div);
  });

  wrap.insertAdjacentHTML('beforeend', '<div class="divider"><span>🎧</span></div><h3 class="script sub-heading">Nuestras canciones</h3>');
  wrap.insertAdjacentHTML('beforeend', '<button class="add-btn" id="add-cancion">+ Agregar una canción</button>');
  wrap.insertAdjacentHTML('beforeend', '<div class="songs-tabs"><button class="song-tab active" data-st="todos">Todas</button><button class="song-tab" data-st="de-ella">De ella</button><button class="song-tab" data-st="mias">Las que dediqué</button></div>');
  wrap.insertAdjacentHTML('beforeend', '<div id="songs-list"></div>');
  $('#add-cancion').addEventListener('click', openCancionModal);
  wrap.querySelectorAll('.songs-tabs .song-tab').forEach((t) => t.addEventListener('click', () => {
    set('songTab', t.dataset.st);
  }));
  renderSongList();
}

function renderSongList() {
  const list = $('#songs-list');
  if (!list) return;
  const tab = get('songTab');
  $$('.songs-tabs .song-tab').forEach((t) => t.classList.toggle('active', t.dataset.st === tab));
  const who = get('who');
  const items = (get('canciones') || []).filter((c) => {
    if (tab === 'de-ella') return c.de === 'ella';
    if (tab === 'mias') return c.de === who;
    return true;
  }).slice().reverse();
  list.innerHTML = '';
  if (!items.length) { list.innerHTML = '<p class="pv-empty">Todavía no hay canciones acá. 🎵</p>'; return; }
  items.forEach((c) => {
    const div = document.createElement('div');
    div.className = 'song-item';
    const fecha = (c.creado_en || '').slice(0, 10);
    div.innerHTML = `<div class="song-meta"><span class="song-de">${whoLabel(c.de)}${fecha ? ' · ' + fechaCorta(fecha) : ''}</span><button class="song-del">🗑️</button></div>
      ${c.mensaje ? `<div class="song-msg">"${escapeHtml(c.mensaje)}"</div>` : ''}
      <iframe src="https://open.spotify.com/embed/track/${c.spotify_id}" width="100%" height="152" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
    div.querySelector('.song-del').addEventListener('click', () => { if (confirm('¿Borrar esta canción?')) removeCancion(c.id).catch(() => {}); });
    list.appendChild(div);
  });
}

export function initMusica() {
  renderCanciones();
  on('canciones', renderSongList);
  on('songTab', renderSongList);
  on('who', renderSongList);
}
