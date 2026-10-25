let host = null;

function ensure() {
  if (!host) {
    host = document.createElement('div');
    host.className = 'toast-host';
    document.body.appendChild(host);
  }
  return host;
}

function show(msg, kind) {
  const h = ensure();
  const el = document.createElement('div');
  el.className = `toast ${kind || ''}`;
  el.textContent = msg;
  h.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 3200);
}

export const toast = {
  error: (m) => show(m, 'toast-error'),
  success: (m) => show(m, 'toast-success'),
};
