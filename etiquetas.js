/* ---- Etiquetas de producción (51 × 26 mm, impresora térmica en blanco y negro) ----
   Se sacan de cualquier plato o elaboración de la carta, o de una etiqueta guardada aquí mismo
   (para lo que aún no está en la app). Todo se puede retocar antes de imprimir.
   Imprimir: desde el móvil (AirPrint en iPhone, Brother Print Service en Android) o directo con
   un toque a través del «puente de impresión» del restaurante. */
const masDias = (f, d) => {
  const x = new Date(f + 'T12:00:00');
  x.setDate(x.getDate() + d);
  return x.getFullYear() + '-' + pad(x.getMonth() + 1) + '-' + pad(x.getDate());
};
const fCorta = (s) => {
  const d = new Date(s + 'T12:00:00');
  return isNaN(d) ? '' : pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
};
const fEt = (s) => {
  const d = new Date(s + 'T12:00:00');
  return isNaN(d) ? '' : pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + String(d.getFullYear()).slice(2);
};
const CONSERVA = ['Refrigerado 0-4 °C', 'Congelado -18 °C', 'Descongelado 0-4 °C', 'Abierto 0-4 °C', 'Ambiente fresco y seco'];
const ET_W = 51,
  ET_H = 26; // milímetros del rollo
