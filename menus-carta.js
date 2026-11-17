/* ---- Menús dentro de la carta ----
   Un menú (por ejemplo «Menú Nochevieja 2026») sale en la carta como un plato más, con su
   precio por persona. Los platos que solo se venden dentro de él no salen sueltos: aparecen
   debajo del menú. Su food cost se calcula sobre el menú entero, así que un plato caro se
   compensa con los baratos. */
const ICO_MENU =
  '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12v18H6z"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>';
function menusHTML() {
  const l = menusCarta().filter((e) => !e.platos.length || e.platos.some((x) => { const p = plato(x.id); return p && enArea(p); }));
  if (!l.length) return '';
  return (
    '<h3 class="grupoh">Menús</h3>' +
    l
      .map((e) => {
        const c = costeMenu(e);
        return (
          '<button class="row menurow" type="button" data-act="ev-carta" data-id="' + esc(e.id) + '"><span class="mini-foto menu" aria-hidden="true">' + ICO_MENU + '</span>' +
          '<span class="n"><b>' + esc(e.nombre || 'Menú sin nombre') + '</b><span>' + e.platos.length + (e.platos.length === 1 ? ' plato' : ' platos') +
          (e.precio > 0 ? ' · ' + fEur.format(e.precio) + ' por persona' : ' · falta el precio') + '</span></span>' +
          '<span class="d"><b>' + fEur.format(c) + '</b>' + evPill(e) + '</span></button>' +
          '<div class="menu-platos">' +
          e.platos
            .map((x) => {
              const p = plato(x.id);
              return p
                ? '<button class="row subrow" type="button" data-act="abrir" data-id="' + esc(p.id) + '">' + miniFoto(p) + '<span class="n"><b>' + esc(p.nombre || 'Sin nombre') + '</b><span>' +
                    (x.n !== 1 ? fNum(x.n, 2) + ' raciones · ' : '') + 'coste ' + fEur.format(x.n * costeUd(p)) + '</span></span></button>'
                : '';
            })
            .join('') +
          '</div>'
        );
      })
      .join('')
  );
}
/* Reparto del precio del menú entre sus platos según lo que cuesta cada uno */
function nivelHTML(e) {
  const c = costeMenu(e),
    fc = fcMenu(e);
  if (!(c > 0)) return '<p class="hint">Añade platos con ingredientes para ver el reparto.</p>';
  if (!(e.precio > 0)) return '<p class="hint">Pon el precio por persona para ver cómo se reparte entre los platos.</p>';
  return (
    '<p class="hint">Si repartes los ' + fEur.format(e.precio) + ' del menú según lo que cuesta cada plato, todos quedan al <b>' + fNum(fc) + ' %</b>: los platos caros se compensan con los baratos.</p>' +
    '<div class="tabla"><table class="nivel"><thead><tr><th>Plato</th><th>Coste</th><th>Precio repartido</th><th>Suelto</th></tr></thead><tbody>' +
    e.platos
      .map((x) => {
        const p = plato(x.id);
        if (!p) return '';
        const pc = x.n * costeUd(p),
          fs = fcDe(p);
        return (
          '<tr><td>' + esc(p.nombre) + '</td><td>' + fEur.format(pc) + '</td><td>' + fEur.format((e.precio * pc) / c) + '</td><td>' +
          (fs == null ? '—' : '<span class="pill ' + (fs <= 30 ? 'ok' : fs <= 35 ? 'warn' : 'crit') + '">' + fNum(fs) + ' %</span>') + '</td></tr>'
        );
      })
      .join('') +
    '</tbody><tfoot><tr><td>Menú</td><td>' + fEur.format(c) + '</td><td>' + fEur.format(e.precio) + '</td><td>' + evPill(e) + '</td></tr></tfoot></table></div>' +
    '<p class="hint">«Suelto» es el food cost de cada plato con su precio de carta, solo como referencia.</p>'
  );
}
/* Ingredientes de un plato dentro del menú, por persona */
function ingsMenuHTML(p, n) {
  const ings = p.ingredientes.filter((i) => nom(i));
  if (!ings.length) return '';
  const rac = p.raciones > 0 ? p.raciones : 1;
  return (
    '<details class="ev-ings"><summary>Ingredientes</summary><ul class="ri">' +
    ings
      .map((i) => {
        const q = (i.cantidad * n) / rac,
          u = un(i);
        return '<li><span>' + esc(nom(i)) + ' · ' + (u !== 'ud' && q >= 1000 ? fNum(q / 1000, 2) + ' ' + UDI[u] : fNum(q) + ' ' + UD[u]) + '</span><b>' + fEur.format((coste(i) * n) / rac) + '</b></li>';
      })
      .join('') +
    '</ul></details>'
  );
}
/* Crear un menú con los platos marcados en Carta › Seleccionar */
function selMenu() {
  const l = S.platos.filter((p) => selIds.has(p.id) && !p.base);
  if (!l.length) {
    toast('Marca primero los platos del menú.');
    return;
  }
  const ev = nEvento({ id: nuevoId('eventos'), nombre: '', pax: 0, enCarta: true, platos: l.map((p) => ({ id: p.id, n: 1 })) });
  enLote(() => {
    S.eventos.push(ev);
    guardar('eventos', ev, true);
    l.forEach((p) => {
      if (p.soloMenu) return;
      p.soloMenu = true;
      guardar('platos', p, true);
    });
  });
  selFin();
  sucio();
  evId = ev.id;
  location.hash = '#carta-eventos';
  setTimeout(() => {
    if ($('ev-nombre')) $('ev-nombre').focus();
  }, 60);
  toast('Menú creado con ' + l.length + (l.length === 1 ? ' plato' : ' platos') + ': ponle nombre y precio por persona.');
}
V.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act="ev-carta"]');
  if (!b) return;
  evId = b.dataset.id;
  if (location.hash === '#carta-eventos') vEventos();
  else location.hash = '#carta-eventos';
});
V.addEventListener('change', (e) => {
  if (e.target.id !== 'ev-encarta') return;
  const ev = evento();
  if (!ev || !puede(2)) return;
  ev.enCarta = e.target.checked;
  guardar('eventos', ev, true);
  sucio();
  toast(ev.enCarta ? 'El menú sale en Carta › Platos con su precio por persona.' : 'El menú ya no sale en la carta.');
});
