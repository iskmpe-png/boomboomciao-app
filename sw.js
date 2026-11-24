/* Boom Boom Ciao: guarda la app en el dispositivo para que abra sin conexión.
   Sube el número de versión cada vez que publiques cambios. */
const CACHE = 'bbc-v30-1';
const BASE = [
  "./",
  "index.html",
  "config.js",
  "manifest.webmanifest",
  "vendor/supabase.js",
  "img/logo-oro.png",
  "img/icon-192.png",
  "img/icon-512.png",
  "css/inicio.css",
  "css/fuentes.css",
  "css/fuentes/plus-jakarta-sans-latin-400-normal.woff2",
  "css/fuentes/plus-jakarta-sans-latin-500-normal.woff2",
  "css/fuentes/plus-jakarta-sans-latin-600-normal.woff2",
  "css/fuentes/plus-jakarta-sans-latin-700-normal.woff2",
  "css/fuentes/plus-jakarta-sans-latin-800-normal.woff2",
  "css/fuentes/bricolage-grotesque-latin-700-normal.woff2",
  "css/fuentes/bricolage-grotesque-latin-800-normal.woff2",
  "css/base.css",
  "css/componentes.css",
  "css/pantallas.css",
  "css/novedades.css",
  "css/retoques-movil.css",
  "css/zz-estilo.css",
  "css/zzz-pomodoro.css",
  "js/nucleo/base.js",
  "js/nucleo/modelo.js",
  "js/nucleo/indices.js",
  "js/nucleo/guardado.js",
  "js/nucleo/calculo.js",
  "js/nucleo/formatos.js",
  "js/nucleo/pintado.js",
  "js/pantallas/carta.js",
  "js/pantallas/ficha.js",
  "js/pantallas/precios.js",
  "js/pantallas/recetas.js",
  "js/utilidades/dictado.js",
  "js/pantallas/inventario.js",
  "js/pantallas/mermas.js",
  "js/nucleo/alergenos-y-utilidades.js",
  "js/pantallas/alertas.js",
  "js/pantallas/comparar.js",
  "js/pantallas/panel.js",
  "js/pantallas/sala.js",
  "js/pantallas/ingenieria.js",
  "js/pantallas/eventos.js",
  "js/pantallas/modo-cocina.js",
  "js/pantallas/produccion.js",
  "js/pantallas/etiquetas.js",
  "js/pantallas/appcc.js",
  "js/pantallas/compras.js",
  "js/pantallas/ficha-extra.js",
  "js/exportar/informes-extra.js",
  "js/exportar/detalle.js",
  "js/eventos/eventos-ampliacion.js",
  "js/nucleo/permisos.js",
  "js/nucleo/nombres.js",
  "js/nucleo/precio-historial.js",
  "js/utilidades/imagenes.js",
  "js/utilidades/documentos.js",
  "js/ia/asistente.js",
  "js/ia/chat-flotante.js",
  "js/ia/escaner.js",
  "js/ia/ventas.js",
  "js/eventos/eventos-ia.js",
  "js/exportar/informes.js",
  "js/exportar/lienzo.js",
  "js/exportar/pdf.js",
  "js/exportar/excel.js",
  "js/exportar/varios.js",
  "js/eventos/eventos-principales.js",
  "js/nucleo/tema.js",
  "js/nucleo/navegacion.js",
  "js/nucleo/interfaz.js",
  "js/nucleo/recibir.js",
  "js/datos/copia.js",
  "js/datos/deshacer.js",
  "js/pantallas/proveedores.js",
  "js/pantallas/pedidos.js",
  "js/pantallas/historial.js",
  "js/nube/legal-y-copias.js",
  "js/nube/legal.js",
  "js/pantallas/grupo.js",
  "js/ia/tarifas.js",
  "js/ia/escandallos.js",
  "js/pantallas/unidades.js",
  "js/pantallas/seleccion.js",
  "js/pantallas/grupos-carta.js",
  "js/pantallas/fotos.js",
  "js/pantallas/menus-carta.js",
  "js/pantallas/zonas.js",
  "js/pantallas/recordatorios.js",
  "js/pantallas/turnos.js",
  "js/pantallas/reparto.js",
  "js/pantallas/cuadre.js",
  "js/pantallas/aprobar.js",
  "js/pantallas/consumo.js",
  "js/pantallas/enlazar.js",
  "js/pantallas/repaso-kgl.js",
  "js/pantallas/tablon.js",
  "js/pantallas/tareas.js",
  "js/pantallas/etiquetas-acciones.js",
  "js/ia/manual.js",
  "js/pantallas/primeros-pasos.js",
  "js/pantallas/buscador.js",
  "js/nube/limite-ia.js",
  "js/nube/sesion.js",
  "js/nube/almacen-local.js",
  "js/nube/archivos.js",
  "js/nube/avisos.js",
  "js/pantallas/limpieza.js",
  "js/nube/sincronizacion.js",
  "js/nube/acceso.js",
  "js/nube/mi-cuenta.js",
  "js/nube/usuarios.js",
  "js/nube/ia.js",
  "js/arranque.js"
];
self.addEventListener('install', (e) => {
  // cache: 'reload' = siempre del servidor, nunca de la caché del navegador (así no se mezclan versiones)
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASE.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== location.origin) return; // la base de datos nunca se guarda aquí
  const guarda = (res) => {
    if (res && (res.ok || res.type === 'opaque')) {
      const copia = res.clone();
      caches.open(CACHE).then((c) => c.put(r, copia));
    }
    return res;
  };
  // config.js dice a qué base de datos conectarse: siempre se pide al servidor primero, para que un
  // cambio de config llegue a todos los móviles sin esperar a una versión nueva. Sin conexión, la guardada.
  if (/\/config\.js$/.test(u.pathname)) {
    e.respondWith(
      fetch(r, { cache: 'no-store' })
        .then((res) => {
          // Se guarda con el mismo nombre que en la instalación, para que sin conexión salga la última
          if (res && res.ok) {
            const copia = res.clone();
            caches.open(CACHE).then((c) => c.put(new URL('config.js', self.registration.scope).href, copia));
          }
          return res;
        })
        .catch(() => caches.match(new URL('config.js', self.registration.scope).href).then((m) => m || Response.error()))
    );
    return;
  }
  // Lo propio de la app sale al instante de lo guardado en el móvil (abre mucho más rápido).
  // Las actualizaciones llegan con un sw.js nuevo: guarda la versión nueva entera y la app se recarga sola.
  if (u.origin === location.origin) {
    e.respondWith(
      caches.match(r, { ignoreSearch: true }).then(
        (m) =>
          m ||
          fetch(r)
            .then(guarda)
            .catch(() => (r.mode === 'navigate' ? caches.match('index.html') : Response.error()))
      )
    );
    return;
  }
});
// Avisos al móvil: llegan del servidor aunque la app esté cerrada
self.addEventListener('push', (e) => {
  let d = {};
  try {
    d = e.data ? e.data.json() : {};
  } catch (er) {
    d = { cuerpo: e.data ? e.data.text() : '' };
  }
  e.waitUntil(
    self.registration.showNotification(d.titulo || 'Boom Boom Ciao', {
      body: d.cuerpo || '',
      icon: 'img/icon-192.png',
      badge: 'img/icon-192.png',
      tag: d.clave || undefined,
      data: { url: d.url || '' },
    })
  );
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const destino = new URL('./' + ((e.notification.data && e.notification.data.url) || ''), self.registration.scope).href;
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((l) => {
      for (const c of l) {
        if (c.url.indexOf(self.registration.scope) === 0 && 'focus' in c) {
          c.navigate(destino).catch(() => {});
          return c.focus();
        }
      }
      return self.clients.openWindow(destino);
    })
  );
});
