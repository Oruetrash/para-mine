// Redimensiona una imagen en el cliente a JPEG (respeta EXIF vía imageOrientation).
// Devuelve null si el navegador no puede decodificar (p. ej. HEIC), para hacer fallback al original.
export async function toJpeg(file, max, quality = 0.82) {
  try {
    let bmp;
    try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch (e) { bmp = await createImageBitmap(file); }
    const r = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * r));
    const h = Math.max(1, Math.round(bmp.height * r));
    const c = new OffscreenCanvas(w, h);
    const ctx = c.getContext('2d');
    ctx.drawImage(bmp, 0, 0, w, h);
    if (bmp.close) bmp.close();
    return c.convertToBlob({ type: 'image/jpeg', quality });
  } catch (e) {
    return null;
  }
}
