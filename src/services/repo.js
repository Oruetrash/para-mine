import { db } from '../lib/supabase.js';

const ok = ({ data, error }) => { if (error) throw error; return data; };

export const repo = (t) => ({
  list: (q = (x) => x) => q(db.from(t).select('*')).then(ok),
  insert: (row) => db.from(t).insert(row).select().single().then(ok),
  patch: (id, p) => db.from(t).update(p).eq('id', id).select().single().then(ok),
  remove: (id) => db.from(t).delete().eq('id', id).then(ok),
});

// Tablas con CRUD estándar.
export const T = Object.fromEntries(
  ['razones', 'diario', 'planes', 'reto', 'cartas', 'capsula', 'lugares', 'canciones', 'mood'].map((t) => [t, repo(t)])
);

// Tablas con orden propio o columnas especiales.
export const fotosRepo = repo('fotos');
export const notasRepo = repo('notas');
export const fotosDiaRepo = repo('fotos_dia');
export const paraVosRepo = repo('fotos_para_vos');
export const mensajesRepo = repo('mensajes_diarios');
export const arteRepo = repo('arte');
export const teQuieroRepo = repo('te_quiero');
export const advientoRepo = repo('adviento');
export const propuestaRepo = repo('propuesta');

export const REPOS = {
  fotos: fotosRepo, notas: notasRepo, fotosDia: fotosDiaRepo, paraVos: paraVosRepo,
  mensajes: mensajesRepo, razones: T.razones, arte: arteRepo, teQuiero: teQuieroRepo,
  diario: T.diario, planes: T.planes, capsula: T.capsula, cartas: T.cartas,
  lugares: T.lugares, reto: T.reto, mood: T.mood, adviento: advientoRepo, canciones: T.canciones,
};

export const ORDERS = {
  fotos: (q) => q.order('creado_en'),
  notas: (q) => q.order('creado_en'),
  fotosDia: (q) => q.order('fecha'),
  capsula: (q) => q.order('abre_en'),
  adviento: (q) => q.order('fecha'),
};
