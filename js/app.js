// ============================================================
//  APP PRINCIPAL
// ============================================================

const db = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const SLOTS = [
  { tipo: 'nosotros1', label: 'Nosotros #1', icono: '💑' },
  { tipo: 'nosotros2', label: 'Nosotros #2', icono: '💞' },
  { tipo: 'ella', label: 'Ella', icono: '🌹' },
];

const state = {
  fotos: [], notas: [], fotosDia: [], paraVos: [], mensajes: [],
  razones: [], arte: [], teQuiero: [], diario: [], planes: [],
  capsula: [], cartas: [], lugares: [], reto: [], mood: [],
  signedUrls: {}, pvTab: 'el', albumMode: 'mes', pvWho: 'el',
  who: localStorage.getItem('who') || 'el', envTipo: 'mensaje',
};

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

function whoLabel(w) { return w === 'el' ? 'Él' : 'Ella'; }
function saludo() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días,';
  if (h < 20) return 'Buenas tardes,';
  return 'Buenas noches,';
}
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function fechaCorta(str) {
  if (!str) return '';
  const [y, m, d] = String(str).split('-').map(Number);
  return `${d} ${MESES[m - 1].slice(0, 3)}`;
}
function escapeHtml(s) {
  return (s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function pickN(arr, n) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, n);
}

// ---------- Fondo: motas sutiles ----------
function initParticles() {
  const breathe = document.createElement('div');
  breathe.id = 'breathe';
  document.body.prepend(breathe);
  const bg = $('#particles-bg');
  for (let i = 0; i < 22; i++) {
    const m = document.createElement('span');
    m.className = 'mote';
    m.style.left = Math.random() * 100 + 'vw';
    m.style.animationDuration = (16 + Math.random() * 20) + 's';
    m.style.animationDelay = (Math.random() * 20) + 's';
    m.style.width = m.style.height = (2 + Math.random() * 3) + 'px';
    bg.appendChild(m);
  }
}

// ---------- OneSignal ----------
function initOneSignal() {
  const base = new URL('.', location.href).pathname;
  const swPath = base + 'onesignal/';
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async function (OS) {
    try {
      await OS.init({
        appId: CONFIG.ONESIGNAL_APP_ID,
        path: swPath,
        serviceWorkerParam: { scope: swPath },
      });
      await OS.login(state.who);
      if (OS.Notifications && OS.Notifications.requestPermission) OS.Notifications.requestPermission();
    } catch (e) {}
  });
}

// ---------- Login ----------
async function checkSession() {
  const { data } = await db.auth.getSession();
  if (data.session) showApp();
  else $('#login-screen').classList.remove('hidden');
}

$$('.who-btn').forEach((b) => b.addEventListener('click', () => {
  state.who = b.dataset.who;
  $$('.who-btn').forEach((x) => x.classList.toggle('active', x === b));
}));

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const pass = $('#password-input').value.trim();
  if (!pass) return;
  $('#login-btn').disabled = true;
  $('#login-btn').textContent = 'Entrando…';
  const { error } = await db.auth.signInWithPassword({ email: CONFIG.LOGIN_EMAIL, password: pass });
  if (error) {
    $('#login-error').textContent = 'Clave incorrecta 💔';
    $('#login-btn').disabled = false;
    $('#login-btn').textContent = 'Entrar';
  } else {
    localStorage.setItem('who', state.who);
    $('#login-error').textContent = '';
    showApp();
  }
});

async function showApp() {
  $('#login-screen').classList.add('hidden');
  $('#app').classList.remove('hidden');
  $('#saludo').textContent = saludo();
  initOneSignal();
  startCountdown();
  renderTimeline();
  renderCanciones();
  renderCofre();
  renderMasMenu();
  renderDiasJuntos();
  await loadData();
}

// ---------- Navegación ----------
$$('.nav-btn').forEach((btn) => {
  if (btn.id === 'nav-mas') {
    btn.addEventListener('click', () => $('#mas-menu').classList.remove('hidden'));
    return;
  }
  btn.addEventListener('click', () => go(btn.dataset.view));
});
$$('.cta').forEach((btn) => btn.addEventListener('click', () => go(btn.dataset.go)));
$('#mas-close').addEventListener('click', () => $('#mas-menu').classList.add('hidden'));

