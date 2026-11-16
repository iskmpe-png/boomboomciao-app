/* ---- Selección múltiple: mover fichas entre Platos y Elaboraciones y cambiar varios productos a la vez ---- */
let selModo = ''; // '', 'carta' o 'precios'
const selIds = new Set();
const selCaja = (id) => '<i class="selbox" aria-hidden="true"></i>';
function selBarHTML() {
  if (selModo === 'carta')
    return (
      '<div class="bar selbar"><b id="sel-n"></b><button class="btn small" type="button" data-act="sel-todos">Marcar todos</button>' +
      (enElab()
        ? '<button class="btn primary small" type="button" data-act="sel-mover" data-a="plato">Pasar a Platos</button><button class="btn small" type="button" data-act="sel-a-prod">Pasar a Productos</button>'
        : '<div class="field corto"><label for="sel-grupo">Grupo</label><select id="sel-grupo">' + gruposCarta().map((g) => '<option>' + esc(g) + '</option>').join('') + '<option value="">Sin grupo</option></select></div>' +
          '<button class="btn primary small" type="button" data-act="sel-grupo">Poner en el grupo</button>' +
          '<button class="btn small" type="button" data-act="sel-mover" data-a="elab">Pasar a Elaboraciones</button>') +
      '<button class="btn small" type="button" data-act="sel-fin">Terminar</button></div>'
    );
  if (selModo === 'precios')
    return (
      '<div class="bar selbar"><b id="sel-n"></b><button class="btn small" type="button" data-act="sel-todos">Marcar todos</button>' +
      '<div class="field corto"><label for="sel-campo">Cambiar</label><select id="sel-campo"><option value="proveedor">Proveedor</option><option value="familia">Grupo para comparar</option></select></div>' +
      '<div class="field"><label for="sel-valor">Nuevo valor</label><input id="sel-valor" type="text" list="dl-proveedores" autocomplete="off" placeholder="Ej. Makro"></div>' +
      '<button class="btn primary small" type="button" data-act="sel-aplicar">Cambiar en todos</button>' +
      '<button class="btn small" type="button" data-act="sel-a-elab">Pasar a Elaboraciones</button>' +
      '<button class="btn small" type="button" data-act="sel-fin">Terminar</button></div>'
    );
  return '';
}
/* Fila de producto mientras se selecciona: se marca, no se edita */
const selFilaProd = (p) =>
  '<button class="row selrow" type="button" data-act="sel" data-id="' + esc(p.id) + '" aria-pressed="' + selIds.has(p.id) + '"><span class="n"><b>' + selCaja() + esc(p.nombre) + '</b><span>' + esc(metaProd(p)) +
  '</span></span><span class="d"><b>' + fEur.format(p.precio) + '</b><span class="hint">' + UDP[p.unidad].slice(1) + '</span></span></button>';
