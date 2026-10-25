import { $ } from '../lib/dom.js';
import { get } from '../store/store.js';
import { CONFIG } from '../config.js';
import { MESES, escapeHtml } from '../lib/format.js';
import { answerProposal } from '../services/data.js';
import { mountSpotifyFacades } from '../ui/spotify.js';

let seq = null; // AbortController de la secuencia de revelado

const revealEl = () => $('#cofre-reveal');

function enterReveal() {
  $('#cofre-calendario-wrap').classList.add('hidden');
  revealEl().classList.remove('hidden');
}

export function startReveal() {
  const p = get('propuesta');
  if (p && p.respuesta === 'si') { showCelebration(); return; }
  enterReveal();
  playSlideshow();
}

function playSlideshow() {
  seq?.abort();
  seq = new AbortController();
  const ac = seq;
  const fotos = (get('fotos') || [])
    .filter((f) => f.destacada && !(f.url || '').toLowerCase().endsWith('.mp4'))
    .sort((a, b) => (a.anio - b.anio) || (a.mes - b.mes))
    .slice(0, 20);
  if (!fotos.length) { showLetter(); return; }
  let i = 0;
  revealEl().innerHTML = `<div class="slideshow"><img id="ss-img" /><div class="ss-caption" id="ss-cap"></div><button class="btn-big ghost" id="ss-skip" style="margin-top:18px">Saltar</button></div>`;
  const render = () => {
    const urls = get('signedUrls') || {};
    $('#ss-img').src = urls[fotos[i].url] || '';
    $('#ss-cap').textContent = `${MESES[fotos[i].mes - 1]} ${fotos[i].anio}`;
  };
  render();
  $('#ss-skip').addEventListener('click', () => { ac.abort(); showLetter(); });
  const t = setInterval(() => {
    if (ac.signal.aborted) { clearInterval(t); return; }
    i++;
    if (i >= fotos.length) { clearInterval(t); showLetter(); return; }
    render();
  }, 1600);
}

function showLetter() {
  const carta = get('propuesta') && get('propuesta').carta;
  if (!carta) {
    revealEl().innerHTML = '<div class="letter-card">Todavía no es el momento… 😉</div>';
    return;
  }
  revealEl().innerHTML = '<div class="letter-card" id="letter"></div>';
  typewriter($('#letter'), carta, showProposal);
}

function typewriter(el, text, done) {
  seq?.abort();
  seq = new AbortController();
  const ac = seq;
  el.textContent = '';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = text; done(); return; }
  let i = 0;
  const t = setInterval(() => {
    if (ac.signal.aborted) { clearInterval(t); return; }
    el.textContent += text[i]; i++;
    if (i >= text.length) { clearInterval(t); done(); }
  }, 30);
}

function showProposal() {
  const p = get('propuesta') || {};
  const div = document.createElement('div');
  div.className = 'proposal';
  div.innerHTML = `<h3>${escapeHtml(p.pregunta || '')}</h3><button class="btn-si" id="btn-si">SÍ ❤️</button><button class="btn-no" id="btn-no" aria-label="No">No</button>`;
  revealEl().appendChild(div);
  $('#btn-si').addEventListener('click', celebrate);
  const no = $('#btn-no');
  const dodge = () => { no.style.position = 'fixed'; no.style.left = (Math.random() * (innerWidth - 100)) + 'px'; no.style.top = (Math.random() * (innerHeight - 60)) + 'px'; };
  no.addEventListener('touchstart', (e) => { e.preventDefault(); dodge(); }, { passive: false });
  no.addEventListener('mouseenter', dodge);
}

async function celebrate() {
  try { await answerProposal(); } catch (e) {}
  showCelebration();
}

function showCelebration() {
  enterReveal();
  const p = get('propuesta') || {};
  revealEl().innerHTML = `<div class="final-msg"><div class="big">❤️🎉❤️</div><h3>${escapeHtml(p.final || '')}</h3><p>Desde hoy, oficialmente… nuestros. Te amo, ${CONFIG.NOMBRE}.</p>
    <div style="margin-top:16px" class="sp-mount" data-spotify="${CONFIG.CANCION_CELEBRACION}" data-label="Nuestra canción"></div></div>`;
  mountSpotifyFacades(revealEl());
  launchConfetti();
}

function launchConfetti() {
  const e = ['❤️', '🤎', '🎉', '✨', '🌹', '💍'];
  for (let i = 0; i < 80; i++) {
    const c = document.createElement('span');
    c.className = 'confetti';
    c.textContent = e[Math.floor(Math.random() * e.length)];
    c.style.left = Math.random() * 100 + 'vw';
    c.style.animationDuration = (2.5 + Math.random() * 3) + 's';
    c.style.animationDelay = (Math.random() * 2) + 's';
    c.style.fontSize = (14 + Math.random() * 22) + 'px';
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 7000);
  }
}
