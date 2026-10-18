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
  fotos: [],
  notas: [],
  fotosDia: [],
  paraVos: [],
  signedUrls: {},
  pvTab: 'el',
  albumMode: 'mes',
  pvWho: 'el',
};

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

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
  const [y, m, d] = str.split('-').map(Number);
  return `${d} ${MESES[m - 1].slice(0, 3)}`;
}
function escapeHtml(s) {
  return (s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- Partículas de fondo ----------
function initParticles() {
  const bg = $('#particles-bg');
  const emojis = ['❤️', '🤎', '✨', '🌹', '🍂'];
  for (let i = 0; i < 16; i++) {
    const h = document.createElement('span');
    h.className = 'floating-heart';
    h.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    h.style.left = Math.random() * 100 + 'vw';
    h.style.animationDuration = (9 + Math.random() * 12) + 's';
    h.style.animationDelay = (Math.random() * 12) + 's';
    h.style.fontSize = (15 + Math.random() * 20) + 'px';
    bg.appendChild(h);
  }
}

// ---------- Login ----------
async function checkSession() {
  const { data } = await db.auth.getSession();
  if (data.session) showApp();
  else $('#login-screen').classList.remove('hidden');
}

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
    $('#login-error').textContent = '';
    showApp();
  }
});

async function showApp() {
  $('#login-screen').classList.add('hidden');
  $('#app').classList.remove('hidden');
  $('#saludo').textContent = saludo();
  startCountdown();
  renderTimeline();
  renderCanciones();
  renderCofre();
  await loadData();
}

// ---------- Navegación ----------
$$('.nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => go(btn.dataset.view));
});
$$('.cta').forEach((btn) => {
  btn.addEventListener('click', () => go(btn.dataset.go));
});
function go(view) {
  $$('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  $$('.view').forEach((v) => v.classList.remove('active'));
  $('#view-' + view).classList.add('active');
  window.scrollTo({ top: 0 });
}

// ---------- Cuenta regresiva ----------
function startCountdown() {
  const target = CONFIG.CUMPLE.getTime();
  const tick = () => {
    let diff = target - Date.now();
    if (diff < 0) diff = 0;
    $('#cd-dias').textContent = Math.floor(diff / 86400000);
    $('#cd-horas').textContent = Math.floor((diff % 86400000) / 3600000);
    $('#cd-min').textContent = Math.floor((diff % 3600000) / 60000);
    $('#cd-seg').textContent = Math.floor((diff % 60000) / 1000);
    $('#countdown-hint').textContent = diff === 0 ? '¡Es hoy! 🎂' : 'Cada segundo que pasa, te quiero un poco más.';
  };
  tick();
  setInterval(tick, 1000);
}

// ---------- Historia ----------
function renderTimeline() {
  const tl = $('#timeline');
  tl.innerHTML = '';
  CONFIG.HISTORIA.forEach((cap) => {
    const item = document.createElement('div');
    item.className = 'tl-item' + (cap.especial ? ' especial' : '');
    item.innerHTML = `
      <div class="tl-card">
        <span class="tl-icono">${cap.icono}</span>
        <div class="tl-fecha">${cap.fecha}</div>
        <h3>${cap.titulo}</h3>
        <p>${cap.texto}</p>
      </div>`;
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
      iframe.title = t.nombre;
      div.appendChild(iframe);
    });
    wrap.appendChild(div);
  });
}

// ---------- Carga de datos ----------
async function loadData() {
  const [fr, nr, fd, pv] = await Promise.all([
    db.from('fotos').select('*').order('creado_en', { ascending: true }),
    db.from('notas').select('*').order('creado_en', { ascending: true }),
    db.from('fotos_dia').select('*').order('fecha', { ascending: true }),
    db.from('fotos_para_vos').select('*').order('creado_en', { ascending: false }),
  ]);
  state.fotos = (!fr.error && fr.data) ? fr.data : [];
  state.notas = (!nr.error && nr.data) ? nr.data : [];
  state.fotosDia = (!fd.error && fd.data) ? fd.data : [];
  state.paraVos = (!pv.error && pv.data) ? pv.data : [];

  // firmar URLs de todas las fotos
  const paths = new Set();
  state.fotos.forEach((f) => paths.add(f.url));
  state.fotosDia.forEach((f) => { if (f.url) paths.add(f.url); });
  state.paraVos.forEach((f) => paths.add(f.url));
  await Promise.all([...paths].map(async (p) => {
    const { data } = await db.storage.from('fotos').createSignedUrl(p, 604800);
    if (data) state.signedUrls[p] = data.signedUrl;
  }));

  renderAlbum();
  renderHoy();
  renderParaVos();
}

