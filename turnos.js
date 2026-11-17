/* ---- Turnos y avisos ----
   Horario semanal de tareas y roles (limpieza de cámaras, encargado de turno…): para cada día,
   quién lo hace por la mañana y por la tarde. A la hora indicada, el servidor manda un aviso
   al móvil de esa persona. Una semana sin horario propio repite el de la última semana guardada. */
const fISO = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
function lunesDe(f) {
  const d = new Date(f + 'T12:00:00');
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return fISO(d);
}
let tuSem = lunesDe(hoy());
const semanas = () => S.turnos.filter((t) => /^\d{4}-\d{2}-\d{2}$/.test(t.id)).sort((a, z) => z.id.localeCompare(a.id));
/* El horario que vale para una semana: el suyo o, si no tiene, el de la última anterior */
function semanaDe(lun) {
  const l = semanas(),
    propia = l.find((t) => t.id === lun);
  return propia ? { doc: propia, propia: true } : { doc: l.find((t) => t.id < lun) || null, propia: false };
}
/* Para editar una semana que repite otra, primero se copia */
function semanaEditable(lun) {
  const s = semanaDe(lun);
  if (s.propia) return s.doc;
  const d = nTurno({ id: lun, filas: s.doc ? JSON.parse(JSON.stringify(s.doc.filas)) : [] });
  S.turnos.push(d);
  return d;
}
const idFila = () => 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
/* ---- Quién es quién: lo escrito en el horario contra los nombres del equipo ---- */
const nrmP = (s) => norm(String(s || '').replace(/\(.*?\)/g, ' '));
const partesP = (t) => String(t || '').split(/[,/+&]|\sy\s/i).map(nrmP).filter(Boolean);
function quienEs(parte) {
  let m = miembros.filter((x) => nrmP(x.nombre) === parte);
  if (!m.length) m = miembros.filter((x) => nrmP(x.nombre).startsWith(parte + ' ') || nrmP(x.nombre).split(' ')[0] === parte);
  return m;
}
const soyYo = (txt) => !!miId && partesP(txt).some((p) => { const m = quienEs(p); return m.length === 1 && m[0].user_id === miId; });
/* «Recibirán aviso…» de una tarea */
function destinosHTML(f) {
  const nombres = {};
  ['am', 'pm'].forEach((fr) =>
    Object.keys(f[fr]).forEach((d) =>
      String(f[fr][d])
        .replace(/\(.*?\)/g, ' ')
        .split(/[,/+&]|\sy\s/i)
        .forEach((t) => {
          const p = nrmP(t);
          if (p && !nombres[p]) nombres[p] = t.trim();
        }),
    ),
  );
  const ks = Object.keys(nombres);
  if (!ks.length) return '<span class="hint">Escribe quién hace cada turno. Si el nombre coincide con su usuario de la app, le llegará el aviso.</span>';
  if (!f.horaAm && !f.horaPm) return '<span class="hint">Pon una hora de aviso para que el móvil les recuerde la tarea.</span>';
  return ks
    .sort()
    .map((p) => {
      const m = quienEs(p),
        n = esc(m.length === 1 ? m[0].nombre : nombres[p]);
      if (!enNube()) return '<span class="pill">' + n + '</span>';
      if (m.length > 1) return '<span class="pill warn" title="Hay varias personas con ese nombre: escribe también el apellido">' + n + ' · ¿cuál?</span>';
      if (!m.length) return '<span class="pill" title="No tiene usuario en la app: no recibe avisos">' + n + ' · sin usuario</span>';
      return pushIds.has(m[0].user_id) ? '<span class="pill ok" title="Recibe los avisos en el móvil">' + n + ' ✓</span>' : '<span class="pill warn" title="Tiene usuario pero no ha activado los avisos en su móvil">' + n + ' · sin activar</span>';
    })
    .join(' ');
}
function pintaDestinos() {
  const s = semanaDe(tuSem);
  if (!s.doc) return;
  s.doc.filas.forEach((f) => {
    const el = q($('vista'), '[data-fila="' + f.id + '"] .destinos');
    if (el) el.innerHTML = destinosHTML(f);
  });
}
const fRango = (lun) => {
  const a = new Date(lun + 'T12:00:00'),
    b = new Date(masDias(lun, 6) + 'T12:00:00'),
    o = { day: 'numeric', month: 'short' };
  return a.toLocaleDateString('es-ES', o) + ' – ' + b.toLocaleDateString('es-ES', o) + ' ' + b.getFullYear();
};
/* Lo que me toca hoy */
function hoyMeTocaHTML() {
  const s = semanaDe(lunesDe(hoy())),
    d = String(new Date().getDay()),
    mio = [];
  if (s.doc)
    s.doc.filas.forEach((f) =>
      ['am', 'pm'].forEach((fr) => {
        if (f[fr][d] && soyYo(f[fr][d])) mio.push('<li><b>' + esc(f.tarea || 'Tarea') + '</b> · ' + (fr === 'am' ? 'mañana' : 'tarde') + (f.nota ? ' · ' + esc(f.nota) : '') + '</li>');
      }),
    );
  if (!mio.length) return '';
  return '<section class="card tu-hoy"><h3>Hoy te toca</h3><ul>' + mio.join('') + '</ul></section>';
}
function filaHTML(f, k, lun) {
  const hoyD = lun === lunesDe(hoy()) ? new Date().getDay() : -1;
  return (
    '<section class="card turno" data-fila="' + esc(f.id) + '">' +
    '<div class="tu-cab"><div class="field grow"><label for="tu-t' + k + '">Tarea o rol</label><input id="tu-t' + k + '" type="text" data-tf="tarea" value="' + esc(f.tarea) + '" placeholder="Limpieza de cámaras y bodega"></div>' +
    '<div class="field corto"><label for="tu-ha' + k + '">Aviso mañana</label><input id="tu-ha' + k + '" type="time" data-tf="horaAm" value="' + esc(f.horaAm) + '"></div>' +
    '<div class="field corto"><label for="tu-hp' + k + '">Aviso tarde</label><input id="tu-hp' + k + '" type="time" data-tf="horaPm" value="' + esc(f.horaPm) + '"></div>' +
    '<button class="icon" type="button" data-act="tu-borrar" aria-label="Quitar esta tarea" style="width:34px;height:34px">×</button></div>' +
    '<div class="tabla"><table class="nivel tu-tabla"><thead><tr><th>Día</th><th>Mañana</th><th>Tarde</th></tr></thead><tbody>' +
    ORDEN_SEMANA.map(
      (d) =>
        '<tr' + (d === hoyD ? ' class="hoy"' : '') + '><th scope="row">' + DIAS_LARGOS[d].charAt(0).toUpperCase() + DIAS_LARGOS[d].slice(1) + '<small>' + new Date(masDias(lun, (d + 6) % 7) + 'T12:00:00').getDate() + '</small></th>' +
        ['am', 'pm']
          .map((fr) => '<td><input type="text" list="dl-equipo" autocomplete="off" aria-label="' + DIAS_LARGOS[d] + ' ' + (fr === 'am' ? 'mañana' : 'tarde') + '" data-td="' + fr + '" data-d="' + d + '" value="' + esc(f[fr][d] || '') + '"></td>')
          .join('') +
        '</tr>',
    ).join('') +
    '</tbody></table></div>' +
    '<div class="field wide"><label for="tu-n' + k + '">Nota para el aviso (opcional)</label><input id="tu-n' + k + '" type="text" data-tf="nota" value="' + esc(f.nota) + '" placeholder="Sube las fotos en APPCC › Limpieza"></div>' +
    '<p class="destinos">' + destinosHTML(f) + '</p></section>'
  );
}
/* Avisos personalizados: un texto que llega a su hora los días marcados */
function avisosPHTML() {
  const l = S.ajustes.avisos,
    para = (a) => (a.para === 'encargados' ? 'Encargados' : a.para === 'personas' ? a.personas || 'nadie' : 'Todo el equipo');
  return (
    '<section class="card"><h3>Avisos personalizados</h3><p class="hint">Recordatorios que llegan al móvil a su hora, por ejemplo «Revisar temperaturas de las cámaras» cada día a las 12:00.</p>' +
    (l.length
      ? '<div class="rows">' +
        l
          .map(
            (a) =>
              '<div class="row" data-av="' + esc(a.id) + '"><span class="n"><b>' + esc(a.titulo || a.texto) + '</b><span>' + esc((a.titulo ? a.texto + ' · ' : '') + ORDEN_SEMANA.filter((d) => a.dias.indexOf(d) >= 0).map((d) => DIAS_CORTOS[d]).join(' ') + ' · ' + a.hora + ' · ' + para(a)) + '</span></span>' +
              '<span class="d"><label class="check"><input type="checkbox" data-avon' + (a.activo ? ' checked' : '') + '> Activo</label><button class="icon" type="button" data-act="av-borrar" aria-label="Eliminar aviso" style="width:34px;height:34px">×</button></span></div>',
          )
          .join('') +
        '</div>'
      : '') +
    '<form id="form-avisop" class="editor m6" novalidate style="margin-top:10px">' +
    '<div class="field"><label for="avp-tit">Título</label><input id="avp-tit" type="text" maxlength="60" placeholder="Temperaturas"></div>' +
    '<div class="field wide"><label for="avp-txt">Mensaje *</label><input id="avp-txt" type="text" maxlength="200" placeholder="Apunta las temperaturas de las cámaras en APPCC"></div>' +
    '<div class="field corto"><label for="avp-h">Hora</label><input id="avp-h" type="time" value="12:00"></div>' +
    '<div class="field wide"><span class="lbl">Días</span><div class="dias">' +
    ORDEN_SEMANA.map((d) => '<label class="dia"><input type="checkbox" data-avd="' + d + '" checked><span>' + DIAS_CORTOS[d] + '</span></label>').join('') +
    '</div></div>' +
    '<div class="field"><label for="avp-para">Para</label><select id="avp-para"><option value="todos">Todo el equipo</option><option value="encargados">Encargados</option><option value="personas">Algunas personas</option></select></div>' +
    '<div class="field" id="avp-per-c" hidden><label for="avp-per">Quiénes</label><input id="avp-per" type="text" list="dl-equipo" placeholder="Marco, Laura"></div>' +
    '<button class="btn primary" type="submit">Añadir aviso</button><span class="hint full" id="avp-msg" aria-live="polite"></span></form></section>'
  );
}
function vTurnos() {
  $('dl-equipo').innerHTML = nombresEquipo().map((n) => '<option value="' + esc(n) + '"></option>').join('');
  const s = semanaDe(tuSem),
    actual = tuSem === lunesDe(hoy()),
    hay = semanas().length;
  $('vista').innerHTML =
    '<div class="bar tu-bar" data-libre><button class="btn small" type="button" data-act="tu-sem" data-n="-7" aria-label="Semana anterior">‹</button><b class="grow tu-rango">Semana del ' + esc(fRango(tuSem)) + (actual ? ' <span class="pill ok">Esta semana</span>' : '') + '</b>' +
    (actual ? '' : '<button class="btn small" type="button" data-act="tu-sem" data-n="0">Hoy</button>') +
    '<button class="btn small" type="button" data-act="tu-sem" data-n="7" aria-label="Semana siguiente">›</button></div>' +
    hoyMeTocaHTML() +
    pushHTML() +
    (!hay
      ? vacio(
          'Todavía no hay horario',
          'Crea el horario semanal de limpieza y de roles. A cada persona le llegará un aviso al móvil el día y la hora que le toque.',
          puede(2) ? '<button class="btn primary" type="button" data-act="tu-crear">Crear el horario</button>' : '',
        )
      : (!s.propia && s.doc ? '<p class="hint tu-aviso">Esta semana repite el horario de la semana del ' + esc(fRango(s.doc.id)) + '. Si cambias algo, se guarda como horario propio de esta semana.</p>' : '') +
        '<form id="form-turnos" class="col" novalidate>' + (s.doc ? s.doc.filas.map((f, k) => filaHTML(f, k, tuSem)).join('') : '') + '</form>' +
        (puede(2)
          ? '<div class="acciones"><button class="btn" type="button" data-act="tu-add">Añadir tarea o rol</button>' + (s.propia && semanas().some((t) => t.id < tuSem) ? '<button class="btn" type="button" data-act="tu-copiar">Copiar la semana anterior</button>' : '') + '</div>'
          : '')) +
    (puede(2) ? avisosPHTML() : '');
  pintaPush();
  cargarPushIds();
}
/* Plantilla inicial: el horario de limpieza de cámaras y bodega de la casa */
function plantillaTurnos() {
  const lim = { tarea: 'Limpieza cámaras y bodega', horaAm: '10:00', horaPm: '17:00', nota: 'Sube las fotos en APPCC › Limpieza.' };
  const am = { 1: 'Dahianna', 2: 'Genoveba', 3: 'Junior', 4: 'Laura', 5: 'Gilbert', 6: 'James', 0: 'Kevin (16h)' },
    pm = { 1: 'Marco', 2: 'Gilbert', 3: 'Kevin Molina', 4: 'Sandra', 5: 'Fouad', 6: 'Joel', 0: 'Kevin Molina' };
  return [
    Object.assign({ id: idFila(), am: am, pm: pm }, lim),
    { id: idFila(), tarea: 'Encargado de turno', horaAm: '09:30', horaPm: '16:30', nota: '', am: {}, pm: {} },
  ];
}
let tuT = null;
function guardaTurno(d) {
  clearTimeout(tuT);
  tuT = setTimeout(() => guardar('turnos', d, true), 400);
}
V.addEventListener('change', (e) => {
  const t = e.target;
  if (pant !== 'turnos' || !puede(2)) return;
  const fe = t.closest('[data-fila]');
  if (fe && (t.dataset.tf || t.dataset.td)) {
    const eraPropia = semanaDe(tuSem).propia,
      d = semanaEditable(tuSem),
      f = d.filas.find((x) => x.id === fe.dataset.fila);
    if (!f) return;
    if (t.dataset.tf) f[t.dataset.tf] = t.value.trim();
    else {
      const v = t.value.trim();
      if (v) f[t.dataset.td][t.dataset.d] = v;
      else delete f[t.dataset.td][t.dataset.d];
    }
    guardaTurno(d);
    const el = q(fe, '.destinos');
    if (el) el.innerHTML = destinosHTML(f);
    if (!eraPropia) {
      const av = q($('vista'), '.tu-aviso');
      if (av) av.remove();
      toast('Guardado como horario propio de esta semana.');
    }
    return;
  }
  const r = t.closest('[data-av]');
  if (r && t.hasAttribute('data-avon')) {
    const a = S.ajustes.avisos.find((x) => x.id === r.dataset.av);
    if (a) {
      a.activo = t.checked;
      guardar('ajustes', S.ajustes, true);
    }
  }
  if (t.id === 'avp-para') $('avp-per-c').hidden = t.value !== 'personas';
});
V.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act^="tu-"],[data-act="av-borrar"]');
  if (!b || pant !== 'turnos') return;
  const a = b.dataset.act;
  if (a === 'tu-sem') {
    const n = +b.dataset.n;
    tuSem = n ? masDias(tuSem, n) : lunesDe(hoy());
    vTurnos();
    return;
  }
  if (!puede(2)) return toast('Solo el encargado puede cambiar el horario.');
  if (a === 'tu-crear') {
    const d = nTurno({ id: tuSem, filas: plantillaTurnos() });
    S.turnos.push(d);
    guardar('turnos', d, true);
    vTurnos();
    toast('Horario creado. Revisa los nombres y las horas de aviso.');
  } else if (a === 'tu-add') {
    const d = semanaEditable(tuSem);
    d.filas.push({ id: idFila(), tarea: '', nota: '', horaAm: '10:00', horaPm: '17:00', am: {}, pm: {} });
    guardar('turnos', d, true);
    vTurnos();
    const l = $('vista').querySelectorAll('[data-tf="tarea"]');
    if (l.length) l[l.length - 1].focus();
  } else if (a === 'tu-borrar') {
    const id = b.closest('[data-fila]').dataset.fila;
    if (!confirmar(b, '¿Quitar esta tarea?')) return;
    const d = semanaEditable(tuSem);
    d.filas = d.filas.filter((x) => x.id !== id);
    guardar('turnos', d, true);
    vTurnos();
  } else if (a === 'tu-copiar') {
    const prev = semanas().find((t) => t.id < tuSem),
      d = semanaEditable(tuSem);
    if (!prev || !confirmar(b, '¿Sustituir esta semana por la del ' + fRango(prev.id) + '?')) return;
    d.filas = JSON.parse(JSON.stringify(prev.filas));
    guardar('turnos', d, true);
    vTurnos();
    toast('Copiado el horario de la semana anterior.');
  } else if (a === 'av-borrar') {
    const id = b.closest('[data-av]').dataset.av;
    if (!confirmar(b, '¿Eliminar este aviso?')) return;
    S.ajustes.avisos = S.ajustes.avisos.filter((x) => x.id !== id);
    guardar('ajustes', S.ajustes, true);
    vTurnos();
  }
});
V.addEventListener('submit', (e) => {
  if (e.target.id !== 'form-avisop') return;
  e.preventDefault();
  e.stopImmediatePropagation();
  if (!puede(2)) return;
  const txt = $('avp-txt').value.trim(),
    dias = Array.from($('vista').querySelectorAll('[data-avd]:checked')).map((x) => +x.dataset.avd),
    para = $('avp-para').value;
  if (!txt) {
    $('avp-msg').textContent = 'Escribe el mensaje del aviso.';
    $('avp-txt').focus();
    return;
  }
  if (!dias.length) {
    $('avp-msg').textContent = 'Marca al menos un día.';
    return;
  }
  if (para === 'personas' && !$('avp-per').value.trim()) {
    $('avp-msg').textContent = 'Escribe a quién va dirigido.';
    $('avp-per').focus();
    return;
  }
  S.ajustes.avisos.push(nAvisoP({ id: idFila(), titulo: $('avp-tit').value.trim(), texto: txt, hora: $('avp-h').value, dias: dias, para: para, personas: $('avp-per').value.trim() }));
  guardar('ajustes', S.ajustes, true);
  vTurnos();
  toast('Aviso añadido.');
});
