// ============================================================
//  APP PRINCIPAL
// ============================================================

const db = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const SLOTS = [
  { tipo: 'nosotros1', label: 'Nosotros #1', icono: '💑' },
  { tipo: 'nosotros2', label: 'Nosotros #2', icono: '💞' },
  { tipo: 'ella', label: 'Ella', icono: '🌸' },
];

let fotosData = [];
let notasData = [];
let signedUrls = {}; // path -> signedUrl

// ---------- Utilidades ----------
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

function saludo() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días,';
  if (h < 20) return 'Buenas tardes,';
  return 'Buenas noches,';
}

// ---------- Fondo de corazones ----------
function initHearts() {
  const bg = $('#hearts-bg');
  const emojis = ['💗', '💖', '💘', '❤️', '💕', '✨', '🌸'];
  for (let i = 0; i < 18; i++) {
    const h = document.createElement('span');
    h.className = 'floating-heart';
    h.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    h.style.left = Math.random() * 100 + 'vw';
    h.style.animationDuration = (8 + Math.random() * 12) + 's';
    h.style.animationDelay = (Math.random() * 12) + 's';
    h.style.fontSize = (16 + Math.random() * 22) + 'px';
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
  $('#login-btn').textContent = 'Abriendo…';
  const { error } = await db.auth.signInWithPassword({
    email: CONFIG.LOGIN_EMAIL,
    password: pass,
  });
  if (error) {
    $('#login-error').textContent = 'Clave incorrecta, probá de nuevo 💔';
    $('#login-btn').disabled = false;
    $('#login-btn').textContent = 'Abrir mi regalo 💝';
  } else {
    $('#login-error').textContent = '';
    showApp();
  }
});

function showApp() {
  $('#login-screen').classList.add('hidden');
  $('#app').classList.remove('hidden');
  $('#saludo').textContent = saludo();
  startCountdown();
  renderTimeline();
  renderCanciones();
  renderCofre();
  loadAlbum();
}

