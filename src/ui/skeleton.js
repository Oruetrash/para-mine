import { $ } from '../lib/dom.js';

// Placeholder de carga para listas (se usa mientras status === 'loading').
export function skeleton(container, n = 3) {
  const wrap = $(container);
  if (!wrap) return;
  wrap.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const s = document.createElement('div');
    s.className = 'skeleton';
    wrap.appendChild(s);
  }
}
