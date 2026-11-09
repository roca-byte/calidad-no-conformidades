// Pruebas de las reglas (js/reglas.js). Correr con:  node --test tests/
// No necesitan navegador: reglas.js son funciones puras.
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../js/reglas.js');

test('fechas: formato local y días hábiles', () => {
  assert.equal(R.toISO('7/11/26'), '2026-11-07');
  assert.equal(R.toISO('2026-11-07'), '2026-11-07');
  assert.equal(R.isoToDMY('2026-11-07'), '07/11/2026');
  assert.equal(R.sumarHabiles('2026-11-06', 5), '2026-11-13', 'viernes + 5 hábiles salta el fin de semana');
  assert.equal(R.sumarHabiles('2026-12-31', 1), '2027-01-01', 'cruza de año sin correrse un día');
});

test('cada NC va al mes de su detección; sin fecha, al mes actual', () => {
  const rows = [{ fecha: '2026-10-30', est: 'Pendiente' }, { fecha: '2026-11-02', est: 'Finalizado' }, { fecha: '', est: 'Pendiente' }, { fecha: '2026-09-01', est: 'En proceso' }];
  assert.deepEqual(R.meses(rows, '2026-11'), ['2026-11', '2026-10', '2026-09']);
  assert.deepEqual(R.filtrar(rows, '2026-11', '2026-11'), [1, 2]);
  assert.deepEqual(R.filtrar(rows, '2026-10', '2026-11'), [0]);
  assert.deepEqual(R.filtrar(rows, 'abiertas', '2026-11'), [0, 2, 3], 'abiertas de cualquier mes para el seguimiento diario');
  assert.deepEqual(R.meses([], '2026-11'), ['2026-11'], 'el mes actual aparece aunque no haya NC');
  assert.equal(R.nombreMes('2026-11'), 'Noviembre 2026');
});

test('indicadores: las anuladas no cuentan', () => {
  const k = R.kpis([
    { tipo: 'A', sev: 'Leve', litNC: '10', litTot: '100', plazo: '2026-11-10', est: 'Finalizado', cierre: '2026-11-09' },
    { tipo: 'A', sev: 'Crítico', litNC: '5', litTot: '100', plazo: '2026-11-10', est: 'Finalizado', cierre: '2026-11-12' },
    { tipo: 'B', sev: 'Crítico', litNC: '', litTot: '', est: 'Pendiente' },
    { tipo: 'B', sev: 'Crítico', litNC: '999', litTot: '1000', est: 'Anulado' }
  ]);
  assert.equal(k.activas, 3);
  assert.equal(k.tasaLitros, 7.5);
  assert.deepEqual(k.masFrecuente.tipo, 'A');
  assert.equal(k.enPlazo, 50, 'una cerró en plazo y otra tarde');
  assert.deepEqual(k.sev, { Leve: 1, Moderado: 0, 'Crítico': 2 });
  const vacio = R.kpis([]);
  assert.equal(vacio.tasaLitros, null); assert.equal(vacio.masFrecuente, null); assert.equal(vacio.enPlazo, null);
});

test('tipos de desvío: se limpian y arrancan según lo que ya había', () => {
  assert.deepEqual(R.normalizarTipos([{ label: ' Envase roto ', sev: 'Moderado' }, { label: 'envase roto', sev: 'Leve' }, { label: '', sev: 'Leve' }, { label: 'X', sev: 'Raro' }]),
    [{ label: 'Envase roto', sev: 'Moderado' }, { label: 'X', sev: '' }]);
  assert.equal(R.tiposIniciales([{ tipo: 'Inducción débil' }])[0].label, 'Poco film', 'quien ya usaba la lista de agroquímicos la conserva');
  assert.equal(R.tiposIniciales([]).some(t => t.label === 'Poco film'), false, 'una cuenta nueva arranca con la lista general');
  Object.keys(R.EJEMPLOS).forEach(n => R.ejemplo(n).forEach(t => assert.ok(R.SEVS.includes(t.sev), n + ': ' + t.label)));
});

