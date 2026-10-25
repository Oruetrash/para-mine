// Devuelve el HTML de `n` skeletons (usar con innerHTML).
export function skeleton(n = 3, cls = '') {
  return Array.from({ length: n }, () => `<div class="skel ${cls}"></div>`).join('');
}