function selCuenta() {
  const n = $('sel-n');
  if (n) n.textContent = selIds.size + (selIds.size === 1 ? ' seleccionado' : ' seleccionados');
}
function selFin() {
  if (!selModo) return;
  selModo = '';
  selIds.clear();
}
/* Lo que rinde una ficha que pasa a ser elaboración: la suma de sus ingredientes, si no se había tocado */
function selRinde(p) {
  const g = p.ingredientes.reduce((t, i) => t + (un(i) === 'ud' ? 0 : i.cantidad), 0);
  return p.raciones === 1 && g > 0 ? r3(g / 1000) : p.raciones;
}
function selMover(aElab) {
  const l = S.platos.filter((p) => selIds.has(p.id) && !!p.base !== aElab);
  if (!l.length) {
    toast('Marca primero las fichas que quieres mover.');
    return;
  }
  l.forEach((p) => {
    if (aElab) {
      p.raciones = selRinde(p);
      p.unidadBase = 'kg';
      p.soloMenu = false;
    }
    p.base = aElab;
    guardar('platos', p, true);
  });
  selFin();
  sucio();
  pintar();
  toast(
    aElab
      ? (l.length === 1 ? '1 ficha pasada' : l.length + ' fichas pasadas') + ' a Elaboraciones. Revisa en cada una cuánto rinde.'
      : (l.length === 1 ? '1 ficha pasada' : l.length + ' fichas pasadas') + ' a Platos. Ponles raciones y precio de carta.',
  );
}
function selAplicar() {
  const campo = $('sel-campo').value === 'familia' ? 'familia' : 'proveedor',
    valor = $('sel-valor').value.trim(),
    l = S.productos.filter((p) => selIds.has(p.id));
  if (!l.length) {
    toast('Marca primero los productos que quieres cambiar.');
    return;
  }
  if (campo === 'proveedor' && !valor) {
    toast('Escribe el proveedor que quieres poner.');
    $('sel-valor').focus();
    return;
  }
  const filas = l.filter((p) => p[campo] !== valor);
  filas.forEach((p) => (p[campo] = valor));
  sucio();
  /* Con la base de datos propia se sube todo de una vez; si no, de uno en uno */
  if (filas.length && db && db.lote && !sinRed) {
    estado('Guardando…');
    db.lote(filas.map((p) => ['productos', p.id, limpio(p)])).then(
      () => estado('Cambios guardados'),
      () => filas.forEach((p) => guardar('productos', p, true)),
    );
  } else filas.forEach((p) => guardar('productos', p, true));
  selFin();
  pintar();
  toast((campo === 'proveedor' ? 'Proveedor' : 'Grupo para comparar') + ' cambiado en ' + l.length + (l.length === 1 ? ' producto.' : ' productos.'));
}
/* Varias fichas al mismo grupo. Se sigue en modo selección para ir repartiendo el resto */
function selGrupo() {
  const g = $('sel-grupo').value,
    l = S.platos.filter((p) => selIds.has(p.id) && !p.base);
  if (!l.length) {
    toast('Marca primero los platos que quieres poner en el grupo.');
    return;
  }
  l.forEach((p) => {
    if (p.grupo.trim() === g) return;
    p.grupo = g;
    guardar('platos', p, true);
  });
  selIds.clear();
  pintar();
  if ($('sel-grupo')) $('sel-grupo').value = g;
  toast((l.length === 1 ? '1 plato' : l.length + ' platos') + (g ? ' en «' + g + '».' : ' sin grupo.'));
}
/* Un producto comprado que en realidad se hace en casa: pasa a ser una elaboración.
   Conserva su precio como coste hasta que se le pongan los ingredientes de verdad. */
