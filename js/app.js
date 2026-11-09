// app.js — registro de No Conformidades: se carga todos los días y se entrega por mes.
// Todo vive en el dispositivo: filas en IndexedDB (db.js), respaldo manual en .json (backup.js).
// Las reglas (meses, indicadores, desvíos de QualityOS) están en reglas.js; acá solo la pantalla.
// Tabla en pantallas grandes, tarjetas colapsables en el celular. Imprime A4 horizontal en dos hojas.
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ════════════════════════════════════════════
// CONSTANTES
// ════════════════════════════════════════════
const SEVS = ['', ...Reglas.SEVS];
const ESTADOS = ['Pendiente', 'En proceso', 'Finalizado', 'Anulado'];
const EFICACIA = ['Pendiente', 'Eficaz', 'No eficaz'];
const DETEC = ['', 'CONTROL LÍNEA', 'CONTROL FINAL', 'CONTROL INGRESO'];
const BADGES = { Pendiente: 'b-pend', 'En proceso': 'b-proc', Finalizado: 'b-final', Anulado: 'b-cancel' };
const EF_BADGES = { Pendiente: 'b-efpend', Eficaz: 'b-efok', 'No eficaz': 'b-efno' };
const SEV_CLS = { Leve: 'sb-leve', Moderado: 'sb-mod', 'Crítico': 'sb-crit' };
const SEV_ICON = { Leve: '🟢', Moderado: '🟡', 'Crítico': '🔴' };
const { isoToDMY, fmtDate, toISO, sumarHabiles, firma, tieneContenido } = Reglas;

let rows = [];
let _cardExpanded = null;   // celular: qué tarjetas están abiertas (por índice de fila)
const esMovil = () => innerWidth <= 1100;

// Qué se ve: un mes ('aaaa-mm') o 'abiertas' (pendientes y en proceso de todos los meses).
// Siempre arranca en el mes actual: es donde se carga lo del día.
const mesActual = () => Reglas.hoy().slice(0, 7);
let filtro = mesActual();
let visibles = [];   // índices de rows que se muestran, en orden de carga
const enVista = () => visibles.map(i => rows[i]);

// ── Unidades del registro (litros y pallets salvo que la empresa elija otras) ──
const KEY_UNIDADES = 'nc_unidades.v1';
let unidades = Reglas.unidades((() => { try { return JSON.parse(localStorage.getItem(KEY_UNIDADES)); } catch (e) { return null; } })());
function guardarUnidades() { try { localStorage.setItem(KEY_UNIDADES, JSON.stringify(unidades)); } catch (e) { toast('⚠ No se pudieron guardar las unidades.'); } }
function pintarUnidades() {
  const t = Reglas.textosUnidades(unidades);
  $('kpi2-label').textContent = 'AQ-IND-02 · ' + t.kpi;
  $('th-cant-nc').textContent = t.colNC;
  $('th-cant-tot').textContent = t.colTot;
  $('th-embalaje').textContent = t.embalaje;
  if (document.activeElement !== $('in-u-cantidad')) $('in-u-cantidad').value = unidades.cantidad;
  if (document.activeElement !== $('in-u-embalaje')) $('in-u-embalaje').value = unidades.embalaje;
}

// ── Tipos de desvío (configurables, guardados en el dispositivo) ──
const KEY_TIPOS = 'nc_tipos.v1';
let tipos = null;   // se completa en iniciar(), cuando ya se leyeron las NC
function leerTipos() { try { const t = JSON.parse(localStorage.getItem(KEY_TIPOS)); return Array.isArray(t) ? Reglas.normalizarTipos(t) : null; } catch (e) { return null; } }
function guardarTipos() { try { localStorage.setItem(KEY_TIPOS, JSON.stringify(tipos)); } catch (e) { toast('⚠ No se pudieron guardar los tipos de desvío.'); } }

// ════════════════════════════════════════════
// PERSISTENCIA — cada fila tocada se guarda sola (con un pequeño retardo) en IndexedDB
// ════════════════════════════════════════════
function setSave(estado, texto) {
  $('saveDot').className = 'save-dot' + (estado === 'saving' ? ' saving' : estado === 'error' ? ' error' : '');
  const msg = $('saveMsg');
  if (texto) msg.textContent = texto;
  else if (estado === 'ok') msg.textContent = '✅ Guardado — ' + new Date().toLocaleTimeString('es-AR');
  else if (estado === 'saving') msg.textContent = 'Guardando...';
  else if (estado === 'error') msg.textContent = '⚠ Error al guardar. Exportá un backup como respaldo.';
}
const pendientes = new Set();
let timerGuardado = null;
function marcar(i) {
  rows[i]._m = Date.now();
  pendientes.add(rows[i].id);
  setSave('saving');
  clearTimeout(timerGuardado);
  timerGuardado = setTimeout(guardarPendientes, 500);
}
async function guardarPendientes() {
  clearTimeout(timerGuardado);
  if (!pendientes.size) return;
  const ids = new Set(pendientes); pendientes.clear();
  try { await DB.guardarVarias(rows.filter(r => ids.has(r.id))); setSave('ok'); }
  catch (e) { ids.forEach(id => pendientes.add(id)); setSave('error'); }
}
// En el celular el sistema puede cerrar la pestaña sin aviso: guardar al salir.
addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') guardarPendientes(); });
addEventListener('pagehide', guardarPendientes);

