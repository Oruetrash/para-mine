import { db } from '../lib/supabase.js';
import { CONFIG } from '../config.js';
import { get, set } from '../store/store.js';
import { $, $$ } from '../lib/dom.js';
import { clearSignedCache } from './storage.js';
import { invalidateAll } from './data.js';

export async function logout() {
  await db.auth.signOut();
}

// Reaccionar a expiración/refresh fallido o cierre de sesión.
export function initAuthEvents() {
  db.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
      clearSignedCache();
      invalidateAll();
      location.reload();
    }
  });
}

// Quién soy y qué fecha es, según el servidor (no el dispositivo).
export async function resolveServer() {
  try {
    const [who, hoy] = await Promise.all([db.rpc('me'), db.rpc('hoy')]);
    if (who.data) { set('serverWho', who.data); set('who', who.data); localStorage.setItem('who', who.data); }
    if (hoy.data) set('serverToday', hoy.data);
  } catch (e) {}
}

export async function checkSession() {
  const { data } = await db.auth.getSession();
  return !!data.session;
}

export function showLogin() {
  $('#login-screen').classList.remove('hidden');
}

export function initLogin(onSuccess) {
  $$('.who-btn').forEach((b) => b.addEventListener('click', () => {
    set('who', b.dataset.who);
    $$('.who-btn').forEach((x) => x.classList.toggle('active', x === b));
  }));

  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pass = $('#password-input').value.trim();
    if (!pass) return;
    $('#login-btn').disabled = true;
    $('#login-btn').textContent = 'Entrando…';
    const email = CONFIG.LOGIN_EMAILS[get('who')] || CONFIG.LOGIN_EMAILS.el;
    const { error } = await db.auth.signInWithPassword({ email, password: pass });
    if (error) {
      $('#login-error').textContent = 'Clave incorrecta 💔';
      $('#login-btn').disabled = false;
      $('#login-btn').textContent = 'Entrar';
    } else {
      localStorage.setItem('who', get('who'));
      $('#login-error').textContent = '';
      onSuccess();
    }
  });
}
