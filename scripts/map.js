const fs = require('fs');
const path = require('path');

const root = __dirname.replace(/scripts$/, '');
const dir = fs.readdirSync(root).find((d) => d.startsWith('fotoscon'));
const photosDir = path.join(root, dir);

const MESES = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};

// Overrides exactos por nombre de archivo (sin extensión)
const OVERRIDES = {
  'la primera foto de diciembre 2023': { anio: 2023, mes: 12, tipo: 'nosotros1' },
  'la ultima foto de octubre 2023': { anio: 2023, mes: 10, tipo: 'nosotros2' },
  'enero 2024 mi cumple': { anio: 2024, mes: 1, tipo: 'extra' },
  'su cara hermosa': { anio: 2024, mes: 1, tipo: 'extra' }, // el video sin fecha
  '2 juntos diciembre': { anio: 2023, mes: 12, tipo: 'nosotros2' }, // sin año en el nombre
  // tipeos detectados: el nombre dice 2026 pero la foto es de 2025
  '1 foto juntos diciembre 2026': { anio: 2025, mes: 12, tipo: 'nosotros1' },
  '1 foto juntos septiembre 2026': { anio: 2025, mes: 9, tipo: 'nosotros1' },
  'su cara hermosa diciembre 2026': { anio: 2025, mes: 12, tipo: 'ella' },
};

function parseName(name) {
  const lower = name.toLowerCase();
  // tipo
  let tipo;
  if (lower.includes('cara hermosa') || lower.includes('carita hermosa')) tipo = 'ella';
  else if (lower.includes('primera')) tipo = 'nosotros1';
  else if (lower.includes('ultima')) tipo = 'nosotros2';
  else if (lower.includes('mi cumple')) tipo = 'extra';
  else if (/^1(\s|$)/.test(name)) tipo = 'nosotros1';
  else if (/^2(\s|$)/.test(name)) tipo = 'nosotros2';
  else if (lower.includes('juntos')) tipo = 'nosotros1';
  else tipo = 'ella';

  // mes
  let mes = null;
  for (const [m, n] of Object.entries(MESES)) {
    if (lower.includes(m)) { mes = n; break; }
  }
  // año
  const yearMatch = name.match(/(19|20)\d{2}/);
  let anio = yearMatch ? parseInt(yearMatch[0], 10) : null;

  return { anio, mes, tipo };
}

function resolve(file) {
  const ext = path.extname(file).toLowerCase();
  const base = file.slice(0, file.length - path.extname(file).length);
  const st = fs.statSync(path.join(photosDir, file));
  const mYear = st.mtime.getFullYear();
  const mMonth = st.mtime.getMonth() + 1;

  if (OVERRIDES[base]) return { ...OVERRIDES[base], ext, file };

  const p = parseName(base);
  let { anio, mes, tipo } = p;

  // si no hay año en el nombre, usar año del archivo
  if (anio === null) anio = mYear;
  return { anio, mes, tipo, ext, file };
}

const files = fs.readdirSync(photosDir).sort();
const mapped = [];
for (const f of files) {
  if (f.toLowerCase().endsWith('.heic')) continue; // ya convertidos
  mapped.push(resolve(f));
}

console.log('ARCHIVO | AÑO | MES | TIPO | EXT');
for (const m of mapped) {
  console.log(`${m.file}  =>  ${m.anio}-${String(m.mes).padStart(2, '0')}  ${m.tipo}  ${m.ext}`);
}
console.log(`\nTotal: ${mapped.length} archivos a subir.`);
console.log(`Sin mes detectado: ${mapped.filter(m => m.mes === null).map(m => m.file).join(', ') || 'ninguno'}`);

if (process.argv.includes('--write')) {
  fs.writeFileSync(path.join(root, 'scripts', 'mapping.json'), JSON.stringify(mapped, null, 2));
  console.log('mapping.json generado.');
}
