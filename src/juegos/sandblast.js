import { formatScore, getRecord, saveRecord } from './records.js';

const GW = 40;
const GH = 64;
const BW = 360;
const BH = 512;
const CW = BW / GW;
const CH = BH / GH;
const DANGER_ROW = 6;
const SCALE = 2;
const SIM_STEP = 1 / 90;

const COLORS = ['#dfa05d', '#d46d6d', '#6fae9b', '#8595cf', '#d6b54b', '#af82bf'];
const PALETTE = [
  [223, 160, 93],
  [212, 109, 109],
  [111, 174, 155],
  [133, 149, 207],
  [214, 181, 75],
  [175, 130, 191],
];
const SHADES = PALETTE.map(([r, g, b]) => [0.88, 0.96, 1.04, 1.1].map((f) => [
  Math.min(255, Math.round(r * f)),
  Math.min(255, Math.round(g * f)),
  Math.min(255, Math.round(b * f)),
]));

const SHAPES = [
  [[0, 0]],
  [[0, 0], [1, 0]],
  [[0, 0], [0, 1]],
  [[0, 0], [1, 0], [2, 0]],
  [[0, 0], [0, 1], [0, 2]],
  [[0, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0], [1, 1]],
  [[0, 0], [0, 1], [1, 0], [1, 1]],
  [[0, 0], [1, 0], [2, 0], [1, 1]],
  [[0, 1], [1, 0], [1, 1]],
  [[0, 0], [1, 0], [1, 1], [2, 1]],
];

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const rand = (min, max) => min + Math.random() * (max - min);

function crearPieza() {
  const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  const minR = Math.min(...shape.map((c) => c[0]));
  const minC = Math.min(...shape.map((c) => c[1]));
  const cells = shape.map(([r, c]) => [r - minR, c - minC]);
  const w = Math.max(...cells.map((c) => c[1])) + 1;
  const h = Math.max(...cells.map((c) => c[0])) + 1;
  const grains = [];
  cells.forEach(([r, c]) => {
    for (let dr = 0; dr < SCALE; dr++) {
      for (let dc = 0; dc < SCALE; dc++) grains.push([r * SCALE + dr, c * SCALE + dc]);
    }
  });
  return {
    cells,
    w,
    h,
    gw: w * SCALE,
    gh: h * SCALE,
    grains,
    color: 1 + Math.floor(Math.random() * COLORS.length),
  };
}

function nuevasPiezas() {
  return [crearPieza(), crearPieza(), crearPieza()];
}