// ---------- Álbum ----------
function getMonths() {
  const now = new Date();
  const endY = now.getFullYear();
  const endM = now.getMonth() + 1;
  const months = [];
  let y = 2023, m = 4;
  while (y < endY || (y === endY && m <= endM)) {
    months.push({ anio: y, mes: m });
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return months.reverse();
}

function renderAlbum() {
  const wrap = $('#album');
  wrap.innerHTML = '';
  if (state.albumMode === 'mejores') { renderMejores(wrap); return; }

  const fotosPorClave = {};
  state.fotos.forEach((f) => {
    const k = `${f.anio}-${f.mes}-${f.tipo}`;
    (fotosPorClave[k] = fotosPorClave[k] || []).push(f);
  });
  const notasPorClave = {};
  state.notas.forEach((n) => {
    const k = `${n.anio}-${n.mes}-${n.tipo}`;
    (notasPorClave[k] = notasPorClave[k] || []).push(n);
  });

  getMonths().forEach(({ anio, mes }) => {
    const card = document.createElement('div');
    card.className = 'month-card';
    const mesNombre = MESES[mes - 1];
    const head = `<div class="month-head"><h3>${mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1)}</h3><span class="year">${anio}</span></div>`;

    let slotsHtml = '<div class="slot-row">';
    SLOTS.forEach((s) => {
      const k = `${anio}-${mes}-${s.tipo}`;
      const fotos = fotosPorClave[k] || [];
      const notas = notasPorClave[k] || [];
      slotsHtml += renderSlot(anio, mes, s.tipo, s.label, s.icono, fotos[0] || null, notas[0] || null);
    });
    slotsHtml += '</div>';

    const extras = [];
    (fotosPorClave[`${anio}-${mes}-extra`] || []).forEach((f) => extras.push(f));
    SLOTS.forEach((s) => {
      const fotos = fotosPorClave[`${anio}-${mes}-${s.tipo}`] || [];
      for (let i = 1; i < fotos.length; i++) extras.push(fotos[i]);
    });

    let extrasHtml = '';
    if (extras.length > 0) {
      extrasHtml = `<div class="extras-row"><div class="extra-title">Más recuerdos</div><div class="extra-grid">`;
      extras.forEach((f) => { extrasHtml += mediaTag(f, 'extra-' + f.id); });
      extrasHtml += '</div></div>';
    }
    card.innerHTML = head + slotsHtml + extrasHtml;
    wrap.appendChild(card);
  });
  bindAlbumEvents();
}

function renderSlot(anio, mes, tipo, label, icono, foto, nota) {
  let inner = '';
  if (foto) {
    inner = mediaTag(foto, 'foto-' + foto.id);
    const star = foto.destacada ? '⭐' : '☆';
    inner += `<div class="slot-actions">
        <button class="mini-btn star ${foto.destacada ? 'on' : ''}" data-action="star" data-id="${foto.id}" title="Destacar">${star}</button>
        <button class="mini-btn" data-action="add" data-anio="${anio}" data-mes="${mes}" data-tipo="${tipo}">➕</button>
        <button class="mini-btn" data-action="del" data-id="${foto.id}">🗑️</button>
      </div>`;
  } else if (nota) {
    inner = `<div class="slot-note">${escapeHtml(nota.texto)}${nota.autor ? `<span class="who">— ${escapeHtml(nota.autor)}</span>` : ''}</div>
      <div class="slot-actions">
        <button class="mini-btn" data-action="add" data-anio="${anio}" data-mes="${mes}" data-tipo="${tipo}">➕</button>
        <button class="mini-btn" data-action="delnote" data-id="${nota.id}">🗑️</button>
      </div>`;
  } else {
    inner = `<div class="slot-empty">${icono}<br/>Sin foto aún</div>
      <div class="slot-actions">
        <button class="mini-btn" data-action="add" data-anio="${anio}" data-mes="${mes}" data-tipo="${tipo}">📷 Subir</button>
        <button class="mini-btn" data-action="note" data-anio="${anio}" data-mes="${mes}" data-tipo="${tipo}">✍️ Falta porque…</button>
      </div>`;
  }
  return `<div class="slot ${tipo === 'ella' ? 'ella' : ''}" data-slot="${tipo}"><span class="slot-label">${label}</span>${inner}</div>`;
}

function renderMejores(wrap) {
  const destacadas = state.fotos.filter((f) => f.destacada);
  if (destacadas.length === 0) {
    wrap.innerHTML = '<p style="text-align:center;color:var(--marron-claro);padding:20px">Todavía no destacaron fotos. En "Mes a mes", tocá la ⭐ de una foto para traerla acá.</p>';
    return;
  }
  const porMes = {};
  destacadas.forEach((f) => {
    const k = `${f.anio}-${f.mes}`;
    (porMes[k] = porMes[k] || []).push(f);
  });
  const claves = Object.keys(porMes).sort((a, b) => (a < b ? 1 : -1));
  claves.forEach((k) => {
    const [anio, mes] = k.split('-').map(Number);
    const title = document.createElement('div');
    title.className = 'mejor-month-title';
    title.textContent = `${MESES[mes - 1].charAt(0).toUpperCase() + MESES[mes - 1].slice(1)} ${anio}`;
    wrap.appendChild(title);
    const grid = document.createElement('div');
    grid.className = 'mejores-grid';
    porMes[k].forEach((f) => {
      grid.innerHTML += `<div class="mejor-card">${mediaTag(f, 'mejor-' + f.id)}<div class="mejor-tag">⭐</div></div>`;
    });
    wrap.appendChild(grid);
  });
  bindAlbumEvents();
}

function mediaTag(foto, id) {
  const url = state.signedUrls[foto.url] || '';
  const isVideo = (foto.url || '').toLowerCase().endsWith('.mp4');
  if (isVideo) return `<video src="${url}" controls playsinline></video>`;
  return `<img src="${url}" alt="foto" loading="lazy" data-full="${url}" />`;
}

function bindAlbumEvents() {
  $$('#album [data-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const a = btn.dataset.action;
      if (a === 'add') openUpload(btn.dataset.anio, btn.dataset.mes, btn.dataset.tipo);
      else if (a === 'note') openNote(btn.dataset.anio, btn.dataset.mes, btn.dataset.tipo);
      else if (a === 'del') deleteFoto(btn.dataset.id);
      else if (a === 'delnote') deleteNota(btn.dataset.id);
      else if (a === 'star') toggleDestacada(btn.dataset.id);
    });
  });
  $$('#album img').forEach((img) => {
    img.addEventListener('click', () => openLightbox(img.dataset.full));
  });
}