const siguienteOrden = () => rows.reduce((m, r) => Math.max(m, r._o || 0), 0) + 1;

// ════════════════════════════════════════════
// FILAS: alta, anulación, duplicados, borrado total
// ════════════════════════════════════════════
// Nueva NC con la fecha de hoy y su plazo: la carga diaria arranca con lo que ya se sabe.
function addRow() {
  const r = DB.nuevaFila(siguienteOrden());
  r.fecha = Reglas.hoy();
  r.plazo = r._plazoAuto = sumarHabiles(r.fecha, BRAND.plazoDias);
  rows.push(r);
  if (filtro !== 'abiertas') filtro = mesActual();
  if (esMovil()) { if (_cardExpanded === null) _cardExpanded = rows.map((_, k) => k === rows.length - 1); else _cardExpanded.push(true); }
  render(); marcar(rows.length - 1);
  if (esMovil()) scrollTo({ top: 0 });
}
function anular(idx) {
  const r = rows[idx];
  if (!r) return;
  if (r.est === 'Anulado') { alert('Esa NC ya está anulada.'); return; }
  if (!confirm(`¿Anular la NC N°${numero(idx)}? Queda registrada con estado "Anulado" (no se borra).\n\nPara eliminar definitivamente usá 🗑 Borrar todo (reinicio de mes).`)) return;
  r.est = 'Anulado';
  render(); marcar(idx);
}
function anularSeleccionada() {
  const idx = parseInt($('sel-del-row').value);
  if (!isNaN(idx)) anular(idx);
}
function actualizarSelectorAnular() {
  const sel = $('sel-del-row');
  const prev = parseInt(sel.value);
  sel.innerHTML = '';
  if (!visibles.length) { const o = document.createElement('option'); o.textContent = 'Sin filas'; sel.appendChild(o); return; }
  visibles.forEach(i => {
    const r = rows[i];
    const o = document.createElement('option');
    o.value = i;
    const raw = '#' + numero(i) + ' ' + (r.lote || r.prod || r.fecha || 'Fila');
    o.textContent = raw.length > 22 ? raw.slice(0, 21) + '…' : raw;
    sel.appendChild(o);
  });
  sel.value = visibles.includes(prev) ? prev : visibles[visibles.length - 1];
}

// Número de la NC dentro de su mes (en el orden en que se cargó). Es el mismo en la vista del mes,
// en "abiertas", en la impresión y en el Excel.
function numero(i) {
  const mes = Reglas.mesDe(rows[i], mesActual());
  return rows.filter((r, k) => k <= i && Reglas.mesDe(r, mesActual()) === mes).length;
}

async function quitarDuplicados() {
  const vistos = new Map(); const resultado = []; let elim = 0;
  for (const r of rows) {
    if (!tieneContenido(r)) { resultado.push(r); continue; }   // filas en blanco, intactas
    const f = firma(r);
    if (!vistos.has(f)) { vistos.set(f, resultado.length); resultado.push(r); continue; }
    const idx = vistos.get(f);
    if (resultado[idx].est === 'Anulado' && r.est !== 'Anulado') resultado[idx] = r;   // si la guardada está anulada y esta no, queda la activa
    elim++;
  }
  if (!elim) { toast('No se encontraron duplicados ✓'); return; }
  if (!confirm(`Se encontraron ${elim} NC duplicada/s.\n\nSe conserva una de cada una y se eliminan las repetidas.\n\n¿Continuar?`)) return;
  rows = resultado; _cardExpanded = null;
  await DB.reemplazarTodo(rows);
  render(); setSave('ok', elim + ' duplicada/s eliminada/s.');
  toast('🧹 ' + elim + ' duplicada/s eliminada/s');
}

async function borrarTodo() {
  // Doble confirmación: borra TODO (reinicio de mes / empezar de cero)
  // Ya no hace falta para empezar un mes nuevo: cada mes se ve por separado con el selector.
  if (!confirm('⚠ BORRAR TODO\n\nEsto elimina TODAS las NC de TODOS los meses. No hace falta para empezar un mes nuevo: elegí el mes en «Ver».\n\nAntes de seguir, descargá un backup (💾) si querés conservarlas.\n\n¿Continuar?')) return;
  if (prompt('Para confirmar, escribí la palabra BORRAR (en mayúsculas):') !== 'BORRAR') { setSave('ok', 'Borrado cancelado.'); return; }
  rows = []; _cardExpanded = null; pendientes.clear();
  await DB.borrarTodo();
  render(); setSave('ok', 'Datos borrados.');
}

