// Prueba de punta a punta en un navegador real (Chromium con Playwright).
// Recorre la carga diaria, pegar desvíos de QualityOS, la vista por mes, los tipos de desvío,
// el Excel, el respaldo y el modo sin conexión.
//   node tests/e2e.js [carpeta-para-capturas]
// Levanta solo un servidor local en un puerto libre; no toca nada fuera de la carpeta.
// El reloj del navegador se fija en el 09/11/2026 para que las fechas esperadas no dependan del día.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const RAIZ = path.join(__dirname, '..');
const CAPTURAS = process.argv[2];
const PREFIJO = '/calidad-no-conformidades/';
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const HOY = new Date(2026, 10, 9, 10, 0, 0);   // lunes 09/11/2026, hora local

// Servidor estático mínimo bajo un subdirectorio, como GitHub Pages.
function servidor() {
  return new Promise(res => {
    const s = http.createServer((req, resp) => {
      const url = decodeURIComponent(req.url.split('?')[0]);
      if (!url.startsWith(PREFIJO)) { resp.writeHead(404); return resp.end(); }
      let f = path.join(RAIZ, url.slice(PREFIJO.length) || 'index.html');
      if (!f.startsWith(RAIZ)) { resp.writeHead(403); return resp.end(); }
      if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
      if (!fs.existsSync(f)) { resp.writeHead(404); return resp.end(); }
      resp.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(resp);
    });
    s.listen(0, '127.0.0.1', () => res(s));
  });
}

let fallas = 0;
function ok(cond, msg) { console.log((cond ? '  ✔ ' : '  ✘ ') + msg); if (!cond) fallas++; }

// Lo que copia QualityOS con "Copiar para el registro de NC" (columnas separadas por tabulaciones).
const COPIADO = [
  ['09/11/2026', 'L-2311', 'Cliente Uno', 'Detergente 5 L', 'Control en línea', 'Pallet 2', 'Peso por pico fuera de rango (4.91 / 4.93 kg)', 'Abierto', ''],
  ['09/11/2026', 'L-2311', 'Cliente Uno', 'Detergente 5 L', 'Control en línea', 'Pallet 5', 'Peso por pico fuera de rango (4.92 kg)', 'Abierto', 'pico 3 tapado'],
  ['09/11/2026', 'L-2311', 'Cliente Uno', 'Detergente 5 L', 'Control final', 'Pallet 1', 'Rotulado / etiqueta incorrecta NOK', 'Reprocesado', 'se reetiquetó']
].map(c => c.join('\t')).join('\n');

async function abrir(browser, BASE, movil, antes) {
  const ctx = await browser.newContext(movil
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, acceptDownloads: true }
    : { viewport: { width: 1400, height: 900 }, acceptDownloads: true });
  await ctx.clock.install({ time: HOY });
  const page = await ctx.newPage();
  page.errores = [];
  page.on('pageerror', e => page.errores.push(e.message));
  page.on('console', m => { if (m.type() === 'error') page.errores.push(m.text()); });
  page.on('dialog', d => d.accept(d.type() === 'prompt' ? page.respuesta || '' : undefined));
  if (antes) await antes(page);
  await page.goto(BASE);
  await page.waitForFunction(() => document.getElementById('saveMsg').textContent !== 'Cargando datos guardados...');
  return { ctx, page };
}