async function toggleDestacada(id) {
  const f = state.fotos.find((x) => x.id === id);
  if (!f) return;
  const { error } = await db.from('fotos').update({ destacada: !f.destacada }).eq('id', id);
  if (error) { alert('No se pudo: ' + error.message); return; }
  f.destacada = !f.destacada;
  renderAlbum();
}

// ---------- Subir foto (álbum mensual) ----------
let uploadContext = null;
function openUpload(anio, mes, tipo) {
  uploadContext = { anio: parseInt(anio), mes: parseInt(mes), tipo };
  const slot = SLOTS.find((s) => s.tipo === tipo);
  $('#upload-slot-label').textContent = `${slot ? slot.label : 'Extra'} · ${MESES[mes - 1]} ${anio}`;
  $('#upload-input').value = '';
  $('#upload-modal').classList.remove('hidden');
}
$('#upload-cancel').addEventListener('click', () => $('#upload-modal').classList.add('hidden'));
$('#upload-do').addEventListener('click', async () => {
  const file = $('#upload-input').files[0];
  if (!file) { alert('Elegí una foto primero'); return; }
  const { anio, mes, tipo } = uploadContext;
  const ext = '.' + (file.name.split('.').pop() || 'jpg').toLowerCase();
  const safe = file.name.replace(/\.[^.]+$/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 60);
  const storagePath = `${anio}/${mes}/${tipo}/${safe}_${Date.now()}${ext}`;
  const ct = file.type || (ext === '.mp4' ? 'video/mp4' : 'image/jpeg');
  $('#upload-do').disabled = true;
  const { error: upErr } = await db.storage.from('fotos').upload(storagePath, file, { contentType: ct, upsert: false });
  if (upErr) { alert('No se pudo subir: ' + upErr.message); $('#upload-do').disabled = false; return; }
  const { error: inErr } = await db.from('fotos').insert({ anio, mes, tipo, url: storagePath, subido_por: 'app' });
  $('#upload-do').disabled = false;
  $('#upload-modal').classList.add('hidden');
  if (inErr) { alert('Se subió la foto pero no se guardó: ' + inErr.message); }
  loadData();
});