function selProdAElab() {
  const l = S.productos.filter((p) => selIds.has(p.id));
  if (!l.length) {
    toast('Marca primero los productos que son elaboraciones.');
    return;
  }
  let hechos = 0,
    saltados = 0;
  l.forEach((p) => {
    const ya = S.platos.find((x) => norm(x.nombre) === norm(p.nombre));
    if (ya && (!ya.base || ya.unidadBase !== p.unidad)) {
      saltados++;
      return;
    }
    const b =
      ya ||
      nPlato({
        id: nuevoId('platos'),
        nombre: p.nombre,
        base: true,
        unidadBase: p.unidad,
        raciones: 1,
        alergenos: p.alergenos,
        ingredientes: p.precio > 0 ? [{ nombre: 'Coste anterior (cámbialo por los ingredientes)', precio: p.precio, unidad: p.unidad, cantidad: p.unidad === 'ud' ? 1 : 1000 }] : [],
      });
    if (!ya) S.platos.push(b);
    sucio();
    S.platos.forEach((pl) => {
      let toca = pl === b && !ya;
      pl.ingredientes.forEach((i) => {
        if (i.productoId !== p.id || pl.id === b.id) return;
        i.productoId = '';
        i.baseId = b.id;
        i.nombre = b.nombre;
        i.unidad = b.unidadBase;
        i.precio = r3(costeUd(b));
        toca = true;
      });
      if (toca) guardar('platos', pl, true);
    });
    borrar('productos', p.id);
    hechos++;
  });
  selFin();
  sucio();
  pintar();
  toast(
    (hechos === 1 ? '1 producto pasado' : hechos + ' productos pasados') + ' a Elaboraciones' + (hechos ? ': ábrelos en Carta › Elaboraciones para ponerles sus ingredientes.' : '.') +
      (saltados ? ' ' + saltados + ' no se movieron porque ya hay una ficha con ese nombre.' : ''),
  );
}
/* Una elaboración que en realidad se compra hecha: pasa a ser un producto con su coste como precio */
function selElabAProd() {
  const l = S.platos.filter((b) => selIds.has(b.id) && b.base);
  if (!l.length) {
    toast('Marca primero las elaboraciones que quieres pasar a productos.');
    return;
  }
  let hechos = 0,
    saltados = 0;
  const ahora = new Date().toISOString();
  l.forEach((b) => {
    if (prodPorNombre(b.nombre)) {
      saltados++;
      return;
    }
    const p = nProd({ id: nuevoId('productos'), nombre: b.nombre, proveedor: '', precio: r3(costeUd(b)), unidad: b.unidadBase, alergenos: b.alergenos, actualizado: ahora });
    S.productos.push(p);
    S.platos.forEach((pl) => {
      let toca = false;
      pl.ingredientes.forEach((i) => {
        if (i.baseId !== b.id) return;
        i.baseId = '';
        i.productoId = p.id;
        i.nombre = p.nombre;
        i.unidad = p.unidad;
        i.precio = p.precio;
        toca = true;
      });
      if (toca && pl.id !== b.id) guardar('platos', pl, true);
    });
    guardar('productos', p, true);
    borrar('platos', b.id);
    hechos++;
  });
  selFin();
  sucio();
  pintar();
  toast(
    (hechos === 1 ? '1 elaboración pasada' : hechos + ' elaboraciones pasadas') + ' a Productos' + (hechos ? ': ya están en Precios, sin proveedor.' : '.') +
      (saltados ? ' ' + saltados + ' no se movieron porque ya hay un producto con ese nombre.' : ''),
  );
}
V.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const a = b.dataset.act;
  if (a === 'sel-grupo') selGrupo();
  else if (a === 'sel-a-elab') selProdAElab();
  else if (a === 'sel-a-prod') {
    if (!selIds.size) toast('Marca primero las elaboraciones que quieres pasar a productos.');
    else if (confirmar(b, 'Se borra su receta: pulsa otra vez')) selElabAProd();
  } else if (a === 'grupo') {
    grp = b.dataset.g;
    lim.carta = 20;
    pintar();
  } else if (a === 'sel-ini') {
    finEdicion();
    editProd = null;
    selIds.clear();
    selModo = b.dataset.m;
    pintar();
  } else if (a === 'sel-fin') {
    selFin();
    pintar();
  } else if (a === 'sel') {
    const id = b.dataset.id;
    if (selIds.has(id)) selIds.delete(id);
    else selIds.add(id);
    b.setAttribute('aria-pressed', selIds.has(id));
    selCuenta();
  } else if (a === 'sel-todos') {
    const l = selModo === 'carta' ? filtradosCarta() : filtradosProd('precios'),
      todos = l.length && l.every((p) => selIds.has(p.id));
    l.forEach((p) => (todos ? selIds.delete(p.id) : selIds.add(p.id)));
    pintar();
  } else if (a === 'sel-mover') selMover(b.dataset.a === 'elab');
  else if (a === 'sel-aplicar') selAplicar();
});
V.addEventListener('change', (e) => {
  if (e.target.id !== 'sel-campo') return;
  const prov = e.target.value === 'proveedor';
  $('sel-valor').setAttribute('list', prov ? 'dl-proveedores' : '');
  $('sel-valor').placeholder = prov ? 'Ej. Makro' : 'Ej. huevo (vacío = automático)';
});
/* Al cambiar de pantalla se sale de la selección */
window.addEventListener('hashchange', selFin);