// ════════════════════════════════════════════
// RENDER — reconstruye la tabla (o las tarjetas) desde rows[]
// ════════════════════════════════════════════
function render() {
  visibles = Reglas.filtrar(rows, filtro, mesActual());
  pintarMeses();
  const tb = $('tBody');
  tb.innerHTML = '';
  const movil = esMovil();
  if (movil) {
    if (_cardExpanded === null) _cardExpanded = rows.map((_, k) => k === rows.length - 1);
    else { while (_cardExpanded.length < rows.length) _cardExpanded.push(true); _cardExpanded = _cardExpanded.slice(0, rows.length); }
  }
  const orden = visibles.slice();
  if (movil) orden.reverse();   // celular: la última NC arriba

  orden.forEach(i => {
    const r = rows[i];
    const tr = document.createElement('tr');
    tr.dataset.rowIdx = i;
    if (r.est === 'Anulado') tr.classList.add('anulada');

    if (movil) {
      if (!_cardExpanded[i]) tr.classList.add('nc-collapsed');
      const hdr = document.createElement('td');
      hdr.className = 'nc-card-hdr';
      hdr.appendChild(span('nc-hdr-num', '#' + numero(i)));
      if (r.lote) hdr.appendChild(span('nc-hdr-lote', r.lote));
      if (r.prod) hdr.appendChild(span('nc-hdr-prod', r.prod));
      if (r.sev) hdr.appendChild(span('sev-badge ' + (SEV_CLS[r.sev] || ''), (SEV_ICON[r.sev] || '') + ' ' + r.sev));
      if (r.est === 'Anulado') hdr.appendChild(span('nc-hdr-anulada', 'ANULADA'));
      else {
        const btn = document.createElement('button');
        btn.textContent = '⊘'; btn.title = 'Anular NC'; btn.setAttribute('aria-label', 'Anular NC');
        btn.setAttribute('style', 'background:none;border:none;color:#f59e0b;font-size:18px;padding:6px 10px;cursor:pointer;line-height:1;min-width:44px;min-height:44px;display:inline-flex;align-items:center;justify-content:center;');
        btn.addEventListener('click', e => { e.stopPropagation(); anular(i); });
        hdr.appendChild(btn);
      }
      hdr.appendChild(span('nc-hdr-chev', '▼'));
      hdr.addEventListener('click', () => toggleCard(i));
      tr.appendChild(hdr);
    }

    mkTd(tr, 'c0', String(numero(i)));
    mkInp(tr, 'c1', 'date', r.fecha, v => { r.fecha = v; autoPlazo(i); marcar(i); updateKPIs(); }, 'Fecha detección');
    // Si la fecha cambia de mes, la NC pasa a ese mes al terminar de editarla.
    tr.querySelector('td.c1 input').addEventListener('change', () => { if (Reglas.mesDe(r, mesActual()) !== filtro && filtro !== 'abiertas') { filtro = Reglas.mesDe(r, mesActual()); renderConScroll(); toast('La NC pasó a ' + Reglas.nombreMes(filtro)); } });
    mkInp(tr, 'c2', 'text', r.lote, v => { r.lote = v; marcar(i); }, 'N° Lote');
    mkInp(tr, 'c3', 'text', r.prod, v => { r.prod = v; marcar(i); }, 'Producto');
    mkInp(tr, 'c3b', 'text', r.cliente, v => { r.cliente = v; marcar(i); }, 'Cliente');

    const tdT = mkTdEl(tr, 'c4', 'Tipo de desvío');
    tdT.dataset.val = r.tipo || '';
    // Un tipo que ya no está en la lista (se borró o se cambió de rubro) se sigue mostrando en esa NC.
    const opcTipos = [{ v: '', l: '—' }, ...tipos.map(t => ({ v: t.label, l: t.label }))];
    if (r.tipo && !tipos.some(t => t.label === r.tipo)) opcTipos.push({ v: r.tipo, l: r.tipo });
    tdT.appendChild(mkSelect(opcTipos, r.tipo, e => {
      r.tipo = e.target.value;
      const sev = Reglas.sevSugerida(tipos, r.tipo);
      if (sev) r.sev = sev;
      marcar(i); renderConScroll();
    }));

    const tdG = mkTdEl(tr, 'c5', 'Gravedad');
    tdG.dataset.val = r.sev || '';
    tdG.appendChild(mkSelect(SEVS.map(s => ({ v: s, l: s || '—' })), r.sev, e => { r.sev = e.target.value; tdG.dataset.val = r.sev; marcar(i); renderConScroll(); }));

    const tdD = mkTdEl(tr, 'c5b', 'Detección');
    tdD.dataset.detec = r.detec || '';
    tdD.appendChild(mkSelect(DETEC.map(s => ({ v: s, l: s || '—' })), r.detec, e => { r.detec = e.target.value; tdD.dataset.detec = r.detec; marcar(i); }));

    mkInp(tr, 'c6', 'text', r.desc, v => { r.desc = v; marcar(i); }, 'Descripción');
    const tu = Reglas.textosUnidades(unidades);
    mkInp(tr, 'c7', 'number', r.litNC, v => { r.litNC = v; marcar(i); updateKPIs(); }, tu.etqNC);
    mkInp(tr, 'c8', 'number', r.litTot, v => { r.litTot = v; marcar(i); updateKPIs(); }, tu.etqTot);
    mkInp(tr, 'c9', 'text', r.ac, v => { r.ac = v; marcar(i); }, 'Acción correctiva / disposición');
    mkInp(tr, 'c10', 'date', r.plazo, v => { r.plazo = v; marcar(i); updateKPIs(); }, 'Plazo reproceso');

    const tdE = mkTdEl(tr, 'c11', 'Estado');
    tdE.appendChild(mkSelect(ESTADOS.map(s => ({ v: s, l: s })), r.est, e => { r.est = e.target.value; marcar(i); renderConScroll(); }));
    tdE.appendChild(document.createElement('span'));
    badge(tdE, r.est, BADGES, 'b-pend');

    mkInp(tr, 'c12', 'date', r.cierre, v => { r.cierre = v; marcar(i); updateKPIs(); }, 'Fecha cierre');
    mkInp(tr, 'c13', 'number', r.pallets, v => { r.pallets = v; marcar(i); }, tu.embalaje);
    mkInp(tr, 'c14', 'text', r.resp, v => { r.resp = v; marcar(i); }, 'Responsable');

    const tdF = mkTdEl(tr, 'c15', 'Verif. eficacia (ISO 10.2.2)');
    tdF.appendChild(mkSelect(EFICACIA.map(s => ({ v: s, l: s })), r.eficacia, e => { r.eficacia = e.target.value; badge(tdF, r.eficacia, EF_BADGES, 'b-efpend'); marcar(i); }));
    tdF.appendChild(document.createElement('span'));
    badge(tdF, r.eficacia, EF_BADGES, 'b-efpend');

    tb.appendChild(tr);
  });
  $('vacio').hidden = visibles.length > 0;
  $('vacio').textContent = filtro === 'abiertas' ? 'No hay NC abiertas. 🎉' : 'Todavía no hay NC en ' + Reglas.nombreMes(filtro) + '. Tocá «+ Agregar NC de hoy».';
  updateKPIs();
  actualizarSelectorAnular();
  renderPrintAcciones();
}
// Re-render sin saltar de posición (los selects que cambian badges/gravedad reconstruyen la lista).
function renderConScroll() { const y = scrollY; render(); scrollTo({ top: y }); }

