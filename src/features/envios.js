import { $ } from '../lib/dom.js';
import { get, on, set } from '../store/store.js';
import { CONFIG } from '../config.js';
import { fechaCorta, whoLabel, escapeHtml, pickN, FRANJAS } from '../lib/format.js';
import { openTextModal } from '../ui/layers.js';
import { sendEnvio } from '../services/data.js';

function renderEnvios() {
  const wrap = $('#diario-envios');
  const who = get('who');
  const para = who === 'el' ? 'ella' : 'el';
  wrap.innerHTML = '';

  // Componer: una franja por turno
  const comp = document.createElement('div');
  comp.className = 'compose-card';
  comp.innerHTML = `<h4>Mandale algo a ${whoLabel(para)}</h4><p class="compose-hint">Uno por turno: mañana, mediodía y noche.</p>`;
  const mis = (get('mensajes') || []).filter((m) => m.de === who);

  FRANJAS.forEach((fr) => {
    const enviado = mis.find((m) => m.franja === fr.id);
    const row = document.createElement('div');
    row.className = 'franja-row' + (enviado ? ' done' : '');
    if (enviado) {
      row.innerHTML = `<span class="franja-ico">${fr.icono}</span><span class="franja-label">${fr.label}</span><span class="franja-msg">${enviado.tipo === 'quiz' ? '🎯' : '💌'} ${escapeHtml(enviado.texto)}</span>`;
    } else {
      row.innerHTML = `<span class="franja-ico">${fr.icono}</span><span class="franja-label">${fr.label}</span>
        <button class="franja-btn" data-et="mensaje" data-franja="${fr.id}" aria-label="Enviar mensaje (${fr.label})">💌</button>
        <button class="franja-btn" data-et="quiz" data-franja="${fr.id}" aria-label="Enviar quiz (${fr.label})">🎯</button>`;
    }
    comp.appendChild(row);
  });

  const picker = document.createElement('div');
  picker.className = 'env-picker hidden';
  comp.appendChild(picker);
  wrap.appendChild(comp);

  comp.querySelectorAll('.franja-btn').forEach((b) => b.addEventListener('click', () => {
    set('envFranja', b.dataset.franja);
    set('envTipo', b.dataset.et);
    renderPicker(picker, b.dataset.et);
  }));

  // Bandeja (lo que mandó el otro, por franja)
  const incoming = (get('mensajes') || []).filter((m) => m.de === para);
  if (incoming.length) {
    incoming.slice().reverse().forEach((m) => {
      const card = document.createElement('div');
      card.className = 'envio-card';
      const fr = FRANJAS.find((f) => f.id === m.franja);
      card.innerHTML = `<div class="env-tag">${m.tipo === 'quiz' ? '🎯 Quiz de ' : '💌 Mensaje de '}${whoLabel(m.de)}${fr ? ' · ' + fr.icono + ' ' + fr.label : ''}</div>
        <div class="env-texto">"${escapeHtml(m.texto)}"</div>
        ${m.respuesta ? `<div class="env-respuesta">↳ ${escapeHtml(m.respuesta)}</div>` : ''}`;
      if (m.tipo === 'quiz' && !m.respuesta) {
        const btn = document.createElement('button');
        btn.className = 'btn-big ghost';
        btn.textContent = 'Responder';
        btn.addEventListener('click', () => openTextModal('Tu respuesta', '', 'respuesta', m.id));
        card.appendChild(btn);
      }
      wrap.appendChild(card);
    });
  }
}

function renderPicker(picker, tipo) {
  const opts = tipo === 'quiz' ? pickN(CONFIG.BANK_QUIZ, 2) : pickN(CONFIG.BANK_MENSAJES, 2);
  let html = '';
  opts.forEach((o) => { html += `<button class="opt-btn" data-env="${escapeHtml(o)}">${escapeHtml(o)}</button>`; });
  html += `<button class="opt-btn" data-env="propio" style="font-style:italic">✍️ Escribir el mío…</button>`;
  picker.innerHTML = html;
  picker.classList.remove('hidden');
  picker.querySelectorAll('[data-env]').forEach((b) => b.addEventListener('click', () => {
    const val = b.dataset.env;
    if (val === 'propio') openTextModal('Escribí el tuyo', '', 'envio');
    else sendEnvio(val, get('envFranja')).catch(() => {});
    picker.classList.add('hidden');
  }));
}

export function initEnvios() {
  on('mensajes', renderEnvios);
  on('who', renderEnvios);
  on('envTipo', renderEnvios);
}