// Texto como lo copia QualityOS (js/app.js, acción 'copiar-desvios').
const COPIADO = [
  ['05/11/2026', 'L-1001', 'Cliente Uno', 'Producto A', 'Control en línea', 'Pallet 2', 'Peso por pico fuera de rango (9.5 / 9.6 kg)', 'Abierto', ''],
  ['05/11/2026', 'L-1001', 'Cliente Uno', 'Producto A', 'Control en línea', 'Pallet 4', 'Peso por pico fuera de rango (9.4 kg)', 'Abierto', 'balanza recalibrada'],
  ['05/11/2026', 'L-1001', 'Cliente Uno', 'Producto A', 'Control en línea', 'Pallet 3', 'QR NOK', 'Reprocesado', ''],
  ['05/11/2026', 'L-1001', 'Cliente Uno', 'Producto A', 'Control final', 'Pallet 1', 'Trazabilidad / QR NOK', 'Abierto', '']
].map(c => c.join('\t')).join('\n');

test('desvíos de QualityOS: un control que falla en varias unidades es una sola NC', () => {
  const tipos = [{ label: 'Trazabilidad / QR', sev: 'Crítico' }];
  const { lineas, filas } = R.leerDesviosQualityOS('encabezado que no es de QualityOS\n' + COPIADO + '\n', tipos, 5);
  assert.equal(lineas, 4);
  assert.equal(filas.length, 3);
  const peso = filas[0];
  assert.equal(peso.fecha, '2026-11-05'); assert.equal(peso.lote, 'L-1001'); assert.equal(peso.cliente, 'Cliente Uno');
  assert.equal(peso.detec, 'CONTROL LÍNEA'); assert.equal(peso.est, 'Pendiente');
  assert.match(peso.desc, /Pallet 2: .*Pallet 4: /);
  assert.match(peso.desc, /Obs\.: balanza recalibrada/);
  assert.equal(peso.plazo, '2026-11-12', 'plazo automático para las abiertas');
  const qr = filas[1];
  assert.equal(qr.est, 'Finalizado', 'lo corregido en el momento entra cerrado');
  assert.equal(qr.cierre, '2026-11-05'); assert.equal(qr.plazo, '');
  const final = filas[2];
  assert.equal(final.detec, 'CONTROL FINAL');
  assert.equal(final.tipo, 'Trazabilidad / QR', 'si el control coincide con un tipo configurado, se usa');
  assert.equal(final.sev, 'Crítico');
  assert.equal(R.leerDesviosQualityOS('cualquier cosa', tipos, 5).lineas, 0);
});

test('duplicados: misma firma sin importar mayúsculas ni espacios', () => {
  assert.equal(R.firma({ lote: 'L1 ', prod: 'A' }), R.firma({ lote: 'l1', prod: 'a' }));
  assert.equal(R.tieneContenido({ fecha: '2026-11-01' }), false);
});

test('unidades del registro: litros y pallets si no se eligieron otras', () => {
  assert.deepEqual(R.unidades(null), { cantidad: 'L', embalaje: 'Pallets' });
  assert.deepEqual(R.unidades({ cantidad: ' kg ', embalaje: '' }), { cantidad: 'kg', embalaje: 'Pallets' });
  assert.equal(R.textosUnidades(R.unidades(null)).kpi, 'Tasa litros NC', 'a quien ya la usaba no le cambia el indicador');
  const t = R.textosUnidades({ cantidad: 'kg', embalaje: 'Cajas' });
  assert.deepEqual([t.kpi, t.colNC, t.colTot, t.embalaje], ['Tasa kg NC', 'kg NC', 'kg Tot.', 'Cajas NC']);
  assert.equal(t.etqNC, 'Cantidad (kg) NC');
});