function span(cls, txt) { const s = document.createElement('span'); s.className = cls; s.textContent = txt; return s; }
function toggleCard(idx) {
  if (!_cardExpanded) return;
  const abrir = !_cardExpanded[idx];
  const y = scrollY;
  _cardExpanded[idx] = abrir;
  render();
  requestAnimationFrame(() => {
    const tr = document.querySelector(`#tBody tr[data-row-idx="${idx}"]`);
    if (abrir && tr) tr.scrollIntoView({ block: 'center' }); else scrollTo({ top: y });
  });
}
function mkTdEl(tr, cls, label) { const el = document.createElement('td'); el.className = cls; if (label) el.dataset.label = label; tr.appendChild(el); return el; }
function mkTd(tr, cls, text) { const el = document.createElement('td'); el.className = cls; el.textContent = text; tr.appendChild(el); return el; }
function mkInp(tr, cls, type, val, cb, label) {
  const el = mkTdEl(tr, cls, label);
  el.dataset.val = type === 'date' ? fmtDate(val) : (val || '');
  const inp = document.createElement('input');
  inp.type = type; inp.value = val || '';
  if (type === 'number') { inp.min = 0; inp.step = 'any'; inp.inputMode = 'decimal'; }
  inp.addEventListener('input', e => { el.dataset.val = type === 'date' ? fmtDate(e.target.value) : e.target.value; cb(e.target.value); });
  el.appendChild(inp);
}
function mkSelect(opts, val, cb) {
  const s = document.createElement('select');
  opts.forEach(o => { const op = document.createElement('option'); op.value = o.v; op.textContent = o.l; if (val === o.v) op.selected = true; s.appendChild(op); });
  s.addEventListener('change', cb);
  return s;
}
function badge(td, val, mapa, porDefecto) {
  td.dataset.val = val || 'Pendiente';
  let b = td.querySelector('.badge');
  if (!b) { b = document.createElement('span'); td.appendChild(b); }
  b.className = 'badge ' + (mapa[val] || porDefecto);
  b.textContent = val || 'Pendiente';
}
// Plazo automático (días hábiles desde la detección). No pisa un plazo que se haya puesto a mano.
function autoPlazo(i) {
  const r = rows[i];
  if (!r.fecha || (r.plazo && r.plazo !== r._plazoAuto)) return;
  r.plazo = r._plazoAuto = sumarHabiles(r.fecha, BRAND.plazoDias);
  const inp = document.querySelector(`#tBody tr[data-row-idx="${i}"] td.c10 input`);
  if (inp) { inp.value = r.plazo; inp.closest('td').dataset.val = fmtDate(r.plazo); }
}

