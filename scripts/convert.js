const fs = require('fs');
const path = require('path');
const heicConvert = require('heic-convert');

const root = __dirname.replace(/scripts$/, '');
const dir = fs.readdirSync(root).find((d) => d.startsWith('fotoscon'));
if (!dir) {
  console.error('No se encontró la carpeta de fotos');
  process.exit(1);
}
const photosDir = path.join(root, dir);

(async () => {
  const files = fs.readdirSync(photosDir);
  const heics = files.filter((f) => f.toLowerCase().endsWith('.heic'));
  console.log(`Encontré ${files.length} archivos, ${heics.length} son .HEIC`);

  for (const f of heics) {
    const inPath = path.join(photosDir, f);
    const outPath = inPath.replace(/\.heic$/i, '.jpg');
    try {
      const input = fs.readFileSync(inPath);
      const output = await heicConvert({ buffer: input, format: 'JPEG', quality: 0.9 });
      fs.writeFileSync(outPath, Buffer.from(output));
      console.log('OK  ', f, '->', path.basename(outPath));
    } catch (e) {
      console.error('FAIL', f, e.message);
    }
  }
  console.log('Listo.');
  process.exit(0);
})();