// ---------- Nota "falta porque" (álbum) ----------
let noteContext = null;
function openNote(anio, mes, tipo) {
  noteContext = { anio: parseInt(anio), mes: parseInt(mes), tipo };
  const slot = SLOTS.find((s) => s.tipo === tipo);
  $('#note-modal-title').textContent = `¿Por qué falta "${slot ? slot.label : 'esta foto'}" en ${MESES[mes - 1]} ${anio}?`;
  $('#note-text').value = '';
  $('#note-modal').classList.remove('hidden');
}
$('#note-cancel').addEventListener('click', () => $('#note-modal').classList.add('hidden'));
$('#note-save').addEventListener('click', async () => {
  const texto = $('#note-text').value.trim();
  if (!texto) { alert('Escribí el porqué'); return; }
  const { anio, mes, tipo } = noteContext;
  const { error } = await db.from('notas').insert({ anio, mes, tipo, texto, autor: 'nosotros' });
  if (error) { alert('No se pudo guardar: ' + error.message); return; }
  $('#note-modal').classList.add('hidden');
  loadData();
});

async function deleteFoto(id) {
  if (!confirm('¿Borrar esta foto?')) return;
  const foto = state.fotos.find((f) => f.id === id);
  if (foto) await db.storage.from('fotos').remove([foto.url]);
  await db.from('fotos').delete().eq('id', id);
  loadData();
}
async function deleteNota(id) {
  if (!confirm('¿Borrar esta nota?')) return;
  await db.from('notas').delete().eq('id', id);
  loadData();
}

// ---------- HOY (foto del día) ----------
function renderHoy() {
  const hoy = todayStr();
  const entry = state.fotosDia.find((f) => f.fecha === hoy);
  const wrap = $('#hoy');

  let html = `<div class="hoy-card">
    <div class="hoy-fecha">${fechaCorta(hoy)} · hoy</div>
    <div class="hoy-titulo">Nuestra foto de hoy</div>`;

  if (entry && entry.url) {
    const url = state.signedUrls[entry.url] || '';
    const isVideo = entry.url.toLowerCase().endsWith('.mp4');
    html += isVideo ? `<video src="${url}" controls playsinline></video>` : `<img src="${url}" data-full="${url}" />`;
    html += `<div class="hoy-actions">
      <button class="btn-big ghost" data-act="del-dia" data-id="${entry.id}">🗑️</button>
    </div>`;
  } else if (entry && entry.nota) {
    html += `<div class="hoy-note">${escapeHtml(entry.nota)}<span class="who">Hoy no hubo foto…</span></div>
      <div class="hoy-actions">
        <button class="btn-big" data-act="subir-dia">📷 Subir foto</button>
        <button class="btn-big ghost" data-act="del-dia" data-id="${entry.id}">Borrar nota</button>
      </div>`;
  } else {
    html += `<div class="hoy-empty">Todavía no subimos la foto de hoy.</div>
      <div class="hoy-actions">
        <button class="btn-big" data-act="subir-dia">📷 Subir foto</button>
        <button class="btn-big ghost" data-act="nota-dia">✍️ Por qué no subimos</button>
      </div>`;
  }
  html += '</div>';
  wrap.innerHTML = html;

  wrap.querySelector('[data-act="subir-dia"]')?.addEventListener('click', () => openUploadDia());
  wrap.querySelector('[data-act="nota-dia"]')?.addEventListener('click', () => openNotaDia());
  wrap.querySelector('[data-act="del-dia"]')?.addEventListener('click', () => deleteDia(entry.id));
  wrap.querySelector('img')?.addEventListener('click', (e) => openLightbox(e.target.dataset.full));

  // historial últimos 14 días
  const hist = $('#hoy-history');
  hist.innerHTML = '';
  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const e = state.fotosDia.find((f) => f.fecha === ds);
    const cell = document.createElement('div');
    cell.className = 'day';
    if (e && e.url) {
      const u = state.signedUrls[e.url] || '';
      cell.innerHTML = `<img src="${u}" data-full="${u}" /><span class="day-dia">${d.getDate()}</span>`;
    } else if (e && e.nota) {
      cell.innerHTML = `<div class="day-note" title="${escapeHtml(e.nota)}">💭</div><span class="day-dia">${d.getDate()}</span>`;
    } else {
      cell.innerHTML = `<div class="day-empty">·</div><span class="day-dia">${d.getDate()}</span>`;
    }
    hist.appendChild(cell);
  }
  hist.querySelectorAll('img').forEach((img) => img.addEventListener('click', () => openLightbox(img.dataset.full)));
}

