import { $ } from '../lib/dom.js';
import { get, on } from '../store/store.js';
import { CONFIG } from '../config.js';
import { go } from '../ui/router.js';
import { startReveal } from './cofre.js';
import { renderAdventAdmin } from './adviento.js';

function renderCreador() {
  const wrap = $('#creador');
  const fotos = get('fotos') || [];
  const fotosDia = get('fotosDia') || [];
  const paraVos = get('paraVos') || [];
  const mensajes = get('mensajes') || [];
  const teQuiero = get('teQuiero') || [];
  const razones = get('razones') || [];
  wrap.innerHTML = `<div class="creador-card"><h3>Estadísticas</h3>
    <div class="creador-stat"><span>Fotos en el álbum</span><b>${fotos.length}</b></div>
    <div class="creador-stat"><span>Días con foto</span><b>${fotosDia.filter((f) => f.url).length}</b></div>
    <div class="creador-stat"><span>"Para vos"</span><b>${paraVos.length}</b></div>
    <div class="creador-stat"><span>Mensajes/quizzes</span><b>${mensajes.length}</b></div>
    <div class="creador-stat"><span>"Te quiero"</span><b>${teQuiero.length}</b></div>
    <div class="creador-stat"><span>Razones</span><b>${razones.length}</b></div>
    <div class="creador-stat"><span>Días juntos</span><b>${Math.floor((Date.now() - CONFIG.INICIO.getTime()) / 86400000)}</b></div>
    <button class="btn-big ghost" id="preview-cofre" style="margin-top:14px;width:100%">👁️ Ver cofre de prueba</button>
  </div>
  <div class="creador-card"><h3>Calendario de adviento</h3><p class="section-sub" style="text-align:left;font-size:13px;margin-bottom:6px">Cargá la sorpresa de cada puerta. El último día es el cofre.</p><div id="adv-admin"></div></div>`;
  $('#preview-cofre').addEventListener('click', () => { go('cofre'); startReveal(); });
  renderAdventAdmin();
}

export function initCreador() {
  on('fotos', renderCreador);
  on('fotosDia', renderCreador);
  on('paraVos', renderCreador);
  on('mensajes', renderCreador);
  on('teQuiero', renderCreador);
  on('razones', renderCreador);
}
