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
  adviento: [], canciones: [],
  signedUrls: {}, pvTab: 'el', albumMode: 'mes', pvWho: 'el', songTab: 'todos',
  who: localStorage.getItem('who') || 'el', envTipo: 'mensaje',
  advFecha: null, advTipo: 'texto',
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
function dateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function extractSpotifyId(input) {
  const s = (input || '').trim();
  const m = s.match(/track\/([A-Za-z0-9]+)/) || s.match(/^([A-Za-z0-9]{22})$/);
  return m ? m[1] : null;
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
        // La app está configurada como "Typical Site" en el dashboard, por lo que
        // sin esta bandera el SDK ignora path/serviceWorkerParam y usa la ruta "/"
        // del dashboard (que en GitHub Pages da 404). Esto fuerza usar la ruta correcta.
        serviceWorkerOverrideForTypical: true,
        path: swPath,
        serviceWorkerPath: 'OneSignalSDKWorker.js',
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
  renderCalendario();
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
  if (view === 'cofre' && !$('#calendario')) renderCalendario();
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

  // Canciones que se agregan entre los dos
  wrap.insertAdjacentHTML('beforeend', '<div class="divider"><span>🎧</span></div><h3 class="script sub-heading">Nuestras canciones</h3>');
  wrap.insertAdjacentHTML('beforeend', '<button class="add-btn" id="add-cancion">+ Agregar una canción</button>');
  wrap.insertAdjacentHTML('beforeend', '<div class="songs-tabs"><button class="song-tab active" data-st="todos">Todas</button><button class="song-tab" data-st="de-ella">De ella</button><button class="song-tab" data-st="mias">Las que dediqué</button></div>');
  wrap.insertAdjacentHTML('beforeend', '<div id="songs-list"></div>');
  $('#add-cancion').addEventListener('click', () => {
    $('#cancion-link').value = '';
    $('#cancion-msg').value = '';
    $('#cancion-modal').classList.remove('hidden');
  });
  wrap.querySelectorAll('.songs-tabs .song-tab').forEach((t) => t.addEventListener('click', () => {
    state.songTab = t.dataset.st;
    renderSongList();
  }));
  renderSongList();
}
function renderSongList() {
  const list = $('#songs-list');
  if (!list) return;
  $$('.songs-tabs .song-tab').forEach((t) => t.classList.toggle('active', t.dataset.st === state.songTab));
  const items = state.canciones.filter((c) => {
    if (state.songTab === 'de-ella') return c.de === 'ella';
    if (state.songTab === 'mias') return c.de === state.who;
    return true;
  }).slice().reverse();
  list.innerHTML = '';
  if (!items.length) { list.innerHTML = '<p class="pv-empty">Todavía no hay canciones acá. 🎵</p>'; return; }
  items.forEach((c) => {
    const div = document.createElement('div');
    div.className = 'song-item';
    const fecha = (c.creado_en || '').slice(0, 10);
    div.innerHTML = `<div class="song-meta"><span class="song-de">${whoLabel(c.de)}${fecha ? ' · ' + fechaCorta(fecha) : ''}</span><button class="song-del">🗑️</button></div>
      ${c.mensaje ? `<div class="song-msg">"${escapeHtml(c.mensaje)}"</div>` : ''}
      <iframe src="https://open.spotify.com/embed/track/${c.spotify_id}" width="100%" height="152" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
    div.querySelector('.song-del').addEventListener('click', () => deleteCancion(c.id));
    list.appendChild(div);
  });
}
async function deleteCancion(id) {
  if (!confirm('¿Borrar esta canción?')) return;
  await db.from('canciones').delete().eq('id', id);
  loadData();
}

// ---------- Carga de datos ----------
async function fetchTable(name, order) {
  const { data, error } = await db.from(name).select('*').order(order || 'creado_en', { ascending: order === 'fecha' || order === 'abre_en' });
  return (!error && data) ? data : [];
}
async function loadData() {
  const [fotos, notas, fotosDia, paraVos, mensajes, razones, arte, teQuiero, diario, planes, capsula, cartas, lugares, reto, mood, adviento, canciones] = await Promise.all([
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
    fetchTable('adviento', 'fecha'),
    fetchTable('canciones'),
  ]);
  Object.assign(state, { fotos, notas, fotosDia, paraVos, mensajes, razones, arte, teQuiero, diario, planes, capsula, cartas, lugares, reto, mood, adviento, canciones });

  const paths = new Set();
  [...state.fotos, ...state.fotosDia, ...state.paraVos, ...state.arte].forEach((f) => { if (f.url) paths.add(f.url); });
  state.adviento.forEach((a) => { if (a.tipo === 'foto' && a.url) paths.add(a.url); });
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
  renderCalendario();
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
  add.addEventListener('click', openPvModal);
  wrap.appendChild(add);
  if (!items.length) { wrap.insertAdjacentHTML('beforeend', '<p class="pv-empty">Todavía no hay fotos acá. 💌</p>'); return; }
  items.forEach((f) => {
    const div = document.createElement('div');
    div.className = 'pv-item';
    let body = '';
    if (f.url) {
      const url = state.signedUrls[f.url] || '';
      const isVideo = (f.url || '').toLowerCase().endsWith('.mp4');
      body = isVideo ? `<video src="${url}" controls playsinline></video>` : `<img src="${url}" data-full="${url}" />`;
    }
    div.innerHTML = body + `<div class="pv-meta"><button class="pv-del">🗑️</button><div class="pv-fecha">${fechaCorta(f.fecha)} · de ${whoLabel(f.remitente)}</div>${f.mensaje ? `<div class="pv-msg">"${escapeHtml(f.mensaje)}"</div>` : ''}</div>`;
    div.querySelector('.pv-del').addEventListener('click', () => deleteParaVos(f.id));
    div.querySelector('img')?.addEventListener('click', (e) => openLightbox(e.target.dataset.full));
    wrap.appendChild(div);
  });
}
function openPvModal() {
  const para = state.who === 'el' ? 'ella' : 'el';
  $('#pv-label').textContent = `Mandale una foto a ${whoLabel(para)}`;
  $('#pv-input').value = '';
  $('#pv-text').value = '';
  $('#pv-modal').classList.remove('hidden');
}
$('#pv-cancel').addEventListener('click', () => $('#pv-modal').classList.add('hidden'));
$('#pv-save').addEventListener('click', async () => {
  const file = $('#pv-input').files[0];
  if (!file) { alert('Elegí una foto primero'); return; }
  const ext = '.' + (file.name.split('.').pop() || 'jpg').toLowerCase();
  const safe = file.name.replace(/\.[^.]+$/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 60);
  const storagePath = `para_vos/${safe}_${Date.now()}${ext}`;
  const msg = $('#pv-text').value.trim() || null;
  $('#pv-save').disabled = true;
  const { error: upErr } = await db.storage.from('fotos').upload(storagePath, file, { contentType: file.type || 'image/jpeg', upsert: false });
  if (upErr) { alert('No se pudo subir: ' + upErr.message); $('#pv-save').disabled = false; return; }
  const { error: inErr } = await db.from('fotos_para_vos').insert({ fecha: todayStr(), remitente: state.who, url: storagePath, mensaje: msg });
  $('#pv-save').disabled = false;
  $('#pv-modal').classList.add('hidden');
  if (inErr) { alert('Se subió pero no se guardó: ' + inErr.message); return; }
  const para = state.who === 'el' ? 'ella' : 'el';
  sendPush(para, '💌 Foto para vos', whoLabel(state.who) + ' te mandó una foto.');
  loadData();
});
$$('.pv-tab').forEach((t) => t.addEventListener('click', () => { state.pvTab = t.dataset.pv; $$('.pv-tab').forEach((x) => x.classList.toggle('active', x === t)); renderParaVos(); }));
async function deleteParaVos(id) {
  if (!confirm('¿Borrar?')) return;
  const f = state.paraVos.find((x) => x.id === id);
  if (f && f.url) await db.storage.from('fotos').remove([f.url]);
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
  wrap.innerHTML = '<button class="add-btn" id="add-lugar">+ Agregar un lugar</button>';
  const items = state.lugares.slice().reverse();
  if (!items.length) { wrap.innerHTML += '<p class="pv-empty">Todavía no hay lugares guardados. 📍</p>'; }
  items.forEach((l) => {
    const div = document.createElement('div');
    div.className = 'entry';
    let maps = '';
    if (l.ubicacion) {
      const q = encodeURIComponent(l.ubicacion);
      maps = `<a class="maps-link" href="https://www.google.com/maps/search/?api=1&query=${q}" target="_blank" rel="noopener">📍 Ver en Google Maps</a>`;
    }
    div.innerHTML = `<div class="entry-body">
        <div class="lugar-nombre">${escapeHtml(l.nombre || '')}</div>
        <div class="entry-texto">${escapeHtml(l.descripcion || '')}</div>
        ${maps}
      </div>
      <button class="entry-del">🗑️</button>`;
    div.querySelector('.entry-del').addEventListener('click', async () => {
      if (confirm('¿Borrar este lugar?')) { await db.from('lugares').delete().eq('id', l.id); loadData(); }
    });
    wrap.appendChild(div);
  });
  $('#add-lugar').addEventListener('click', () => {
    $('#lugar-nombre').value = '';
    $('#lugar-desc').value = '';
    $('#lugar-ubicacion').value = '';
    $('#lugar-modal').classList.remove('hidden');
  });
}
$('#lugar-cancel').addEventListener('click', () => $('#lugar-modal').classList.add('hidden'));
$('#lugar-save').addEventListener('click', async () => {
  const nombre = $('#lugar-nombre').value.trim();
  const desc = $('#lugar-desc').value.trim();
  const ubic = $('#lugar-ubicacion').value.trim();
  if (!nombre && !desc) { alert('Poné al menos un nombre o una descripción'); return; }
  const { error } = await db.from('lugares').insert({ nombre: nombre || null, descripcion: desc || null, ubicacion: ubic || null });
  if (error) { alert('No se pudo: ' + error.message); return; }
  $('#lugar-modal').classList.add('hidden');
  loadData();
});
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
  const hoy = state.teQuiero.filter((t) => ((t.creado_en || '').slice(0, 10)) === todayStr()).length;
  wrap.innerHTML = `<div class="tq-wrap">
    <div class="tq-count">${count}</div>
    <p class="section-sub" style="margin:4px 0 16px">"te quiero" enviados</p>
    <button class="tq-btn" id="tq-btn">Te<br/>quiero</button>
    <div class="tq-today">${hoy ? `Hoy ya se mandaron ${hoy} ❤️` : 'Mandale un "te quiero" hoy ❤️'}</div>
  </div>`;
  $('#tq-btn').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    if (btn.disabled) return;
    btn.disabled = true;
    const { error } = await db.from('te_quiero').insert({ autor: state.who });
    if (error) { alert(error.message); btn.disabled = false; return; }
    const para = state.who === 'el' ? 'ella' : 'el';
    sendPush(para, '❤️', 'Alguien te mandó un "te quiero".');
    launchHearts(e);
    btn.disabled = false;
    loadData();
  });
}
function launchHearts(e) {
  const emojis = ['❤️', '💖', '💘', '💕', '💗'];
  for (let i = 0; i < 12; i++) {
    const s = document.createElement('span');
    s.className = 'tq-burst';
    s.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    s.style.left = ((e && e.clientX ? e.clientX : innerWidth / 2) + (Math.random() * 70 - 35)) + 'px';
    s.style.top = ((e && e.clientY ? e.clientY : innerHeight / 2) - 20) + 'px';
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 1000);
  }
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
    <button class="btn-big ghost" id="preview-cofre" style="margin-top:14px;width:100%">👁️ Ver cofre de prueba</button>
  </div>
  <div class="creador-card"><h3>Calendario de adviento</h3><p class="section-sub" style="text-align:left;font-size:13px;margin-bottom:6px">Cargá la sorpresa de cada puerta. El último día es el cofre.</p><div id="adv-admin"></div></div>`;
  $('#preview-cofre').addEventListener('click', () => { go('cofre'); startReveal(); });
  renderAdventAdmin();
}
function renderAdventAdmin() {
  const wrap = $('#adv-admin');
  if (!wrap) return;
  const days = getAdventDays();
  wrap.innerHTML = '';
  days.forEach((d, i) => {
    const ds = dateStr(d);
    const esFinal = i === days.length - 1;
    if (esFinal) {
      const row = document.createElement('div');
      row.className = 'adv-row';
      row.innerHTML = `<span class="adv-dia">Día ${i + 1}</span><span class="adv-resumen">🎁 El cofre (se abre solo ese día)</span>`;
      wrap.appendChild(row);
      return;
    }
    const entry = state.adviento.find((a) => a.fecha === ds);
    const resumen = entry
      ? (entry.tipo === 'foto' ? '📷 ' + (entry.titulo || 'Foto') : entry.tipo === 'cancion' ? '🎵 Canción' : '💬 ' + ((entry.texto || '').slice(0, 26)))
      : '— vacío —';
    const row = document.createElement('div');
    row.className = 'adv-row';
    row.innerHTML = `<span class="adv-dia">Día ${i + 1}</span><span class="adv-resumen">${escapeHtml(resumen)} · ${fechaCorta(ds)}</span><button class="mini-btn" data-adv="${ds}">✏️</button>`;
    row.querySelector('[data-adv]').addEventListener('click', () => openAdventModal(ds, entry));
    wrap.appendChild(row);
  });
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

// ---------- Calendario de adviento ----------
function previewCumple() {
  return new URLSearchParams(location.search).get('preview') === '1';
}
function getAdventDays() {
  const days = [];
  const d = new Date(CONFIG.ADVIENTO_INICIO);
  const end = new Date(CONFIG.CUMPLE);
  while (d <= end) { days.push(new Date(d)); d.setDate(d.getDate() + 1); }
  return days;
}
function renderCalendario() {
  const wrap = $('#calendario');
  if (!wrap) return;
  const days = getAdventDays();
  const hoy = todayStr();
  const esPreview = previewCumple();
  const cumpleStr = dateStr(CONFIG.CUMPLE);
  let html = '<div class="cal-grid">';
  days.forEach((d, i) => {
    const ds = dateStr(d);
    const n = i + 1;
    const esHoy = ds === hoy;
    const abierta = esPreview || ds < hoy || esHoy;
    const esFinal = ds === cumpleStr;
    const entry = state.adviento.find((a) => a.fecha === ds);
    if (esFinal) {
      html += `<button class="cal-door cal-final ${abierta ? 'open' : 'locked'}" data-day="${ds}">
        <span class="cal-num">${n}</span><span class="cal-ico">${abierta ? '🎁' : '🔒'}</span>
        <span class="cal-txt">${abierta ? 'Tu regalo' : 'Se abre el ' + CONFIG.CUMPLE_TEXTO}</span></button>`;
    } else if (!abierta) {
      html += `<div class="cal-door locked"><span class="cal-num">${n}</span><span class="cal-ico">🔒</span><span class="cal-txt">${fechaCorta(ds)}</span></div>`;
    } else {
      const ico = entry ? (entry.tipo === 'foto' ? '📷' : entry.tipo === 'cancion' ? '🎵' : '💌') : '✨';
      html += `<button class="cal-door open ${esHoy && !esPreview ? 'today' : ''}" data-day="${ds}">
        <span class="cal-num">${n}</span><span class="cal-ico">${ico}</span>
        <span class="cal-txt">${esPreview ? fechaCorta(ds) : (esHoy ? '¡Hoy!' : fechaCorta(ds))}</span></button>`;
    }
  });
  html += '</div>';
  wrap.innerHTML = html;
  wrap.querySelectorAll('.cal-door[data-day]').forEach((b) => b.addEventListener('click', () => openDoor(b.dataset.day)));
}
function openDoor(fecha) {
  if (fecha === dateStr(CONFIG.CUMPLE)) { startReveal(); return; }
  const entry = state.adviento.find((a) => a.fecha === fecha);
  const c = $('#door-content');
  c.innerHTML = `<div class="door-fecha">${fechaCorta(fecha)}</div>`;
  if (!entry) {
    c.innerHTML += `<div class="door-empty">Todavía no hay nada acá para este día… 😉</div>`;
  } else if (entry.tipo === 'foto') {
    c.innerHTML += `${entry.titulo ? `<div class="door-titulo">${escapeHtml(entry.titulo)}</div>` : ''}<img src="${state.signedUrls[entry.url] || ''}" alt="sorpresa" />`;
  } else if (entry.tipo === 'cancion') {
    c.innerHTML += `${entry.titulo ? `<div class="door-titulo">${escapeHtml(entry.titulo)}</div>` : ''}<iframe src="https://open.spotify.com/embed/track/${entry.url}" width="100%" height="152" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
  } else {
    c.innerHTML += `${entry.titulo ? `<div class="door-titulo">${escapeHtml(entry.titulo)}</div>` : ''}<div class="door-texto">${escapeHtml(entry.texto || '')}</div>`;
  }
  $('#door-modal').classList.remove('hidden');
}
$('#door-close').addEventListener('click', () => $('#door-modal').classList.add('hidden'));
$('#door-modal').addEventListener('click', (e) => { if (e.target.id === 'door-modal') $('#door-modal').classList.add('hidden'); });

// Editor de puertas (creador)
function openAdventModal(fecha, entry) {
  state.advFecha = fecha;
  $('#adviento-titulo').textContent = `Puerta del ${fechaCorta(fecha)}`;
  $('#adv-titulo').value = entry?.titulo || '';
  $('#adv-texto').value = entry?.tipo === 'texto' ? (entry.texto || '') : '';
  $('#adv-foto').value = '';
  $('#adv-cancion').value = entry?.tipo === 'cancion' ? (entry.url || '') : '';
  setAdvTipo(entry?.tipo || 'texto');
  $('#adviento-modal').classList.remove('hidden');
}
function setAdvTipo(tipo) {
  state.advTipo = tipo;
  $$('#adv-tipo button').forEach((b) => b.classList.toggle('active', b.dataset.tipo === tipo));
  $('#adv-texto').classList.toggle('hidden', tipo !== 'texto');
  $('#adv-foto').classList.toggle('hidden', tipo !== 'foto');
  $('#adv-cancion').classList.toggle('hidden', tipo !== 'cancion');
}
$$('#adv-tipo button').forEach((b) => b.addEventListener('click', () => setAdvTipo(b.dataset.tipo)));
$('#adviento-cancel').addEventListener('click', () => $('#adviento-modal').classList.add('hidden'));
$('#adviento-save').addEventListener('click', async () => {
  const fecha = state.advFecha;
  const tipo = state.advTipo;
  const titulo = $('#adv-titulo').value.trim() || null;
  let texto = null, url = null;
  const existing = state.adviento.find((a) => a.fecha === fecha);
  if (tipo === 'texto') {
    texto = $('#adv-texto').value.trim();
    if (!texto) { alert('Escribí la sorpresa'); return; }
  } else if (tipo === 'foto') {
    const file = $('#adv-foto').files[0];
    if (file) {
      const ext = '.' + (file.name.split('.').pop() || 'jpg').toLowerCase();
      const safe = file.name.replace(/\.[^.]+$/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 60);
      url = `adviento/${fecha}_${Date.now()}${ext}`;
      const { error: upErr } = await db.storage.from('fotos').upload(url, file, { contentType: file.type || 'image/jpeg', upsert: false });
      if (upErr) { alert('No se pudo subir: ' + upErr.message); return; }
    } else if (existing && existing.url) {
      url = existing.url;
    } else {
      alert('Elegí una foto');
      return;
    }
  } else if (tipo === 'cancion') {
    const id = extractSpotifyId($('#adv-cancion').value);
    if (!id) { alert('Pegá un link de Spotify válido'); return; }
    url = id;
  }
  const payload = { fecha, tipo, titulo, texto, url };
  const { error } = existing
    ? await db.from('adviento').update(payload).eq('id', existing.id)
    : await db.from('adviento').insert(payload);
  if (error) { alert('No se pudo: ' + error.message); return; }
  $('#adviento-modal').classList.add('hidden');
  loadData();
});

// Agregar canción
$('#cancion-cancel').addEventListener('click', () => $('#cancion-modal').classList.add('hidden'));
$('#cancion-save').addEventListener('click', async () => {
  const link = $('#cancion-link').value.trim();
  const msg = $('#cancion-msg').value.trim() || null;
  const id = extractSpotifyId(link);
  if (!id) { alert('Pegá un link de Spotify válido (open.spotify.com/track/…)'); return; }
  const { error } = await db.from('canciones').insert({ spotify_id: id, de: state.who, mensaje: msg });
  if (error) { alert('No se pudo: ' + error.message); return; }
  $('#cancion-modal').classList.add('hidden');
  const para = state.who === 'el' ? 'ella' : 'el';
  sendPush(para, '🎵 Nueva canción', whoLabel(state.who) + ' te dedicó una canción. ¡Escuchala!');
  loadData();
});
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