function openUploadDia() {
  uploadContext = { tipo: 'dia' };
  $('#upload-slot-label').textContent = 'Foto juntos de hoy';
  $('#upload-input').value = '';
  $('#upload-modal').classList.remove('hidden');
}
function openNotaDia() {
  $('#notadia-text').value = '';
  $('#notadia-modal').classList.remove('hidden');
}
$('#notadia-cancel').addEventListener('click', () => $('#notadia-modal').classList.add('hidden'));
$('#notadia-save').addEventListener('click', async () => {
  const texto = $('#notadia-text').value.trim();
  if (!texto) { alert('Escribí el porqué'); return; }
  const fecha = todayStr();
  const { error } = await db.from('fotos_dia').upsert({ fecha, url: null, nota: texto }, { onConflict: 'fecha' });
  if (error) { alert('No se pudo guardar: ' + error.message); return; }
  $('#notadia-modal').classList.add('hidden');
  loadData();
});
async function deleteDia(id) {
  if (!confirm('¿Borrar la foto/nota de hoy?')) return;
  const e = state.fotosDia.find((f) => f.id === id);
  if (e && e.url) await db.storage.from('fotos').remove([e.url]);
  await db.from('fotos_dia').delete().eq('id', id);
  loadData();
}

// el upload-do maneja tanto álbum mensual como foto del día
$('#upload-do').addEventListener('click', async function uploadDoHandler() {
  const file = $('#upload-input').files[0];
  if (!file) { alert('Elegí una foto primero'); return; }
  if (uploadContext && uploadContext.tipo === 'dia') {
    const ext = '.' + (file.name.split('.').pop() || 'jpg').toLowerCase();
    const storagePath = `foto_dia/${todayStr()}_${Date.now()}${ext}`;
    const ct = file.type || (ext === '.mp4' ? 'video/mp4' : 'image/jpeg');
    $('#upload-do').disabled = true;
    const { error: upErr } = await db.storage.from('fotos').upload(storagePath, file, { contentType: ct, upsert: false });
    if (upErr) { alert('No se pudo subir: ' + upErr.message); $('#upload-do').disabled = false; return; }
    const { error: inErr } = await db.from('fotos_dia').upsert({ fecha: todayStr(), url: storagePath, nota: null }, { onConflict: 'fecha' });
    $('#upload-do').disabled = false;
    $('#upload-modal').classList.add('hidden');
    if (inErr) { alert('Se subió pero no se guardó: ' + inErr.message); }
    loadData();
  } else {
    // álbum mensual (lógica original)
    const { anio, mes, tipo } = uploadContext;
    const ext = '.' + (file.name.split('.').pop() || 'jpg').toLowerCase();
    const safe = file.name.replace(/\.[^.]+$/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 60);
    const storagePath = `${anio}/${mes}/${tipo}/${safe}_${Date.now()}${ext}`;
    const ct = file.type || (ext === '.mp4' ? 'video/mp4' : 'image/jpeg');
    $('#upload-do').disabled = true;
    const { error: upErr } = await db.storage.from('fotos').upload(storagePath, file, { contentType: ct, upsert: false });
    if (upErr) { alert('No se pudo subir: ' + upErr.message); $('#upload-do').disabled = false; return; }
    const { error: inErr } = await db.from('fotos').insert({ anio, mes, tipo, url: storagePath, subido_por: 'app' });
    $('#upload-do').disabled = false;
    $('#upload-modal').classList.add('hidden');
    if (inErr) { alert('Se subió pero no se guardó: ' + inErr.message); }
    loadData();
  }
});

