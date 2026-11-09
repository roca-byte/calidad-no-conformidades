/* Datos de ejemplo para la guía y el video (tools/demo.js y tools/video.js).
 *
 * Son INVENTADOS: empresa "Planta Demo", productos genéricos, lotes L-04xx y clientes de
 * fantasía. No son parte de la app (la app arranca vacía): los scripts los cargan en el
 * navegador de la grabación, que es un perfil nuevo cada vez.
 *
 * filas(hoy) arma el registro de octubre y noviembre con fechas contadas desde "hoy", para que
 * se vean todos los estados: pendientes, en proceso, finalizadas (eficaces y no), una anulada y
 * una de octubre todavía abierta (aparece en "Abiertas").
 */
function filas(hoy) {
  const [y, m] = hoy.split('-').map(Number);
  const f = (mes, dia) => `${mes === 'ant' ? (m === 1 ? y - 1 : y) : y}-${String(mes === 'ant' ? (m === 1 ? 12 : m - 1) : m).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  const base = { cliente: '', detec: '', desc: '', litNC: '', litTot: '', ac: '', plazo: '', _plazoAuto: '', cierre: '', pallets: '', resp: '', eficacia: 'Pendiente' };
  const datos = [
    // Mes anterior
    { fecha: f('ant', 6), lote: 'L-0412', prod: 'Aceite girasol 1,5 L', cliente: 'Almacén Central', tipo: 'Envase dañado', sev: 'Moderado', detec: 'CONTROL FINAL',
      desc: '18 botellas abolladas en el pallet 3', litNC: '27', litTot: '6000', ac: 'Reemplazo de las botellas y refuerzo del film', plazo: f('ant', 13),
      est: 'Finalizado', cierre: f('ant', 10), pallets: '1', resp: 'Laura Gómez', eficacia: 'Eficaz' },
    { fecha: f('ant', 14), lote: 'L-0419', prod: 'Jugo naranja 1 L', cliente: 'Supermercados del Sur', tipo: 'Rotulado / etiqueta incorrecta', sev: 'Moderado', detec: 'CONTROL LÍNEA',
      desc: 'Etiqueta con fecha de vencimiento corrida', litNC: '120', litTot: '4800', ac: 'Reetiquetado del lote', plazo: f('ant', 21),
      est: 'Finalizado', cierre: f('ant', 24), pallets: '2', resp: 'Pablo Díaz', eficacia: 'No eficaz' },
    { fecha: f('ant', 20), lote: 'L-0423', prod: 'Detergente 5 L', cliente: 'Distribuidora Norte SA', tipo: 'Cierre / tapa defectuosa', sev: 'Crítico', detec: 'CONTROL FINAL',
      desc: 'Tapas sin precinto en 2 pallets', litNC: '400', litTot: '5000', ac: 'Retapado y control al 100 %', plazo: f('ant', 27),
      est: 'En proceso', pallets: '2', resp: 'Laura Gómez' },
    { fecha: f('ant', 22), lote: 'L-0425', prod: 'Jugo naranja 1 L', tipo: 'Peso / volumen fuera de rango', sev: 'Leve', detec: 'CONTROL LÍNEA',
      desc: 'Cargada dos veces por error', est: 'Anulado' },
    // Mes actual
    { fecha: f('act', 3), lote: 'L-0431', prod: 'Aceite girasol 1,5 L', cliente: 'Almacén Central', tipo: 'Peso / volumen fuera de rango', sev: 'Leve', detec: 'CONTROL LÍNEA',
      desc: 'Pico 2 con 1,47 L (mín. 1,48)', litNC: '15', litTot: '6000', ac: 'Recalibración del pico 2', plazo: f('act', 10),
      est: 'Finalizado', cierre: f('act', 4), resp: 'Laura Gómez', eficacia: 'Eficaz' },
    { fecha: f('act', 5), lote: 'L-0433', prod: 'Detergente 5 L', cliente: 'Distribuidora Norte SA', tipo: 'Cierre / tapa defectuosa', sev: 'Crítico', detec: 'CONTROL FINAL',
      desc: 'Tapas flojas en el pallet 4', litNC: '250', litTot: '5000', ac: 'Ajuste del torque de la tapadora y retapado', plazo: f('act', 12),
      est: 'En proceso', pallets: '1', resp: 'Pablo Díaz' },
    { fecha: f('act', 7), lote: 'L-0436', prod: 'Jugo naranja 1 L', cliente: 'Supermercados del Sur', tipo: 'Peso / volumen fuera de rango', sev: 'Leve', detec: 'CONTROL LÍNEA',
      desc: 'Llenado bajo en 12 envases (985 ml)', litNC: '12', litTot: '4800', ac: 'Ajuste de la llenadora', plazo: f('act', 14),
      est: 'Finalizado', cierre: f('act', 8), resp: 'Laura Gómez', eficacia: 'Pendiente' },
    { fecha: f('act', 9), lote: 'L-0438', prod: 'Jugo naranja 1 L', cliente: 'Supermercados del Sur', tipo: 'Rotulado / etiqueta incorrecta', sev: 'Moderado', detec: 'CONTROL LÍNEA',
      desc: 'Código de lote ilegible en el codificador', litNC: '60', litTot: '4800', resp: 'Laura Gómez', plazo: f('act', 16), est: 'Pendiente' },
    { fecha: f('act', 10), lote: 'L-0440', prod: 'Aceite girasol 1,5 L', cliente: 'Almacén Central', tipo: 'Embalaje / paletizado incorrecto', sev: 'Moderado', detec: 'CONTROL FINAL',
      desc: 'Pallet sin esquineros', litNC: '0', litTot: '6000', ac: 'Se colocaron esquineros', plazo: f('act', 17),
      est: 'Finalizado', cierre: f('act', 10), pallets: '1', resp: 'Laura Gómez' }
  ];
  return datos.map((d, i) => Object.assign({ id: 'ejemplo-' + (i + 1), _o: i + 1, _m: 0 }, base, d, { _plazoAuto: d.plazo || '' }));
}

// Lo que se guarda en el navegador además de las NC: la empresa y los tipos de desvío generales.
const MARCA = { empresa: 'Planta Demo' };

module.exports = { filas, MARCA };
