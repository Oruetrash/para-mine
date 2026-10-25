import { $, $$ } from '../lib/dom.js';
import { get } from '../store/store.js';
import { ensure } from '../services/data.js';
import { requestPushPermission } from '../services/push.js';
import { logout } from '../services/auth.js';
import { openLayer, closeTop, dismissAllLayers, getView, setView } from './layers.js';
import { toast } from './toast.js';

export function show(view) {
  $$('.nav-btn').forEach((b) => {
    const active = b.dataset.view === view;
    b.classList.toggle('active', active);
    if (active) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  $$('.view').forEach((v) => v.classList.remove('active'));
  const el = $('#view-' + view);
  if (el) el.classList.add('active');
  window.scrollTo({ top: 0 });
}

export async function go(view) {
  dismissAllLayers();
  if (getView() === view && history.state && history.state.view === view) {
    show(view);
    await ensure(view);
    return;
  }
  history.pushState({ view }, '', '#' + view);
  setView(view);
  show(view);
  await ensure(view);
}

export function renderMasMenu() {
  const items = [
    { view: 'canciones', icono: '🎵', texto: 'Música' },
    { view: 'razones', icono: '💌', texto: 'Razones' },
    { view: 'arte', icono: '🎨', texto: 'Su arte' },
    { view: 'tequiero', icono: '❤️', texto: 'Te quiero' },
    { view: 'diario', icono: '📓', texto: 'Diario' },
    { view: 'planes', icono: '🗺️', texto: 'Planes' },
    { view: 'capsula', icono: '⏳', texto: 'Cápsula' },
    { view: 'cartas', icono: '✉️', texto: 'Cartas' },
    { view: 'lugares', icono: '📍', texto: 'Lugares' },
    { view: 'reto', icono: '🎯', texto: 'Reto' },
    { view: 'mood', icono: '🌤️', texto: 'Mood' },
  ];
  if (get('who') === 'el') items.push({ view: 'creador', icono: '🔐', texto: 'Creador' });
  items.push({
    icono: '🔔', texto: 'Notificaciones',
    action: async () => {
      try { await requestPushPermission(); toast.success('Notificaciones activadas ✅'); }
      catch (e) { toast.error('No se pudo activar'); }
    },
  });
  items.push({ icono: '🚪', texto: 'Cerrar sesión', action: () => logout() });
  const grid = $('#mas-grid');
  grid.innerHTML = '';
  items.forEach((it) => {
    const b = document.createElement('button');
    b.className = 'mas-item';
    b.innerHTML = `<span class="mi">${it.icono}</span><span class="mt">${it.texto}</span>`;
    b.addEventListener('click', () => (it.action ? it.action() : go(it.view)));
    grid.appendChild(b);
  });
}

export function initRouter() {
  $$('.nav-btn').forEach((btn) => {
    if (btn.id === 'nav-mas') {
      btn.addEventListener('click', () => openLayer($('#mas-menu')));
      return;
    }
    btn.addEventListener('click', () => go(btn.dataset.view));
  });
  $$('.cta').forEach((btn) => btn.addEventListener('click', () => go(btn.dataset.go)));
  $('#mas-close').addEventListener('click', closeTop);
}
