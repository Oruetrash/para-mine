// Delegación de eventos: delegate(root, selector, type, handler).
export function delegate(root, selector, type, handler) {
  root.addEventListener(type, (e) => {
    const el = e.target.closest(selector);
    if (el && root.contains(el)) handler(el, e);
  });
}
