import '../css/style.css';
import { set, get } from './store/store.js';
import { $ } from './lib/dom.js';
import { saludo } from './lib/format.js';
import { initParticles } from './ui/effects.js';
import { initLayers } from './ui/layers.js';
import { initRouter, renderMasMenu } from './ui/router.js';
import { initPush, initRealtime } from './services/push.js';
import { checkSession, resolveServer, showLogin, initLogin } from './services/auth.js';
import { loadData, refetchTable } from './services/data.js';
import { initInicio, bootInicio } from './features/inicio.js';
import { initAlbum } from './features/album.js';
import { initHoy } from './features/hoy.js';
import { initEnvios } from './features/envios.js';
import { initMusica } from './features/musica.js';
import { initEntries } from './features/entries.js';
import { initAdviento } from './features/adviento.js';
import { initCreador } from './features/creador.js';

// Estado inicial
set('who', localStorage.getItem('who') || 'el');
set('signedUrls', {});
set('pvTab', 'el');
set('albumMode', 'mes');
set('songTab', 'todos');
set('envTipo', 'mensaje');
set('advTipo', 'texto');
['fotos', 'notas', 'fotosDia', 'paraVos', 'mensajes', 'razones', 'arte', 'teQuiero', 'diario', 'planes', 'capsula', 'cartas', 'lugares', 'reto', 'mood', 'adviento', 'canciones'].forEach((k) => set(k, []));
set('propuesta', null);
set('serverWho', null);
set('serverToday', null);

async function showApp() {
  $('#login-screen').classList.add('hidden');
  $('#app').classList.remove('hidden');
  $('#saludo').textContent = saludo();
  bootInicio();
  await resolveServer();
  renderMasMenu();
  initPush(get('who'));
  initRealtime(refetchTable);
  await loadData();
}

async function bootstrap() {
  initParticles();
  initLayers();
  initRouter();
  initInicio();
  initAlbum();
  initHoy();
  initEnvios();
  initMusica();
  initEntries();
  initAdviento();
  initCreador();
  initLogin(showApp);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
    navigator.serviceWorker.addEventListener('controllerchange', () => location.reload());
  }

  const ok = await checkSession();
  if (ok) await showApp();
  else showLogin();
}

bootstrap();
