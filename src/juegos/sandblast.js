import { formatScore, getRecord, saveRecord } from './records.js';

const P_COLS = 15;
const P_ROWS = 20;
const SCALE = 10;
const GW = P_COLS * SCALE;
const GH = P_ROWS * SCALE;
const BW = 360;
const BH = 480;
const CW = BW / GW;
const CH = BH / GH;
const DANGER_ROW = 24;
const STEP_MS = 12;

const COLORS = ['#ff5a5f', '#3fb950', '#4c9bff', '#ffcd3c', '#b57bff', '#ff9d4c'];
const PALETTE = [
  [255, 90, 95],
  [63, 185, 80],
  [76, 155, 255],
  [255, 205, 60],
  [181, 123, 255],
  [255, 157, 76],
];
const DARKPAL = [
  [216, 58, 64],
  [44, 154, 60],
  [53, 127, 224],
  [230, 178, 31],
  [151, 88, 230],
  [230, 130, 44],
];

const RAW_SHAPES = [
  { id: 'I', cells: [[0, 0], [1, 0], [2, 0], [3, 0]] },
  { id: 'O', cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
  { id: 'T', cells: [[0, 0], [1, 0], [2, 0], [1, 1]] },
  { id: 'L', cells: [[0, 0], [0, 1], [0, 2], [1, 2]] },
  { id: 'J', cells: [[1, 0], [1, 1], [1, 2], [0, 2]] },
  { id: 'S', cells: [[1, 0], [2, 0], [0, 1], [1, 1]] },
  { id: 'Z', cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  { id: 'dot', cells: [[0, 0]] },
  { id: 'line2', cells: [[0, 0], [1, 0]] },
  { id: 'line3', cells: [[0, 0], [1, 0], [2, 0]] },
  { id: 'square3', cells: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]] },
];

const SHAPES = RAW_SHAPES.map(({ id, cells }) => {
  const minR = Math.min(...cells.map((c) => c[0]));
  const minC = Math.min(...cells.map((c) => c[1]));
  const norm = cells.map(([r, c]) => [r - minR, c - minC]);
  return {
    id,
    cells: norm,
    w: Math.max(...norm.map((c) => c[1])) + 1,
    h: Math.max(...norm.map((c) => c[0])) + 1,
  };
});

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const esOscuro = (x, y) => ((x * 73856093 ^ y * 19349663) >>> 0) % 10 < 3;

