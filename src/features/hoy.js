import { $, $$ } from '../lib/dom.js';
import { get, on, set } from '../store/store.js';
import { fechaCorta, todayStr, whoLabel, escapeHtml } from '../lib/format.js';
import { openUploadModal, openTextModal, openPvModal } from '../ui/layers.js';
import { deferredRemove } from '../services/data.js';

function renderHoy() {
  const hoy = todayStr();
  const entry = (get('fotosDia') || []).find((f) => f.fecha === hoy);
  const urls = get('signedUrls') || {};
  const wrap = $('#hoy');
  let html = `<div class="hoy-card"><div class="hoy-fecha">${fechaCorta(hoy)} · hoy</div><div class="hoy-titulo">Nuestra foto de hoy</div>`;
  if (entry && entry.url) {
    const isVideo = entry.url.toLowerCase().endsWith('.mp4');
    html += isVideo ? `<video src="${urls[entry.url] || ''}" controls playsinline preload="metadata"></video>`
      : `<img src="${urls[entry.url] || ''}" data-full="${urls[entry.url] || ''}" class="fade" />`;
    html += `<div class="hoy-actions"><button class="btn-big ghost" data-act="del-dia" data-id="${entry.id}">🗑️</button></div>`;
  } else if (entry && entry.nota) {
    html += `<div class="hoy-note">${escapeHtml(entry.nota)}</div>
      <div class="hoy-actions"><button class="btn-big" data-act="subir-dia">📷 Subir foto</button><button class="btn-big ghost" data-act="del-dia" data-id="${entry.id}">Borrar nota</button></div>`;
  } else {
    html += `<div class="hoy-empty">Todavía no subimos la foto de hoy.</div>
      <div class="hoy-actions"><button class="btn-big" data-act="subir-dia">📷 Subir foto</button><button class="btn-big ghost" data-act="nota-dia">✍️ Por qué no subimos</button></div>`;
  }
  html += '</div>';
  wrap.innerHTML = html;
  wrap.querySelector('[data-act="subir-dia"]')?.addEventListener('click', () => openUploadModal({ tipo: 'dia' }));
  wrap.querySelector('[data-act="nota-dia"]')?.addEventListener('click', () => openTextModal('¿Por qué no subimos foto hoy?', '', 'notadia'));
  wrap.querySelector('[data-act="del-dia"]')?.addEventListener('click', () => { deferredRemove('fotosDia', 'fotos_dia', entry.id, { label: 'Borrado', paths: entry.url ? [entry.url] : [] }); });

  const hist = $('#hoy-history');
  hist.innerHTML = '';
  for (let i = 0; i < 14; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const e = (get('fotosDia') || []).find((f) => f.fecha === ds);
    const cell = document.createElement('div');
    cell.className = 'day';
    if (e && e.url) cell.innerHTML = `<img src="${urls[e.url] || ''}" data-full="${urls[e.url] || ''}" class="fade" /><span class="day-dia">${d.getDate()}</span>`;
    else if (e && e.nota) cell.innerHTML = `<div class="day-note">💭</div><span class="day-dia">${d.getDate()}</span>`;
    else cell.innerHTML = `<div class="day-empty">·</div><span class="day-dia">${d.getDate()}</span>`;
    hist.appendChild(cell);
  }
}

function renderParaVos() {
  const wrap = $('#para-vos');
  wrap.innerHTML = '';
  const items = (get('paraVos') || []).filter((f) => f.remitente === get('pvTab'));
  const urls = get('signedUrls') || {};
  const add = document.createElement('button');
  add.className = 'pv-add-btn';
  add.textContent = '+ Enviar una foto para vos';
  add.addEventListener('click', openPvModal);
  wrap.appendChild(add);
  if (!items.length) { wrap.insertAdjacentHTML('beforeend', '<p class="pv-empty">Todavía no hay fotos acá. 💌</p>'); return; }
  items.forEach((f) => {
    const div = document.createElement('div');
    div.className = 'pv-item';
    let body = '';
    if (f.url) {
      const url = urls[f.url] || '';
      const isVideo = (f.url || '').toLowerCase().endsWith('.mp4');
      body = isVideo ? `<video src="${url}" controls playsinline preload="metadata"></video>` : `<img src="${url}" data-full="${url}" class="fade" />`;
    }
    div.innerHTML = body + `<div class="pv-meta"><button class="pv-del">🗑️</button><div class="pv-fecha">${fechaCorta(f.fecha)} · de ${whoLabel(f.remitente)}</div>${f.mensaje ? `<div class="pv-msg">"${escapeHtml(f.mensaje)}"</div>` : ''}</div>`;
    div.querySelector('.pv-del').addEventListener('click', () => { deferredRemove('paraVos', 'fotos_para_vos', f.id, { label: 'Borrado', paths: f.url ? [f.url] : [] }); });
    wrap.appendChild(div);
  });
}

export function initHoy() {
  $$('.pv-tab').forEach((t) => t.addEventListener('click', () => {
    set('pvTab', t.dataset.pv);
    $$('.pv-tab').forEach((x) => x.classList.toggle('active', x === t));
  }));
  on('fotosDia', renderHoy);
  on('signedUrls', renderHoy);
  on('paraVos', renderParaVos);
  on('signedUrls', renderParaVos);
  on('pvTab', renderParaVos);
}
