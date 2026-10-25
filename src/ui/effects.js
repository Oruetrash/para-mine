import { $ } from '../lib/dom.js';

// Fondo: motas sutiles
export function initParticles() {
  const breathe = document.createElement('div');
  breathe.id = 'breathe';
  document.body.prepend(breathe);
  const bg = $('#particles-bg');
  for (let i = 0; i < 22; i++) {
    const m = document.createElement('span');
    m.className = 'mote';
    m.style.left = Math.random() * 100 + 'vw';
    m.style.animationDuration = (16 + Math.random() * 20) + 's';
    m.style.animationDelay = (Math.random() * 20) + 's';
    m.style.width = m.style.height = (2 + Math.random() * 3) + 'px';
    bg.appendChild(m);
  }
}