// ════════════════════════════════════════════
// KPIs
// AQ-IND-01: NC activas · AQ-IND-02: ΣL NC / ΣL totales · AQ-IND-03: desvío más frecuente
// AQ-IND-04: % de reprocesos (litNC>0 con plazo) finalizados dentro del plazo
// ════════════════════════════════════════════
function updateKPIs() {
  const k = Reglas.kpis(enVista());
  $('kpi1-label').textContent = filtro === 'abiertas' ? 'AQ-IND-01 · NC abiertas' : 'AQ-IND-01 · NC Totales del mes';
  $('kpi1').textContent = k.activas;
  if (k.tasaLitros !== null) { $('kpi2').textContent = k.tasaLitros.toFixed(1) + '%'; $('kpi2-card').className = 'kpi-card' + (k.tasaLitros > 5 ? ' warn' : ''); }
  else { $('kpi2').textContent = '—'; $('kpi2-card').className = 'kpi-card'; }
  if (k.masFrecuente) {
    const m = k.masFrecuente;
    $('kpi3').textContent = m.tipo; $('kpi3-sub').textContent = m.pct.toFixed(0) + '% (' + m.veces + ' eventos)';
    $('kpi3-card').className = 'kpi-card' + (m.pct >= 40 ? ' warn' : '');
  } else { $('kpi3').textContent = '—'; $('kpi3-sub').textContent = 'sin datos'; $('kpi3-card').className = 'kpi-card'; }
  if (k.enPlazo !== null) { $('kpi4').textContent = k.enPlazo.toFixed(0) + '%'; $('kpi4-card').className = 'kpi-card' + (k.enPlazo < 90 ? (k.enPlazo < 70 ? ' warn' : ' mid') : ''); }
  else { $('kpi4').textContent = '—'; $('kpi4-card').className = 'kpi-card'; }
  $('sev-leve').textContent = k.sev.Leve;
  $('sev-mod').textContent = k.sev.Moderado;
  $('sev-crit').textContent = k.sev['Crítico'];
}

// Selector de mes: los meses con NC (más el actual) y la vista de abiertas.
function pintarMeses() {
  const sel = $('sel-mes');
  const nAb = rows.filter(Reglas.abierta).length;
  const opc = [{ v: 'abiertas', l: `Abiertas, todos los meses (${nAb})` }, ...Reglas.meses(rows, mesActual()).map(m => ({ v: m, l: Reglas.nombreMes(m) }))];
  sel.innerHTML = opc.map(o => `<option value="${esc(o.v)}">${esc(o.l)}</option>`).join('');
  sel.value = filtro;
}

// ════════════════════════════════════════════
// ENCABEZADO / PERÍODO / IMPRESIÓN
// ════════════════════════════════════════════
// El período impreso es el mes elegido (o la fecha de hoy, si se imprimen las abiertas).
const periodo = () => filtro === 'abiertas' ? 'NC abiertas al ' + isoToDMY(Reglas.hoy()) : Reglas.nombreMes(filtro);
function htmlMarca() {
  return BRAND.logo
    ? `<img src="${esc(BRAND.logo)}" alt="${esc(BRAND.empresa)}">`
    : `<span class="print-empresa">${esc(BRAND.empresa)}</span>`;
}
function pintarEncabezados() {
  const set = (id, v) => { $(id).textContent = v; };
  set('ph-proceso', 'Proceso: ' + BRAND.proceso);
  set('ph-codigo', BRAND.codigo); set('ph-version', BRAND.version); set('ph-area', BRAND.area);
  set('ph-elaboro', BRAND.elaboro); set('ph-aprobo', BRAND.aprobo); set('periodo-val', periodo());
  set('pc-codigo', BRAND.codigo); set('pc-version', BRAND.version); set('pc-area', BRAND.area);
  set('pc-elaboro', BRAND.elaboro); set('pc-aprobo', BRAND.aprobo); set('pc-proceso', BRAND.proceso);
  $('brand').innerHTML = `<span class="q-mark" aria-hidden="true"><img src="qualityos.svg" alt=""></span><span class="brand-nombre">Registro de No Conformidades</span>`;
  // Encabezado impreso: logo si hay, si no el nombre de la empresa.
  const printMarca = $('print-marca');
  if (printMarca) printMarca.innerHTML = htmlMarca();
  // Mantener sincronizado el panel de configuración.
  if (typeof Marca !== 'undefined') {
    const emp = $('in-empresa');
    if (emp && document.activeElement !== emp) emp.value = Marca.datos.empresa || '';
    const prev = $('marca-logo-prev');
    if (prev) {
      const tieneLogo = !!(Marca.datos.logo && Marca.datos.logo.d);
      prev.hidden = !tieneLogo;
      if (tieneLogo) prev.src = Marca.datos.logo.d;
      $('marca-logo-txt').textContent = tieneLogo ? 'Cambiar logo' : 'Elegir logo';
      $('btn-logo-quitar').hidden = !tieneLogo;
    }
  }
}