export function mountSandBlast(container, { onExit } = {}) {
  container.innerHTML = `
    <div class="arcade-game sb2-game">
      <div class="arcade-title">🏖️ Sand Blast</div>
      <div class="arcade-hud">
        <span class="arcade-score">Puntaje <b>0</b></span>
        <span class="arcade-best">🏆 <b>0</b></span>
      </div>
      <div class="sb2-stage" tabindex="0" aria-label="Sand Blast. Elegí una pieza y tocá una columna para soltar la arena.">
        <canvas class="sb2-canvas"></canvas>
      </div>
      <div class="sb2-dock" aria-label="Piezas disponibles"></div>
      <p class="arcade-hint">Elegí una pieza, mantené apretado para apuntar y soltá para dejar caer la arena. Completá una línea para reventarla.</p>
      <div class="arcade-actions"><button type="button" class="btn-big ghost sb2-restart">Reiniciar</button></div>
      <div class="arcade-overlay hidden"></div>
    </div>`;

  const stage = container.querySelector('.sb2-stage');
  const canvas = container.querySelector('.sb2-canvas');
  const ctx = canvas.getContext('2d');
  const dock = container.querySelector('.sb2-dock');
  const scoreEl = container.querySelector('.arcade-score b');
  const bestEl = container.querySelector('.arcade-best b');
  const overlay = container.querySelector('.arcade-overlay');
  const restartBtn = container.querySelector('.sb2-restart');

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = BW * dpr;
  canvas.height = BH * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const sandCanvas = document.createElement('canvas');
  sandCanvas.width = GW;
  sandCanvas.height = GH;
  const sandCtx = sandCanvas.getContext('2d');
  const sandImg = sandCtx.createImageData(GW, GH);
  const pixels = sandImg.data;

  let grid = new Uint8Array(GW * GH);
  let pieces = nuevasPiezas();
  let selected = 0;
  let score = 0;
  let best = getRecord('sandblast');
  let over = false;
  let running = false;
  let raf = 0;
  let last = 0;
  let simAcc = 0;
  let settle = 0;
  let settling = false;
  let hoverCol = Math.floor(GW / 2);
  let flashes = [];
  let bursts = [];
  let labels = [];
  let combo = 0;
  let comboTimer = 0;
  let invalidTimer = 0;
  let pointerActive = false;

  function idx(x, y) { return y * GW + x; }

  function updateHud() {
    scoreEl.textContent = formatScore(score);
    bestEl.textContent = formatScore(best);
  }

  function puedeEn(piece, start) {
    if (start < 0 || start + piece.gw > GW) return false;
    for (const [r, c] of piece.grains) if (grid[idx(start + c, r)]) return false;
    return true;
  }

  function puedeEnAlgunLado(piece) {
    for (let start = 0; start <= GW - piece.gw; start++) if (puedeEn(piece, start)) return true;
    return false;
  }

  function inicioPara(piece) {
    return clamp(hoverCol - Math.floor(piece.gw / 2), 0, GW - piece.gw);
  }

  function previewHtml(piece) {
    if (!piece) return '<span class="sb2-piece-empty">✓</span>';
    const filled = new Set(piece.cells.map(([r, c]) => `${r},${c}`));
    let html = `<span class="sb2-piece-preview" style="grid-template-columns:repeat(${piece.w}, 12px);grid-auto-rows:12px">`;
    for (let r = 0; r < piece.h; r++) {
      for (let c = 0; c < piece.w; c++) {
        const on = filled.has(`${r},${c}`);
        html += `<span class="sb2-prev-cell${on ? ' on' : ''}"${on ? ` style="--c:${COLORS[piece.color - 1]}"` : ''}></span>`;
      }
    }
    return html + '</span>';
  }

  function renderDock() {
    dock.innerHTML = '';
    pieces.forEach((piece, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'sb2-piece' + (i === selected ? ' active' : '') + (piece ? '' : ' empty');
      b.disabled = !piece || over;
      b.innerHTML = previewHtml(piece);
      b.setAttribute('aria-label', piece ? `Elegir pieza ${i + 1}` : `Pieza ${i + 1} usada`);
      b.addEventListener('click', () => {
        if (over || !piece) return;
        selected = i;
        hoverCol = Math.floor(GW / 2);
        renderDock();
      });
      dock.appendChild(b);
    });
  }

  function flashInvalid() {
    stage.classList.remove('sb2-invalid');
    void stage.offsetWidth;
    stage.classList.add('sb2-invalid');
    clearTimeout(invalidTimer);
    invalidTimer = setTimeout(() => stage.classList.remove('sb2-invalid'), 320);
  }

  function soltar(col) {
    if (over || !running) return;
    const piece = pieces[selected];
    if (!piece) return;
    const start = clamp(col - Math.floor(piece.gw / 2), 0, GW - piece.gw);
    if (!puedeEn(piece, start)) { flashInvalid(); return; }

    let grains = 0;
    for (const [r, c] of piece.grains) {
      grid[idx(start + c, r)] = piece.color;
      grains += 1;
    }
    score += grains;
    pieces[selected] = null;
    const next = pieces.findIndex(Boolean);
    if (next >= 0) {
      selected = next;
    } else {
      pieces = nuevasPiezas();
      selected = 0;
    }
    settling = true;
    settle = 0;
    updateHud();
    renderDock();
  }

  function pasoArena() {
    let moved = 0;
    for (let y = GH - 2; y >= 0; y--) {
      const leftToRight = Math.random() < 0.5;
      for (let i = 0; i < GW; i++) {
        const x = leftToRight ? i : GW - 1 - i;
        const here = idx(x, y);
        const color = grid[here];
        if (!color) continue;
        const abajo = idx(x, y + 1);
        if (!grid[abajo]) {
          grid[abajo] = color;
          grid[here] = 0;
          moved += 1;
          continue;
        }
        const first = Math.random() < 0.5 ? 1 : -1;
        const x1 = x + first;
        const x2 = x - first;
        if (x1 >= 0 && x1 < GW && !grid[idx(x1, y + 1)]) {
          grid[idx(x1, y + 1)] = color;
          grid[here] = 0;
          moved += 1;
          continue;
        }
        if (x2 >= 0 && x2 < GW && !grid[idx(x2, y + 1)]) {
          grid[idx(x2, y + 1)] = color;
          grid[here] = 0;
          moved += 1;
        }
      }
    }
    return moved;
  }

  function limpiarLineas() {
    const filas = [];
    for (let y = 0; y < GH; y++) {
      let full = true;
      let mono = true;
      let color = 0;
      for (let x = 0; x < GW; x++) {
        const v = grid[idx(x, y)];
        if (!v) { full = false; break; }
        if (!color) color = v;
        else if (v !== color) mono = false;
      }
      if (full) filas.push({ y, mono });
    }
    if (!filas.length) return 0;

    let base = 0;
    filas.forEach(({ y, mono }) => {
      base += 100 + (mono ? 100 : 0);
      for (let x = 0; x < GW; x++) {
        const v = grid[idx(x, y)];
        if (v && Math.random() < 0.28) {
          bursts.push({
            x: x * CW + CW / 2,
            y: y * CH + CH / 2,
            vx: rand(-70, 70),
            vy: rand(-150, -20),
            r: rand(1.2, 3.2),
            life: 0.6,
            max: 0.6,
            color: COLORS[v - 1],
          });
        }
        grid[idx(x, y)] = 0;
      }
      flashes.push({ y, t: 0.32, max: 0.32 });
    });
    comboTimer = 1.1;
    combo = combo ? combo + 1 : 1;
    const gained = base * combo;
    score += gained;
    labels.push({
      text: `+${formatScore(gained)}`,
      x: BW / 2,
      y: (filas[0].y + 0.5) * CH,
      life: 0.9,
      max: 0.9,
    });
    if (combo > 1) {
      labels.push({
        text: `x${combo}`,
        x: BW / 2,
        y: (filas[0].y + 0.5) * CH - 20,
        life: 0.9,
        max: 0.9,
      });
    }
    updateHud();
    return filas.length;
  }

  function actualizarEfectos(dt) {
    flashes.forEach((f) => { f.t -= dt; });
    flashes = flashes.filter((f) => f.t > 0);
    bursts.forEach((p) => {
      p.life -= dt;
      p.vy += 520 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    });
    bursts = bursts.filter((p) => p.life > 0);
    labels.forEach((l) => { l.life -= dt; l.y -= 22 * dt; });
    labels = labels.filter((l) => l.life > 0);
    comboTimer = Math.max(0, comboTimer - dt);
    if (!comboTimer) combo = 0;
  }

  function filaSuperior() {
    for (let y = 0; y < GH; y++) {
      for (let x = 0; x < GW; x++) if (grid[idx(x, y)]) return y;
    }
    return GH;
  }

  function comprobarFin() {
    if (filaSuperior() < DANGER_ROW) { terminar(); return; }
    if (!pieces.filter(Boolean).some(puedeEnAlgunLado)) terminar();
  }

  function terminar() {
    if (over) return;
    over = true;
    running = false;
    cancelAnimationFrame(raf);
    const nuevo = saveRecord('sandblast', score);
    best = getRecord('sandblast');
    updateHud();
    overlay.innerHTML = `
      <div class="arcade-over-emoji" aria-hidden="true">🏖️</div>
      <h4>La arena llegó arriba</h4>
      <p class="arcade-over-score">${formatScore(score)} puntos</p>
      <p class="arcade-over-sub">${nuevo ? '¡Nuevo récord!' : 'Récord: ' + formatScore(best)}</p>
      <button type="button" class="btn-big" data-arcade="restart">Jugar de nuevo</button>
      <button type="button" class="btn-big ghost" data-arcade="exit">Volver a juegos</button>`;
    overlay.classList.remove('hidden');
    overlay.querySelector('[data-arcade="restart"]').addEventListener('click', reiniciar);
    overlay.querySelector('[data-arcade="exit"]').addEventListener('click', () => onExit?.());
    renderDock();
    draw();
  }

  function dibujarArena() {
    pixels.fill(0);
    for (let y = 0; y < GH; y++) {
      for (let x = 0; x < GW; x++) {
        const v = grid[idx(x, y)];
        if (!v) continue;
        const shade = SHADES[v - 1][(x * 31 + y * 57 + x * y * 7) & 3];
        const o = (y * GW + x) * 4;
        pixels[o] = shade[0];
        pixels[o + 1] = shade[1];
        pixels[o + 2] = shade[2];
        pixels[o + 3] = 255;
      }
    }
    sandCtx.putImageData(sandImg, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sandCanvas, 0, 0, GW, GH, 0, 0, BW, BH);
  }

  function dibujarFantasma() {
    const piece = pieces[selected];
    if (!piece) return;
    const start = inicioPara(piece);
    const ok = puedeEn(piece, start);
    ctx.globalAlpha = ok ? 0.34 : 0.22;
    ctx.fillStyle = ok ? COLORS[piece.color - 1] : '#a33b3b';
    for (const [r, c] of piece.grains) {
      ctx.fillRect((start + c) * CW + 0.4, r * CH + 0.4, CW - 0.8, CH - 0.8);
    }
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.setLineDash([3, 9]);
    ctx.strokeStyle = 'rgba(109,31,38,.14)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo((start + piece.gw / 2) * CW, 0);
    ctx.lineTo((start + piece.gw / 2) * CW, BH);
    ctx.stroke();
    ctx.restore();
  }

  function draw() {
    const bg = ctx.createLinearGradient(0, 0, 0, BH);
    bg.addColorStop(0, '#fffaf2');
    bg.addColorStop(1, '#f1dfc8');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, BW, BH);

    dibujarArena();

    const dy = DANGER_ROW * CH;
    ctx.save();
    ctx.setLineDash([5, 7]);
    ctx.strokeStyle = 'rgba(163,59,59,.32)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, dy);
    ctx.lineTo(BW, dy);
    ctx.stroke();
    ctx.restore();

    if (!over) dibujarFantasma();

    flashes.forEach((f) => {
      ctx.fillStyle = `rgba(255,252,240,${0.6 * (f.t / f.max)})`;
      ctx.fillRect(0, f.y * CH, BW, CH);
    });

    bursts.forEach((p) => {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    labels.forEach((l) => {
      ctx.globalAlpha = Math.min(1, l.life / l.max + 0.15);
      ctx.fillStyle = '#6d1f26';
      ctx.font = '600 22px "Cormorant Garamond", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(l.text, l.x, l.y);
    });
    ctx.globalAlpha = 1;
  }

  function loop(ts) {
    if (!running) return;
    if (!last) last = ts;
    const dt = Math.min((ts - last) / 1000, 0.05);
    last = ts;

    if (!over) {
      simAcc += dt;
      let moved = 0;
      let steps = 0;
      while (simAcc >= SIM_STEP && steps < 4) {
        simAcc -= SIM_STEP;
        moved += pasoArena();
        steps += 1;
      }
      const limpiadas = limpiarLineas();
      if (moved || limpiadas) settle = 0;
      else settle += dt;

      if (settling && settle > 0.55) {
        settling = false;
        settle = 0;
        comprobarFin();
      }
      actualizarEfectos(dt);
    }

    draw();
    if (!over) raf = requestAnimationFrame(loop);
  }

  function iniciar() {
    running = true;
    last = 0;
    simAcc = 0;
    raf = requestAnimationFrame(loop);
  }

  function reiniciar() {
    cancelAnimationFrame(raf);
    clearTimeout(invalidTimer);
    grid = new Uint8Array(GW * GH);
    pieces = nuevasPiezas();
    selected = 0;
    score = 0;
    over = false;
    settle = 0;
    settling = false;
    simAcc = 0;
    hoverCol = Math.floor(GW / 2);
    flashes = [];
    bursts = [];
    labels = [];
    combo = 0;
    comboTimer = 0;
    pointerActive = false;
    overlay.classList.add('hidden');
    overlay.innerHTML = '';
    stage.classList.remove('sb2-invalid', 'sb2-aiming');
    updateHud();
    renderDock();
    iniciar();
  }

  function columnaDeEvento(e) {
    const r = canvas.getBoundingClientRect();
    if (!r.width) return hoverCol;
    return clamp(Math.floor(((e.clientX - r.left) / r.width) * GW), 0, GW - 1);
  }

  function onMove(e) {
    hoverCol = columnaDeEvento(e);
  }

  function onDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    pointerActive = true;
    hoverCol = columnaDeEvento(e);
    stage.focus({ preventScroll: true });
    stage.classList.add('sb2-aiming');
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
  }

  function onUp(e) {
    if (!pointerActive) return;
    pointerActive = false;
    stage.classList.remove('sb2-aiming');
    try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
    hoverCol = columnaDeEvento(e);
    soltar(hoverCol);
  }

  function onCancel(e) {
    pointerActive = false;
    stage.classList.remove('sb2-aiming');
    try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
  }

  function onKey(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a') { hoverCol = clamp(hoverCol - 2, 0, GW - 1); e.preventDefault(); }
    else if (e.key === 'ArrowRight' || e.key === 'd') { hoverCol = clamp(hoverCol + 2, 0, GW - 1); e.preventDefault(); }
    else if (e.key === ' ' || e.key === 'Enter') { soltar(hoverCol); e.preventDefault(); }
  }

  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onCancel);
  stage.addEventListener('keydown', onKey);
  restartBtn.addEventListener('click', reiniciar);

  updateHud();
  renderDock();
  iniciar();

  return () => {
    running = false;
    pointerActive = false;
    cancelAnimationFrame(raf);
    clearTimeout(invalidTimer);
    saveRecord('sandblast', score);
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('pointerup', onUp);
    canvas.removeEventListener('pointercancel', onCancel);
    stage.removeEventListener('keydown', onKey);
    restartBtn.removeEventListener('click', reiniciar);
    container.innerHTML = '';
  };
}