function go(view) {
  $('#mas-menu').classList.add('hidden');
  $$('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  $$('.view').forEach((v) => v.classList.remove('active'));
  const el = $('#view-' + view);
  if (el) el.classList.add('active');
  window.scrollTo({ top: 0 });
}

function renderMasMenu() {
  const items = [
    { view: 'canciones', icono: '🎵', texto: 'Música' },
    { view: 'razones', icono: '💌', texto: 'Razones' },
    { view: 'arte', icono: '🎨', texto: 'Su arte' },
    { view: 'tequiero', icono: '❤️', texto: 'Te quiero' },
    { view: 'diario', icono: '📓', texto: 'Diario' },
    { view: 'planes', icono: '🗺️', texto: 'Planes' },
    { view: 'capsula', icono: '⏳', texto: 'Cápsula' },
    { view: 'cartas', icono: '✉️', texto: 'Cartas' },
    { view: 'lugares', icono: '📍', texto: 'Lugares' },
    { view: 'reto', icono: '🎯', texto: 'Reto' },
    { view: 'mood', icono: '🌤️', texto: 'Mood' },
  ];
  if (state.who === 'el') items.push({ view: 'creador', icono: '🔐', texto: 'Creador' });
  const grid = $('#mas-grid');
  grid.innerHTML = '';
  items.forEach((it) => {
    const b = document.createElement('button');
    b.className = 'mas-item';
    b.innerHTML = `<span class="mi">${it.icono}</span><span class="mt">${it.texto}</span>`;
    b.addEventListener('click', () => go(it.view));
    grid.appendChild(b);
  });
}

// ---------- Cuenta regresiva + días juntos ----------
function startCountdown() {
  const target = CONFIG.CUMPLE.getTime();
  const tick = () => {
    let diff = target - Date.now();
    if (diff < 0) diff = 0;
    $('#cd-dias').textContent = Math.floor(diff / 86400000);
    $('#cd-horas').textContent = Math.floor((diff % 86400000) / 3600000);
    $('#cd-min').textContent = Math.floor((diff % 3600000) / 60000);
    $('#cd-seg').textContent = Math.floor((diff % 60000) / 1000);
  };
  tick();
  setInterval(tick, 1000);
}
function renderDiasJuntos() {
  const d = Math.floor((Date.now() - CONFIG.INICIO.getTime()) / 86400000);
  $('#dias-juntos').innerHTML = `Hace <strong>${d}</strong> días que mi mundo gira alrededor tuyo.`;
}

// ---------- Historia ----------
function renderTimeline() {
  const tl = $('#timeline');
  tl.innerHTML = '';
  CONFIG.HISTORIA.forEach((cap) => {
    const item = document.createElement('div');
    item.className = 'tl-item';
    item.innerHTML = `<div class="tl-card"><span class="tl-icono">${cap.icono}</span><h3>${cap.titulo}</h3><p>${cap.texto}</p></div>`;
    tl.appendChild(item);
  });
}

// ---------- Canciones ----------
function renderCanciones() {
  const wrap = $('#canciones');
  wrap.innerHTML = '';
  Object.values(CONFIG.CANCIONES).forEach((block) => {
    const div = document.createElement('div');
    div.className = 'music-block';
    div.innerHTML = `<h3>${block.titulo}</h3><p class="music-desc">${block.descripcion}</p>`;
    block.tracks.forEach((t) => {
      const iframe = document.createElement('iframe');
      iframe.src = `https://open.spotify.com/embed/track/${t.id}`;
      iframe.width = '100%';
      iframe.height = '152';
      iframe.frameBorder = '0';
      iframe.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
      iframe.loading = 'lazy';
      div.appendChild(iframe);
    });
    wrap.appendChild(div);
  });
}

// ---------- Carga de datos ----------
async function fetchTable(name, order) {
  const { data, error } = await db.from(name).select('*').order(order || 'creado_en', { ascending: order === 'fecha' || order === 'abre_en' });
  return (!error && data) ? data : [];
}
async function loadData() {
  const [fotos, notas, fotosDia, paraVos, mensajes, razones, arte, teQuiero, diario, planes, capsula, cartas, lugares, reto, mood] = await Promise.all([
    fetchTable('fotos', 'creado_en'),
    fetchTable('notas', 'creado_en'),
    fetchTable('fotos_dia', 'fecha'),
    fetchTable('fotos_para_vos'),
    fetchTable('mensajes_diarios'),
    fetchTable('razones'),
    fetchTable('arte'),
    fetchTable('te_quiero'),
    fetchTable('diario'),
    fetchTable('planes'),
    fetchTable('capsula', 'abre_en'),
    fetchTable('cartas'),
    fetchTable('lugares'),
    fetchTable('reto'),
    fetchTable('mood'),
  ]);
  Object.assign(state, { fotos, notas, fotosDia, paraVos, mensajes, razones, arte, teQuiero, diario, planes, capsula, cartas, lugares, reto, mood });

  const paths = new Set();
  [...state.fotos, ...state.fotosDia, ...state.paraVos, ...state.arte].forEach((f) => { if (f.url) paths.add(f.url); });
  await Promise.all([...paths].map(async (p) => {
    const { data } = await db.storage.from('fotos').createSignedUrl(p, 604800);
    if (data) state.signedUrls[p] = data.signedUrl;
  }));

  renderAlbum();
  renderHoy();
  renderEnvios();
  renderParaVos();
  renderRazones();
  renderArte();
  renderTeQuiero();
  renderDiario();
  renderPlanes();
  renderCapsula();
  renderCartas();
  renderLugares();
  renderReto();
  renderMood();
  renderCreador();
  renderRecuerdo();
}

// ---------- Recuerdo del día ----------
function renderRecuerdo() {
  const wrap = $('#recuerdo-del-dia');
  const fotos = state.fotos.filter((f) => !(f.url || '').toLowerCase().endsWith('.mp4'));
  if (fotos.length === 0) { wrap.innerHTML = ''; return; }
  const f = fotos[Math.floor(Math.random() * fotos.length)];
  wrap.innerHTML = `<div class="rec-label">Recuerdo del día</div>
    <img src="${state.signedUrls[f.url] || ''}" data-full="${state.signedUrls[f.url] || ''}" />
    <div class="rec-cap">${MESES[f.mes - 1]} ${f.anio}</div>`;
  wrap.querySelector('img')?.addEventListener('click', (e) => openLightbox(e.target.dataset.full));
}

// ---------- Álbum ----------
function getMonths() {
  const now = new Date();
  const endY = now.getFullYear(), endM = now.getMonth() + 1;
  const months = [];
  let y = 2023, m = 4;
  while (y < endY || (y === endY && m <= endM)) { months.push({ anio: y, mes: m }); m++; if (m > 12) { m = 1; y++; } }
  return months.reverse();
}
function renderAlbum() {
  const wrap = $('#album');
  wrap.innerHTML = '';
  if (state.albumMode === 'mejores') { renderMejores(wrap); return; }
  const fotosPorClave = {}, notasPorClave = {};
  state.fotos.forEach((f) => { const k = `${f.anio}-${f.mes}-${f.tipo}`; (fotosPorClave[k] = fotosPorClave[k] || []).push(f); });
  state.notas.forEach((n) => { const k = `${n.anio}-${n.mes}-${n.tipo}`; (notasPorClave[k] = notasPorClave[k] || []).push(n); });
  getMonths().forEach(({ anio, mes }) => {
    const card = document.createElement('div');
    card.className = 'month-card';
    const mesNombre = MESES[mes - 1];
    let html = `<div class="month-head"><h3>${mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1)}</h3><span class="year">${anio}</span></div><div class="slot-row">`;
    SLOTS.forEach((s) => {
      const k = `${anio}-${mes}-${s.tipo}`;
      html += renderSlot(anio, mes, s.tipo, s.label, s.icono, (fotosPorClave[k] || [])[0] || null, (notasPorClave[k] || [])[0] || null);
    });
    html += '</div>';
    const extras = [];
    (fotosPorClave[`${anio}-${mes}-extra`] || []).forEach((f) => extras.push(f));
    SLOTS.forEach((s) => { const arr = fotosPorClave[`${anio}-${mes}-${s.tipo}`] || []; for (let i = 1; i < arr.length; i++) extras.push(arr[i]); });
    if (extras.length) {
      html += `<div class="extras-row"><div class="extra-title">Más recuerdos</div><div class="extra-grid">`;
      extras.forEach((f) => { html += mediaTag(f); });
      html += '</div></div>';
    }
    card.innerHTML = html;
    wrap.appendChild(card);
  });
  bindAlbumEvents();
}
function renderSlot(anio, mes, tipo, label, icono, foto, nota) {
  let inner = '';
  if (foto) {
    inner = mediaTag(foto);
    inner += `<div class="slot-actions">
      <button class="mini-btn star" data-action="star" data-id="${foto.id}">${foto.destacada ? '⭐' : '☆'}</button>
      <button class="mini-btn" data-action="add" data-anio="${anio}" data-mes="${mes}" data-tipo="${tipo}">➕</button>
      <button class="mini-btn" data-action="del" data-id="${foto.id}">🗑️</button></div>`;
  } else if (nota) {
    inner = `<div class="slot-note">${escapeHtml(nota.texto)}</div>
      <div class="slot-actions">
      <button class="mini-btn" data-action="add" data-anio="${anio}" data-mes="${mes}" data-tipo="${tipo}">➕</button>
      <button class="mini-btn" data-action="delnote" data-id="${nota.id}">🗑️</button></div>`;
  } else {
    inner = `<div class="slot-empty">${icono}<br/>Sin foto aún</div>
      <div class="slot-actions">
      <button class="mini-btn" data-action="add" data-anio="${anio}" data-mes="${mes}" data-tipo="${tipo}">📷</button>
      <button class="mini-btn" data-action="note" data-anio="${anio}" data-mes="${mes}" data-tipo="${tipo}">✍️</button></div>`;
  }
  return `<div class="slot ${tipo === 'ella' ? 'ella' : ''}"><span class="slot-label">${label}</span>${inner}</div>`;
}
function renderMejores(wrap) {
  const d = state.fotos.filter((f) => f.destacada);
  if (!d.length) { wrap.innerHTML = '<p style="text-align:center;color:var(--marron-claro);padding:20px">Todavía no destacaron fotos. En "Mes a mes", tocá la ⭐.</p>'; return; }
  const porMes = {};
  d.forEach((f) => { const k = `${f.anio}-${f.mes}`; (porMes[k] = porMes[k] || []).push(f); });
  Object.keys(porMes).sort((a, b) => (a < b ? 1 : -1)).forEach((k) => {
    const [anio, mes] = k.split('-').map(Number);
    const t = document.createElement('div');
    t.className = 'mejor-month-title';
    t.textContent = `${MESES[mes - 1].charAt(0).toUpperCase() + MESES[mes - 1].slice(1)} ${anio}`;
    wrap.appendChild(t);
    const g = document.createElement('div');
    g.className = 'mejores-grid';
    porMes[k].forEach((f) => { g.innerHTML += `<div class="mejor-card">${mediaTag(f)}<div class="mejor-tag">⭐</div></div>`; });
    wrap.appendChild(g);
  });
  bindAlbumEvents();
}
function mediaTag(foto) {
  const url = state.signedUrls[foto.url] || '';
  const isVideo = (foto.url || '').toLowerCase().endsWith('.mp4');
  if (isVideo) return `<video src="${url}" controls playsinline></video>`;
  return `<img src="${url}" alt="foto" loading="lazy" data-full="${url}" />`;
}
function bindAlbumEvents() {
  $$('#album [data-action]').forEach((btn) => btn.addEventListener('click', () => {
    const a = btn.dataset.action;
    if (a === 'add') openUpload(btn.dataset.anio, btn.dataset.mes, btn.dataset.tipo);
    else if (a === 'note') openNote(btn.dataset.anio, btn.dataset.mes, btn.dataset.tipo);
    else if (a === 'del') deleteFoto(btn.dataset.id);
    else if (a === 'delnote') deleteNota(btn.dataset.id);
    else if (a === 'star') toggleDestacada(btn.dataset.id);
  }));
  $$('#album img').forEach((img) => img.addEventListener('click', () => openLightbox(img.dataset.full)));
}
async function toggleDestacada(id) {
  const f = state.fotos.find((x) => x.id === id);
  if (!f) return;
  const { error } = await db.from('fotos').update({ destacada: !f.destacada }).eq('id', id);
  if (error) { alert('No se pudo: ' + error.message); return; }
  f.destacada = !f.destacada;
  renderAlbum();
}

// ---------- Subir foto (genérico) ----------
let uploadContext = null;
function openUpload(anio, mes, tipo) {
  uploadContext = { tipo: 'album', anio: parseInt(anio), mes: parseInt(mes), slot: tipo };
  $('#upload-slot-label').textContent = `${SLOTS.find((s) => s.tipo === tipo)?.label || 'Extra'} · ${MESES[mes - 1]} ${anio}`;
  $('#upload-input').value = '';
  $('#upload-modal').classList.remove('hidden');
}
function openUploadDia() {
  uploadContext = { tipo: 'dia' };
  $('#upload-slot-label').textContent = 'Foto juntos de hoy';
  $('#upload-input').value = '';
  $('#upload-modal').classList.remove('hidden');
}
function openUploadArte() {
  uploadContext = { tipo: 'arte' };
  $('#upload-slot-label').textContent = 'Subir un dibujo / plano';
  $('#upload-input').value = '';
  $('#upload-modal').classList.remove('hidden');
}
$('#upload-cancel').addEventListener('click', () => $('#upload-modal').classList.add('hidden'));
$('#upload-do').addEventListener('click', async () => {
  const file = $('#upload-input').files[0];
  if (!file) { alert('Elegí una foto primero'); return; }
  const ext = '.' + (file.name.split('.').pop() || 'jpg').toLowerCase();
  const safe = file.name.replace(/\.[^.]+$/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 60);
  const ct = file.type || (ext === '.mp4' ? 'video/mp4' : 'image/jpeg');
  let storagePath, insert;
  if (uploadContext.tipo === 'dia') {
    storagePath = `foto_dia/${todayStr()}_${Date.now()}${ext}`;
    insert = () => db.from('fotos_dia').upsert({ fecha: todayStr(), url: storagePath, nota: null }, { onConflict: 'fecha' });
  } else if (uploadContext.tipo === 'arte') {
    storagePath = `arte/${safe}_${Date.now()}${ext}`;
    insert = () => db.from('arte').insert({ url: storagePath, titulo: file.name.replace(/\.[^.]+$/, '') });
  } else {
    const { anio, mes, slot } = uploadContext;
    storagePath = `${anio}/${mes}/${slot}/${safe}_${Date.now()}${ext}`;
    insert = () => db.from('fotos').insert({ anio, mes, tipo: slot, url: storagePath, subido_por: 'app' });
  }
  $('#upload-do').disabled = true;
  const { error: upErr } = await db.storage.from('fotos').upload(storagePath, file, { contentType: ct, upsert: false });
  if (upErr) { alert('No se pudo subir: ' + upErr.message); $('#upload-do').disabled = false; return; }
  const { error: inErr } = await insert();
  $('#upload-do').disabled = false;
  $('#upload-modal').classList.add('hidden');
  if (inErr) alert('Se subió pero no se guardó: ' + inErr.message);
  loadData();
});

// ---------- Nota "falta porque" ----------
let noteContext = null;
function openNote(anio, mes, tipo) {
  noteContext = { anio: parseInt(anio), mes: parseInt(mes), tipo };
  openTextModal('¿Por qué falta esta foto?', '', 'note');
}
async function deleteFoto(id) {
  if (!confirm('¿Borrar esta foto?')) return;
  const f = state.fotos.find((x) => x.id === id);
  if (f) await db.storage.from('fotos').remove([f.url]);
  await db.from('fotos').delete().eq('id', id);
  loadData();
}
async function deleteNota(id) { if (confirm('¿Borrar esta nota?')) { await db.from('notas').delete().eq('id', id); loadData(); } }

// ---------- HOY: foto del día ----------
function renderHoy() {
  const hoy = todayStr();
  const entry = state.fotosDia.find((f) => f.fecha === hoy);
  const wrap = $('#hoy');
  let html = `<div class="hoy-card"><div class="hoy-fecha">${fechaCorta(hoy)} · hoy</div><div class="hoy-titulo">Nuestra foto de hoy</div>`;
  if (entry && entry.url) {
    const isVideo = entry.url.toLowerCase().endsWith('.mp4');
    html += isVideo ? `<video src="${state.signedUrls[entry.url] || ''}" controls playsinline></video>`
      : `<img src="${state.signedUrls[entry.url] || ''}" data-full="${state.signedUrls[entry.url] || ''}" />`;
    html += `<div class="hoy-actions"><button class="btn-big ghost" data-act="del-dia" data-id="${entry.id}">🗑️</button></div>`;
  } else if (entry && entry.nota) {
    html += `<div class="hoy-note">${escapeHtml(entry.nota)}</div>
      <div class="hoy-actions"><button class="btn-big" data-act="subir-dia">📷 Subir foto</button><button class="btn-big ghost" data-act="del-dia" data-id="${entry.id}">Borrar nota</button></div>`;
  } else {
    html += `<div class="hoy-empty">Todavía no subimos la foto de hoy.</div>
      <div class="hoy-actions"><button class="btn-big" data-act="subir-dia">📷 Subir foto</button><button class="btn-big ghost" data-act="nota-dia">✍️ Por qué no subimos</button></div>`;
  }
  html += '</div>';
  wrap.innerHTML = html;
  wrap.querySelector('[data-act="subir-dia"]')?.addEventListener('click', openUploadDia);
  wrap.querySelector('[data-act="nota-dia"]')?.addEventListener('click', () => openTextModal('¿Por qué no subimos foto hoy?', '', 'notadia'));
  wrap.querySelector('[data-act="del-dia"]')?.addEventListener('click', () => deleteDia(entry.id));
  wrap.querySelector('img')?.addEventListener('click', (e) => openLightbox(e.target.dataset.full));

  const hist = $('#hoy-history');
  hist.innerHTML = '';
  for (let i = 0; i < 14; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const e = state.fotosDia.find((f) => f.fecha === ds);
    const cell = document.createElement('div');
    cell.className = 'day';
    if (e && e.url) cell.innerHTML = `<img src="${state.signedUrls[e.url] || ''}" data-full="${state.signedUrls[e.url] || ''}" /><span class="day-dia">${d.getDate()}</span>`;
    else if (e && e.nota) cell.innerHTML = `<div class="day-note">💭</div><span class="day-dia">${d.getDate()}</span>`;
    else cell.innerHTML = `<div class="day-empty">·</div><span class="day-dia">${d.getDate()}</span>`;
    hist.appendChild(cell);
  }
  hist.querySelectorAll('img').forEach((img) => img.addEventListener('click', () => openLightbox(img.dataset.full)));
}
async function deleteDia(id) {
  if (!confirm('¿Borrar?')) return;
  const e = state.fotosDia.find((f) => f.id === id);
  if (e && e.url) await db.storage.from('fotos').remove([e.url]);
  await db.from('fotos_dia').delete().eq('id', id);
  loadData();
}

// ---------- Mensaje / quiz diario ----------
function renderEnvios() {
  const wrap = $('#diario-envios');
  const para = state.who === 'el' ? 'ella' : 'el';
  wrap.innerHTML = '';

  // Componer
  const comp = document.createElement('div');
  comp.className = 'compose-card';
  const opts = state.envTipo === 'quiz' ? pickN(CONFIG.BANK_QUIZ, 2) : pickN(CONFIG.BANK_MENSAJES, 2);
  comp.innerHTML = `<h4>Mandale ${state.envTipo === 'quiz' ? 'un quiz' : 'un mensaje'} a ${whoLabel(para)}</h4>
    <div class="pv-tabs" style="margin-bottom:10px">
      <button class="pv-tab ${state.envTipo === 'mensaje' ? 'active' : ''}" data-et="mensaje">Mensaje</button>
      <button class="pv-tab ${state.envTipo === 'quiz' ? 'active' : ''}" data-et="quiz">Quiz</button>
    </div>`;
  opts.forEach((o) => { comp.innerHTML += `<button class="opt-btn" data-env="${escapeHtml(o)}">${escapeHtml(o)}</button>`; });
  comp.innerHTML += `<button class="opt-btn" data-env="propio" style="font-style:italic">✍️ Escribir el mío…</button>`;
  wrap.appendChild(comp);
  comp.querySelectorAll('[data-et]').forEach((b) => b.addEventListener('click', () => {
    state.envTipo = b.dataset.et;
    renderEnvios();
  }));
  comp.querySelectorAll('[data-env]').forEach((b) => b.addEventListener('click', () => {
    const val = b.dataset.env;
    if (val === 'propio') openTextModal('Escribí el tuyo', '', 'envio');
    else sendEnvio(val);
  }));

  // Bandeja (lo que mandó el otro)
  const incoming = state.mensajes.filter((m) => m.de === para);
  if (incoming.length) {
    incoming.slice().reverse().slice(0, 10).forEach((m) => {
      const card = document.createElement('div');
      card.className = 'envio-card';
      card.innerHTML = `<div class="env-tag">${m.tipo === 'quiz' ? '🎯 Quiz de ' : '💌 Mensaje de '}${whoLabel(m.de)} · ${fechaCorta(m.fecha)}</div>
        <div class="env-texto">"${escapeHtml(m.texto)}"</div>
        ${m.respuesta ? `<div class="env-respuesta">↳ ${escapeHtml(m.respuesta)}</div>` : ''}`;
      if (m.tipo === 'quiz' && !m.respuesta && state.who === para) {
        const btn = document.createElement('button');
        btn.className = 'btn-big ghost';
        btn.textContent = 'Responder';
        btn.addEventListener('click', () => openTextModal('Tu respuesta', '', 'respuesta', m.id));
        card.appendChild(btn);
      }
      wrap.appendChild(card);
    });
  }
}
async function sendEnvio(texto) {
  const para = state.who === 'el' ? 'ella' : 'el';
  const { error } = await db.from('mensajes_diarios').insert({ fecha: todayStr(), tipo: state.envTipo, texto, de: state.who });
  if (error) { alert('No se pudo: ' + error.message); return; }
  sendPush(para, state.envTipo === 'quiz' ? 'Nuevo quiz de ' + whoLabel(state.who) : 'Un mensaje de ' + whoLabel(state.who), texto);
  loadData();
}
async function sendPush(to, title, body) {
  try { await db.functions.invoke('send-push', { body: { to, title, text: body } }); } catch (e) {}
}

// ---------- Para vos ----------
function renderParaVos() {
  const wrap = $('#para-vos');
  wrap.innerHTML = '';
  const items = state.paraVos.filter((f) => f.remitente === state.pvTab);
  const add = document.createElement('button');
  add.className = 'pv-add-btn';
  add.textContent = '+ Enviar una foto para vos';
  add.addEventListener('click', () => openTextModal('Foto para vos', '', 'paravos'));
  wrap.appendChild(add);
  if (!items.length) { wrap.innerHTML += '<p class="pv-empty">Todavía no hay fotos acá. 💌</p>'; return; }
  items.forEach((f) => {
    const url = state.signedUrls[f.url] || '';
    const isVideo = f.url.toLowerCase().endsWith('.mp4');
    const div = document.createElement('div');
    div.className = 'pv-item';
    div.innerHTML = (isVideo ? `<video src="${url}" controls playsinline></video>` : `<img src="${url}" data-full="${url}" />`) +
      `<div class="pv-meta"><button class="pv-del">🗑️</button><div class="pv-fecha">${fechaCorta(f.fecha)}</div>${f.mensaje ? `<div class="pv-msg">"${escapeHtml(f.mensaje)}"</div>` : ''}</div>`;
    div.querySelector('.pv-del').addEventListener('click', () => deleteParaVos(f.id));
    div.querySelector('img')?.addEventListener('click', (e) => openLightbox(e.target.dataset.full));
    wrap.appendChild(div);
  });
}
$$('.pv-tab').forEach((t) => t.addEventListener('click', () => { state.pvTab = t.dataset.pv; $$('.pv-tab').forEach((x) => x.classList.toggle('active', x === t)); renderParaVos(); }));
async function deleteParaVos(id) {
  if (!confirm('¿Borrar?')) return;
  const f = state.paraVos.find((x) => x.id === id);
  if (f) await db.storage.from('fotos').remove([f.url]);
  await db.from('fotos_para_vos').delete().eq('id', id);
  loadData();
}

// ---------- Listas genéricas ----------
function renderEntries(containerId, items, opts = {}) {
  const wrap = $(containerId);
  wrap.innerHTML = '';
  items.forEach((it) => {
    const div = document.createElement('div');
    div.className = 'entry' + (it.hecho ? ' done' : '');
    let meta = '';
    if (opts.showAutor && it.autor) meta += `${whoLabel(it.autor)}`;
    if (opts.showFecha && it.fecha) meta += (meta ? ' · ' : '') + fechaCorta(it.fecha);
    if (it.abre_en) meta += (meta ? ' · ' : '') + `se abre ${fechaCorta(it.abre_en)}`;
    if (it.titulo) meta += (meta ? ' · ' : '') + escapeHtml(it.titulo);
    div.innerHTML = `<div class="entry-body">
        <div class="entry-texto">${escapeHtml(it.texto || it.descripcion || it.nombre)}</div>
        ${meta ? `<div class="entry-meta">${meta}</div>` : ''}
      </div>
      ${opts.toggle ? `<button class="mini-btn" data-t="${it.id}">✓</button>` : ''}
      <button class="entry-del" data-d="${it.id}">🗑️</button>`;
    if (opts.toggle) div.querySelector(`[data-t="${it.id}"]`).addEventListener('click', () => opts.onToggle(it));
    div.querySelector(`[data-d="${it.id}"]`).addEventListener('click', () => opts.onDelete(it));
    wrap.appendChild(div);
  });
}

function renderRazones() {
  const wrap = $('#razones');
  wrap.innerHTML = '<button class="add-btn" data-a="razones">+ Agregar una razón</button>';
  renderEntriesInto(wrap, state.razones.slice().reverse(), { showAutor: true, table: 'razones' });
  bindListAdd(wrap);
}
function renderDiario() {
  const wrap = $('#diario');
  wrap.innerHTML = '<button class="add-btn" data-a="diario">+ Escribir una entrada</button>';
  renderEntriesInto(wrap, state.diario.slice().reverse(), { showAutor: true, showFecha: true, table: 'diario' });
  bindListAdd(wrap);
}
function renderPlanes() {
  const wrap = $('#planes');
  wrap.innerHTML = '<button class="add-btn" data-a="planes">+ Agregar un plan</button>';
  renderEntriesInto(wrap, state.planes.slice().reverse(), { toggle: true, table: 'planes' });
  bindListAdd(wrap);
}
function renderReto() {
  const wrap = $('#reto');
  wrap.innerHTML = '<button class="add-btn" data-a="reto">+ Proponer un reto</button>';
  renderEntriesInto(wrap, state.reto.slice().reverse(), { toggle: true, table: 'reto' });
  bindListAdd(wrap);
}
function renderCartas() {
  const wrap = $('#cartas');
  wrap.innerHTML = '<button class="add-btn" data-a="cartas">+ Escribir una carta</button>';
  renderEntriesInto(wrap, state.cartas.slice().reverse(), { showAutor: true, table: 'cartas' });
  bindListAdd(wrap);
}
function renderLugares() {
  const wrap = $('#lugares');
  wrap.innerHTML = '<button class="add-btn" data-a="lugares">+ Agregar un lugar</button>';
  renderEntriesInto(wrap, state.lugares.slice().reverse(), { table: 'lugares' });
  bindListAdd(wrap);
}
function renderCapsula() {
  const wrap = $('#capsula');
  wrap.innerHTML = '<button class="add-btn" data-a="capsula">+ Guardar un mensaje</button>';
  const abiertas = state.capsula.filter((c) => c.abre_en && c.abre_en <= todayStr());
  const cerradas = state.capsula.filter((c) => !c.abre_en || c.abre_en > todayStr());
  renderEntriesInto(wrap, abiertas.slice().reverse(), { showAutor: true, showFecha: true, table: 'capsula' });
  renderEntriesInto(wrap, cerradas.slice().reverse(), { showAutor: true, table: 'capsula' });
  bindListAdd(wrap);
}
function renderEntriesInto(wrap, items, opts) {
  items.forEach((it) => {
    const div = document.createElement('div');
    div.className = 'entry' + (it.hecho ? ' done' : '');
    let meta = '';
    if (opts.showAutor && it.autor) meta += whoLabel(it.autor);
    if (opts.showFecha && it.fecha) meta += (meta ? ' · ' : '') + fechaCorta(it.fecha);
    if (it.abre_en) meta += (meta ? ' · ' : '') + `se abre ${fechaCorta(it.abre_en)}`;
    if (it.titulo) meta = (meta ? meta + ' · ' : '') + escapeHtml(it.titulo);
    div.innerHTML = `<div class="entry-body"><div class="entry-texto">${escapeHtml(it.texto || it.descripcion || it.nombre)}</div>${meta ? `<div class="entry-meta">${meta}</div>` : ''}</div>
      ${opts.toggle ? `<button class="mini-btn" data-t="${it.id}">✓</button>` : ''}<button class="entry-del" data-d="${it.id}">🗑️</button>`;
    if (opts.toggle) div.querySelector(`[data-t="${it.id}"]`).addEventListener('click', async () => {
      await db.from(opts.table).update({ hecho: !it.hecho }).eq('id', it.id); loadData();
    });
    div.querySelector(`[data-d="${it.id}"]`).addEventListener('click', async () => {
      if (confirm('¿Borrar?')) { await db.from(opts.table).delete().eq('id', it.id); loadData(); }
    });
    wrap.appendChild(div);
  });
}
function bindListAdd(wrap) {
  wrap.querySelector('[data-a]').addEventListener('click', () => {
    const a = wrap.querySelector('[data-a]').dataset.a;
    openTextModal(modalTitle(a), '', a);
  });
}
function modalTitle(a) {
  return { razones: 'Nueva razón', diario: 'Nueva entrada', planes: 'Nuevo plan', reto: 'Nuevo reto', cartas: 'Nueva carta', lugares: 'Nuevo lugar', capsula: 'Cápsula del tiempo' }[a] || '';
}

// ---------- Arte ----------
function renderArte() {
  const wrap = $('#arte');
  wrap.innerHTML = '<button class="add-btn" data-arte="1">+ Subir un dibujo / plano</button><div class="arte-grid"></div>';
  wrap.querySelector('[data-arte]').addEventListener('click', openUploadArte);
  const grid = wrap.querySelector('.arte-grid');
  state.arte.slice().reverse().forEach((a) => {
    const div = document.createElement('div');
    div.className = 'arte-item';
    div.innerHTML = `<img src="${state.signedUrls[a.url] || ''}" data-full="${state.signedUrls[a.url] || ''}" /><div class="arte-cap">${escapeHtml(a.titulo || '')}</div>`;
    div.querySelector('img').addEventListener('click', (e) => openLightbox(e.target.dataset.full));
    grid.appendChild(div);
  });
}

// ---------- Te quiero ----------
function renderTeQuiero() {
  const wrap = $('#tequiero');
  const count = state.teQuiero.length;
  wrap.innerHTML = `<div class="tq-wrap">
    <div class="tq-count">${count}</div>
    <p class="section-sub" style="margin:4px 0 16px">"te quiero" enviados</p>
    <button class="tq-btn" id="tq-btn">Te<br/>quiero</button>
  </div>`;
  $('#tq-btn').addEventListener('click', async () => {
    const { error } = await db.from('te_quiero').insert({ autor: state.who });
    if (error) { alert(error.message); return; }
    const para = state.who === 'el' ? 'ella' : 'el';
    sendPush(para, '❤️', 'Alguien te mando un "te quiero".');
    loadData();
  });
}

// ---------- Mood ----------
function renderMood() {
  const wrap = $('#mood');
  const emojis = ['😍', '😊', '😐', '😔', '🥺'];
  const hoy = state.mood.filter((m) => m.fecha === todayStr());
  let html = '<div class="mood-grid">';
  emojis.forEach((e) => { html += `<button class="mood-btn" data-mood="${e}">${e}</button>`; });
  html += '</div><div class="mood-today">';
  if (hoy.length) html += `Hoy: ${hoy.map((h) => `${h.mood} (${whoLabel(h.autor)})`).join(' · ')}`;
  else html += 'Todavía nadie marcó cómo se siente hoy.';
  html += '</div>';
  wrap.innerHTML = html;
  wrap.querySelectorAll('[data-mood]').forEach((b) => b.addEventListener('click', async () => {
    await db.from('mood').insert({ fecha: todayStr(), mood: b.dataset.mood, autor: state.who });
    loadData();
  }));
}

// ---------- Modo creador ----------
function renderCreador() {
  const wrap = $('#creador');
  wrap.innerHTML = `<div class="creador-card"><h3>Estadísticas</h3>
    <div class="creador-stat"><span>Fotos en el álbum</span><b>${state.fotos.length}</b></div>
    <div class="creador-stat"><span>Días con foto</span><b>${state.fotosDia.filter((f) => f.url).length}</b></div>
    <div class="creador-stat"><span>"Para vos"</span><b>${state.paraVos.length}</b></div>
    <div class="creador-stat"><span>Mensajes/quizzes</span><b>${state.mensajes.length}</b></div>
    <div class="creador-stat"><span>"Te quiero"</span><b>${state.teQuiero.length}</b></div>
    <div class="creador-stat"><span>Razones</span><b>${state.razones.length}</b></div>
    <div class="creador-stat"><span>Días juntos</span><b>${Math.floor((Date.now() - CONFIG.INICIO.getTime()) / 86400000)}</b></div>
  </div>`;
}

// ---------- Modal de texto genérico ----------
let modalCtx = { action: null, id: null };
function openTextModal(title, placeholder, action, id) {
  modalCtx = { action, id: id || null };
  $('#text-modal-title').textContent = title;
  $('#text-modal-text').value = '';
  $('#text-modal-text').placeholder = placeholder || 'Escribí acá…';
  const extra = $('#text-modal-extra');
  extra.classList.add('hidden');
  if (action === 'capsula') { extra.classList.remove('hidden'); extra.type = 'date'; extra.placeholder = 'Fecha de apertura'; }
  else if (action === 'cartas') { extra.classList.remove('hidden'); extra.type = 'text'; extra.placeholder = 'Título (opcional)'; }
  else if (action === 'lugares') { extra.classList.remove('hidden'); extra.type = 'text'; extra.placeholder = 'Nombre del lugar'; }
  $('#text-modal').classList.remove('hidden');
}
$('#text-cancel').addEventListener('click', () => $('#text-modal').classList.add('hidden'));
$('#text-save').addEventListener('click', async () => {
  const texto = $('#text-modal-text').value.trim();
  const extra = $('#text-modal-extra').value.trim();
  const { action, id } = modalCtx;
  if (!texto && action !== 'respuesta') { alert('Escribí algo'); return; }
  let result;
  switch (action) {
    case 'note': result = await db.from('notas').insert({ anio: noteContext.anio, mes: noteContext.mes, tipo: noteContext.tipo, texto, autor: state.who }); break;
    case 'notadia': result = await db.from('fotos_dia').upsert({ fecha: todayStr(), url: null, nota: texto }, { onConflict: 'fecha' }); break;
    case 'envio': await sendEnvio(texto); $('#text-modal').classList.add('hidden'); return;
    case 'respuesta': result = await db.from('mensajes_diarios').update({ respuesta: texto }).eq('id', id); break;
    case 'paravos': result = await db.from('fotos_para_vos').insert({ fecha: todayStr(), remitente: state.who, url: null, mensaje: texto }); break;
    case 'razones': result = await db.from('razones').insert({ texto, autor: state.who }); break;
    case 'diario': result = await db.from('diario').insert({ texto, autor: state.who, fecha: todayStr() }); break;
    case 'planes': result = await db.from('planes').insert({ texto, hecho: false }); break;
    case 'reto': result = await db.from('reto').insert({ texto, hecho: false }); break;
    case 'cartas': result = await db.from('cartas').insert({ titulo: extra || null, texto, autor: state.who }); break;
    case 'lugares': result = await db.from('lugares').insert({ nombre: extra || null, descripcion: texto }); break;
    case 'capsula': result = await db.from('capsula').insert({ texto, autor: state.who, abre_en: extra || null }); break;
  }
  if (result && result.error) { alert('No se pudo: ' + result.error.message); return; }
  $('#text-modal').classList.add('hidden');
  if (action === 'paravos') { const para = state.who === 'el' ? 'ella' : 'el'; sendPush(para, '💌', 'Tenés una foto/mensaje nuevo.'); }
  loadData();
});

// ---------- Tabs álbum ----------
$$('.album-tab').forEach((t) => t.addEventListener('click', () => {
  state.albumMode = t.dataset.mode;
  $$('.album-tab').forEach((x) => x.classList.toggle('active', x === t));
  renderAlbum();
}));

// ---------- Lightbox ----------
function openLightbox(url) {
  if (!url) return;
  $('#lightbox-img').src = url;
  $('#lightbox').classList.remove('hidden');
}
$('#lightbox').addEventListener('click', (e) => {
  if (e.target.id === 'lightbox' || e.target.classList.contains('lightbox-close')) $('#lightbox').classList.add('hidden');
});

// ---------- Cofre ----------
const ES_CUMPLE = () => Date.now() >= CONFIG.CUMPLE.getTime();
function renderCofre() {
  const wrap = $('#cofre');
  if (!ES_CUMPLE()) {
    wrap.innerHTML = `<div class="cofre-wrap"><div class="cofre-box">🔒🎁</div>
      <p class="cofre-locked-hint">Este cofre se abre el ${CONFIG.CUMPLE_TEXTO}.</p>
      <p class="cofre-locked-hint">Paciencia, mi amor… vale la pena. 😉</p>
      <div class="cofre-countdown"><div class="cd-box"><span id="cofre-dias">--</span><label>días</label></div><div class="cd-box"><span id="cofre-horas">--</span><label>horas</label></div></div></div>`;
    const target = CONFIG.CUMPLE.getTime();
    const tick = () => { let d = target - Date.now(); if (d < 0) d = 0; $('#cofre-dias').textContent = Math.floor(d / 86400000); $('#cofre-horas').textContent = Math.floor((d % 86400000) / 3600000); };
    tick(); setInterval(tick, 60000);
  } else {
    wrap.innerHTML = `<div class="cofre-wrap"><div class="cofre-box" id="cofre-open">🎁</div><p class="cofre-locked-hint">Tocá el cofre, mi amor.</p></div>`;
    $('#cofre-open').addEventListener('click', startReveal);
  }
}
function startReveal() { $('#view-cofre').innerHTML = '<div class="slideshow" id="slideshow"></div>'; playSlideshow(); }
function playSlideshow() {
  const ss = $('#slideshow');
  const fotos = state.fotos.filter((f) => !f.url.toLowerCase().endsWith('.mp4'));
  if (!fotos.length) { showLetter(); return; }
  const ord = [...fotos].sort((a, b) => (a.anio - b.anio) || (a.mes - b.mes));
  let i = 0;
  ss.innerHTML = `<img src="${state.signedUrls[ord[0].url]}" /><div class="ss-caption">${MESES[ord[0].mes - 1]} ${ord[0].anio}</div>`;
  const t = setInterval(() => {
    i++;
    if (i >= ord.length) { clearInterval(t); showLetter(); return; }
    ss.innerHTML = `<img src="${state.signedUrls[ord[i].url]}" /><div class="ss-caption">${MESES[ord[i].mes - 1]} ${ord[i].anio}</div>`;
  }, 1600);
}
function showLetter() { $('#view-cofre').innerHTML = '<div class="letter-card" id="letter"></div>'; typewriter($('#letter'), CONFIG.PROPUESTA.carta, showProposal); }
function typewriter(el, text, done) {
  el.textContent = ''; let i = 0;
  const t = setInterval(() => { el.textContent += text[i]; i++; if (i >= text.length) { clearInterval(t); done(); } }, 30);
}
function showProposal() {
  const div = document.createElement('div');
  div.className = 'proposal';
  div.innerHTML = `<h3>${CONFIG.PROPUESTA.pregunta}</h3><button class="btn-si" id="btn-si">${CONFIG.PROPUESTA.si}</button><button class="btn-no" id="btn-no">${CONFIG.PROPUESTA.no}</button>`;
  $('#view-cofre').appendChild(div);
  $('#btn-si').addEventListener('click', celebrate);
  const no = $('#btn-no');
  const dodge = () => { no.style.position = 'fixed'; no.style.left = (Math.random() * (innerWidth - 100)) + 'px'; no.style.top = (Math.random() * (innerHeight - 60)) + 'px'; };
  no.addEventListener('touchstart', (e) => { e.preventDefault(); dodge(); });
  no.addEventListener('mouseenter', dodge);
}
function celebrate() {
  $('#view-cofre').innerHTML = `<div class="final-msg"><div class="big">❤️🎉❤️</div><h3>${CONFIG.PROPUESTA.final}</h3><p>Desde hoy, oficialmente… nuestros. Te amo, ${CONFIG.NOMBRE}.</p>
    <div style="margin-top:16px"><iframe src="https://open.spotify.com/embed/track/${CONFIG.PROPUESTA.cancionCelebracion}" width="100%" height="152" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" style="border-radius:14px"></iframe></div></div>`;
  launchConfetti();
}
function launchConfetti() {
  const e = ['❤️', '🤎', '🎉', '✨', '🌹', '💍'];
  for (let i = 0; i < 80; i++) {
    const c = document.createElement('span');
    c.className = 'confetti';
    c.textContent = e[Math.floor(Math.random() * e.length)];
    c.style.left = Math.random() * 100 + 'vw';
    c.style.animationDuration = (2.5 + Math.random() * 3) + 's';
    c.style.animationDelay = (Math.random() * 2) + 's';
    c.style.fontSize = (14 + Math.random() * 22) + 'px';
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 7000);
  }
}

// ---------- Service worker ----------
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

// ---------- Arranque ----------
initParticles();
checkSession();
