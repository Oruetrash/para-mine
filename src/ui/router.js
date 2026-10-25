import { $, $$ } from '../lib/dom.js';
import { get } from '../store/store.js';
import { ensure } from '../services/data.js';
import { requestPushPermission } from '../services/push.js';
import { logout } from '../services/auth.js';
import { toast } from './toast.js';

export async function go(view) {
  $('#mas-menu').classList.add('hidden');
  $$('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  $$('.view').forEach((v) => v.classList.remove('active'));
  const el = $('#view-' + view);
  if (el) el.classList.add('active');
  window.scrollTo({ top: 0 });
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
      btn.addEventListener('click', () => $('#mas-menu').classList.remove('hidden'));
      return;
    }
    btn.addEventListener('click', () => go(btn.dataset.view));
  });
  $$('.cta').forEach((btn) => btn.addEventListener('click', () => go(btn.dataset.go)));
  $('#mas-close').addEventListener('click', () => $('#mas-menu').classList.add('hidden'));
}
