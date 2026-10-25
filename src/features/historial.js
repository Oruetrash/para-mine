import { $ } from '../lib/dom.js';
import { get, on } from '../store/store.js';
import { fechaCorta, whoLabel, escapeHtml, FRANJAS } from '../lib/format.js';

const ORDEN_FRANJA = { manana: 0, mediodia: 1, noche: 2 };

function fechasDe(rows) {
  return [...new Set(rows.map((r) => r.fecha))].sort().reverse();
}

function renderFotos() {
  const wrap = $('#hist-fotos');
  const rows = get('historialParaVos') || [];
  const urls = get('signedUrls') || {};
  wrap.innerHTML = '';
  if (!rows.length) { wrap.innerHTML = '<p class="pv-empty">Todavía no se mandaron fotos. 💌</p>'; return; }
  fechasDe(rows).forEach((fecha) => {
    const g = document.createElement('div');
    g.className = 'hist-group';
    g.innerHTML = `<div class="hist-fecha">${fechaCorta(fecha)}</div>`;
    rows.filter((r) => r.fecha === fecha).forEach((f) => {
      const url = urls[f.url] || '';
      const isVideo = (f.url || '').toLowerCase().endsWith('.mp4');
      const body = isVideo ? `<video src="${url}" controls playsinline preload="metadata"></video>` : `<img src="${url}" data-full="${url}" class="fade" />`;
      const item = document.createElement('div');
      item.className = 'hist-foto';
      item.innerHTML = `${body}<div class="hist-foto-meta">${whoLabel(f.remitente)}${f.mensaje ? ` · "${escapeHtml(f.mensaje)}"` : ''}</div>`;
      g.appendChild(item);
    });
    wrap.appendChild(g);
  });
}

function renderMensajes() {
  const wrap = $('#hist-mensajes');
  const rows = get('historialMensajes') || [];
  wrap.innerHTML = '';
  if (!rows.length) { wrap.innerHTML = '<p class="pv-empty">Todavía no hay mensajes. 💌</p>'; return; }
  fechasDe(rows).forEach((fecha) => {
    const g = document.createElement('div');
    g.className = 'hist-group';
    g.innerHTML = `<div class="hist-fecha">${fechaCorta(fecha)}</div>`;
    rows.filter((r) => r.fecha === fecha)
      .sort((a, b) => (ORDEN_FRANJA[a.franja] ?? 9) - (ORDEN_FRANJA[b.franja] ?? 9))
      .forEach((m) => {
        const fr = FRANJAS.find((x) => x.id === m.franja);
        const div = document.createElement('div');
        div.className = 'hist-msg';
        div.innerHTML = `<div class="hist-msg-head">${m.tipo === 'quiz' ? '🎯' : '💌'} ${whoLabel(m.de)}${fr ? ' · ' + fr.icono + ' ' + fr.label : ''}</div>
          <div class="hist-msg-texto">"${escapeHtml(m.texto)}"</div>
          ${m.respuesta ? `<div class="hist-msg-resp">↳ ${escapeHtml(m.respuesta)}</div>` : ''}`;
        g.appendChild(div);
      });
    wrap.appendChild(g);
  });
}

export function renderHistorial() {
  renderFotos();
  renderMensajes();
}

export function initHistorial() {
  on('historialParaVos', renderHistorial);
  on('historialMensajes', renderHistorial);
  on('signedUrls', renderHistorial);
  on('who', renderHistorial);
}