// ---------- PARA VOS ----------
function renderParaVos() {
  const wrap = $('#para-vos');
  wrap.innerHTML = '';
  const items = state.paraVos.filter((f) => f.remitente === state.pvTab);

  const addBtn = document.createElement('button');
  addBtn.className = 'pv-add-btn';
  addBtn.textContent = '+ Enviar una foto para vos';
  addBtn.addEventListener('click', () => $('#paravos-modal').classList.remove('hidden'));
  wrap.appendChild(addBtn);

  if (items.length === 0) {
    wrap.innerHTML += '<p class="pv-empty">Todavía no hay fotos acá. ¡Enviale la primera! 💌</p>';
    return;
  }
  items.forEach((f) => {
    const url = state.signedUrls[f.url] || '';
    const isVideo = f.url.toLowerCase().endsWith('.mp4');
    const div = document.createElement('div');
    div.className = 'pv-item';
    div.innerHTML = (isVideo ? `<video src="${url}" controls playsinline></video>` : `<img src="${url}" data-full="${url}" />`) +
      `<div class="pv-meta"><button class="pv-del" title="Borrar">🗑️</button>
        <div class="pv-fecha">${fechaCorta(f.fecha)}</div>
        ${f.mensaje ? `<div class="pv-msg">"${escapeHtml(f.mensaje)}"</div>` : ''}
      </div>`;
    div.querySelector('.pv-del').addEventListener('click', () => deleteParaVos(f.id));
    const img = div.querySelector('img');
    if (img) img.addEventListener('click', () => openLightbox(img.dataset.full));
    wrap.appendChild(div);
  });
}

$$('.pv-tab').forEach((t) => t.addEventListener('click', () => {
  state.pvTab = t.dataset.pv;
  $$('.pv-tab').forEach((x) => x.classList.toggle('active', x === t));
  renderParaVos();
}));

$$('.pv-choose-btn').forEach((b) => b.addEventListener('click', () => {
  state.pvWho = b.dataset.who;
  $$('.pv-choose-btn').forEach((x) => x.classList.toggle('active', x === b));
}));

$('#paravos-cancel').addEventListener('click', () => $('#paravos-modal').classList.add('hidden'));
$('#paravos-do').addEventListener('click', async () => {
  const file = $('#paravos-input').files[0];
  if (!file) { alert('Elegí una foto'); return; }
  const remitente = state.pvWho;
  const mensaje = $('#paravos-msg').value.trim();
  const ext = '.' + (file.name.split('.').pop() || 'jpg').toLowerCase();
  const storagePath = `para_vos/${remitente}_${todayStr()}_${Date.now()}${ext}`;
  const ct = file.type || (ext === '.mp4' ? 'video/mp4' : 'image/jpeg');
  $('#paravos-do').disabled = true;
  const { error: upErr } = await db.storage.from('fotos').upload(storagePath, file, { contentType: ct, upsert: false });
  if (upErr) { alert('No se pudo subir: ' + upErr.message); $('#paravos-do').disabled = false; return; }
  const { error: inErr } = await db.from('fotos_para_vos').insert({ fecha: todayStr(), remitente, url: storagePath, mensaje: mensaje || null });
  $('#paravos-do').disabled = false;
  $('#paravos-modal').classList.add('hidden');
  $('#paravos-input').value = '';
  $('#paravos-msg').value = '';
  if (inErr) { alert('Se subió pero no se guardó: ' + inErr.message); }
  loadData();
});

async function deleteParaVos(id) {
  if (!confirm('¿Borrar esta foto?')) return;
  const f = state.paraVos.find((x) => x.id === id);
  if (f) await db.storage.from('fotos').remove([f.url]);
  await db.from('fotos_para_vos').delete().eq('id', id);
  loadData();
}

// ---------- Tabs del álbum ----------
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
  if (e.target.id === 'lightbox' || e.target.classList.contains('lightbox-close')) {
    $('#lightbox').classList.add('hidden');
  }
});

// ---------- Cofre ----------
const ES_CUMPLE = () => Date.now() >= CONFIG.CUMPLE.getTime();

function renderCofre() {
  const wrap = $('#cofre');
  if (!ES_CUMPLE()) {
    wrap.innerHTML = `
      <div class="cofre-wrap">
        <div class="cofre-box">🔒🎁</div>
        <p class="cofre-locked-hint">Este cofre se abre el ${CONFIG.CUMPLE_TEXTO}.</p>
        <p class="cofre-locked-hint">Paciencia, mi amor… vale la pena. 😉</p>
        <div class="cofre-countdown">
          <div class="cd-box"><span id="cofre-dias">--</span><label>días</label></div>
          <div class="cd-box"><span id="cofre-horas">--</span><label>horas</label></div>
        </div>
      </div>`;
    const target = CONFIG.CUMPLE.getTime();
    const tick = () => {
      let diff = target - Date.now();
      if (diff < 0) diff = 0;
      $('#cofre-dias').textContent = Math.floor(diff / 86400000);
      $('#cofre-horas').textContent = Math.floor((diff % 86400000) / 3600000);
    };
    tick();
    setInterval(tick, 60000);
  } else {
    wrap.innerHTML = `
      <div class="cofre-wrap">
        <div class="cofre-box" id="cofre-open">🎁</div>
        <p class="cofre-locked-hint">Tocá el cofre, mi amor.</p>
      </div>`;
    $('#cofre-open').addEventListener('click', startReveal);
  }
}

