/* ---- Control › Consumo y stock ----
   Lo junta todo: las ventas importadas de un periodo, los escandallos (con su % de merma),
   los albaranes, las mermas apuntadas y el último inventario. Para cada producto calcula:
   - lo que se gastó según lo vendido (también lo que va dentro de las elaboraciones);
   - lo que debería quedar en cocina = inventario inicial + compras − gasto − mermas;
   - el stock mínimo sugerido, según lo que se gasta al día y cada cuánto se le pide al proveedor;
   y para cada elaboración, cuánto hay que producir a la semana. */
let cnsD = '',
  cnsH = '',
  cnsBus = '',
  cnsTodo = false;
const diasEntre = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5) + 1;
/* Periodo por defecto: el último informe de ventas importado, o la semana pasada */
function periodoInicial() {
  const l = [];
  S.ventas.forEach((v) => v.importes.forEach((x) => Array.isArray(x.lineas) && l.push(x)));
  l.sort((a, z) => String(z.hasta).localeCompare(String(a.hasta)));
  if (l.length) return [l[0].desde, l[0].hasta];
  const lun = lunesDe(hoy());
  return [masDias(lun, -7), masDias(lun, -1)];
}
/* Platos vendidos en el periodo. Si un informe solo cae en parte dentro, se cuenta la parte proporcional. */
function vendidoEn(d, h) {
  const u = {},
    dias = new Set(),
    viejos = [];
  S.ventas.forEach((v) =>
    v.importes.forEach((x) => {
      if (!x.desde || !x.hasta || x.desde > h || x.hasta < d) return;
      if (!Array.isArray(x.lineas)) return viejos.push(x);
      const ini = x.desde > d ? x.desde : d,
        fin = x.hasta < h ? x.hasta : h,
        k = diasEntre(ini, fin) / diasEntre(x.desde, x.hasta);
      for (let f = ini; f <= fin; f = masDias(f, 1)) dias.add(f);
      x.lineas.forEach(([pid, n]) => (u[pid] = (u[pid] || 0) + n * k));
    }),
  );
  return { u: u, dias: dias.size, viejos: viejos };
}
/* Lo que lleva cada plato vendido, bajando por las elaboraciones. Cantidades en la unidad del producto
   (kg, L o ud) y ya con la merma de cada ingrediente (cantidad bruta). */