/* De dónde sale la etiqueta: un plato/elaboración de la carta o una etiqueta guardada */
function origenEt() {
  if (!et.id || et.id === 'nueva') return null;
  if (et.id.indexOf('e:') === 0) {
    const x = S.etiquetas.find((e) => e.id === et.id.slice(2));
    return x ? { tipo: 'e', x: x } : null;
  }
  const p = plato(et.id);
  return p ? { tipo: 'p', x: p } : null;
}
function datosEt() {
  const o = origenEt();
  if (!o && et.id !== 'nueva') return null;
  et.ed = et.ed || {};
  const b = !o
    ? { nombre: '', dias: 3, alg: [], conserva: CONSERVA[0], nota: '' }
    : o.tipo === 'e'
      ? { nombre: o.x.nombre, dias: o.x.dias, alg: o.x.alergenos.slice(), conserva: o.x.conserva || CONSERVA[0], nota: o.x.nota }
      : { nombre: o.x.nombre, dias: o.x.caducidad > 0 ? o.x.caducidad : 3, alg: algDe(o.x), conserva: CONSERVA[0], nota: '' };
  const d = Object.assign(b, et.ed),
    dias = Math.max(0, Math.round(Number(d.dias) || 0));
  return {
    p: o && o.tipo === 'p' ? o.x : null,
    e: o && o.tipo === 'e' ? o.x : null,
    nombre: d.nombre,
    elab: et.fecha,
    dias: dias,
    cad: masDias(et.fecha, dias),
    alg: d.alg,
    conserva: d.conserva,
    nota: d.nota,
    resp: et.resp,
    lote: 'L' + et.fecha.slice(2).replace(/-/g, ''),
    copias: Math.min(50, Math.max(1, Math.round(et.copias || 1))),
  };
}
/* La etiqueta en HTML, al tamaño exacto del rollo: solo negro sobre blanco */
function etiquetaHTML(d) {
  const n = d.nombre || 'Sin nombre',
    t = n.length > 34 ? ' l3' : n.length > 20 ? ' l2' : '',
    alg = d.alg.length ? algTxt(d.alg).toUpperCase() : 'SIN ALÉRGENOS';
  return (
    '<div class="et51"><div class="e-n' + t + '">' + esc(n) + '</div>' +
    '<div class="e-f"><span>ELAB <b>' + fEt(d.elab) + '</b></span><span class="e-cad">CAD ' + fEt(d.cad) + '</span></div>' +
    '<div class="e-a">' + (d.alg.length ? 'ALÉRGENOS: ' : '') + esc(alg) + '</div>' +
    '<div class="e-p"><span>' + esc(d.conserva) + (d.nota ? ' · ' + esc(d.nota) : '') + '</span><span>' + esc(d.lote) + (d.resp ? ' · ' + esc(d.resp.toUpperCase().slice(0, 14)) : '') + '</span></div></div>'
  );
}
function pintarEt() {
  const d = datosEt(),
    o = $('et-prev');
  if (!o) return;
  o.innerHTML = d
    ? '<div class="et-zoom">' + etiquetaHTML(d) + '</div><p class="hint">Tamaño real: ' + ET_W + ' × ' + ET_H + ' mm (aquí al doble). Caduca el ' + esc(fCorta(d.cad)) + ' (' + d.dias + (d.dias === 1 ? ' día' : ' días') + ').</p>'
    : '';
  document.querySelectorAll('[data-act="et-imp"]').forEach((b) => {
    b.textContent = d && d.copias > 1 ? 'Imprimir ' + d.copias + ' etiquetas' : 'Imprimir';
  });
}
const modoImp = () => (mem('bbc.impMod') === 'directo' ? 'directo' : 'movil');
function opcionesEt(sel) {
  const guard = ordenados(S.etiquetas.filter((e) => enArea(e)));
  return (
    '<option value="nueva"' + (sel === 'nueva' ? ' selected' : '') + '>＋ Etiqueta nueva</option>' +
    (guard.length
      ? '<optgroup label="Etiquetas guardadas">' + guard.map((e) => '<option value="e:' + esc(e.id) + '"' + ('e:' + e.id === sel ? ' selected' : '') + '>' + esc(e.nombre) + '</option>').join('') + '</optgroup>'
      : '') +
    opcionesPlatos(sel)
  );
}
function vEtiquetas() {
  if (!et.id || (et.id !== 'nueva' && !origenEt())) {
    const b = ordenados(S.platos.filter((p) => p.base))[0] || ordenados(S.platos)[0];
    et.id = b ? b.id : 'nueva';
    et.ed = {};
  }
  const d = datosEt(),
    o = origenEt(),
    puedo = puede(1),
    algSel = d.alg;
  $('vista').innerHTML =
    '<div class="bar et-bar"><div class="field"><label for="et-plato">Etiqueta de</label><select id="et-plato">' +
    opcionesEt(et.id) +
    '</select></div>' +
    '<button class="btn primary et-imp-top" type="button" data-act="et-imp">Imprimir</button>' +
    expHTML() +
    '</div>' +
    '<div class="dos et-dos"><section class="card"><form id="form-et" class="ficha" novalidate>' +
    '<div class="field wide"><label for="et-n">Nombre en la etiqueta</label><input id="et-n" data-et="nombre" type="text" maxlength="60" autocomplete="off" value="' + esc(d.nombre) + '" placeholder="Salsa de tomate"></div>' +
    '<div class="field"><label for="et-fecha">Elaborado el</label><input id="et-fecha" type="date" value="' + esc(et.fecha) + '"></div>' +
    '<div class="field"><label for="et-dias">Días de vida</label><input class="num" id="et-dias" data-et="dias" type="text" inputmode="numeric" value="' + d.dias + '"></div>' +
    '<div class="field"><label for="et-cons">Conservación</label><input id="et-cons" data-et="conserva" type="text" list="dl-conserva" maxlength="30" value="' + esc(d.conserva) + '"></div>' +
    '<div class="field"><label for="et-resp">Responsable</label><input id="et-resp" type="text" autocomplete="off" maxlength="30" value="' + esc(et.resp) + '"></div>' +
    '<div class="field"><label for="et-nota">Nota corta</label><input id="et-nota" data-et="nota" type="text" maxlength="24" value="' + esc(d.nota) + '" placeholder="Sin sal, vegano…"></div>' +
    '<div class="field"><label for="et-cop">Copias</label><input class="num" id="et-cop" type="text" inputmode="numeric" value="' + d.copias + '"></div>' +
    '<div class="full col" style="gap:6px"><span class="lbl">Alérgenos' + (o && o.tipo === 'p' ? ' (salen de la ficha; puedes cambiarlos para esta etiqueta)' : '') + '</span><div class="togs">' +
    algBtns(algSel, 'et-alg') +
    '</div></div>' +
    '<datalist id="dl-conserva">' + CONSERVA.map((c) => '<option value="' + esc(c) + '"></option>').join('') + '</datalist>' +
    '<div class="acciones full"><button class="btn primary et-big" type="button" id="et-imp" data-act="et-imp">Imprimir</button>' +
    (puedo ? '<button class="btn" type="button" data-act="et-guardar">' + (o && o.tipo === 'e' ? 'Guardar cambios' : 'Guardar como etiqueta') + '</button>' : '') +
    (o && o.tipo === 'e' && puedo ? '<button class="link" type="button" data-act="et-borrar" style="color:var(--crit)">Borrar</button>' : '') +
    (Object.keys(et.ed || {}).length && o ? '<button class="link" type="button" data-act="et-deshacer">Volver a los datos de la ficha</button>' : '') +
    '</div><p class="hint full" id="et-msg" aria-live="polite"></p></form></section>' +
    '<div class="col"><section class="card" id="et-prev"></section>' +
    impresoraHTML() +
    '</div></div>';
  pintarEt();
}
/* Cómo se imprime en este dispositivo */
function impresoraHTML() {
  const m = modoImp();
  return (
    '<details class="card et-impr"' + (mem('bbc.impVisto') ? '' : ' open') + '><summary><b>Impresora</b> <span class="hint">· ' + (m === 'directo' ? 'directo con un toque' : 'desde este móvil') + '</span></summary>' +
    '<div class="seg" role="radiogroup" aria-label="Cómo imprimir"><button type="button" data-act="et-modo" data-m="movil" aria-pressed="' + (m === 'movil') + '">Desde el móvil</button><button type="button" data-act="et-modo" data-m="directo" aria-pressed="' + (m === 'directo') + '">Directo (un toque)</button></div>' +
    (m === 'movil'
      ? '<ol class="et-pasos"><li><b>iPhone:</b> no hay que instalar nada (AirPrint). Móvil e impresora en el mismo Wi-Fi.</li><li><b>Android / tablet Samsung:</b> instala «Brother Print Service Plugin» de Google Play y actívalo en Ajustes › Conexiones › Más ajustes › Impresión.</li><li>Al tocar Imprimir, elige la <b>TD-4455DNWB</b>, tamaño <b>51 × 26 mm</b>, escala 100 % y sin márgenes. El móvil lo recuerda para la próxima vez.</li></ol>'
      : '<p class="hint">La etiqueta se manda a la cola del restaurante y la imprime el <b>puente de impresión</b> (un ordenador pequeño, un PC o un móvil Android viejo enchufado junto a la impresora). Sale en 1-2 segundos, sin menús, desde cualquier móvil, incluso fuera del Wi-Fi.</p><p class="hint" id="et-puente">Si no sale nada, comprueba que el puente está encendido.</p>' + (puede(2) && typeof rid === 'string' && rid ? '<p class="hint">Para configurar el puente, ID del restaurante: <code>' + esc(rid) + '</code></p>' : '')) +
    '</details>'
  );
}
/* Imprime desde el móvil: una hoja por etiqueta, al tamaño del rollo */
function imprimirMovil(d) {
  let z = $('zona-imp');
  if (!z) {
    z = document.createElement('div');
    z.id = 'zona-imp';
    document.body.appendChild(z);
  }
  z.innerHTML = Array.from({ length: d.copias }, () => etiquetaHTML(d)).join('');
  let st = $('et-page');
  if (!st) {
    st = document.createElement('style');
    st.id = 'et-page';
    document.head.appendChild(st);
  }
  st.textContent = '@page{size:' + ET_W + 'mm ' + ET_H + 'mm;margin:0}';
  document.body.classList.add('imp-et');
  const fin = () => {
    document.body.classList.remove('imp-et');
    if (st.isConnected) st.remove();
    z.innerHTML = '';
    window.removeEventListener('afterprint', fin);
  };
  window.addEventListener('afterprint', fin);
  setTimeout(() => {
    try {
      window.print();
    } catch (e) {
      toast('Este navegador no deja imprimir. Exporta la etiqueta en PDF desde «Exportar».');
    }
    /* Algunos móviles no avisan al terminar: se limpia al volver a la app */
    setTimeout(() => {
      const v = () => {
        if (!document.hidden) {
          fin();
          document.removeEventListener('visibilitychange', v);
        }
      };
      document.addEventListener('visibilitychange', v);
    }, 500);
  }, 60);
}
/* Imprime directo: deja el trabajo en la cola y el puente lo manda a la impresora */
async function imprimirDirecto(d) {
  if (!enNube()) return toast('El modo directo necesita la versión con usuarios (conectada a internet).');
  const datos = {
    nombre: d.nombre || 'Sin nombre',
    elab: fEt(d.elab),
    cad: fEt(d.cad),
    alergenos: d.alg.length ? algTxt(d.alg).toUpperCase() : 'SIN ALÉRGENOS',
    conserva: d.conserva,
    nota: d.nota,
    lote: d.lote,
    resp: (d.resp || '').toUpperCase().slice(0, 14),
    copias: d.copias,
  };
  const r = await sb.from('impresiones').insert({ restaurante_id: rid, datos: datos, creado_por: miId });
  if (r.error) {
    toast(/relation|does not exist|schema cache/i.test(r.error.message || '') ? 'Falta ejecutar el script 8 en la base de datos.' : errTxt(r.error));
    return;
  }
  toast('Enviada a la impresora…');
  const mira = async (intento) => {
    const q = await sb.from('impresiones').select('id,estado,error').eq('creado_por', miId).order('id', { ascending: false }).limit(1);
    const x = q.data && q.data[0];
    if (x && x.estado === 'impresa') toast('✓ Etiqueta impresa' + (datos.copias > 1 ? ' (' + datos.copias + ')' : '') + '.');
    else if (x && x.estado === 'error') toast('La impresora dio un error: ' + (x.error || 'revisa el papel y la tapa') + '.');
    else if (intento < 2) setTimeout(() => mira(intento + 1), 4000);
    else toast('La etiqueta espera en la cola: el puente de impresión no responde. ¿Está encendido?');
  };
  setTimeout(() => mira(0), 2500);
}
function imprimirEt() {
  const d = datosEt();
  if (!d) return;
  if (!d.nombre.trim()) {
    toast('Escribe el nombre de la etiqueta.');
    if ($('et-n')) $('et-n').focus();
    return;
  }
  mem('bbc.impVisto', '1');
  if (modoImp() === 'directo') imprimirDirecto(d);
  else imprimirMovil(d);
}
/* Para exportar en PNG/PDF: la misma etiqueta dibujada a 16 puntos por mm (el doble de la impresora) */
function lienzoEt(d) {
  const K = 16,
    W = ET_W * K,
    H = ET_H * K,
    cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const g = cv.getContext('2d'),
    M = 1.6 * K;
  g.fillStyle = '#fff';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#000';
  g.textBaseline = 'top';
  const F = (pt, w) => (w || 700) + ' ' + Math.round(pt * 0.3528 * K) + 'px Arial,Helvetica,sans-serif';
  const lineas = (t, w, max) => {
    const ws = String(t).split(' '),
      out = [];
    let ln = '';
    ws.forEach((x) => {
      const p = ln ? ln + ' ' + x : x;
      if (g.measureText(p).width > w && ln) {
        out.push(ln);
        ln = x;
      } else ln = p;
    });
    if (ln) out.push(ln);
    if (out.length > max) {
      out.length = max;
      out[max - 1] = out[max - 1].replace(/\s*\S*$/, '') + '…';
    }
    return out;
  };
  const n = d.nombre || 'Sin nombre',
    pt = n.length > 34 ? 7.5 : n.length > 20 ? 9 : 11;
  g.font = F(pt, 800);
  let y = 1.2 * K;
  lineas(n, W - 2 * M, 2).forEach((l) => {
    g.fillText(l, M, y);
    y += pt * 0.3528 * K * 1.08;
  });
  y += 0.6 * K;
  g.font = F(7, 400);
  g.fillText('ELAB', M, y + 0.6 * K);
  const xE = M + g.measureText('ELAB ').width;
  g.font = F(8.5, 700);
  g.fillText(fEt(d.elab), xE, y + 0.3 * K);
  const tc = 'CAD ' + fEt(d.cad);
  g.font = F(9, 800);
  const wc = g.measureText(tc).width,
    xc = W - M - wc - 1.2 * K;
  g.lineWidth = 0.5 * K;
  g.strokeRect(xc - 0.4 * K, y - 0.3 * K, wc + 2 * K, 4.4 * K);
  g.fillText(tc, xc + 0.6 * K, y + 0.2 * K);
  y += 4.9 * K;
  g.font = F(6.5, 700);
  lineas((d.alg.length ? 'ALÉRGENOS: ' + algTxt(d.alg).toUpperCase() : 'SIN ALÉRGENOS'), W - 2 * M, 2).forEach((l) => {
    g.fillText(l, M, y);
    y += 2.5 * K;
  });
  g.font = F(6, 400);
  const pie1 = d.conserva + (d.nota ? ' · ' + d.nota : ''),
    pie2 = d.lote + (d.resp ? ' · ' + d.resp.toUpperCase().slice(0, 14) : '');
  g.fillText(pie1, M, H - 3.4 * K);
  g.fillText(pie2, W - M - g.measureText(pie2).width, H - 3.4 * K);
  return cv;
}
