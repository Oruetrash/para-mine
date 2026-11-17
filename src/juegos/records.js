const KEY = (juego) => `record:${juego}`;

export function getRecord(juego) {
  try {
    return Number(localStorage.getItem(KEY(juego))) || 0;
  } catch (e) {
    return 0;
  }
}

export function saveRecord(juego, score) {
  const prev = getRecord(juego);
  if (score > prev) {
    try { localStorage.setItem(KEY(juego), String(score)); } catch (e) {}
    return true;
  }
  return false;
}

export function formatScore(n) {
  return Number(n || 0).toLocaleString('es-AR');
}