function explotarC(p, uds, P, B, d) {
  if ((d || 0) > 6) return;
  const rac = p.raciones > 0 ? p.raciones : 1;
  p.ingredientes.forEach((i) => {
    const q = ((un(i) === 'ud' ? bruto(i) : bruto(i) / 1000) * uds) / rac;
    if (!(q > 0)) return;
    const pr = prod(i.productoId);
    if (pr) P[pr.id] = (P[pr.id] || 0) + q;
    else {
      const b = baseDe(i);
      if (b) {
        B[b.id] = (B[b.id] || 0) + q;
        explotarC(b, q, P, B, (d || 0) + 1);
      }
    }
  });
}
function comprasEn(d, h) {
  const q = {},
    otraUd = {};
  let imp = 0;
  S.compras.forEach((c) => {
    if (c.fecha < d || c.fecha > h) return;
    imp += c.importe;
    c.lineas.forEach((l) => {
      const p = prod(l.productoId);
      if (!p) return;
      if (l.unidad === p.unidad) q[p.id] = (q[p.id] || 0) + l.cantidad;
      else otraUd[p.id] = true;
    });
  });
  return { q: q, imp: imp, otraUd: otraUd };
}
function mermasEn(d, h) {
  const q = {};
  S.mermas.forEach((m) => {
    const p = prod(m.productoId);
    if (p && m.fecha >= d && m.fecha <= h && m.unidad === p.unidad) q[p.id] = (q[p.id] || 0) + m.cantidad;
  });
  return q;
}
/* Inventario del que se parte: el último contado antes de empezar el periodo (o ese mismo día) */
const invInicio = (d) => S.inventarios.filter((v) => v.fecha <= d).sort((a, z) => z.fecha.localeCompare(a.fecha))[0] || null;
/* Inventario para comparar al final: uno contado el último día o hasta dos días después */
const invFinal = (h) => S.inventarios.filter((v) => v.fecha >= h && v.fecha <= masDias(h, 2)).sort((a, z) => a.fecha.localeCompare(z.fecha))[0] || null;
/* Días de stock que hay que cubrir: el hueco más largo entre dos pedidos al proveedor (7 si no hay calendario) */
function cobertura(p) {
  const pv = S.proveedores.find((x) => norm(x.nombre) === norm(p.proveedor));
  const ds = pv && pv.diasPedido && pv.diasPedido.length ? ORDEN_SEMANA.filter((x) => pv.diasPedido.indexOf(x) >= 0).map((x) => ORDEN_SEMANA.indexOf(x)) : null;
  if (!ds) return 7;
  let max = 0;
  ds.forEach((x, i) => {
    const sig = i + 1 < ds.length ? ds[i + 1] : ds[0] + 7;
    max = Math.max(max, sig - x);
  });
  return max || 7;
}
const SEGURIDAD = 1.2;
function calculoConsumo(d, h) {
  const v = vendidoEn(d, h),
    P = {},
    B = {};
  let platos = 0,
    sinEsc = 0;
  Object.keys(v.u).forEach((id) => {
    const pl = idx().pl.get(id);
    if (!pl) return;
    platos += v.u[id];
    if (!pl.ingredientes.length) sinEsc += v.u[id];
    explotarC(pl, v.u[id], P, B, 0);
  });
  const c = comprasEn(d, h),
    m = mermasEn(d, h),
    ini = invInicio(d),
    fin = invFinal(h),
    dias = diasEntre(d, h);
  const filas = S.productos
    .filter((p) => enArea(p))
    .map((p) => {
      const gasto = P[p.id] || 0,
        compra = c.q[p.id] || 0,
        merma = m[p.id] || 0,
        i0 = ini && ini.cantidades[p.id] != null ? Number(ini.cantidades[p.id]) || 0 : null,
        teo = i0 != null ? i0 + compra - gasto - merma : null,
        real = fin && fin.cantidades[p.id] != null ? Number(fin.cantidades[p.id]) || 0 : null,
        diario = gasto / dias,
        min = diario > 0 ? redondeo(diario * cobertura(p) * SEGURIDAD, p.unidad) : 0;
      return { p: p, gasto: gasto, compra: compra, merma: merma, ini: i0, teo: teo, real: real, min: min, semana: diario * 7, otraUd: !!c.otraUd[p.id] };
    });
  const elab = S.platos
    .filter((b) => b.base && enArea(b) && B[b.id] > 0)
    .map((b) => ({ b: b, q: B[b.id], semana: (B[b.id] / dias) * 7, lotes: ((B[b.id] / dias) * 7) / (b.raciones > 0 ? b.raciones : 1) }))
    .sort((a, z) => z.semana - a.semana);
  return {
    d: d,
    h: h,
    dias: dias,
    vendido: v,
    platos: platos,
    sinEsc: sinEsc,
    filas: filas,
    elab: elab,
    ini: ini,
    fin: fin,
    compras: c.imp,
    coste: suma(filas, (x) => x.gasto * x.p.precio),
    valorTeo: suma(filas.filter((x) => x.teo != null), (x) => Math.max(0, x.teo) * x.p.precio),
  };
}
const redondeo = (q, u) => (u === 'ud' ? Math.ceil(q) : Math.ceil(q * 10) / 10);
const qU = (n, u) => (n == null ? '—' : fNum(n, u === 'ud' ? 0 : 2) + ' ' + UDI[u]);
function vConsumo() {
  if (!cnsD) [cnsD, cnsH] = periodoInicial();
  const r = calculoConsumo(cnsD, cnsH),
    rr = rangosRapidos(),
    per = [];
  S.ventas.forEach((v) => v.importes.forEach((x) => Array.isArray(x.lineas) && per.push(x)));
  const opsPer = [...new Map(per.sort((a, z) => String(z.hasta).localeCompare(String(a.hasta))).map((x) => [x.desde + '|' + x.hasta, x])).values()].slice(0, 12);
  const sin = sinEnlazar();
  $('vista').innerHTML =
    '<div class="bar cn-bar" data-libre><div class="field corto"><label for="cn-per">Periodo</label><select id="cn-per"><option value="">Elegir…</option>' +
    opsPer.map((x) => '<option value="' + x.desde + '|' + x.hasta + '"' + (x.desde === cnsD && x.hasta === cnsH ? ' selected' : '') + '>Ventas ' + esc(fRangoF(x.desde, x.hasta)) + '</option>').join('') +
    rr.map((x) => '<option value="' + x[2] + '|' + x[3] + '">' + x[1] + '</option>').join('') +
    '</select></div><div class="field corto"><label for="cn-d">Desde</label><input id="cn-d" type="date" value="' + cnsD + '"></div><div class="field corto"><label for="cn-h">Hasta</label><input id="cn-h" type="date" value="' + cnsH + '"></div>' +
    (sAPI && puede(2) ? '<button class="btn" type="button" data-act="ventas-importar">Importar ventas</button>' : '') +
    expHTML() +
    '</div>' +
    '<div class="kpis k4"><div class="kpi"><span class="lbl">Platos vendidos</span><b>' + fNum(r.platos, 0) + '</b></div>' +
    '<div class="kpi"><span class="lbl">Coste de lo vendido</span><b>' + fEur.format(r.coste) + '</b></div>' +
    '<div class="kpi"><span class="lbl">Compras del periodo</span><b>' + fEur.format(r.compras) + '</b></div>' +
    '<div class="kpi"><span class="lbl">Debería quedar</span><b>' + (r.ini ? fEur.format(r.valorTeo) : '—') + '</b></div></div>' +
    avisosConsumo(r, sin) +
    '<section class="card"><div class="acciones" style="justify-content:space-between"><h3>Productos</h3><div class="acciones">' +
    '<input id="b-cns" type="search" aria-label="Buscar producto" placeholder="Buscar" value="' + esc(cnsBus) + '">' +
    '<label class="check"><input type="checkbox" id="cn-todo"' + (cnsTodo ? ' checked' : '') + '> Ver todos</label></div></div>' +
    '<p class="hint">Gasto según ventas = lo que llevan los platos vendidos, con la merma de cada escandallo. Debería quedar = inventario del ' + (r.ini ? esc(fFecha(r.ini.fecha)) : '—') + ' + compras − gasto − mermas.' + (r.fin ? ' Contado: inventario del ' + esc(fFecha(r.fin.fecha)) + '.' : '') + ' Mínimo sugerido = gasto diario × días hasta el próximo pedido × 1,2.</p>' +
    '<div class="tabla"><table class="nivel cns"><thead><tr><th>Producto</th><th>Inicial</th><th>Compras</th><th>Gasto ventas</th><th>Mermas</th><th>Debería quedar</th>' + (r.fin ? '<th>Contado</th><th>Diferencia</th>' : '') + '<th>Por semana</th><th>Mín. sugerido</th><th>Mín. actual</th></tr></thead><tbody id="cn-filas"></tbody></table></div>' +
    (puede(2) ? '<div class="acciones"><button class="btn" type="button" data-act="cn-minimos">Poner los mínimos sugeridos</button></div>' : '') +
    '</section>' +
    '<section class="card"><h3>Elaboraciones: producción semanal</h3>' +
    (r.elab.length
      ? '<div class="tabla"><table class="nivel"><thead><tr><th>Elaboración</th><th>Gastado en el periodo</th><th>Por semana</th><th>Lotes por semana</th></tr></thead><tbody>' +
        r.elab.map((x) => '<tr><td>' + esc(x.b.nombre) + '</td><td>' + qU(x.q, x.b.unidadBase) + '</td><td><b>' + qU(x.semana, x.b.unidadBase) + '</b></td><td>' + fNum(x.lotes, 1) + ' <span class="hint">(rinde ' + esc(rinde(x.b)) + ')</span></td></tr>').join('') +
        '</tbody></table></div>' +
        (puede(1) ? '<div class="acciones"><button class="btn" type="button" data-act="cn-plan">Llevar a Producción como plan semanal</button></div>' : '')
      : '<p class="hint">No hay elaboraciones en los platos vendidos de este periodo.</p>') +
    '</section>';
  filasConsumo(r);
}
let cnsUlt = null;
function filasConsumo(r) {
  r = r || cnsUlt;
  cnsUlt = r;
  const f = norm(cnsBus),
    l = r.filas
      .filter((x) => (cnsTodo || x.gasto > 0 || x.compra > 0 || x.merma > 0) && (!f || norm(x.p.nombre).indexOf(f) >= 0))
      .sort((a, z) => z.gasto * z.p.precio - a.gasto * a.p.precio || a.p.nombre.localeCompare(z.p.nombre, 'es'));
  const el = $('cn-filas');
  if (!el) return;
  el.innerHTML = l.length
    ? l
        .map((x) => {
          const u = x.p.unidad,
            dif = x.real != null && x.teo != null ? x.real - x.teo : null,
            bajo = x.teo != null && x.min > 0 && x.teo < x.min;
          return (
            '<tr><td><b>' + esc(x.p.nombre) + '</b>' + (x.p.general ? ' <span class="pill">Uso general</span>' : !platosDe(x.p.id).size ? ' <span class="pill crit">Sin enlazar</span>' : '') + (x.otraUd ? ' <span class="pill warn" title="Algún albarán viene en otra unidad y no se suma">otra unidad</span>' : '') + '</td>' +
            '<td>' + qU(x.ini, u) + '</td><td>' + (x.compra ? qU(x.compra, u) : '—') + '</td><td>' + (x.gasto ? qU(x.gasto, u) : '—') + '</td><td>' + (x.merma ? qU(x.merma, u) : '—') + '</td>' +
            '<td' + (x.teo != null && x.teo < 0 ? ' class="neg"' : bajo ? ' class="bajo"' : '') + '><b>' + qU(x.teo, u) + '</b></td>' +
            (r.fin ? '<td>' + qU(x.real, u) + '</td><td' + (dif != null && Math.abs(dif) > 0.0005 ? ' class="' + (dif < 0 ? 'neg' : 'pos') + '"' : '') + '>' + (dif == null ? '—' : (dif > 0 ? '+' : '') + qU(dif, u)) + '</td>' : '') +
            '<td>' + (x.semana ? qU(x.semana, u) : '—') + '</td><td><b>' + (x.min ? qU(x.min, u) : '—') + '</b></td><td>' + (x.p.minimo ? qU(x.p.minimo, u) : '—') + '</td></tr>'
          );
        })
        .join('')
    : '<tr><td colspan="11" class="hint">' + (r.platos ? 'Nada que mostrar con ese filtro.' : 'No hay ventas importadas en estas fechas.') + '</td></tr>';
}
function avisosConsumo(r, sin) {
  const l = [];
  if (!r.platos) l.push('No hay ventas importadas entre el ' + fFecha(r.d) + ' y el ' + fFecha(r.h) + '. Impórtalas en Carta › Ingeniería (o con el botón de arriba) eligiendo esas fechas.');
  else if (r.vendido.dias < r.dias) l.push('Solo hay ventas de ' + r.vendido.dias + ' de los ' + r.dias + ' días del periodo: el gasto sale más bajo de lo real.');
  if (r.vendido.viejos.length) l.push(r.vendido.viejos.length + (r.vendido.viejos.length === 1 ? ' informe antiguo no tiene' : ' informes antiguos no tienen') + ' el detalle por plato y no se cuenta.');
  if (r.sinEsc) l.push(fNum(r.sinEsc, 0) + ' platos vendidos no tienen escandallo: su gasto no se puede calcular.');
  if (!r.ini) l.push('No hay inventario contado antes del ' + fFecha(r.d) + ': «Debería quedar» necesita un inventario inicial.');
  const avisos = l.map((t) => '<p class="aviso">' + esc(t) + '</p>').join('');
  return (
    avisos +
    (sin.length
      ? '<section class="card alerta-roja"><h3>' + sin.length + ' sin enlazar a ningún plato</h3><p class="hint">Su gasto no se puede calcular con las ventas: ' + esc(sin.slice(0, 10).map((y) => y.x.nombre).join(' · ') + (sin.length > 10 ? ' …' : '')) + '</p><div class="acciones"><a class="btn small" href="#precios-productos" data-act="ver-sinenlace">Revisarlos</a></div></section>'
      : '')
  );
}
function informeConsumo() {
  const r = cnsUlt || calculoConsumo(cnsD, cnsH),
    sub = fRangoF(r.d, r.h) + ' · ' + fNum(r.platos, 0) + ' platos vendidos';
  const T3 = (n, u) => (n == null ? T('—') : N(n, u === 'ud' ? 0 : 3));
  return [
    {
      titulo: 'Consumo y stock',
      hoja: '',
      sub: sub,
      cols: [
        { t: 'Producto', w: 2.6 },
        { t: 'Ud.', w: 0.5 },
        { t: 'Inicial', w: 1, r: 1 },
        { t: 'Compras', w: 1, r: 1 },
        { t: 'Gasto ventas', w: 1.1, r: 1 },
        { t: 'Mermas', w: 1, r: 1 },
        { t: 'Debería quedar', w: 1.2, r: 1 },
        { t: 'Contado', w: 1, r: 1 },
        { t: 'Por semana', w: 1, r: 1 },
        { t: 'Mín. sugerido', w: 1.1, r: 1 },
      ],
      filas: r.filas
        .filter((x) => x.gasto > 0 || x.compra > 0 || x.merma > 0)
        .map((x) => [T(x.p.nombre), T(UDI[x.p.unidad]), T3(x.ini, x.p.unidad), N(x.compra), N(x.gasto), N(x.merma), T3(x.teo, x.p.unidad), T3(x.real, x.p.unidad), N(x.semana), N(x.min)]),
    },
    {
      titulo: 'Producción semanal',
      sub: sub,
      cols: [
        { t: 'Elaboración', w: 3 },
        { t: 'Ud.', w: 0.5 },
        { t: 'Gastado', w: 1.2, r: 1 },
        { t: 'Por semana', w: 1.2, r: 1 },
        { t: 'Lotes / semana', w: 1.2, r: 1 },
      ],
      filas: r.elab.map((x) => [T(x.b.nombre), T(UDI[x.b.unidadBase]), N(x.q), N(x.semana), N(x.lotes, 1)]),
    },
  ];
}
V.addEventListener('change', (e) => {
  if (pant !== 'consumo') return;
  const t = e.target;
  if (t.id === 'cn-per' && t.value) {
    [cnsD, cnsH] = t.value.split('|');
    vConsumo();
  } else if ((t.id === 'cn-d' || t.id === 'cn-h') && t.value) {
    const d = $('cn-d').value,
      h = $('cn-h').value;
    if (d && h && d <= h) {
      cnsD = d;
      cnsH = h;
      vConsumo();
    }
  } else if (t.id === 'cn-todo') {
    cnsTodo = t.checked;
    filasConsumo();
  }
});
V.addEventListener('input', (e) => {
  if (pant === 'consumo' && e.target.id === 'b-cns') {
    cnsBus = e.target.value;
    filasConsumo();
  }
});
V.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act="cn-minimos"],[data-act="cn-plan"]');
  if (!b || pant !== 'consumo') return;
  const r = cnsUlt;
  if (!r) return;
  if (b.dataset.act === 'cn-minimos') {
    const l = r.filas.filter((x) => x.min > 0 && puedeArea(x.p) && Math.abs(x.min - x.p.minimo) > 0.0005);
    if (!l.length) return toast('Los mínimos ya están al día.');
    if (!confirmar(b, '¿Cambiar el mínimo de ' + l.length + (l.length === 1 ? ' producto?' : ' productos?'))) return;
    enLote(() =>
      l.forEach((x) => {
        x.p.minimo = x.min;
        guardar('productos', x.p, true);
      }),
    );
    sucio();
    vConsumo();
    toast('Stock mínimo actualizado en ' + l.length + (l.length === 1 ? ' producto' : ' productos') + '. Pedidos ya avisa con estos mínimos.');
  } else {
    const v = plan(true);
    v.items = {};
    r.elab.forEach((x) => {
      if (x.semana > 0) v.items[x.b.id] = Math.ceil(x.semana * 100) / 100;
    });
    guardar('planes', v, true);
    location.hash = '#cocina-produccion';
    toast('Plan de producción semanal creado con las ventas del ' + fRangoF(r.d, r.h) + '.');
  }
});

/* Botones de otras pantallas (se enganchan aquí porque este archivo carga después de los eventos) */
V.addEventListener('click', (e) => {
  if (!e.target.closest('[data-act="ver-sinenlace"]')) return;
  estProd = 'sinenlace';
  prov = '';
  if (pant === 'precios') vPrecios();
});
V.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act="vimp-quitar"]');
  if (!b || !puede(2)) return;
  const r = b.closest('[data-vm]'),
    v = S.ventas.find((x) => x.id === r.dataset.vm);
  if (v && confirmar(b, '¿Quitar?')) quitarImportacion(v, +r.dataset.vi);
});
