/* ---- Imágenes: reducir antes de enviar ---- */
/* Reduce una foto antes de subirla (el lado mayor a «max» px, JPEG 0,8): de 3-5 MB pasa a unos 200 KB.
   Usa createImageBitmap cuando existe: decodifica fuera del hilo principal y es bastante más rápido en móviles. */
async function reducir(file, max) {
  if (typeof createImageBitmap === 'function') {
    try {
      const bm = await createImageBitmap(file, { imageOrientation: 'from-image' }),
        k = Math.min(1, max / Math.max(bm.width, bm.height)),
        w = Math.max(1, Math.round(bm.width * k)),
        h = Math.max(1, Math.round(bm.height * k)),
        cv = document.createElement('canvas');
      cv.width = w;
      cv.height = h;
      cv.getContext('2d').drawImage(bm, 0, 0, w, h);
      if (bm.close) bm.close();
      const b = await new Promise((ok) => cv.toBlob(ok, 'image/jpeg', 0.8));
      if (b) return b;
    } catch (e) {
      /* formato raro (HEIC…): se intenta por el camino clásico */
    }
  }
  return new Promise((ok, ko) => {
    const u = URL.createObjectURL(file),
      im = new Image();
    im.onload = () => {
      const k = Math.min(1, max / Math.max(im.width, im.height)),
        cv = document.createElement('canvas');
      cv.width = Math.round(im.width * k);
      cv.height = Math.round(im.height * k);
      cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(u);
      cv.toBlob((b) => (b ? ok(b) : ko(new Error('img'))), 'image/jpeg', 0.8);
    };
    im.onerror = () => {
      URL.revokeObjectURL(u);
      ko(new Error('img'));
    };
    im.src = u;
  });
}
/* Hace fn(x, i) con varios a la vez (por defecto 3), en orden de resultados */
async function enParalelo(lista, fn, n) {
  const out = new Array(lista.length);
  let i = 0;
  const trabajador = async () => {
    while (i < lista.length) {
      const k = i++;
      out[k] = await fn(lista[k], k);
    }
  };
  await Promise.all(Array.from({ length: Math.min(n || 3, lista.length) }, trabajador));
  return out;
}
function pedirArchivo(accept, multiple) {
  return new Promise((ok) => {
    const i = document.createElement('input');
    i.type = 'file';
    i.accept = accept;
    i.multiple = !!multiple;
    i.hidden = true;
    i.addEventListener('change', () => {
      ok(Array.from(i.files || []));
      i.remove();
    });
    document.body.appendChild(i);
    i.click();
  });
}
const ERRS = {
  not_granted: 'Claude no tiene permiso en esta página. Actívalo en el menú del artefacto para usar la IA.',
  sampling_disabled: 'La IA no está disponible en esta cuenta.',
  rate_limited: 'Has llegado al límite de uso por ahora. Prueba en un rato.',
  session_expired: 'Vuelve a iniciar sesión en Claude.',
  image_rejected: 'No se pudo leer la imagen. Prueba con otra foto, más cerca y con buena luz.',
  refused: 'Claude no pudo responder a esa petición.',
  invalid_json: 'No pude ordenar los datos. Inténtalo de nuevo.',
  prompt_too_large: 'El archivo es demasiado grande. Prueba con menos días o una foto.',
  images_unavailable: 'Desde aquí no se pueden enviar fotos a Claude.',
};
const errIA = (e) => (e && e.msgIA) || ERRS[e && e.code] || 'No se pudo conectar con la IA. Inténtalo de nuevo.';
const sinIA = () =>
  vacio(
    'La IA no está disponible aquí',
    'Abre la app desde Claude con tu cuenta iniciada para usar el asistente, el escáner y la importación de ventas.',
    '',
  );
