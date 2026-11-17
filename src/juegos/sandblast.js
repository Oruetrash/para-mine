import { formatScore, getRecord, saveRecord } from './records.js';

const COLS = 8;
const ROWS = 10;
const COLORS = ['#e0a15c', '#d97b6c', '#79ad9c', '#8d9bd3', '#d8b94f', '#b487c4'];

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

function nuevoJuego() {
  const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  return { grid, pieces: nuevasPiezas(), selected: 0, score: 0, over: false };
}

function nuevasPiezas() {
  return [0, 1, 2].map(() => {
    const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    const minR = Math.min(...shape.map((c) => c[0]));
    const minC = Math.min(...shape.map((c) => c[1]));
    const cells = shape.map(([r, c]) => [r - minR, c - minC]);
    const w = Math.max(...cells.map((c) => c[1])) + 1;
    const h = Math.max(...cells.map((c) => c[0])) + 1;
    const counts = Array(w).fill(0);
    cells.forEach(([, c]) => { counts[c] += 1; });
    return { cells, w, h, counts, color: COLORS[Math.floor(Math.random() * COLORS.length)] };
  });
}

export function mountSandBlast(container, { onExit } = {}) {
  container.innerHTML = `
    <div class="arcade-game sb-game">
      <div class="arcade-title">🏖️ Sand Blast</div>
      <div class="arcade-hud">
        <span class="arcade-score">Puntaje <b>0</b></span>
        <span class="arcade-best">🏆 <b>0</b></span>
      </div>
      <div class="sb-board" role="grid" aria-label="Tablero de Sand Blast"></div>
      <div class="sb-dock" aria-label="Piezas disponibles"></div>
      <p class="arcade-hint">Elegí una pieza y tocá una columna. Completá una línea para explotar la arena.</p>
      <div class="arcade-actions"><button type="button" class="btn-big ghost sb-restart">Reiniciar</button></div>
      <div class="arcade-overlay hidden"></div>
    </div>`;

  const board = container.querySelector('.sb-board');
  const dock = container.querySelector('.sb-dock');
  const scoreEl = container.querySelector('.arcade-score b');
  const bestEl = container.querySelector('.arcade-best b');
  const overlay = container.querySelector('.arcade-overlay');
  const restartBtn = container.querySelector('.sb-restart');

  let state = nuevoJuego();
  let best = getRecord('sandblast');
  let badTimer = 0;

  function freeInCol(col) {
    let n = 0;
    for (let r = 0; r < ROWS; r++) if (!state.grid[r][col]) n += 1;
    return n;
  }

  function canPlaceAt(piece, start) {
    if (start < 0 || start + piece.w > COLS) return false;
    for (let j = 0; j < piece.w; j++) {
      if (piece.counts[j] > freeInCol(start + j)) return false;
    }
    return true;
  }

  function canPlaceAnywhere(piece) {
    for (let start = 0; start <= COLS - piece.w; start++) {
      if (canPlaceAt(piece, start)) return true;
    }
    return false;
  }

  function boardHtml() {
    let html = '';
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const color = state.grid[r][c];
        html += `<div class="sb-cell${color ? ' filled' : ''}" data-col="${c}" role="gridcell"${color ? ` style="--c:${color}"` : ''}></div>`;
      }
    }
    return html;
  }

  function pieceHtml(piece) {
    if (!piece) return '<span class="sb-piece-empty">✓</span>';
    const filled = new Set(piece.cells.map(([r, c]) => `${r},${c}`));
    let html = `<span class="sb-piece-preview" style="grid-template-columns:repeat(${piece.w}, 15px);grid-auto-rows:15px">`;
    for (let r = 0; r < piece.h; r++) {
      for (let c = 0; c < piece.w; c++) {
        const on = filled.has(`${r},${c}`);
        html += `<span class="sb-piece-cell${on ? ' on' : ''}"${on ? ` style="--c:${piece.color}"` : ''}></span>`;
      }
    }
    return html + '</span>';
  }

  function renderBoard() { board.innerHTML = boardHtml(); }

  function renderDock() {
    dock.innerHTML = '';
    state.pieces.forEach((piece, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'sb-piece' + (i === state.selected ? ' active' : '') + (piece ? '' : ' empty');
      b.disabled = !piece || state.over;
      b.innerHTML = pieceHtml(piece);
      b.setAttribute('aria-label', piece ? `Elegir pieza ${i + 1}` : `Pieza ${i + 1} usada`);
      b.addEventListener('click', () => {
        if (state.over || !piece) return;
        state.selected = i;
        renderDock();
        clearHover();
      });
      dock.appendChild(b);
    });
  }

  function renderHud() {
    scoreEl.textContent = formatScore(state.score);
    bestEl.textContent = formatScore(best);
  }

  function render() {
    renderBoard();
    renderDock();
    renderHud();
  }

  function clearHover() {
    board.querySelectorAll('.sb-hover, .sb-hover-bad').forEach((el) => el.classList.remove('sb-hover', 'sb-hover-bad'));
  }

  function hoverCol(col) {
    clearHover();
    if (state.over || state.selected < 0) return;
    const piece = state.pieces[state.selected];
    if (!piece) return;
    const start = Math.max(0, Math.min(col, COLS - piece.w));
    const ok = canPlaceAt(piece, start);
    const cls = ok ? 'sb-hover' : 'sb-hover-bad';
    for (let c = start; c < start + piece.w; c++) {
      board.querySelectorAll(`[data-col="${c}"]`).forEach((el) => el.classList.add(cls));
    }
  }

  function aplicarGravedad() {
    for (let c = 0; c < COLS; c++) {
      const vals = [];
      for (let r = ROWS - 1; r >= 0; r--) if (state.grid[r][c]) vals.push(state.grid[r][c]);
      for (let r = ROWS - 1, i = 0; r >= 0; r--, i++) state.grid[r][c] = vals[i] || null;
    }
  }

  function resolverLineas() {
    let combo = 0;
    let hubo = false;
    while (true) {
      const filas = [];
      for (let r = ROWS - 1; r >= 0; r--) {
        if (state.grid[r].every(Boolean)) filas.push(r);
      }
      if (!filas.length) break;
      hubo = true;
      combo += 1;
      filas.forEach((r) => {
        const color = state.grid[r][0];
        const mismo = state.grid[r].every((c) => c === color);
        state.score += 20 * combo + (mismo ? 20 : 0);
        for (let c = 0; c < COLS; c++) state.grid[r][c] = null;
      });
      aplicarGravedad();
    }
    if (hubo) {
      board.classList.remove('sb-clearing');
      void board.offsetWidth;
      board.classList.add('sb-clearing');
    }
  }

  function hayJugada() {
    return state.pieces.filter(Boolean).some(canPlaceAnywhere);
  }

  function mostrarFin() {
    state.over = true;
    const nuevo = saveRecord('sandblast', state.score);
    best = getRecord('sandblast');
    overlay.innerHTML = `
      <div class="arcade-over-emoji" aria-hidden="true">🏖️</div>
      <h4>Se llenó la arena</h4>
      <p class="arcade-over-score">${formatScore(state.score)} puntos</p>
      <p class="arcade-over-sub">${nuevo ? '¡Nuevo récord!' : 'Récord: ' + formatScore(best)}</p>
      <button type="button" class="btn-big" data-arcade="restart">Jugar de nuevo</button>
      <button type="button" class="btn-big ghost" data-arcade="exit">Volver a juegos</button>`;
    overlay.classList.remove('hidden');
    overlay.querySelector('[data-arcade="restart"]').addEventListener('click', reiniciar);
    overlay.querySelector('[data-arcade="exit"]').addEventListener('click', () => onExit?.());
    render();
  }

  function colocar(col) {
    if (state.over || state.selected < 0) return;
    const piece = state.pieces[state.selected];
    if (!piece) return;
    const start = Math.max(0, Math.min(col, COLS - piece.w));
    if (!canPlaceAt(piece, start)) {
      board.classList.remove('sb-invalid');
      void board.offsetWidth;
      board.classList.add('sb-invalid');
      clearTimeout(badTimer);
      badTimer = setTimeout(() => board.classList.remove('sb-invalid'), 320);
      return;
    }

    for (let j = 0; j < piece.w; j++) {
      const c = start + j;
      for (let n = 0; n < piece.counts[j]; n++) {
        for (let r = ROWS - 1; r >= 0; r--) {
          if (!state.grid[r][c]) { state.grid[r][c] = piece.color; break; }
        }
      }
    }
    state.score += piece.cells.length;
    state.pieces[state.selected] = null;
    state.selected = -1;
    resolverLineas();
    if (state.pieces.every((p) => !p)) {
      state.pieces = nuevasPiezas();
      state.selected = 0;
    } else if (state.selected < 0) {
      state.selected = state.pieces.findIndex(Boolean);
    }
    if (!hayJugada()) { mostrarFin(); return; }
    render();
  }

  function reiniciar() {
    clearTimeout(badTimer);
    overlay.classList.add('hidden');
    overlay.innerHTML = '';
    state = nuevoJuego();
    render();
  }

  board.addEventListener('pointermove', (e) => {
    const cell = e.target.closest('[data-col]');
    if (cell) hoverCol(Number(cell.dataset.col));
  });
  board.addEventListener('pointerleave', clearHover);
  board.addEventListener('click', (e) => {
    const cell = e.target.closest('[data-col]');
    if (!cell) return;
    colocar(Number(cell.dataset.col));
  });
  restartBtn.addEventListener('click', reiniciar);

  render();

  return () => {
    clearTimeout(badTimer);
    saveRecord('sandblast', state.score);
    container.innerHTML = '';
  };
}
