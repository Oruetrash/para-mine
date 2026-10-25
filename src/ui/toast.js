let host = null;

function ensure() {
  if (!host) {
    host = document.createElement('div');
    host.className = 'toast-host';
    document.body.appendChild(host);
  }
  return host;
}

function dismiss(el) {
  el.classList.add('out');
  setTimeout(() => el.remove(), 300);
}

function show(msg, kind, ms = 3200) {
  const h = ensure();
  const el = document.createElement('div');
  el.className = `toast ${kind || ''}`;
  el.textContent = msg;
  h.appendChild(el);
  setTimeout(() => dismiss(el), ms);
}

export const toast = {
  error: (m) => show(m, 'toast-error'),
  success: (m) => show(m, 'toast-success'),
  // Toast con acción (undo). Devuelve un `finish` para cerrarlo antes si se commitea.
  undo: (msg, onAction, actionLabel = 'Deshacer', ms = 5000) => {
    const h = ensure();
    const el = document.createElement('div');
    el.className = 'toast toast-undo';
    const span = document.createElement('span');
    span.textContent = msg;
    const btn = document.createElement('button');
    btn.className = 'toast-action';
    btn.type = 'button';
    btn.textContent = actionLabel;
    let done = false;
    const finish = () => { if (!done) { done = true; dismiss(el); } };
    btn.addEventListener('click', () => { finish(); onAction && onAction(); });
    el.append(span, btn);
    h.appendChild(el);
    setTimeout(finish, ms);
    return finish;
  },
};
