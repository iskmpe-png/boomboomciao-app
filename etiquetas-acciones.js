/* ---- Etiquetas: lo que pasa al tocar y al escribir ---- */
V.addEventListener('input', (e) => {
  if (pant !== 'etiquetas') return;
  const t = e.target;
  if (t.dataset.et) {
    et.ed = et.ed || {};
    et.ed[t.dataset.et] = t.dataset.et === 'dias' ? Math.max(0, Math.round(parse(t.value))) : t.value;
    pintarEt();
  } else if (t.id === 'et-resp') {
    et.resp = t.value;
    mem('bbc.resp', et.resp);
    pintarEt();
  } else if (t.id === 'et-cop') {
    et.copias = Math.min(50, Math.max(1, Math.round(parse(t.value)) || 1));
    pintarEt();
  }
});
V.addEventListener('change', (e) => {
  if (pant !== 'etiquetas') return;
  const t = e.target;
  if (t.id === 'et-plato') {
    et.id = t.value;
    et.ed = t.value === 'nueva' ? { nombre: '' } : {};
    vEtiquetas();
    if (t.value === 'nueva' && $('et-n')) $('et-n').focus();
  } else if (t.id === 'et-fecha' && t.value) {
    et.fecha = t.value;
    pintarEt();
  }
});
V.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act^="et-"]');
  if (!b || pant !== 'etiquetas') return;
  const a = b.dataset.act,
    d = datosEt();
  if (!d) return;
  if (a === 'et-imp') imprimirEt();
  else if (a === 'et-alg') {
    const l = d.alg.slice(),
      k = l.indexOf(b.dataset.a);
    if (k >= 0) l.splice(k, 1);
    else l.push(b.dataset.a);
    et.ed = et.ed || {};
    et.ed.alg = l;
    b.setAttribute('aria-pressed', String(k < 0));
    b.classList.toggle('on', k < 0);
    pintarEt();
  } else if (a === 'et-modo') {
    mem('bbc.impMod', b.dataset.m);
    mem('bbc.impVisto', '');
    vEtiquetas();
  } else if (a === 'et-deshacer') {
    et.ed = {};
    vEtiquetas();
  } else if (a === 'et-guardar') {
    if (!puede(1)) return;
    if (!d.nombre.trim()) {
      $('et-msg').textContent = 'Escribe el nombre de la etiqueta.';
      $('et-n').focus();
      return;
    }
    const campos = { nombre: d.nombre.trim(), dias: d.dias || 1, alergenos: d.alg, conserva: d.conserva, nota: d.nota };
    if (d.e) {
      Object.assign(d.e, nEtiqueta(Object.assign({ id: d.e.id, area: d.e.area }, campos)));
      guardar('etiquetas', d.e, true);
      toast('Etiqueta guardada.');
    } else {
      const n = nEtiqueta(Object.assign({ id: nuevoId('etiquetas'), area: areaNueva() }, campos));
      S.etiquetas.push(n);
      guardar('etiquetas', n, true);
      /* Si viene de una ficha y es encargado, los días de vida también se guardan en la ficha */
      if (d.p && puede(2) && et.ed && et.ed.dias > 0 && et.ed.dias !== d.p.caducidad && puedeArea(d.p)) {
        d.p.caducidad = et.ed.dias;
        guardar('platos', d.p);
      }
      et.id = 'e:' + n.id;
      toast('Guardada en «Etiquetas guardadas».');
    }
    et.ed = {};
    vEtiquetas();
  } else if (a === 'et-borrar') {
    if (!d.e || !confirmar(b, '¿Borrar la etiqueta?')) return;
    borrar('etiquetas', d.e.id);
    et.id = null;
    et.ed = {};
    vEtiquetas();
  }
});
V.addEventListener('submit', (e) => {
  if (e.target.id !== 'form-et') return;
  e.preventDefault();
  imprimirEt();
});