// Segunda hoja de impresión: Acciones Correctivas / Disposición (solo NC no anuladas, con su N° original)
function renderPrintAcciones() {
  const el = $('print-acciones');
  const activas = visibles.map(i => ({ r: rows[i], n: numero(i) })).filter(x => x.r.est !== 'Anulado');
  const celdas = activas.map(({ r, n }) => {
    const cls = r.est === 'Finalizado' ? 'pac-final' : r.est === 'En proceso' ? 'pac-proc' : 'pac-pend';
    return `<tr>
      <td style="text-align:center;font-weight:700">${n}</td>
      <td>${esc(isoToDMY(r.fecha))}</td><td>${esc(r.lote)}</td><td>${esc(r.prod)}</td><td>${esc(r.tipo)}</td>
      <td>${esc(r.ac)}</td><td>${esc(r.resp)}</td><td>${esc(isoToDMY(r.plazo))}</td>
      <td style="text-align:center"><span class="pac-badge ${cls}">${esc(r.est || 'Pendiente')}</span></td>
      <td>${esc(isoToDMY(r.cierre))}</td></tr>`;
  }).join('') || '<tr><td colspan="10" style="text-align:center;color:#555;padding:12px">Sin NC registradas para este período</td></tr>';
  el.innerHTML = `
  <div class="pac-header">
    <div class="pac-logo">${htmlMarca()}</div>
    <div class="pac-title">
      <span class="pac-title-main">Registro de No Conformidades</span>
      <span class="pac-title-sub">Acciones Correctivas y Disposición — ${esc(BRAND.proceso)}</span>
    </div>
    <div class="pac-meta">
      <div class="pac-meta-row"><span class="pac-meta-lbl">Código</span><span class="pac-meta-val">${esc(BRAND.codigo)}</span></div>
      <div class="pac-meta-row"><span class="pac-meta-lbl">Versión</span><span class="pac-meta-val">${esc(BRAND.version)}</span></div>
      <div class="pac-meta-row"><span class="pac-meta-lbl">Período</span><span class="pac-meta-val">${esc(periodo())}</span></div>
      <div class="pac-meta-row"><span class="pac-meta-lbl">Elab.</span><span class="pac-meta-val">${esc(BRAND.elaboro)}</span></div>
    </div>
  </div>
  <table style="width:100%;border-collapse:collapse;table-layout:fixed;border:2px solid #555;">
    <thead><tr>
      <th style="width:3%">#</th><th style="width:7%">Fecha Det.</th><th style="width:9%">N° Lote</th><th style="width:10%">Producto</th>
      <th style="width:10%">Tipo de Desvío</th><th style="width:28%">Acción Correctiva / Disposición</th><th style="width:12%">Responsable</th>
      <th style="width:7%">Plazo</th><th style="width:7%">Estado</th><th style="width:7%">Fecha Cierre</th>
    </tr></thead>
    <tbody>${celdas}</tbody>
  </table>
  <div class="pac-sigs">
    <div class="pac-sig-box">Inspector de Calidad<br><br>&nbsp;</div>
    <div class="pac-sig-box">Coordinación de Calidad<br><br>&nbsp;</div>
    <div class="pac-sig-box">Revisión SGC / Gerencia<br><br>&nbsp;</div>
  </div>`;
}
function prepararImpresion() {
  pintarEncabezados();
  renderPrintAcciones();
  document.querySelectorAll('#tBody input[type="date"]').forEach(inp => { inp.closest('td').dataset.val = fmtDate(inp.value); });
}
addEventListener('beforeprint', prepararImpresion);

