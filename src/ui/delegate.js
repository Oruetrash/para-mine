// Delegación de eventos (una sola vez, no por render).
export function delegate(root, selector, type, handler) {
  root.addEventListener(type, (e) => {
    const el = e.target.closest(selector);
    if (el && root.contains(el)) handler(el, e);
  });
}

// Delegación por `data-action` con un mapa { acción: fn(dataset, el, e) }.
export function delegateMap(root, map) {
  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (el && root.contains(el)) map[el.dataset.action]?.(el.dataset, el, e);
  });
}
