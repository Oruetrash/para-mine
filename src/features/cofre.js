import { $ } from '../lib/dom.js';
import { get } from '../store/store.js';
import { CONFIG } from '../config.js';
import { MESES, escapeHtml } from '../lib/format.js';
import { answerProposal } from '../services/data.js';

export function startReveal() {
  const p = get('propuesta');
  if (p && p.respuesta === 'si') { showCelebration(); return; }
  $('#view-cofre').innerHTML = '<div class="slideshow" id="slideshow"></div>';
  playSlideshow();
}

function playSlideshow() {
  const ss = $('#slideshow');
  const fotos = (get('fotos') || [])
    .filter((f) => f.destacada && !(f.url || '').toLowerCase().endsWith('.mp4'))
    .sort((a, b) => (a.anio - b.anio) || (a.mes - b.mes))
    .slice(0, 20);
  if (!fotos.length) { showLetter(); return; }
  let i = 0;
  let t = null;
  ss.innerHTML = `<img id="ss-img" /><div class="ss-caption" id="ss-cap"></div><button class="btn-big ghost" id="ss-skip" style="margin-top:18px">Saltar</button>`;
  const render = () => {
    const urls = get('signedUrls') || {};
    $('#ss-img').src = urls[fotos[i].url] || '';
    $('#ss-cap').textContent = `${MESES[fotos[i].mes - 1]} ${fotos[i].anio}`;
  };
  render();
  $('#ss-skip').addEventListener('click', () => { clearInterval(t); showLetter(); });
  t = setInterval(() => {
    i++;
    if (i >= fotos.length) { clearInterval(t); showLetter(); return; }
    render();
  }, 1600);
}

function showLetter() {
  const carta = get('propuesta') && get('propuesta').carta;
  if (!carta) {
    $('#view-cofre').innerHTML = '<div class="letter-card">Todavía no es el momento… 😉</div>';
    return;
  }
  $('#view-cofre').innerHTML = '<div class="letter-card" id="letter"></div>';
  typewriter($('#letter'), carta, showProposal);
}

function typewriter(el, text, done) {
  el.textContent = ''; let i = 0;
  const t = setInterval(() => { el.textContent += text[i]; i++; if (i >= text.length) { clearInterval(t); done(); } }, 30);
}

function showProposal() {
  const p = get('propuesta') || {};
  const div = document.createElement('div');
  div.className = 'proposal';
  div.innerHTML = `<h3>${escapeHtml(p.pregunta || '')}</h3><button class="btn-si" id="btn-si">SÍ ❤️</button><button class="btn-no" id="btn-no">No</button>`;
  $('#view-cofre').appendChild(div);
  $('#btn-si').addEventListener('click', celebrate);
  const no = $('#btn-no');
  const dodge = () => { no.style.position = 'fixed'; no.style.left = (Math.random() * (innerWidth - 100)) + 'px'; no.style.top = (Math.random() * (innerHeight - 60)) + 'px'; };
  no.addEventListener('touchstart', (e) => { e.preventDefault(); dodge(); });
  no.addEventListener('mouseenter', dodge);
}

async function celebrate() {
  try { await answerProposal(); } catch (e) {}
  showCelebration();
}

function showCelebration() {
  const p = get('propuesta') || {};
  $('#view-cofre').innerHTML = `<div class="final-msg"><div class="big">❤️🎉❤️</div><h3>${escapeHtml(p.final || '')}</h3><p>Desde hoy, oficialmente… nuestros. Te amo, ${CONFIG.NOMBRE}.</p>
    <div style="margin-top:16px"><iframe src="https://open.spotify.com/embed/track/${CONFIG.CANCION_CELEBRACION}" width="100%" height="152" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" style="border-radius:14px"></iframe></div></div>`;
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