// ════════════════════════════════════════════
// EXCEL — las NC que se ven (el mes elegido o las abiertas), anuladas incluidas con su estado
// ════════════════════════════════════════════
const MINS_POR_PALLET = { 'Bidón/es por inducción': 5, 'Inducción débil': 20, 'Pérdida (bidón/es pinchados)': 20, 'Palét chocado': 20 };
function exportarExcel() {
  if (typeof XLSX === 'undefined') { toast('⚠ No cargó la librería de Excel.'); return; }
  const filas = visibles.map(i => ({ r: rows[i], n: numero(i) })).filter(x => x.r.lote || x.r.prod || x.r.tipo);
  if (!filas.length) { toast('⚠ No hay datos para exportar.'); return; }
  const datos = [[
    '#', 'Fecha Detección', 'N° Lote', 'Producto', 'Cliente', 'Tipo de Desvío', 'Gravedad', 'Detección',
    'Descripción NC', 'Cantidad NC (' + unidades.cantidad + ')', 'Cantidad Tot. Lote (' + unidades.cantidad + ')', 'Acción Correctiva', 'Plazo Reproceso', 'Estado',
    'Fecha Cierre', unidades.embalaje + ' NC', 'HH estimadas (min)', 'Responsable', 'Verif. Eficacia'
  ]];
  filas.forEach(({ r, n }) => {
    const pallets = parseInt(r.pallets) || 0;
    const base = MINS_POR_PALLET[r.tipo] !== undefined ? MINS_POR_PALLET[r.tipo] : 20;
    datos.push([n, isoToDMY(r.fecha), r.lote, r.prod, r.cliente, r.tipo, r.sev, r.detec, r.desc, r.litNC, r.litTot,
      r.ac, isoToDMY(r.plazo), r.est, isoToDMY(r.cierre), r.pallets, pallets > 0 ? pallets * base : '', r.resp, r.eficacia].map(v => v ?? ''));
  });
  const ws = XLSX.utils.aoa_to_sheet(datos);
  ws['!cols'] = [4, 14, 14, 24, 14, 26, 10, 16, 36, 10, 14, 32, 14, 12, 14, 10, 18, 20, 14].map(wch => ({ wch }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'REGISTRO NC');
  const nombre = `Registro_NC_${periodo().replace(/\s+/g, '_')}.xlsx`;
  XLSX.writeFile(wb, nombre);
  toast(`✅ ${filas.length} registro/s exportados → ${nombre}`);
}

// ════════════════════════════════════════════
// PEGAR DESVÍOS DE QUALITYOS (botón "Copiar para el registro de NC" del lote)
// Reemplaza al puente con REG-01, que solo andaba si las dos apps estaban en el mismo sitio.
// ════════════════════════════════════════════
let pegadas = [];   // NC nuevas listas para agregar (ya sin las repetidas)
function leerPegado() {
  const { lineas, filas } = Reglas.leerDesviosQualityOS($('in-pegar').value, tipos, BRAND.plazoDias);
  const existentes = new Set(rows.filter(tieneContenido).map(firma));
  pegadas = [];
  let repetidas = 0;
  filas.forEach(f => {
    const r = Object.assign(DB.nuevaFila(siguienteOrden() + pegadas.length), f);
    const fr = firma(r);
    if (existentes.has(fr)) { repetidas++; return; }   // ya se había pegado: no se duplica
    existentes.add(fr); pegadas.push(r);
  });
  const txt = $('in-pegar').value.trim();
  $('pegar-resumen').textContent = !txt ? '' : !lineas
    ? '⚠ No se reconocen desvíos de QualityOS en el texto pegado.'
    : `${lineas} desvío(s) → ${pegadas.length} NC nueva(s)` + (repetidas ? ` · ${repetidas} ya estaban en el registro` : '') +
      (pegadas.some(r => !r.tipo) ? ' · elegí el tipo de desvío en las que queden sin tipo' : '');
  $('btn-pegar-ok').disabled = !pegadas.length;
}
function abrirPegar() {
  const p = $('panel-pegar');
  p.hidden = !p.hidden;
  if (!p.hidden) { $('in-pegar').value = ''; leerPegado(); $('in-pegar').focus(); }
}
function agregarPegadas() {
  if (!pegadas.length) return;
  const desde = rows.length;
  rows = rows.concat(pegadas);
  // Se muestra el mes de la primera NC agregada (normalmente, el de hoy).
  if (filtro !== 'abiertas') filtro = Reglas.mesDe(pegadas[0], mesActual());
  const n = pegadas.length;
  pegadas = [];
  _cardExpanded = null;
  render(); for (let k = desde; k < rows.length; k++) marcar(k);
  $('panel-pegar').hidden = true;
  toast(`✅ ${n} NC agregada(s) desde QualityOS`);
}

// ════════════════════════════════════════════
// TIPOS DE DESVÍO — editor en ⚙️ Configuración
// ════════════════════════════════════════════
function pintarTipos() {
  const cont = $('lista-tipos');
  cont.innerHTML = '';
  tipos.forEach((t, k) => {
    const fila = document.createElement('div');
    fila.className = 'tipo-fila';
    const inp = document.createElement('input');
    inp.type = 'text'; inp.value = t.label; inp.setAttribute('aria-label', 'Tipo de desvío ' + (k + 1));
    // Al renombrar, las NC que ya tenían ese tipo lo conservan escrito como estaba.
    inp.addEventListener('change', () => { t.label = inp.value; tipos = Reglas.normalizarTipos(tipos); guardarTipos(); pintarTipos(); renderConScroll(); });
    const sel = mkSelect(SEVS.map(s => ({ v: s, l: s ? SEV_ICON[s] + ' ' + s : '— sin gravedad' })), t.sev, e => { t.sev = e.target.value; guardarTipos(); pintarLeyenda(); });
    sel.setAttribute('aria-label', 'Gravedad sugerida de ' + t.label);
    const quitar = document.createElement('button');
    quitar.type = 'button'; quitar.className = 'pcod-btn'; quitar.textContent = '✕'; quitar.setAttribute('aria-label', 'Quitar ' + t.label);
    quitar.addEventListener('click', () => { tipos.splice(k, 1); guardarTipos(); pintarTipos(); renderConScroll(); });
    fila.append(inp, sel, quitar);
    cont.appendChild(fila);
  });
  pintarLeyenda();
}
function pintarLeyenda() {
  $('legend-tipos').innerHTML = tipos.map(t => `<span>${SEV_ICON[t.sev] || '⚪'} ${esc(t.label)}</span>`).join('');
}
function agregarTipo() {
  const nombre = (prompt('Nombre del tipo de desvío:') || '').trim();
  if (!nombre) return;
  if (tipos.some(t => t.label.toLowerCase() === nombre.toLowerCase())) { toast('Ese tipo ya está en la lista'); return; }
  tipos.push({ label: nombre, sev: '' });
  guardarTipos(); pintarTipos(); renderConScroll();
}
function cargarEjemplo(e) {
  const rubro = e.target.value; e.target.value = '';
  if (!rubro || !confirm(`¿Reemplazar la lista de tipos de desvío por el ejemplo «${rubro}»?\n\nLas NC ya cargadas no cambian.`)) return;
  tipos = Reglas.ejemplo(rubro);
  guardarTipos(); pintarTipos(); renderConScroll();
}

// ════════════════════════════════════════════
// BACKUP (.json)
// ════════════════════════════════════════════
async function importarBackup(e) {
  const archivo = e.target.files[0]; if (!archivo) return;
  try {
    const nuevas = await Backup.leer(archivo, siguienteOrden());
    const porId = new Map(rows.map(r => [r.id, r]));
    nuevas.forEach(n => { porId.set(n.id, n); });   // por id: la del backup reemplaza, las que ya tenías y no están se conservan
    rows = [...porId.values()].sort((a, b) => (a._o || 0) - (b._o || 0));
    _cardExpanded = null;
    await DB.reemplazarTodo(rows);
    render(); setSave('ok', 'Backup importado — ' + nuevas.length + ' registro/s');
    toast('✅ Backup importado');
  } catch (err) { toast('⚠ No se pudo importar: ' + err.message); }
  e.target.value = '';
}

function toast(msg) {
  const t = $('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 3000);
}

// ── Tema claro/oscuro (oscuro por defecto, como el registro original) ──
const ICONO_LUNA = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';
const ICONO_SOL = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2m-7.07-14.07 1.41 1.41M18.66 18.66l1.41 1.41M2 12h2M20 12h2m-4.34-5.66 1.41-1.41M5.34 18.66l-1.41 1.41"/></svg>';
function pintarTema() { $('btn-theme').innerHTML = document.documentElement.classList.contains('light') ? ICONO_LUNA : ICONO_SOL; }
$('btn-theme').addEventListener('click', () => {
  const claro = document.documentElement.classList.toggle('light');
  try { localStorage.setItem('nc_tema', claro ? 'light' : 'dark'); } catch (e) { }
  pintarTema();
});

// ── Eventos de la barra de herramientas ──
$('btn-add').addEventListener('click', addRow);
$('btn-guardar').addEventListener('click', async () => { await guardarPendientes(); setSave('ok'); toast('💾 Datos guardados'); });
$('btn-anular').addEventListener('click', anularSeleccionada);
$('btn-print').addEventListener('click', () => { prepararImpresion(); print(); });
$('btn-excel').addEventListener('click', exportarExcel);
$('btn-backup').addEventListener('click', () => Backup.exportar(rows));
$('file-backup').addEventListener('change', importarBackup);
$('btn-dups').addEventListener('click', quitarDuplicados);
$('btn-clear').addEventListener('click', borrarTodo);
$('btn-cod').addEventListener('click', () => { const p = $('panel-codificacion'); p.style.display = p.style.display === 'block' ? 'none' : 'block'; });
$('sel-mes').addEventListener('change', e => { filtro = e.target.value; _cardExpanded = null; render(); pintarEncabezados(); });
$('btn-pegar').addEventListener('click', abrirPegar);
$('in-pegar').addEventListener('input', leerPegado);
$('btn-pegar-ok').addEventListener('click', agregarPegadas);
$('btn-pegar-cancelar').addEventListener('click', () => { $('panel-pegar').hidden = true; });
$('btn-tipo-add').addEventListener('click', agregarTipo);
['in-u-cantidad', 'in-u-embalaje'].forEach(id => $(id).addEventListener('change', () => {
  unidades = Reglas.unidades({ cantidad: $('in-u-cantidad').value, embalaje: $('in-u-embalaje').value });
  guardarUnidades(); pintarUnidades(); renderConScroll();
}));
$('sel-ejemplo').innerHTML += Object.keys(Reglas.EJEMPLOS).map(n => `<option>${esc(n)}</option>`).join('');
$('sel-ejemplo').addEventListener('change', cargarEjemplo);
// Empresa y logo: se guardan en el dispositivo y se aplican a las impresiones.
$('in-empresa').addEventListener('input', e => {
  Marca.datos.empresa = e.target.value;
  Marca.guardar(); Marca.aplicar();
  pintarEncabezados(); renderPrintAcciones();
});
$('btn-logo').addEventListener('click', () => $('in-logo').click());
$('in-logo').addEventListener('change', e => {
  const f = e.target.files[0]; e.target.value = '';
  if (!f) return;
  Marca.leerLogo(f, logo => {
    if (!logo) { toast('⚠ No se pudo leer esa imagen.'); return; }
    Marca.datos.logo = logo;
    if (Marca.guardar()) { Marca.aplicar(); pintarEncabezados(); renderPrintAcciones(); toast('🖼️ Logo guardado'); }
    else toast('⚠ No hay espacio para guardar el logo. Probá con uno más chico.');
  });
});
$('btn-logo-quitar').addEventListener('click', () => {
  Marca.datos.logo = null;
  Marca.guardar(); Marca.aplicar();
  pintarEncabezados(); renderPrintAcciones();
  toast('Logo quitado');
});
// Cambio de orientación / tamaño: pasar de tabla a tarjetas
let _modoMovil = esMovil();
addEventListener('resize', () => { if (esMovil() !== _modoMovil) { _modoMovil = esMovil(); _cardExpanded = null; render(); } });

// ── Arranque ──
async function iniciar() {
  pintarTema();
  pintarEncabezados();
  try {
    rows = (await DB.listar()).sort((a, b) => (a._o || 0) - (b._o || 0));
    setSave('ok', rows.length ? '✅ Datos restaurados — ' + rows.length + ' registro/s' : 'Registro vacío — listo para cargar las NC del día.');
  } catch (e) { rows = []; setSave('error'); }
  tipos = leerTipos();
  if (!tipos) { tipos = Reglas.tiposIniciales(rows); guardarTipos(); }
  pintarTipos();
  pintarUnidades();
  render();
  // Pedir al navegador que no borre los datos si falta espacio
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { });
}
iniciar();

if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('./sw.js?v=2'));
