import { $ } from '../lib/dom.js';
import { get, on, set } from '../store/store.js';
import { CONFIG } from '../config.js';
import { fechaCorta, whoLabel, escapeHtml, pickN } from '../lib/format.js';
import { openTextModal } from '../ui/layers.js';
import { sendEnvio } from '../services/data.js';

function renderEnvios() {
  const wrap = $('#diario-envios');
  const who = get('who');
  const para = who === 'el' ? 'ella' : 'el';
  wrap.innerHTML = '';

  // Componer
  const comp = document.createElement('div');
  comp.className = 'compose-card';
  const opts = get('envTipo') === 'quiz' ? pickN(CONFIG.BANK_QUIZ, 2) : pickN(CONFIG.BANK_MENSAJES, 2);
  comp.innerHTML = `<h4>Mandale ${get('envTipo') === 'quiz' ? 'un quiz' : 'un mensaje'} a ${whoLabel(para)}</h4>
    <div class="pv-tabs" style="margin-bottom:10px">
      <button class="pv-tab ${get('envTipo') === 'mensaje' ? 'active' : ''}" data-et="mensaje">Mensaje</button>
      <button class="pv-tab ${get('envTipo') === 'quiz' ? 'active' : ''}" data-et="quiz">Quiz</button>
    </div>`;
  opts.forEach((o) => { comp.innerHTML += `<button class="opt-btn" data-env="${escapeHtml(o)}">${escapeHtml(o)}</button>`; });
  comp.innerHTML += `<button class="opt-btn" data-env="propio" style="font-style:italic">✍️ Escribir el mío…</button>`;
  wrap.appendChild(comp);
  comp.querySelectorAll('[data-et]').forEach((b) => b.addEventListener('click', () => {
    set('envTipo', b.dataset.et);
  }));
  comp.querySelectorAll('[data-env]').forEach((b) => b.addEventListener('click', () => {
    const val = b.dataset.env;
    if (val === 'propio') openTextModal('Escribí el tuyo', '', 'envio');
    else sendEnvio(val).catch(() => {});
  }));

  // Bandeja (lo que mandó el otro)
  const incoming = (get('mensajes') || []).filter((m) => m.de === para);
  if (incoming.length) {
    incoming.slice().reverse().slice(0, 10).forEach((m) => {
      const card = document.createElement('div');
      card.className = 'envio-card';
      card.innerHTML = `<div class="env-tag">${m.tipo === 'quiz' ? '🎯 Quiz de ' : '💌 Mensaje de '}${whoLabel(m.de)} · ${fechaCorta(m.fecha)}</div>
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

export function initEnvios() {
  on('mensajes', renderEnvios);
  on('who', renderEnvios);
  on('envTipo', renderEnvios);
}
