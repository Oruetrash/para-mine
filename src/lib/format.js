import { get } from '../store/store.js';

export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export const SLOTS = [
  { tipo: 'nosotros1', label: 'Nosotros #1', icono: '💑' },
  { tipo: 'nosotros2', label: 'Nosotros #2', icono: '💞' },
  { tipo: 'ella', label: 'Ella', icono: '🌹' },
];

export const FRANJAS = [
  { id: 'manana', label: 'Mañana', icono: '🌅' },
  { id: 'mediodia', label: 'Mediodía', icono: '☀️' },
  { id: 'noche', label: 'Noche', icono: '🌙' },
];

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Inicio del día local como ISO (para filtrar "hoy" en servidor sin romperse con el huso).
export function startOfLocalDayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function whoLabel(w) { return w === 'el' ? 'Él' : 'Ella'; }

export function saludo() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días,';
  if (h < 20) return 'Buenas tardes,';
  return 'Buenas noches,';
}

export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Fecha "hoy" del servidor (vía rpc hoy()); si no llegó, cae al reloj local.
export function hoyStr() { return get('serverToday') || todayStr(); }

export function fechaCorta(str) {
  if (!str) return '';
  const [y, m, d] = String(str).split('-').map(Number);
  return `${d} ${MESES[m - 1].slice(0, 3)}`;
}

export function dateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function pickN(arr, n) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, n);
}

export function extractSpotifyId(input) {
  const s = (input || '').trim();
  const m = s.match(/track\/([A-Za-z0-9]+)/) || s.match(/^([A-Za-z0-9]{22})$/);
  return m ? m[1] : null;
}

export function sanitizeBase(name) {
  return String(name || '')
    .replace(/\.[^.]+$/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .slice(0, 60);
}