function startReveal() {
  $('#view-cofre').innerHTML = '<div class="slideshow" id="slideshow"></div>';
  playSlideshow();
}
function playSlideshow() {
  const ss = $('#slideshow');
  const fotos = state.fotos.filter((f) => !f.url.toLowerCase().endsWith('.mp4'));
  if (fotos.length === 0) { showLetter(); return; }
  const ordenadas = [...fotos].sort((a, b) => (a.anio - b.anio) || (a.mes - b.mes));
  let i = 0;
  ss.innerHTML = `<img src="${state.signedUrls[ordenadas[0].url]}" /><div class="ss-caption">${MESES[ordenadas[0].mes - 1]} ${ordenadas[0].anio}</div>`;
  const timer = setInterval(() => {
    i++;
    if (i >= ordenadas.length) { clearInterval(timer); showLetter(); return; }
    const f = ordenadas[i];
    ss.innerHTML = `<img src="${state.signedUrls[f.url]}" /><div class="ss-caption">${MESES[f.mes - 1]} ${f.anio}</div>`;
  }, 1600);
}
function showLetter() {
  const container = $('#view-cofre');
  container.innerHTML = `<div class="letter-card" id="letter"></div>`;
  typewriter($('#letter'), CONFIG.PROPUESTA.carta, showProposal);
}
function typewriter(el, text, done) {
  el.textContent = '';
  let i = 0;
  const timer = setInterval(() => {
    el.textContent += text[i];
    i++;
    if (i >= text.length) { clearInterval(timer); done(); }
  }, 34);
}
function showProposal() {
  const container = $('#view-cofre');
  const div = document.createElement('div');
  div.className = 'proposal';
  div.innerHTML = `<h3>${CONFIG.PROPUESTA.pregunta}</h3>
    <button class="btn-si" id="btn-si">${CONFIG.PROPUESTA.si}</button>
    <button class="btn-no" id="btn-no">${CONFIG.PROPUESTA.no}</button>`;
  container.appendChild(div);
  $('#btn-si').addEventListener('click', celebrate);
  const no = $('#btn-no');
  const dodge = () => {
    no.style.position = 'fixed';
    no.style.left = (Math.random() * (window.innerWidth - 100)) + 'px';
    no.style.top = (Math.random() * (window.innerHeight - 60)) + 'px';
  };
  no.addEventListener('touchstart', (e) => { e.preventDefault(); dodge(); });
  no.addEventListener('mouseenter', dodge);
}
function celebrate() {
  const container = $('#view-cofre');
  container.innerHTML = `
    <div class="final-msg">
      <div class="big">❤️🎉❤️</div>
      <h3>${CONFIG.PROPUESTA.final}</h3>
      <p>Desde hoy, oficialmente… nuestros. Te amo, ${CONFIG.NOMBRE}.</p>
      <div class="cofre-wrap" style="margin-top:16px">
        <iframe src="https://open.spotify.com/embed/track/${CONFIG.PROPUESTA.cancionCelebracion}" width="100%" height="152" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" style="border-radius:14px"></iframe>
      </div>
    </div>`;
  launchConfetti();
}
function launchConfetti() {
  const emojis = ['❤️', '🤎', '🎉', '✨', '🌹', '💍'];
  for (let i = 0; i < 80; i++) {
    const c = document.createElement('span');
    c.className = 'confetti';
    c.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    c.style.left = Math.random() * 100 + 'vw';
    c.style.animationDuration = (2.5 + Math.random() * 3) + 's';
    c.style.animationDelay = (Math.random() * 2) + 's';
    c.style.fontSize = (14 + Math.random() * 22) + 'px';
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 7000);
  }
}

// ---------- Service worker (PWA) ----------
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// ---------- Arranque ----------
initParticles();
checkSession();
