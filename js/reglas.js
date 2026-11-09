// reglas.js — reglas del registro de NC como funciones puras (sin DOM ni almacenamiento).
// Están separadas de app.js para poder probarlas con Node (tests/reglas.test.js) y para que
// la pantalla solo se ocupe de mostrar.
const Reglas = (() => {
  const SEVS = ['Leve', 'Moderado', 'Crítico'];
  const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  // ── Fechas (siempre en hora local: new Date('aaaa-mm-dd') es UTC y corre un día) ──
  const p2 = n => String(n).padStart(2, '0');
  const isoLocal = d => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
  const hoy = () => isoLocal(new Date());
  const isoToDMY = iso => { const [y, m, d] = (iso || '').split('-'); return y && m && d ? `${d}/${m}/${y}` : ''; };
  const fmtDate = iso => { const [y, m, d] = (iso || '').split('-'); return y && m && d ? `${d}/${m}/${y.slice(2)}` : ''; };
  // dd/mm/aaaa (o dd/mm/aa) → aaaa-mm-dd; si ya viene en ISO lo deja.
  function toISO(s) {
    s = String(s || '').trim();
    if (!s) return '';
    if (s.includes('/')) {
      const p = s.split('/');
      return p.length === 3 ? `${p[2].length === 2 ? '20' + p[2] : p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}` : '';
    }
    return s;
  }
  function sumarHabiles(iso, n) {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    for (let a = 0; a < n;) { dt.setDate(dt.getDate() + 1); if (dt.getDay() !== 0 && dt.getDay() !== 6) a++; }
    return isoLocal(dt);
  }

  // ── Meses: el registro se carga todos los días y se entrega por mes ──
  // Una NC pertenece al mes de su fecha de detección. Si todavía no tiene fecha, se muestra en
  // el mes actual para que no quede escondida.
  const mesDe = (r, mesActual) => (r.fecha && /^\d{4}-\d{2}/.test(r.fecha)) ? r.fecha.slice(0, 7) : mesActual;
  const nombreMes = mes => { const [y, m] = (mes || '').split('-'); return y && m ? MESES[+m - 1] + ' ' + y : ''; };
  // Meses con NC, del más nuevo al más viejo, siempre incluyendo el actual.
  function meses(rows, mesActual) {
    const s = new Set([mesActual]);
    rows.forEach(r => s.add(mesDe(r, mesActual)));
    return [...s].sort().reverse();
  }
  const abierta = r => r.est === 'Pendiente' || r.est === 'En proceso';
  // filtro: 'aaaa-mm' (un mes) o 'abiertas' (pendientes y en proceso de cualquier mes, para el
  // seguimiento diario). Devuelve índices de rows para no perder la referencia a la fila real.
  function filtrar(rows, filtro, mesActual) {
    return rows.map((r, i) => i).filter(i => filtro === 'abiertas' ? abierta(rows[i]) : mesDe(rows[i], mesActual) === filtro);
  }

  // ── Duplicados ──
  const firma = r => ['fecha', 'lote', 'cliente', 'prod', 'tipo', 'sev', 'detec', 'desc', 'litNC', 'litTot', 'pallets']
    .map(k => (r[k] == null ? '' : '' + r[k]).trim().toLowerCase()).join('|');
  const tieneContenido = r => !!(r.lote || r.prod || r.tipo || r.desc || r.cliente);

  // ── Indicadores (sobre las NC que se le pasen; las anuladas no cuentan) ──
  const num = v => parseFloat(String(v ?? '').replace(',', '.')) || 0;
  function kpis(lista) {
    const a = lista.filter(r => r.est !== 'Anulado');
    const sNC = a.reduce((x, r) => x + num(r.litNC), 0);
    const sT = a.reduce((x, r) => x + num(r.litTot), 0);
    const freq = {};
    a.forEach(r => { if (r.tipo) freq[r.tipo] = (freq[r.tipo] || 0) + 1; });
    const top = Object.entries(freq).sort((x, y) => y[1] - x[1])[0];
    // Reprocesos: NC con litros afectados y plazo; en plazo = finalizada con cierre ≤ plazo.
    const conPlazo = a.filter(r => r.plazo && num(r.litNC) > 0);
    const enPlazo = conPlazo.filter(r => r.est === 'Finalizado' && r.cierre && toISO(r.cierre) <= toISO(r.plazo));
    return {
      activas: a.length,
      tasaLitros: sT > 0 ? sNC / sT * 100 : null,
      masFrecuente: top ? { tipo: top[0], veces: top[1], pct: top[1] / a.length * 100 } : null,
      enPlazo: conPlazo.length ? enPlazo.length / conPlazo.length * 100 : null,
      sev: { Leve: a.filter(r => r.sev === 'Leve').length, Moderado: a.filter(r => r.sev === 'Moderado').length, 'Crítico': a.filter(r => r.sev === 'Crítico').length }
    };
  }

  // ── Tipos de desvío: los define cada empresa (antes estaban fijos para envasado de agroquímicos) ──
  const EJEMPLOS = {
    'General': [
      ['Producto fuera de especificación', 'Crítico'], ['Peso / volumen fuera de rango', 'Leve'],
      ['Envase dañado', 'Moderado'], ['Cierre / tapa defectuosa', 'Crítico'], ['Rotulado / etiqueta incorrecta', 'Moderado'],
      ['Trazabilidad / codificación ilegible', 'Crítico'], ['Embalaje / paletizado incorrecto', 'Moderado'], ['Materia prima no conforme', 'Crítico']
    ],
    'Alimentos y bebidas': [
      ['Cuerpo extraño', 'Crítico'], ['Temperatura fuera de rango', 'Crítico'], ['Sellado / hermeticidad deficiente', 'Crítico'],
      ['Peso / volumen fuera de rango', 'Leve'], ['Rotulado / alérgenos incorrecto', 'Crítico'], ['Fecha de vencimiento ilegible', 'Moderado'],
      ['Envase dañado', 'Moderado'], ['Características sensoriales fuera de estándar', 'Moderado']
    ],
    'Agroquímicos (envasado)': [
      ['Poco film', 'Leve'], ['Falta de enfilmado final', 'Crítico'], ['Bidones abollados', 'Crítico'], ['Inducción débil', 'Crítico'],
      ['Bidón/es por inducción', 'Moderado'], ['Tapas incorrectas', 'Crítico'], ['Packaging incorrecto', 'Moderado'],
      ['Paletizado incorrecto', 'Moderado'], ['Palét incorrecto', 'Moderado'], ['Trazabilidad / QR', 'Crítico'],
      ['Identificación de palét', 'Moderado'], ['Peso / Volumen', 'Leve'], ['Palét chocado', 'Moderado'], ['Pérdida (bidón/es pinchados)', 'Crítico']
    ],
    'Cosmética': [
      ['Color / olor fuera de estándar', 'Moderado'], ['Viscosidad / pH fuera de rango', 'Crítico'], ['Contaminación microbiológica', 'Crítico'],
      ['Envase o válvula defectuosa', 'Moderado'], ['Rotulado incorrecto', 'Moderado'], ['Peso / volumen fuera de rango', 'Leve']
    ]
  };
  const ejemplo = nombre => (EJEMPLOS[nombre] || []).map(([label, sev]) => ({ label, sev }));
  // Limpia una lista guardada: sin vacíos, sin repetidos (sin importar mayúsculas), severidad válida.
  function normalizarTipos(lista) {
    const vistos = new Set();
    return (Array.isArray(lista) ? lista : []).map(t => ({ label: String((t && t.label) || '').trim(), sev: SEVS.includes(t && t.sev) ? t.sev : '' }))
      .filter(t => t.label && !vistos.has(t.label.toLowerCase()) && vistos.add(t.label.toLowerCase()));
  }
  // Primera vez: si ya hay NC cargadas con los tipos de agroquímicos (versiones anteriores de la
  // app), se arranca con esa lista para no cambiarle nada a quien ya la usaba.
  function tiposIniciales(rows) {
    const agro = new Set(EJEMPLOS['Agroquímicos (envasado)'].map(t => t[0]));
    return ejemplo(rows.some(r => agro.has(r.tipo)) ? 'Agroquímicos (envasado)' : 'General');
  }
  const sevSugerida = (tipos, tipo) => { const t = tipos.find(x => x.label === tipo); return t ? t.sev : ''; };

  // ── Desvíos copiados desde QualityOS (botón "Copiar para el registro de NC" del lote) ──
  // Cada línea, separada por tabulaciones:
  //   fecha (dd/mm/aaaa) · lote · cliente · producto · etapa · unidad · control + detalle · Reprocesado|Abierto · obs
  // El mismo control que falla en varias unidades de un lote es UNA no conformidad (criterio del
  // registro: una NC por lote · evento · tipo de desvío), así que se agrupan y se listan las unidades.
  const DETEC = { 'control en línea': 'CONTROL LÍNEA', 'control en linea': 'CONTROL LÍNEA', 'control final': 'CONTROL FINAL' };
  // "Peso por pico fuera de rango (9.5 / 9.6 kg)" → "Peso por pico"; "QR NOK" → "QR".
  const nombreControl = s => s.replace(/\s+fuera de rango\s*\(.*\)\s*$/i, '').replace(/\s+NOK\s*$/i, '').trim();

  function leerDesviosQualityOS(texto, tipos, plazoDias) {
    const grupos = new Map();
    let lineas = 0;
    String(texto || '').split(/\r?\n/).forEach(l => {
      const c = l.split('\t').map(x => x.trim());
      if (c.length < 8 || !/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(c[0])) return;   // no es una línea de QualityOS
      lineas++;
      const [fecha, lote, cliente, prod, etapa, unidad, desvio, estado, obs] = c;
      const control = nombreControl(desvio);
      const corregido = /^reprocesad/i.test(estado);
      const clave = [fecha, lote, etapa, control.toLowerCase(), corregido].join('|');
      if (!grupos.has(clave)) grupos.set(clave, { fecha, lote, cliente, prod, etapa, control, corregido, items: [] });
      grupos.get(clave).items.push({ unidad, desvio, obs: obs || '' });
    });
    const filas = [...grupos.values()].map(g => {
      const fecha = toISO(g.fecha);
      // Si el nombre del control coincide con un tipo configurado, se usa (y su severidad).
      const tipo = (tipos.find(t => t.label.toLowerCase() === g.control.toLowerCase()) || {}).label || '';
      const obs = [...new Set(g.items.map(x => x.obs).filter(Boolean))];
      const f = {
        fecha, lote: g.lote, cliente: g.cliente, prod: g.prod, tipo, sev: sevSugerida(tipos, tipo),
        detec: DETEC[g.etapa.toLowerCase()] || '',
        desc: `${g.etapa} · ${g.items.map(x => x.unidad + ': ' + x.desvio).join('; ')}` + (obs.length ? ` · Obs.: ${obs.join('; ')}` : ''),
        est: g.corregido ? 'Finalizado' : 'Pendiente',
        ac: g.corregido ? 'Corregido en el momento (reproceso en línea)' : '',
        cierre: g.corregido ? fecha : '', plazo: '', _plazoAuto: ''
      };
      if (!g.corregido && fecha) f.plazo = f._plazoAuto = sumarHabiles(fecha, plazoDias);
      return f;
    });
    return { lineas, filas };
  }

  // ── Unidades del registro ──
  // Antes eran fijas para envasado (litros y pallets). Cada empresa elige las suyas; si no eligió,
  // quedan las de siempre, así a quien ya la usaba no le cambia nada.
  function unidades(guardadas) {
    const u = guardadas || {};
    const limpio = (v, def) => String(v || '').trim().slice(0, 20) || def;
    return { cantidad: limpio(u.cantidad, 'L'), embalaje: limpio(u.embalaje, 'Pallets') };
  }
  // Textos que dependen de las unidades (pantalla, impresión y Excel).
  function textosUnidades(u) {
    const litros = u.cantidad === 'L';
    return {
      kpi: litros ? 'Tasa litros NC' : 'Tasa ' + u.cantidad + ' NC',
      colNC: u.cantidad + ' NC', colTot: u.cantidad + ' Tot.',
      etqNC: (litros ? 'Litros' : 'Cantidad (' + u.cantidad + ')') + ' NC',
      etqTot: (litros ? 'Litros' : 'Cantidad (' + u.cantidad + ')') + ' totales del lote',
      embalaje: u.embalaje + ' NC'
    };
  }

  return {
    SEVS, MESES, unidades, textosUnidades, EJEMPLOS, hoy, isoToDMY, fmtDate, toISO, sumarHabiles,
    mesDe, nombreMes, meses, abierta, filtrar, firma, tieneContenido, kpis,
    ejemplo, normalizarTipos, tiposIniciales, sevSugerida, nombreControl, leerDesviosQualityOS
  };
})();

// Para las pruebas con Node. En el navegador no existe "module" y se ignora.
if (typeof module !== 'undefined') module.exports = Reglas;