(async () => {
  const srv = await servidor();
  const BASE = `http://127.0.0.1:${srv.address().port}${PREFIJO}`;
  const browser = await chromium.launch();

  // ════ Celular: la carga del día ════
  console.log('Celular · carga diaria');
  let { ctx, page } = await abrir(browser, BASE, true);
  const foto = async (nombre, p = page) => { if (CAPTURAS) await p.screenshot({ path: path.join(CAPTURAS, nombre + '.png'), fullPage: true }); };
  ok(await page.inputValue('#sel-mes') === '2026-11', 'arranca en el mes actual');
  ok((await page.textContent('#vacio')).includes('Noviembre 2026'), 'avisa que el mes está vacío');
  ok((await page.textContent('#legend-tipos')).includes('Envase dañado') && !(await page.textContent('#legend-tipos')).includes('Poco film'),
    'una instalación nueva arranca con los tipos generales, no los de agroquímicos');
  await foto('01-inicio');

  await page.click('#btn-add');
  ok(await page.inputValue('#tBody tr td.c1 input') === '2026-11-09', 'la NC nueva trae la fecha de hoy');
  ok(await page.inputValue('#tBody tr td.c10 input') === '2026-11-16', 'y el plazo de 5 días hábiles');
  await page.fill('#tBody tr td.c2 input', 'L-2310');
  await page.fill('#tBody tr td.c3 input', 'Jugo 1 L');
  await page.selectOption('#tBody tr td.c4 select', 'Envase dañado');
  ok(await page.inputValue('#tBody tr td.c5 select') === 'Moderado', 'el tipo sugiere la gravedad');
  await page.fill('#tBody tr td.c6 input', '12 envases <abollados> & "sucios"');
  await page.waitForTimeout(700);
  await foto('02-nc-del-dia');

  // Pegar desvíos de QualityOS
  await page.click('#btn-pegar');
  await page.fill('#in-pegar', COPIADO);
  ok((await page.textContent('#pegar-resumen')).startsWith('3 desvío(s) → 2 NC nueva(s)'), 'agrupa el mismo control de un lote en una NC');
  await foto('03-pegar-qualityos');
  await page.click('#btn-pegar-ok');
  await page.waitForTimeout(700);
  ok(await page.locator('#tBody tr').count() === 3, 'quedan 3 NC en el mes');
  await page.click('#btn-pegar');
  await page.fill('#in-pegar', COPIADO);
  ok((await page.textContent('#pegar-resumen')).includes('0 NC nueva(s) · 2 ya estaban'), 'pegar dos veces no duplica');
  ok(await page.isDisabled('#btn-pegar-ok'), 'y no deja agregar nada');
  await page.click('#btn-pegar-cancelar');

  await page.reload();
  await page.waitForFunction(() => document.getElementById('saveMsg').textContent.includes('restaurados'));
  ok(await page.locator('#tBody tr').count() === 3, 'todo sigue ahí después de recargar');
  ok((await page.textContent('#kpi1')) === '3', 'indicador: 3 NC en el mes');
  ok((await page.textContent('#sel-mes')).includes('Abiertas, todos los meses (2)'), 'cuenta 2 abiertas (la reprocesada entra cerrada)');
  ok(!(await page.content()).includes('<abollados>'), 'el texto con < > se escapa');
  await foto('04-registro-del-mes');

  // Una NC del mes pasado: al cambiarle la fecha pasa a octubre
  await page.click('#btn-add');
  const nueva = page.locator('#tBody tr').first();   // en el celular la última va arriba
  await nueva.locator('td.c1 input').fill('2026-10-28');
  await nueva.locator('td.c1 input').dispatchEvent('change');
  await page.waitForTimeout(400);
  ok(await page.inputValue('#sel-mes') === '2026-10', 'una NC con fecha de octubre pasa a la vista de octubre');
  ok(await page.locator('#tBody tr').count() === 1, 'octubre muestra solo esa NC');
  await page.selectOption('#sel-mes', 'abiertas');
  ok(await page.locator('#tBody tr').count() === 3, '"Abiertas" junta las pendientes de todos los meses');
  ok((await page.textContent('#kpi1-label')).includes('abiertas'), 'y el indicador lo dice');
  await foto('05-abiertas');
  await page.selectOption('#sel-mes', '2026-11');
  ok(await page.locator('#tBody tr').count() === 3, 'noviembre no se mezcla con octubre');
  ok(page.errores.length === 0, 'sin errores en la consola' + (page.errores.length ? ': ' + page.errores.join(' | ') : ''));
  await ctx.close();

  // ════ Compu: tipos de desvío, Excel, impresión, respaldo ════
  console.log('Compu · configuración y entrega del mes');
  // Quien ya usaba la app con los tipos de agroquímicos (sin lista guardada) los conserva.
  ({ ctx, page } = await abrir(browser, BASE, false, async p => {
    await p.addInitScript(() => {
      if (sessionStorage.getItem('sembrado')) return;
      sessionStorage.setItem('sembrado', '1');
      const req = indexedDB.open('calidad_nc_v1', 2);
      req.onupgradeneeded = e => { const db = e.target.result; ['no_conformidades', 'meta'].forEach(n => db.createObjectStore(n, { keyPath: n === 'meta' ? 'clave' : 'id' })); db.createObjectStore('filas', { keyPath: 'id' }); };
      req.onsuccess = e => {
        const t = e.target.result.transaction('filas', 'readwrite');
        t.objectStore('filas').put({ id: 'viejo1', _o: 1, fecha: '2026-11-03', lote: 'A-1', prod: 'Herbicida 20 L', tipo: 'Inducción débil', sev: 'Crítico', litNC: '200', litTot: '4000', est: 'En proceso', eficacia: 'Pendiente', plazo: '2026-11-10' });
        t.oncomplete = () => location.reload();
      };
    });
  }));
  await page.waitForFunction(() => document.querySelectorAll('#tBody tr').length === 1);
  ok((await page.textContent('#legend-tipos')).includes('Poco film'), 'con NC viejas de agroquímicos conserva esa lista de tipos');
  ok((await page.textContent('#kpi2')) === '5.0%', 'indicador de litros NC');

  await page.click('#btn-cod');
  await page.selectOption('#sel-ejemplo', 'Alimentos y bebidas');
  ok((await page.textContent('#legend-tipos')).includes('Cuerpo extraño'), 'carga el ejemplo de otro rubro');
  ok(await page.inputValue('#tBody tr td.c4 select') === 'Inducción débil', 'la NC vieja conserva su tipo aunque ya no esté en la lista');
  page.respuesta = 'Sabor extraño';
  await page.click('#btn-tipo-add');
  ok((await page.textContent('#legend-tipos')).includes('Sabor extraño'), 'agrega un tipo propio');
  await page.locator('.tipo-fila').last().locator('select').selectOption('Crítico');   // el agregado queda último
  await page.reload();
  await page.waitForSelector('#tBody tr');
  ok((await page.textContent('#legend-tipos')).includes('🔴 Sabor extraño'), 'los tipos y su gravedad quedan guardados');
  await page.click('#btn-cod');
  await foto('06-configuracion', page);
  await page.click('#btn-cod');

  const [xls] = await Promise.all([page.waitForEvent('download'), page.click('#btn-excel')]);
  ok(xls.suggestedFilename() === 'Registro_NC_Noviembre_2026.xlsx', 'el Excel lleva el nombre del mes');

  await page.emulateMedia({ media: 'print' });
  await page.evaluate(() => prepararImpresion());
  ok((await page.textContent('#periodo-val')) === 'Noviembre 2026', 'la hoja impresa muestra el mes elegido');
  ok((await page.textContent('#print-acciones')).includes('Inspector de Calidad'), 'firma como Inspector de Calidad');
  if (CAPTURAS) await page.pdf({ path: path.join(CAPTURAS, 'registro.pdf'), format: 'A4', landscape: true, printBackground: true });
  await page.emulateMedia({ media: 'screen' });

  const [bk] = await Promise.all([page.waitForEvent('download'), page.click('#btn-backup')]);
  const datos = JSON.parse(fs.readFileSync(await bk.path(), 'utf8'));
  ok(datos.app === 'registro_nc' && datos.filas.length === 1, 'el respaldo trae las NC');

  // Sin conexión: el service worker ya cacheó la app (incluido reglas.js)
  await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 10000 }).catch(() => {});
  await ctx.setOffline(true);
  await page.reload();
  await page.waitForSelector('#tBody tr');
  ok(true, 'abre sin conexión');
  ok(page.errores.length === 0, 'sin errores en la consola' + (page.errores.length ? ': ' + page.errores.join(' | ') : ''));
  await ctx.close();

  await browser.close();
  srv.close();
  console.log(fallas ? `\n${fallas} prueba(s) fallaron` : '\nTodo bien');
  process.exit(fallas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
