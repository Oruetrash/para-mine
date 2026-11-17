import { CONFIG } from '../config.js';
import { MESES, escapeHtml } from '../lib/format.js';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function fechaLarga(d) {
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

function armarPregunta(pregunta, correcta, pool) {
  const distractores = shuffle([...new Set(pool.filter((o) => o !== correcta))]).slice(0, 3);
  return { pregunta, correcta, opciones: shuffle([correcta, ...distractores]) };
}

function preguntasBase() {
  const ini = CONFIG.INICIO;
  const cumple = CONFIG.CUMPLE;
  const inicioDia = new Date(ini.getFullYear(), ini.getMonth(), ini.getDate());
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const dias = Math.max(1, Math.floor((hoy - inicioDia) / 86400000));

  const fechas = [inicialFecha(ini, 1), inicialFecha(ini, -1), inicialFecha(ini, 2), inicialFecha(ini, -2), inicialFecha(ini, 3)];
  const numeros = [dias + 23, dias - 17, dias + 68, dias - 41, dias + 112]
    .filter((n) => n > 0)
    .map((n) => n.toLocaleString('es-AR'));

  return [
    armarPregunta('¿En qué mes empezó nuestra historia?', cap(MESES[ini.getMonth()]), MESES.map(cap)),
    armarPregunta('¿Qué día empezamos a estar juntos?', fechaLarga(ini), fechas),
    armarPregunta('¿Cuántos días llevamos juntos hoy?', dias.toLocaleString('es-AR'), numeros),
    armarPregunta('¿En qué mes es tu cumpleaños?', cap(MESES[cumple.getMonth()]), MESES.map(cap)),
  ];
}

function inicialFecha(base, deltaMeses) {
  const d = new Date(base.getFullYear(), base.getMonth() + deltaMeses, base.getDate());
  return fechaLarga(d);
}

function preguntasExtra() {
  const bank = Array.isArray(CONFIG.BANK_TRIVIA) ? CONFIG.BANK_TRIVIA : [];
  return bank.reduce((out, item) => {
    if (!item || !item.pregunta || !Array.isArray(item.opciones) || item.opciones.length < 2) return out;
    const opciones = item.opciones.map(String);
    const correcta = typeof item.correcta === 'number' ? opciones[item.correcta] : String(item.correcta ?? '');
    if (!correcta || !opciones.includes(correcta)) return out;
    out.push(armarPregunta(String(item.pregunta), correcta, opciones));
    return out;
  }, []);
}

function armarQuiz() {
  const extras = shuffle(preguntasExtra()).slice(0, 2);
  return shuffle([...preguntasBase(), ...extras]);
}

function mensajeResultado(aciertos, total) {
  const pct = total ? aciertos / total : 0;
  if (pct === 1) return '¡Perfecto! Sabés todo de nosotros ❤️';
  if (pct >= 0.7) return 'Muy bien… casi perfecto 😍';
  if (pct >= 0.5) return 'Nada mal, pero te tengo que contar más cositas 😏';
  return 'Ay… parece que necesitamos más tardes juntos 😅';
}

export function mountQuiz(container, { mensaje } = {}) {
  const preguntas = armarQuiz();
  let i = 0;
  let aciertos = 0;
  let locked = false;
  let timer = 0;

  container.innerHTML = '<div class="quiz-wrap"></div>';
  const wrap = container.querySelector('.quiz-wrap');

  function renderPregunta() {
    const q = preguntas[i];
    wrap.innerHTML = `
      <div class="quiz-top">
        <span class="quiz-progress">Pregunta ${i + 1} / ${preguntas.length}</span>
        <span class="quiz-score">${aciertos} acierto${aciertos === 1 ? '' : 's'}</span>
      </div>
      <div class="quiz-question">${escapeHtml(q.pregunta)}</div>
      <div class="quiz-options"></div>
      <div class="quiz-feedback" aria-live="polite"></div>`;
    const opts = wrap.querySelector('.quiz-options');
    q.opciones.forEach((texto) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'quiz-opt';
      b.textContent = texto;
      b.addEventListener('click', () => responder(texto, q, b));
      opts.appendChild(b);
    });
    locked = false;
  }

  function responder(texto, q, boton) {
    if (locked) return;
    locked = true;
    const ok = texto === q.correcta;
    if (ok) aciertos += 1;
    wrap.querySelectorAll('.quiz-opt').forEach((b) => {
      b.disabled = true;
      if (b.textContent === q.correcta) b.classList.add('correct');
    });
    if (!ok) boton.classList.add('wrong');
    const fb = wrap.querySelector('.quiz-feedback');
    fb.textContent = ok ? '¡Sí! ❤️' : `Casi… la respuesta era: ${q.correcta}`;
    fb.classList.add(ok ? 'ok' : 'no');
    wrap.querySelector('.quiz-score').textContent = `${aciertos} acierto${aciertos === 1 ? '' : 's'}`;
    timer = setTimeout(() => {
      i += 1;
      if (i >= preguntas.length) renderResultado();
      else renderPregunta();
    }, 1200);
  }

  function renderResultado() {
    const total = preguntas.length;
    const perfecto = aciertos === total;
    wrap.innerHTML = `
      <div class="quiz-result">
        <div class="quiz-result-emoji">${perfecto ? '🏆❤️' : aciertos >= total / 2 ? '💖' : '💭'}</div>
        <div class="quiz-result-score">${aciertos} / ${total}</div>
        <p class="quiz-result-msg">${escapeHtml(mensajeResultado(aciertos, total))}</p>
        ${mensaje ? `<div class="quiz-reward">${escapeHtml(mensaje)}</div>` : ''}
        <button type="button" class="btn-big quiz-retry">Jugar de nuevo</button>
      </div>`;
    wrap.querySelector('.quiz-retry').addEventListener('click', reiniciar);
    if (perfecto) burst();
  }

  function burst() {
    for (let n = 0; n < 16; n++) {
      const s = document.createElement('span');
      s.className = 'confetti';
      s.textContent = Math.random() < 0.7 ? '❤️' : '✨';
      s.style.left = Math.random() * 100 + 'vw';
      s.style.animationDuration = (2.5 + Math.random() * 2.5) + 's';
      s.style.animationDelay = (Math.random() * 1.2) + 's';
      s.style.fontSize = (14 + Math.random() * 16) + 'px';
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 7000);
    }
  }

  function reiniciar() {
    clearTimeout(timer);
    preguntas.splice(0, preguntas.length, ...armarQuiz());
    i = 0;
    aciertos = 0;
    locked = false;
    renderPregunta();
  }

  renderPregunta();

  return () => { clearTimeout(timer); };
}