// ---------- Navegación ----------
$$('.nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const view = btn.dataset.view;
    $$('.nav-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    $$('.view').forEach((v) => v.classList.remove('active'));
    $('#view-' + view).classList.add('active');
    window.scrollTo({ top: 0 });
  });
});
$$('.cta').forEach((btn) => {
  btn.addEventListener('click', () => {
    const go = btn.dataset.go;
    $$('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === go));
    $$('.view').forEach((v) => v.classList.remove('active'));
    $('#view-' + go).classList.add('active');
    window.scrollTo({ top: 0 });
  });
});

// ---------- Cuenta regresiva ----------
function startCountdown() {
  const target = CONFIG.CUMPLE.getTime();
  const tick = () => {
    const now = Date.now();
    let diff = target - now;
    if (diff < 0) diff = 0;
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    $('#cd-dias').textContent = d;
    $('#cd-horas').textContent = h;
    $('#cd-min').textContent = m;
    $('#cd-seg').textContent = s;
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

// ---------- Álbum ----------
async function loadAlbum() {
  const [fr, nr] = await Promise.all([
    db.from('fotos').select('*').order('creado_en', { ascending: true }),
    db.from('notas').select('*').order('creado_en', { ascending: true }),
  ]);
  fotosData = fr.data || [];
  notasData = nr.data || [];

  // firmar URLs
  const paths = [...new Set(fotosData.map((f) => f.url))];
  await Promise.all(paths.map(async (p) => {
    const { data } = await db.storage.from('fotos').createSignedUrl(p, 604800);
    if (data) signedUrls[p] = data.signedUrl;
  }));

  renderAlbum();
}

function getMonths() {
  const now = new Date();
  const endY = now.getFullYear();
  const endM = now.getMonth() + 1;
  const months = [];
  let y = 2023, m = 4; // abril 2023
  while (y < endY || (y === endY && m <= endM)) {
    months.push({ anio: y, mes: m });
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return months.reverse(); // más reciente primero
}

function renderAlbum() {
  const wrap = $('#album');
  wrap.innerHTML = '';

  // agrupar
  const fotosPorClave = {};
  fotosData.forEach((f) => {
    const k = `${f.anio}-${f.mes}-${f.tipo}`;
    (fotosPorClave[k] = fotosPorClave[k] || []).push(f);
  });
  const notasPorClave = {};
  notasData.forEach((n) => {
    const k = `${n.anio}-${n.mes}-${n.tipo}`;
    (notasPorClave[k] = notasPorClave[k] || []).push(n);
  });

  const months = getMonths();
  if (months.length === 0) wrap.innerHTML = '<p style="text-align:center;color:#a05570">Todavía no hay meses…</p>';

  months.forEach(({ anio, mes }) => {
    const card = document.createElement('div');
    card.className = 'month-card';
    card.dataset.anio = anio;
    card.dataset.mes = mes;

    const mesNombre = MESES[mes - 1];
    let head = `<div class="month-head"><h3>${mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1)}</h3><span class="year">${anio}</span></div>`;

    // slots
    let slotsHtml = '<div class="slot-row">';
    SLOTS.forEach((s) => {
      const k = `${anio}-${mes}-${s.tipo}`;
      const fotos = fotosPorClave[k] || [];
      const notas = notasPorClave[k] || [];
      slotsHtml += renderSlot(anio, mes, s.tipo, s.label, s.icono, fotos[0] || null, notas[0] || null);
    });
    slotsHtml += '</div>';

    // extras: tipo 'extra' + fotos sobrantes de los 3 slots
    const extras = [];
    (fotosPorClave[`${anio}-${mes}-extra`] || []).forEach((f) => extras.push(f));
    SLOTS.forEach((s) => {
      const k = `${anio}-${mes}-${s.tipo}`;
      const fotos = fotosPorClave[k] || [];
      for (let i = 1; i < fotos.length; i++) extras.push(fotos[i]);
    });

    let extrasHtml = '';
    if (extras.length > 0) {
      extrasHtml = `<div class="extras-row"><div class="extra-title">Más recuerdos</div><div class="extra-grid">`;
      extras.forEach((f) => {
        extrasHtml += mediaTag(f, 'extra-' + f.id);
      });
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
    inner += `<div class="slot-actions">
        <button class="mini-btn" data-action="add" data-anio="${anio}" data-mes="${mes}" data-tipo="${tipo}">➕</button>
        <button class="mini-btn" data-action="del" data-id="${foto.id}">🗑️</button>
      </div>`;
  } else if (nota) {
    inner = `<div class="slot-note">${escapeHtml(nota.texto)}
        ${nota.autor ? `<span class="who">— ${escapeHtml(nota.autor)}</span>` : ''}
      </div>
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
  return `<div class="slot ${tipo === 'ella' ? 'ella' : ''}" data-slot="${tipo}">
    <span class="slot-label">${label}</span>${inner}</div>`;
}

function mediaTag(foto, id) {
  const url = signedUrls[foto.url] || '';
  const ext = (foto.url || '').toLowerCase();
  if (ext.endsWith('.mp4')) {
    return `<video src="${url}" controls playsinline onclick="openLightbox('${url}', true)"></video>`;
  }
  return `<img src="${url}" alt="foto" loading="lazy" data-full="${url}" />`;
}

function escapeHtml(s) {
  return (s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function bindAlbumEvents() {
  $$('#album [data-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      const anio = btn.dataset.anio;
      const mes = btn.dataset.mes;
      const tipo = btn.dataset.tipo;
      const id = btn.dataset.id;
      if (action === 'add') openUpload(anio, mes, tipo);
      else if (action === 'note') openNote(anio, mes, tipo);
      else if (action === 'del') deleteFoto(id);
      else if (action === 'delnote') deleteNota(id);
    });
  });
  $$('#album img').forEach((img) => {
    img.addEventListener('click', () => openLightbox(img.dataset.full));
  });
}

// ---------- Subir foto ----------
let uploadContext = null;
function openUpload(anio, mes, tipo) {
  uploadContext = { anio: parseInt(anio), mes: parseInt(mes), tipo };
  const slot = SLOTS.find((s) => s.tipo === tipo);
  const nombreMes = MESES[mes - 1];
  $('#upload-slot-label').textContent = `${slot ? slot.label : 'Extra'} · ${nombreMes} ${anio}`;
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
  if (inErr) { alert('Se subió la foto pero no se guardó el registro: ' + inErr.message); }
  loadAlbum();
});

// ---------- Nota "falta porque" ----------
let noteContext = null;
function openNote(anio, mes, tipo) {
  noteContext = { anio: parseInt(anio), mes: parseInt(mes), tipo };
  const slot = SLOTS.find((s) => s.tipo === tipo);
  const nombreMes = MESES[mes - 1];
  $('#note-modal-title').textContent = `¿Por qué falta "${slot ? slot.label : 'esta foto'}" en ${nombreMes} ${anio}?`;
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
  loadAlbum();
});

// ---------- Borrar ----------
async function deleteFoto(id) {
  if (!confirm('¿Borrar esta foto?')) return;
  const foto = fotosData.find((f) => f.id === id);
  if (foto) await db.storage.from('fotos').remove([foto.url]);
  await db.from('fotos').delete().eq('id', id);
  loadAlbum();
}
async function deleteNota(id) {
  if (!confirm('¿Borrar esta nota?')) return;
  await db.from('notas').delete().eq('id', id);
  loadAlbum();
}

// ---------- Lightbox ----------
function openLightbox(url, isVideo) {
  if (isVideo) return;
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
  const fotos = fotosData.filter((f) => !f.url.toLowerCase().endsWith('.mp4'));
  if (fotos.length === 0) { showLetter(); return; }
  const ordenadas = [...fotos].sort((a, b) => (a.anio - b.anio) || (a.mes - b.mes));
  let i = 0;
  ss.innerHTML = `<img src="${signedUrls[ordenadas[0].url]}" />
    <div class="ss-caption">${MESES[ordenadas[0].mes - 1]} ${ordenadas[0].anio}</div>`;
  const timer = setInterval(() => {
    i++;
    if (i >= ordenadas.length) { clearInterval(timer); showLetter(); return; }
    const f = ordenadas[i];
    ss.innerHTML = `<img src="${signedUrls[f.url]}" />
      <div class="ss-caption">${MESES[f.mes - 1]} ${f.anio}</div>`;
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
      <div class="big">💖🎉💖</div>
      <h3>${CONFIG.PROPUESTA.final}</h3>
      <p>Desde hoy, oficialmente… nuestros. Te amo, ${CONFIG.NOMBRE}.</p>
      <div class="cofre-wrap" style="margin-top:16px">
        <iframe src="https://open.spotify.com/embed/track/${CONFIG.PROPUESTA.cancionCelebracion}" width="100%" height="152" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" style="border-radius:14px"></iframe>
      </div>
    </div>`;
  launchConfetti();
}

function launchConfetti() {
  const emojis = ['💖', '💘', '💕', '🎉', '✨', '🌸', '❤️', '💍'];
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

// ---------- Arranque ----------
initHearts();
checkSession();
