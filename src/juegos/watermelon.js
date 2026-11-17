import { formatScore, getRecord, saveRecord } from './records.js';

const W = 360;
const H = 520;
const WALL = 10;
const FLOOR = H - 18;
const DANGER = 92;
const GRAVITY = 1400;

const FRUITS = [
  { emoji: '🍒', r: 14, color: '#d84b4b' },
  { emoji: '🍓', r: 18, color: '#e26b6b' },
  { emoji: '🍇', r: 22, color: '#8a6bb3' },
  { emoji: '🍊', r: 27, color: '#e59b4c' },
  { emoji: '🍋', r: 32, color: '#d8c84f' },
  { emoji: '🥝', r: 37, color: '#8bb05c' },
  { emoji: '🍑', r: 43, color: '#e39a7a' },
  { emoji: '🍍', r: 50, color: '#d8b14f' },
  { emoji: '🍈', r: 58, color: '#b9c98a' },
  { emoji: '🍉', r: 68, color: '#5e9e67' },
];

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const rand = (min, max) => min + Math.random() * (max - min);
const nextRandom = () => Math.floor(Math.random() * 4);

export function mountWatermelon(container, { onExit } = {}) {
  container.innerHTML = `
    <div class="arcade-game wm-game">
      <div class="arcade-title">🍉 Watermelon Maker</div>
      <div class="arcade-hud">
        <span class="arcade-score">Puntaje <b>0</b></span>
        <span class="wm-next">Siguiente <b>🍒</b></span>
        <span class="arcade-best">🏆 <b>0</b></span>
      </div>
      <div class="wm-stage" tabindex="0" aria-label="Juego Watermelon Maker. Movés la fruta y tocás para soltarla.">
        <canvas class="wm-canvas"></canvas>
        <div class="arcade-overlay hidden"></div>
      </div>
      <p class="arcade-hint">Mantené apretado y arrastrá para apuntar; soltá para dejar caer la fruta. Uní dos iguales para hacer una más grande.</p>
      <div class="arcade-actions"><button type="button" class="btn-big ghost wm-restart">Reiniciar</button></div>
    </div>`;

  const stage = container.querySelector('.wm-stage');
  const canvas = container.querySelector('.wm-canvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = container.querySelector('.arcade-score b');
  const bestEl = container.querySelector('.arcade-best b');
  const nextEl = container.querySelector('.wm-next b');
  const overlay = stage.querySelector('.arcade-overlay');
  const restartBtn = container.querySelector('.wm-restart');

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  let bodies = [];
  let particles = [];
  let aimX = W / 2;
  let nextLevel = nextRandom();
  let score = 0;
  let best = getRecord('watermelon');
  let over = false;
  let running = false;
  let cooldown = 0;
  let raf = 0;
  let last = 0;
  let pointerActive = false;

  function updateHud() {
    scoreEl.textContent = formatScore(score);
    bestEl.textContent = formatScore(best);
    nextEl.textContent = FRUITS[nextLevel].emoji;
  }

  function dibujarFruta(x, y, r, emoji, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.92, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.fill();
    ctx.font = `${r * 1.72}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, x, y + r * 0.04);
    ctx.restore();
  }

  function draw() {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#fffaf3');
    bg.addColorStop(1, '#f2e0c9');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(109,31,38,.12)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(WALL, 0);
    ctx.lineTo(WALL, FLOOR);
    ctx.moveTo(W - WALL, 0);
    ctx.lineTo(W - WALL, FLOOR);
    ctx.lineTo(WALL, FLOOR);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(109,31,38,.18)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, FLOOR);
    ctx.lineTo(W, FLOOR);
    ctx.stroke();

    ctx.save();
    ctx.setLineDash([6, 7]);
    ctx.strokeStyle = 'rgba(163,59,59,.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(WALL + 4, DANGER);
    ctx.lineTo(W - WALL - 4, DANGER);
    ctx.stroke();
    ctx.restore();

    if (!over) {
      ctx.save();
      ctx.setLineDash([4, 8]);
      ctx.strokeStyle = 'rgba(109,31,38,.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(aimX, DANGER - 4);
      ctx.lineTo(aimX, FLOOR);
      ctx.stroke();
      ctx.restore();
      const f = FRUITS[nextLevel];
      dibujarFruta(clamp(aimX, WALL + f.r, W - WALL - f.r), DANGER - f.r - 8, f.r, f.emoji, 0.42);
    }

    bodies.forEach((b) => dibujarFruta(b.x, b.y, b.r, FRUITS[b.level].emoji));

    particles.forEach((p) => {
      ctx.globalAlpha = Math.max(0, p.life / 0.6);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function explotar(x, y, color) {
    for (let i = 0; i < 10; i++) {
      particles.push({
        x, y,
        vx: rand(-130, 130),
        vy: rand(-190, -30),
        r: rand(2, 5),
        life: 0.6,
        color,
      });
    }
  }

  function actualizarParticulas(dt) {
    particles.forEach((p) => {
      p.life -= dt;
      p.vy += 650 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.r *= 0.99;
    });
    particles = particles.filter((p) => p.life > 0);
  }

  function soltar() {
    if (over || cooldown > 0) return;
    const f = FRUITS[nextLevel];
    const x = clamp(aimX, WALL + f.r + 1, W - WALL - f.r - 1);
    bodies.push({
      x,
      y: DANGER - f.r - 8,
      vx: 0,
      vy: 0,
      r: f.r,
      level: nextLevel,
      age: 0,
      danger: 0,
      merged: false,
    });
    nextLevel = nextRandom();
    cooldown = 0.45;
    updateHud();
  }

  function resolverParedes(b) {
    if (b.x - b.r < WALL) { b.x = WALL + b.r; if (b.vx < 0) b.vx *= -0.18; }
    if (b.x + b.r > W - WALL) { b.x = W - WALL - b.r; if (b.vx > 0) b.vx *= -0.18; }
    if (b.y + b.r > FLOOR) {
      b.y = FLOOR - b.r;
      if (b.vy > 0) b.vy *= -0.12;
      if (Math.abs(b.vy) < 24) b.vy = 0;
      b.vx *= 0.92;
    }
  }

  function resolverChoque(a, b) {
    let dx = b.x - a.x;
    let dy = b.y - a.y;
    let dist = Math.hypot(dx, dy);
    const min = a.r + b.r;
    if (dist >= min) return;
    if (!dist) { dx = 0.01; dy = 0.01; dist = 0.02; }
    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = (min - dist) / 2 + 0.02;
    a.x -= nx * overlap;
    a.y -= ny * overlap;
    b.x += nx * overlap;
    b.y += ny * overlap;

    const rvx = b.vx - a.vx;
    const rvy = b.vy - a.vy;
    const sep = rvx * nx + rvy * ny;
    if (sep < 0) {
      const j = -(1.14 * sep) / 2;
      a.vx -= j * nx;
      a.vy -= j * ny;
      b.vx += j * nx;
      b.vy += j * ny;
    }

    if (a.level === b.level && !a.merged && !b.merged) {
      a.merged = true;
      b.merged = true;
      a.mergeWith = b;
    }
  }

  function terminar() {
    if (over) return;
    over = true;
    running = false;
    cancelAnimationFrame(raf);
    const nuevo = saveRecord('watermelon', score);
    best = getRecord('watermelon');
    updateHud();
    overlay.innerHTML = `
      <div class="arcade-over-emoji" aria-hidden="true">🍉</div>
      <h4>Se desbordó la fruta</h4>
      <p class="arcade-over-score">${formatScore(score)} puntos</p>
      <p class="arcade-over-sub">${nuevo ? '¡Nuevo récord!' : 'Récord: ' + formatScore(best)}</p>
      <button type="button" class="btn-big" data-arcade="restart">Jugar de nuevo</button>
      <button type="button" class="btn-big ghost" data-arcade="exit">Volver a juegos</button>`;
    overlay.classList.remove('hidden');
    overlay.querySelector('[data-arcade="restart"]').addEventListener('click', reiniciar);
    overlay.querySelector('[data-arcade="exit"]').addEventListener('click', () => onExit?.());
    draw();
  }

  function procesarFusiones() {
    const nuevas = [];
    bodies.forEach((a) => {
      if (!a.merged || !a.mergeWith || a.mergeDone) return;
      const b = a.mergeWith;
      if (!b || !b.merged || b.mergeDone) return;
      a.mergeDone = true;
      b.mergeDone = true;
      const nivel = a.level + 1;
      const x = clamp((a.x + b.x) / 2, WALL + 8, W - WALL - 8);
      const y = Math.min((a.y + b.y) / 2, FLOOR - 8);
      if (nivel >= FRUITS.length) {
        score += 500;
        explotar(x, y, FRUITS[a.level].color);
      } else {
        const f = FRUITS[nivel];
        nuevas.push({
          x: clamp(x, WALL + f.r, W - WALL - f.r),
          y: clamp(y, f.r + 4, FLOOR - f.r),
          vx: (a.vx + b.vx) / 2,
          vy: Math.min(-70, (a.vy + b.vy) / 2),
          r: f.r,
          level: nivel,
          age: 0,
          danger: 0,
          merged: false,
        });
        score += nivel * 15;
        explotar(x, y, f.color);
      }
    });
    if (nuevas.length || bodies.some((b) => b.merged)) {
      bodies = bodies.filter((b) => !b.merged).concat(nuevas);
      updateHud();
    }
  }

  function paso(dt) {
    cooldown = Math.max(0, cooldown - dt);
    bodies.forEach((b) => {
      b.age += dt;
      b.vy += GRAVITY * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.vx *= 0.995;
    });

    for (let iter = 0; iter < 4; iter++) {
      bodies.forEach(resolverParedes);
      for (let i = 0; i < bodies.length; i++) {
        for (let j = i + 1; j < bodies.length; j++) {
          if (bodies[i].merged || bodies[j].merged) continue;
          resolverChoque(bodies[i], bodies[j]);
        }
      }
    }

    procesarFusiones();
    actualizarParticulas(dt);

    for (const b of bodies) {
      if (b.age > 1.6 && b.y - b.r < DANGER) b.danger += dt;
      else b.danger = Math.max(0, b.danger - dt * 1.5);
      if (b.danger > 1.1) { terminar(); return; }
    }
  }

  function loop(ts) {
    if (!running) return;
    if (!last) last = ts;
    const dt = Math.min((ts - last) / 1000, 0.033);
    last = ts;
    if (!over) paso(dt);
    draw();
    if (!over) raf = requestAnimationFrame(loop);
  }

  function iniciar() {
    running = true;
    last = 0;
    over = false;
    raf = requestAnimationFrame(loop);
  }

  function reiniciar() {
    cancelAnimationFrame(raf);
    bodies = [];
    particles = [];
    aimX = W / 2;
    nextLevel = nextRandom();
    score = 0;
    over = false;
    cooldown = 0;
    pointerActive = false;
    stage.classList.remove('wm-aiming');
    overlay.classList.add('hidden');
    overlay.innerHTML = '';
    updateHud();
    iniciar();
  }

  function apuntar(e) {
    const r = canvas.getBoundingClientRect();
    if (!r.width) return;
    aimX = clamp(((e.clientX - r.left) / r.width) * W, WALL + 10, W - WALL - 10);
  }

  function onMove(e) { apuntar(e); }

  function onDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    pointerActive = true;
    apuntar(e);
    stage.focus({ preventScroll: true });
    stage.classList.add('wm-aiming');
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
  }

  function onUp(e) {
    if (!pointerActive) return;
    pointerActive = false;
    stage.classList.remove('wm-aiming');
    try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
    apuntar(e);
    soltar();
  }

  function onCancel(e) {
    pointerActive = false;
    stage.classList.remove('wm-aiming');
    try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
  }

  function onKey(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a') { aimX = clamp(aimX - 16, WALL + 10, W - WALL - 10); e.preventDefault(); }
    else if (e.key === 'ArrowRight' || e.key === 'd') { aimX = clamp(aimX + 16, WALL + 10, W - WALL - 10); e.preventDefault(); }
    else if (e.key === ' ' || e.key === 'Enter') { soltar(); e.preventDefault(); }
  }

  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onCancel);
  stage.addEventListener('keydown', onKey);
  restartBtn.addEventListener('click', reiniciar);

  updateHud();
  iniciar();

  return () => {
    running = false;
    pointerActive = false;
    cancelAnimationFrame(raf);
    saveRecord('watermelon', score);
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('pointerup', onUp);
    canvas.removeEventListener('pointercancel', onCancel);
    stage.removeEventListener('keydown', onKey);
    restartBtn.removeEventListener('click', reiniciar);
    container.innerHTML = '';
  };
}
