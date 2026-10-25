// Store mínimo con pub/sub, con status por slice.
const s = {};
const subs = new Map();

export const get = (k) => s[k];

export const set = (k, v) => {
  s[k] = v;
  const fns = subs.get(k);
  if (fns) fns.forEach((f) => f(v));
};

export const on = (k, f) => {
  if (!subs.has(k)) subs.set(k, new Set());
  const fns = subs.get(k);
  fns.add(f);
  return () => fns.delete(f);
};

export const getStatus = (k) => s[`${k}.status`] || 'idle';
export const setStatus = (k, v) => set(`${k}.status`, v);