export function mountSandBlast(container, { onExit } = {}) {
  container.innerHTML = `
    <div class="arcade-game sb3-game">
      <div class="sb3-hud">
        <div class="sb3-scorebox">
          <div class="sb3-topline">
            <span>Puntaje</span>
            <span class="sb3-best">♛ <b>0</b></span>
            <span class="sb3-goal">1.000</span>
          </div>
          <strong class="sb3-score">0</strong>
          <div class="sb3-meter"><i></i></div>
        </div>
        <div class="sb3-tools">
          <button type="button" class="sb3-tool sb3-fs" aria-label="Pantalla completa" title="Pantalla completa">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
            </svg>
          </button>
          <button type="button" class="sb3-tool sb3-close" aria-label="Cerrar juego">✕</button>
        </div>
      </div>
      <div class="sb3-stage" tabindex="0" aria-label="Tablero de Sand Blast. Arrastrá una pieza de la bandeja al tablero.">
        <canvas class="sb3-canvas"></canvas>
      </div>
      <div class="sb3-tray" aria-label="Piezas disponibles"></div>
      <p class="sb3-hint">Arrastrá una pieza al tablero. Conectá arena del mismo color de pared a pared para reventarla.</p>
      <div class="arcade-overlay hidden"></div>
    </div>`;

  const stage = container.querySelector('.sb3-stage');
  const canvas = container.querySelector('.sb3-canvas');
  const ctx = canvas.getContext('2d');
  const trayEl = container.querySelector('.sb3-tray');
  const scoreEl = container.querySelector('.sb3-score');
  const bestEl = container.querySelector('.sb3-best b');
  const meterEl = container.querySelector('.sb3-meter i');
  const overlay = container.querySelector('.arcade-overlay');
  const fsBtn = container.querySelector('.sb3-fs');
  const closeBtn = container.querySelector('.sb3-close');
  const card = container.closest('.arcade-card');

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
  let tray = [];
  let block = null;
  let state = 'ready';
  let score = 0;
  let best = getRecord('sandblast');
  let combo = 0;
  let settles = 0;
  let acc = 0;
  let over = false;
  let running = false;
  let raf = 0;
  let last = 0;
  let flashes = [];
  let bursts = [];
  let labels = [];
  let drag = null;
  let invalidTimer = 0;

  const idx = (x, y) => y * GW + x;

  function colorLimit() {
    if (score < 3000) return 3;
    if (score < 12000) return 4;
    if (score < 40000) return 5;
    return 6;
  }

  function randColor() {
    return 1 + Math.floor(Math.random() * colorLimit());
  }

  function randPiece() {
    const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    return { shape, color: randColor() };
  }

  function refillTray() {
    tray = [randPiece(), randPiece(), randPiece()];
  }

  function updateHud() {
    scoreEl.textContent = formatScore(score);
    bestEl.textContent = formatScore(best);
    meterEl.style.width = `${Math.min(100, (score / 1000) * 100)}%`;
  }

  function previewHtml(piece) {
    if (!piece) return '<span class="sb3-slot-empty">✓</span>';
    const { shape, color } = piece;
    const filled = new Set(shape.cells.map(([r, c]) => `${r},${c}`));
    let html = `<span class="sb3-piece" style="grid-template-columns:repeat(${shape.w}, 16px);grid-auto-rows:16px">`;
    for (let r = 0; r < shape.h; r++) {
      for (let c = 0; c < shape.w; c++) {
        const on = filled.has(`${r},${c}`);
        html += `<span class="sb3-block${on ? ' on' : ''}"${on ? ` style="--c:${COLORS[color - 1]}"` : ''}></span>`;
      }
    }
    return html + '</span>';
  }

  function renderTray() {
    trayEl.innerHTML = '';
    tray.forEach((piece, i) => {
      const slot = document.createElement('button');
      slot.type = 'button';
      slot.className = 'sb3-slot';
      slot.disabled = over;
      slot.innerHTML = previewHtml(piece);
      slot.setAttribute('aria-label', `Arrastrar pieza ${i + 1}`);
      slot.addEventListener('pointerdown', (e) => iniciarDrag(e, i, slot));
      trayEl.appendChild(slot);
    });
  }

  function actualizarDrag(clientX, clientY) {
    if (!drag) return;
    const piece = tray[drag.i];
    if (!piece) return;
    const rect = canvas.getBoundingClientRect();
    const inside = clientX >= rect.left && clientX <= rect.right && clientY >= rect.top - 26 && clientY <= rect.bottom + 30;
    if (!inside) {
      drag.column = null;
      draw();
      return;
    }
    const raw = Math.floor(((clientX - rect.left) / rect.width) * P_COLS);
    drag.column = clamp(raw, 0, P_COLS - piece.shape.w);
    draw();
  }

  function limpiarDrag(d) {
    window.removeEventListener('pointermove', moverDrag);
    window.removeEventListener('pointerup', soltarDrag);
    window.removeEventListener('pointercancel', cancelarDrag);
    if (d?.el) d.el.classList.remove('sb3-dragging');
  }

  function iniciarDrag(e, i, el) {
    if (over || (state !== 'ready' && state !== 'sand') || !tray[i] || (e.button !== undefined && e.button !== 0)) return;
    e.preventDefault();
    drag = { i, el, column: null };
    el.classList.add('sb3-dragging');
    window.addEventListener('pointermove', moverDrag, { passive: false });
    window.addEventListener('pointerup', soltarDrag);
    window.addEventListener('pointercancel', cancelarDrag);
    actualizarDrag(e.clientX, e.clientY);
  }

  function moverDrag(e) {
    if (!drag) return;
    e.preventDefault();
    actualizarDrag(e.clientX, e.clientY);
  }

  function soltarDrag(e) {
    if (!drag) return;
    const d = drag;
    actualizarDrag(e.clientX, e.clientY);
    const col = d.column;
    drag = null;
    limpiarDrag(d);
    if (col === null) {
      renderTray();
      draw();
      return;
    }
    soltar(d.i, col);
  }

  function cancelarDrag() {
    if (!drag) return;
    const d = drag;
    drag = null;
    limpiarDrag(d);
    renderTray();
    draw();
  }



  function bloqueEntra(ox, oy) {
    if (!block) return false;
    for (const [r, c] of block.shape.cells) {
      const bx = ox + c * SCALE;
      const by = oy + r * SCALE;
      for (let dy = 0; dy < SCALE; dy++) {
        const y = by + dy;
        if (y >= GH) return false;
        if (y < 0) continue;
        for (let dx = 0; dx < SCALE; dx++) {
          const x = bx + dx;
          if (x < 0 || x >= GW) return false;
          if (grid[idx(x, y)]) return false;
        }
      }
    }
    return true;
  }

  function disolver() {
    if (!block) return;
    const { color, ox, oy, shape } = block;
    for (const [r, c] of shape.cells) {
      for (let dy = 0; dy < SCALE; dy++) {
        const y = oy + r * SCALE + dy;
        if (y < 0 || y >= GH) continue;
        for (let dx = 0; dx < SCALE; dx++) {
          const x = ox + c * SCALE + dx;
          if (x >= 0 && x < GW) grid[idx(x, y)] = color;
        }
      }
    }
    block = null;
    state = 'sand';
    settles = 0;
    acc = 0;
  }

  function stepBlock() {
    if (!block) return;
    if (bloqueEntra(block.ox, block.oy + 3)) {
      block.oy += 3;
      return;
    }
    while (bloqueEntra(block.ox, block.oy + 1)) block.oy += 1;
    disolver();
  }

  function soltar(i, col) {
    const piece = tray[i];
    if (!piece || over || (state !== 'ready' && state !== 'sand')) return;
    block = {
      color: piece.color,
      shape: piece.shape,
      ox: col * SCALE,
      oy: -piece.shape.h * SCALE,
    };
    tray[i] = randPiece();
    state = 'falling';
    acc = 0;
    renderTray();
    draw();
  }

  function pasoSand() {
    let moved = false;
    for (let y = GH - 2; y >= 0; y--) {
      const leftToRight = Math.random() < 0.5;
      for (let i = 0; i < GW; i++) {
        const x = leftToRight ? i : GW - 1 - i;
        const here = idx(x, y);
        const color = grid[here];
        if (!color) continue;
        const below = idx(x, y + 1);
        if (!grid[below]) {
          grid[below] = color;
          grid[here] = 0;
          moved = true;
          continue;
        }
        const left = x > 0 && !grid[idx(x - 1, y + 1)] && !grid[idx(x - 1, y)];
        const right = x < GW - 1 && !grid[idx(x + 1, y + 1)] && !grid[idx(x + 1, y)];
        let dir = 0;
        if (left && right) dir = Math.random() < 0.5 ? -1 : 1;
        else if (left) dir = -1;
        else if (right) dir = 1;
        if (dir) {
          grid[idx(x + dir, y + 1)] = color;
          grid[here] = 0;
          moved = true;
        }
      }
    }
    return moved;
  }

  const visited = new Uint8Array(GW * GH);
  const queue = new Int32Array(GW * GH);

  function resolverLineas() {
    visited.fill(0);
    const paraBorrar = [];
    for (let y = 0; y < GH; y++) {
      const start = idx(0, y);
      if (!grid[start] || visited[start]) continue;
      const color = grid[start];
      let head = 0;
      let tail = 0;
      queue[tail++] = start;
      visited[start] = 1;
      let tocaDerecha = false;
      const comp = [];
      while (head < tail) {
        const p = queue[head++];
        comp.push(p);
        const x = p % GW;
        const yy = (p / GW) | 0;
        if (x === GW - 1) tocaDerecha = true;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const nx = x + dx;
            const ny = yy + dy;
            if (nx < 0 || nx >= GW || ny < 0 || ny >= GH) continue;
            const np = idx(nx, ny);
            if (!visited[np] && grid[np] === color) {
              visited[np] = 1;
              queue[tail++] = np;
            }
          }
        }
      }
      if (tocaDerecha) paraBorrar.push(...comp);
    }
    if (!paraBorrar.length) return 0;

    combo += 1;
    const cells = paraBorrar.length;
    const gained = Math.max(10, Math.round(Math.round((cells / 100) * 10) * (1 + (combo - 1) * 0.5)));
    let sx = 0;
    let sy = 0;
    paraBorrar.forEach((p) => {
      const x = p % GW;
      const y = (p / GW) | 0;
      sx += x;
      sy += y;
      if (bursts.length < 800 && Math.random() < 0.22) {
        bursts.push({
          x: x * CW + CW / 2,
          y: y * CH + CH / 2,
          vx: (Math.random() - 0.5) * 40,
          vy: -(20 + Math.random() * 50),
          r: 1 + Math.random() * 1.4,
          life: 0.55 + Math.random() * 0.3,
          max: 0.85,
          color: COLORS[grid[p] - 1],
        });
      }
      grid[p] = 0;
    });
    score += gained;
    flashes.push({ y: Math.round(sy / cells), t: 0.3, max: 0.3 });
    labels.push({
      text: `+${formatScore(gained)}`,
      x: (sx / cells) * CW,
      y: (sy / cells) * CH,
      life: 0.95,
      max: 0.95,
    });
    if (combo >= 2) {
      labels.push({
        text: `COMBO x${combo}`,
        x: BW / 2,
        y: BH * 0.28,
        life: 1.15,
        max: 1.15,
      });
    }
    updateHud();
    return cells;
  }

  function actualizarEfectos(dt) {
    flashes.forEach((f) => { f.t -= dt; });
    flashes = flashes.filter((f) => f.t > 0);
    bursts.forEach((p) => {
      p.life -= dt;
      p.vy += 140 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    });
    bursts = bursts.filter((p) => p.life > 0);
    labels.forEach((l) => { l.life -= dt; l.y -= 16 * dt; });
    labels = labels.filter((l) => l.life > 0);
  }

  function finTurno() {
    for (let y = 0; y < DANGER_ROW; y++) {
      for (let x = 0; x < GW; x++) {
        if (grid[idx(x, y)]) { terminar(); return; }
      }
    }
    combo = 0;
    state = 'ready';
  }

  function terminar() {
    if (over) return;
    over = true;
    state = 'over';
    running = false;
    cancelAnimationFrame(raf);
    if (drag) cancelarDrag();
    const nuevo = saveRecord('sandblast', score);
    best = getRecord('sandblast');
    updateHud();
    overlay.innerHTML = `
      <div class="arcade-over-emoji" aria-hidden="true">🏖️</div>
      <h4>Game Over</h4>
      <p class="arcade-over-score">${formatScore(score)} puntos</p>
      <p class="arcade-over-sub">${nuevo ? '¡Nuevo récord!' : 'Récord: ' + formatScore(best)}</p>
      <button type="button" class="btn-big" data-arcade="restart">Jugar de nuevo</button>
      <button type="button" class="btn-big ghost" data-arcade="exit">Volver a juegos</button>`;
    overlay.classList.remove('hidden');
    overlay.querySelector('[data-arcade="restart"]').addEventListener('click', reiniciar);
    overlay.querySelector('[data-arcade="exit"]').addEventListener('click', () => onExit?.());
    renderTray();
    draw();
  }

  function dibujarArena() {
    pixels.fill(0);
    for (let y = 0; y < GH; y++) {
      for (let x = 0; x < GW; x++) {
        const v = grid[idx(x, y)];
        if (!v) continue;
        const rgb = esOscuro(x, y) ? DARKPAL[v - 1] : PALETTE[v - 1];
        const o = (y * GW + x) * 4;
        pixels[o] = rgb[0];
        pixels[o + 1] = rgb[1];
        pixels[o + 2] = rgb[2];
        pixels[o + 3] = 255;
      }
    }
    sandCtx.putImageData(sandImg, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sandCanvas, 0, 0, GW, GH, 0, 0, BW, BH);
  }

  function dibujarPieza(color, shape, ox, oy, alpha = 1, outline = false) {
    ctx.globalAlpha = alpha;
    for (const [r, c] of shape.cells) {
      const x = (ox + c * SCALE) * CW;
      const y = (oy + r * SCALE) * CH;
      const w = SCALE * CW;
      const h = SCALE * CH;
      ctx.fillStyle = COLORS[color - 1];
      ctx.fillRect(x + 0.5, y + 0.5, w - 1, h - 1);
      ctx.globalAlpha = alpha * 0.38;
      ctx.fillStyle = DARKPAL[color - 1];
      ctx.fillRect(x + 0.5, y + h * 0.76, w - 1, h * 0.24 - 0.5);
      ctx.globalAlpha = alpha;
    }
    if (outline) {
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = 'rgba(255,255,255,.7)';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(
        ox * CW + 0.5,
        oy * CH + 0.5,
        shape.w * SCALE * CW - 1,
        shape.h * SCALE * CH - 1,
      );
      ctx.setLineDash([]);
    }
    ctx.globalAlpha = 1;
  }

  function draw() {
    const bg = ctx.createRadialGradient(BW / 2, 0, 20, BW / 2, BH / 2, BH);
    bg.addColorStop(0, '#101d33');
    bg.addColorStop(1, '#060c16');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, BW, BH);

    dibujarArena();

    const dy = DANGER_ROW * CH;
    ctx.save();
    ctx.setLineDash([5, 7]);
    ctx.strokeStyle = 'rgba(248,113,113,.42)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, dy);
    ctx.lineTo(BW, dy);
    ctx.stroke();
    ctx.restore();

    if (block) dibujarPieza(block.color, block.shape, block.ox, block.oy);

    if (drag && drag.column !== null) {
      const piece = tray[drag.i];
      if (piece) {
        const ox = drag.column * SCALE;
        ctx.save();
        ctx.setLineDash([3, 8]);
        ctx.strokeStyle = 'rgba(255,255,255,.18)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo((ox + piece.shape.w * SCALE / 2) * CW, 0);
        ctx.lineTo((ox + piece.shape.w * SCALE / 2) * CW, BH);
        ctx.stroke();
        ctx.restore();
        dibujarPieza(piece.color, piece.shape, ox, 0, 0.35, true);
      }
    }

    flashes.forEach((f) => {
      ctx.fillStyle = `rgba(255,255,255,${0.55 * (f.t / f.max)})`;
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
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '700 22px "Cormorant Garamond", serif';
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
      acc += dt * 1000;
      let steps = 0;
      while (acc >= STEP_MS && steps < 6 && !over) {
        acc -= STEP_MS;
        steps += 1;
        if (state === 'falling') {
          stepBlock();
          if (!block && state === 'sand') {
            settles = 0;
            acc = 0;
          }
        } else if (state === 'sand') {
          const moved = pasoSand();
          if (moved) settles = 0;
          else settles += STEP_MS;
          if (settles >= 60) {
            const cleared = resolverLineas();
            if (cleared) settles = 0;
            else finTurno();
          }
        } else {
          break;
        }
      }
      actualizarEfectos(dt);
    }

    draw();
    if (!over) raf = requestAnimationFrame(loop);
  }

  function iniciar() {
    running = true;
    last = 0;
    acc = 0;
    raf = requestAnimationFrame(loop);
  }

  function reiniciar() {
    cancelAnimationFrame(raf);
    clearTimeout(invalidTimer);
    if (drag) {
      const d = drag;
      drag = null;
      limpiarDrag(d);
    }
    grid = new Uint8Array(GW * GH);
    block = null;
    state = 'ready';
    score = 0;
    combo = 0;
    settles = 0;
    acc = 0;
    over = false;
    flashes = [];
    bursts = [];
    labels = [];
    refillTray();
    overlay.classList.add('hidden');
    overlay.innerHTML = '';
    stage.classList.remove('sb3-invalid');
    updateHud();
    renderTray();
    draw();
    iniciar();
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (card?.requestFullscreen) {
        await card.requestFullscreen();
      }
    } catch (e) {}
  }

  const onClose = () => onExit?.();
  fsBtn.addEventListener('click', toggleFullscreen);
  closeBtn.addEventListener('click', onClose);

  refillTray();
  updateHud();
  renderTray();
  draw();
  iniciar();

  return () => {
    running = false;
    cancelAnimationFrame(raf);
    clearTimeout(invalidTimer);
    if (drag) {
      const d = drag;
      drag = null;
      limpiarDrag(d);
    }
    saveRecord('sandblast', score);
    if (document.fullscreenElement === card) document.exitFullscreen?.().catch(() => {});
    fsBtn.removeEventListener('click', toggleFullscreen);
    closeBtn.removeEventListener('click', onClose);
    container.innerHTML = '';
  };
}
