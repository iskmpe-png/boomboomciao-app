/* Usuarios y restaurantes */
function abrirUsuarios() {
  menu(false);
  $('usuarios').hidden = false;
  document.body.style.overflow = 'hidden';
  pintarUsuarios();
  cargarMiembros().then(() => {
    if (!$('usuarios').hidden) pintarUsuarios();
  });
  cargarUsoIA().then(() => {
    if (!$('usuarios').hidden) pintarUsuarios();
  });
}
function cerrarUsuarios() {
  $('usuarios').hidden = true;
  $('usuarios').innerHTML = '';
  document.body.style.overflow = '';
  $('btn-menu').focus();
}
function pintarUsuarios(msg) {
  const mio = mios.find((x) => x.id === rid),
    soyD = mio.rol === 'dueno',
    tocaArea = soyD || (mio.rol === 'encargado' && (mio.area || 'todas') === 'todas'),
    hayArea = miembros.some((m) => m.area);
  const AREAS = { todas: 'Cocina y barra', cocina: 'Solo cocina', barra: 'Solo barra' };
  const ops = (sel) =>
    Object.keys(ROLES)
      .filter((k) => soyD || k === 'cocina' || k === 'consulta')
      .map((k) => '<option value="' + k + '"' + (k === sel ? ' selected' : '') + '>' + ROLES[k] + '</option>')
      .join('');
  $('usuarios').innerHTML =
    '<div class="mx-top"><div><h2>Usuarios</h2><p class="hint">' +
    esc(mio.nombre) +
    '</p></div><button class="btn" type="button" data-us="cerrar">Cerrar</button></div>' +
    '<div class="mx-lista">' +
    (miembros.length
      ? miembros
          .map((m) => {
            const tu = m.user_id === yo.id,
              fijo = tu || (!soyD && (m.rol === 'dueno' || m.rol === 'encargado'));
            return (
              '<div class="us-it"><span class="us-n"><b>' +
              esc(m.nombre || 'Sin nombre') +
              (tu ? ' (tú)' : '') +
              '</b><small>' +
              esc(m.email) +
              '</small></span>' +
              (fijo
                ? '<span class="pill">' + ROLES[m.rol] + (m.area && m.area !== 'todas' ? ' · ' + AREAS[m.area] : '') + '</span>'
                : '<select data-us="rol" data-id="' +
                  esc(m.user_id) +
                  '" aria-label="Rol de ' +
                  esc(m.nombre) +
                  '">' +
                  ops(m.rol) +
                  '</select>' +
                  (hayArea && tocaArea
                    ? '<select data-us="area" data-id="' + esc(m.user_id) + '" aria-label="Área de ' + esc(m.nombre) + '">' +
                      Object.keys(AREAS).map((k) => '<option value="' + k + '"' + (k === (m.area || 'todas') ? ' selected' : '') + '>' + AREAS[k] + '</option>').join('') +
                      '</select>'
                    : '') +
                  '<button class="btn small danger" type="button" data-us="quitar" data-id="' +
                  esc(m.user_id) +
                  '">Quitar</button>') +
              '</div>'
            );
          })
          .join('')
      : '<p class="hint" style="padding:12px 0">Cargando…</p>') +
    '</div>' +
    '<form id="form-us" class="mx-fil" novalidate><div class="field"><label for="us-email">Correo de la persona</label><input id="us-email" type="email" inputmode="email" autocomplete="off"></div><div class="field"><label for="us-rol">Rol</label><select id="us-rol">' +
    ops('cocina') +
    '</select></div><button class="btn primary" type="submit">Dar acceso</button></form>' +
    '<p class="hint">Primero la persona crea su cuenta en la app con su correo y contraseña. Después le das acceso aquí. Cocina apunta inventario, mermas, compras, APPCC y producción; Solo consulta no cambia nada.' +
    (hayArea ? ' El área decide qué puede cambiar: un encargado de «Solo barra» no toca productos, platos ni turnos de cocina, y al revés.' : ' Para separar cocina y barra, ejecuta el script 7 en la base de datos.') +
    '</p>' +
    (esPlat
      ? '<form id="form-rest" class="mx-fil" novalidate><div class="field"><label for="us-rest">Nuevo restaurante</label><input id="us-rest" type="text" autocomplete="off" placeholder="Nombre"></div><button class="btn" type="submit">Crear restaurante</button></form>'
      : '') +
    usoIAHTML() +
    '<p class="hint" id="us-msg" role="status">' +
    esc(msg || '') +
    '</p>';
}
const usRpc = (fn, args, ok) =>
  sb
    .rpc(fn, args)
    .then((q) => {
      if (q.error) throw q.error;
      return cargarMiembros().then(() => pintarUsuarios(ok));
    })
    .catch((e) => pintarUsuarios(errTxt(e)));
$('btn-usuarios').addEventListener('click', abrirUsuarios);
$('usuarios').addEventListener('click', (e) => {
  const b = e.target.closest('[data-us]');
  if (!b || b.tagName === 'SELECT') return;
  if (b.dataset.us === 'cerrar') cerrarUsuarios();
  else if (b.dataset.us === 'quitar' && confirmar(b, '¿Quitar?'))
    usRpc('quitar_miembro', { p_rid: rid, p_user: b.dataset.id }, 'Acceso retirado.');
});
$('usuarios').addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.us === 'rol')
    usRpc('cambiar_rol', { p_rid: rid, p_user: t.dataset.id, p_rol: t.value }, 'Rol actualizado.');
  else if (t.dataset.us === 'area')
    usRpc('cambiar_area', { p_rid: rid, p_user: t.dataset.id, p_area: t.value }, 'Área actualizada.');
});
$('usuarios').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = e.target,
    m = $('us-msg');
  if (f.id === 'form-us') {
    const em = $('us-email').value.trim();
    if (!/^\S+@\S+\.\S+$/.test(em)) {
      m.textContent = 'Escribe el correo de la persona.';
      return;
    }
    m.textContent = 'Guardando…';
    usRpc('agregar_miembro', { p_rid: rid, p_email: em, p_rol: $('us-rol').value }, 'Acceso dado a ' + em + '.');
  } else if (f.id === 'form-rest') {
    const n = $('us-rest').value.trim();
    if (!n) {
      m.textContent = 'Escribe el nombre del restaurante.';
      return;
    }
    m.textContent = 'Creando…';
    sb.rpc('crear_restaurante', { p_nombre: n })
      .then((q) => {
        if (q.error) throw q.error;
        mem('bbc.rest', q.data);
        location.reload();
      })
      .catch((er) => {
        m.textContent = errTxt(er);
      });
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('usuarios').hidden) cerrarUsuarios();
});
