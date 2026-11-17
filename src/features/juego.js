import { escapeHtml } from '../lib/format.js';

const GOAL = 8;
const TIME = 25;
const SPAWN_EVERY = 0.55;

export function mountJuego(container, { mensaje } = {}) {
  container.innerHTML = `
    <p class="game-hint">Movés la cestita y atrapás ❤️. Esquivá las 💣. Juntá ${GOAL} para ganar.</p>
    <div class="game-stage" tabindex="0" aria-label="Juego: atrapá corazones con la cestita. Usá el mouse, el dedo o las flechas.">
      <canvas class="game-canvas"></canvas>
      <div class="game-hud"><span class="game-score" aria-live="polite">❤️ 0/${GOAL}</span><span class="game-time">⏱ ${TIME}s</span></div>
      <div class="game-end hidden"></div>
    </div>
    <div class="game-actions"><button type="button" class="btn-big ghost game-restart hidden">Volver a jugar</button></div>`;

  const stage = container.querySelector('.game-stage');
  const canvas = container.querySelector('.game-canvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = container.querySelector('.game-score');
  const timeEl = container.querySelector('.game-time');
  const endEl = container.querySelector('.game-end');
  const restartBtn = container.querySelector('.game-restart');

  let raf = 0;
  let running = false;
  let width = 0;
  let height = 0;
  let basketX = 0.5;
  let items = [];
  let score = 0;
  let elapsed = 0;
  let spawnT = 0;
  let last = 0;
  let timeouts = [];
  const keys = { left: false, right: false };

  const later = (fn, ms) => { const t = setTimeout(fn, ms); timeouts.push(t); return t; };

  function resize() {
    const r = stage.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = r.width;
    height = r.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    items.forEach((it) => { it.x = Math.min(it.x, width - 20); });
    draw();
  }

  function spawn() {
    const bomb = Math.random() < 0.24;
    const size = bomb ? 24 : 22 + Math.random() * 10;
    items.push({
      x: 24 + Math.random() * Math.max(1, width - 48),
      y: -size,
      vy: 82 + Math.random() * 70,
      size,
      bomb,
      wob: Math.random() * Math.PI * 2,
      caught: false,
    });
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, '#fffaf3');
    bg.addColorStop(1, '#f1dfc8');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    items.forEach((it) => {
      ctx.save();
      ctx.translate(it.x, it.y);
      ctx.rotate(Math.sin(it.wob + it.y / 45) * 0.12);
      ctx.font = `${it.size}px serif`;
      ctx.fillText(it.bomb ? '💣' : '❤️', 0, 0);
      ctx.restore();
    });

    const bx = basketX * width;
    const by = height - 34;
    ctx.font = '40px serif';
    ctx.fillText('🧺', bx, by);
  }

  function updateHud() {
    const scoreTxt = `❤️ ${score}/${GOAL}`;
    const timeTxt = `⏱ ${Math.max(0, Math.ceil(TIME - elapsed))}s`;
    if (scoreEl.textContent !== scoreTxt) scoreEl.textContent = scoreTxt;
    if (timeEl.textContent !== timeTxt) timeEl.textContent = timeTxt;
  }

  function finish(win) {
    running = false;
    cancelAnimationFrame(raf);
    endEl.classList.remove('hidden');
    restartBtn.classList.remove('hidden');
    if (win) {
      endEl.innerHTML = `<div class="game-end-emoji">🎉❤️</div><h4>¡Lo lograste!</h4>
        <p class="game-end-msg">${escapeHtml(mensaje || 'Me encanta jugar con vos. Te amo.')}</p>`;
      burst();
    } else {
      endEl.innerHTML = `<div class="game-end-emoji">⏰</div><h4>Se terminó el tiempo</h4>
        <p class="game-end-msg">Juntaste ${score} de ${GOAL} corazones. ¡Probá otra vez!</p>`;
    }
  }

  function burst() {
    for (let i = 0; i < 14; i++) {
      const s = document.createElement('span');
      s.className = 'juego-pop';
      s.textContent = Math.random() < 0.8 ? '❤️' : '✨';
      s.style.left = 12 + Math.random() * 76 + '%';
      s.style.animationDelay = (Math.random() * 0.5) + 's';
      s.style.fontSize = (16 + Math.random() * 16) + 'px';
      stage.appendChild(s);
      later(() => s.remove(), 2200);
    }
  }

  function frame(ts) {
    if (!running) return;
    if (!last) last = ts;
    const dt = Math.min((ts - last) / 1000, 0.05);
    last = ts;
    elapsed += dt;

    if (keys.left) basketX -= dt * 0.85;
    if (keys.right) basketX += dt * 0.85;
    basketX = Math.min(1, Math.max(0, basketX));

    spawnT += dt;
    if (spawnT >= SPAWN_EVERY) { spawnT = 0; spawn(); }

    const basketY = height - 34;
    items.forEach((it) => {
      it.y += it.vy * dt;
      if (!it.caught && it.y >= basketY - 18 && it.y <= basketY + 30 && Math.abs(it.x - basketX * width) < 42) {
        it.caught = true;
        if (it.bomb) {
          score = Math.max(0, score - 1);
          stage.classList.add('game-hit');
          later(() => stage.classList.remove('game-hit'), 260);
        } else {
          score += 1;
        }
      }
    });
    items = items.filter((it) => !it.caught && it.y < height + 40);

    updateHud();
    draw();

    if (score >= GOAL) { finish(true); return; }
    if (elapsed >= TIME) { finish(false); return; }
    raf = requestAnimationFrame(frame);
  }

  function start() {
    cancelAnimationFrame(raf);
    timeouts.forEach(clearTimeout);
    timeouts = [];
    items = [];
    score = 0;
    elapsed = 0;
    spawnT = 0;
    last = 0;
    basketX = 0.5;
    endEl.classList.add('hidden');
    endEl.innerHTML = '';
    restartBtn.classList.add('hidden');
    stage.classList.remove('game-hit');
    running = true;
    resize();
    updateHud();
    raf = requestAnimationFrame(frame);
  }

  function onPointer(e) {
    const r = stage.getBoundingClientRect();
    if (!r.width) return;
    if (document.activeElement !== stage) stage.focus({ preventScroll: true });
    basketX = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
  }

  function onKey(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a') { keys.left = true; e.preventDefault(); }
    else if (e.key === 'ArrowRight' || e.key === 'd') { keys.right = true; e.preventDefault(); }
  }

  function onKeyUp(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
    else if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
  }

  stage.addEventListener('pointermove', onPointer);
  stage.addEventListener('pointerdown', onPointer);
  stage.addEventListener('keydown', onKey);
  stage.addEventListener('keyup', onKeyUp);
  restartBtn.addEventListener('click', start);
  window.addEventListener('resize', resize);

  start();

  return () => {
    running = false;
    cancelAnimationFrame(raf);
    timeouts.forEach(clearTimeout);
    window.removeEventListener('resize', resize);
    stage.removeEventListener('pointermove', onPointer);
    stage.removeEventListener('pointerdown', onPointer);
    stage.removeEventListener('keydown', onKey);
    stage.removeEventListener('keyup', onKeyUp);
    restartBtn.removeEventListener('click', start);
  };
}
