/* Genera las capturas de la guía (docs/img/*.png) y el recorrido animado (docs/img/demo.gif).
 *
 * Uso:  node tools/demo.js
 * Necesita Playwright y ffmpeg. Carga en el navegador los datos de ejemplo de tools/ejemplo.js,
 * que son inventados: no hay datos de ninguna empresa real.
 * Volver a correrlo cada vez que cambie algo visible de la app.
 */
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { servidor, RAIZ } = require('./servidor');
const Ejemplo = require('./ejemplo');

const SALIDA = path.join(RAIZ, 'docs', 'img');
const HOY = '2026-11-11';
const CELULAR = { width: 390, height: 844 };
const COMPU = { width: 1600, height: 900 };

// Lo que QualityOS copia con "Copiar para el registro de NC" (inventado).
const COPIADO = [
  ['11/11/2026', 'L-0442', 'Almacén Central', 'Aceite girasol 1,5 L', 'Control en línea', 'Pallet 2', 'Peso por pico fuera de rango (1.46 / 1.47 L)', 'Abierto', ''],
  ['11/11/2026', 'L-0442', 'Almacén Central', 'Aceite girasol 1,5 L', 'Control en línea', 'Pallet 4', 'Peso por pico fuera de rango (1.47 L)', 'Abierto', 'pico 2 tapado'],
  ['11/11/2026', 'L-0442', 'Almacén Central', 'Aceite girasol 1,5 L', 'Control final', 'Pallet 1', 'Rotulado / etiqueta incorrecta NOK', 'Reprocesado', 'se reetiquetó']
].map(c => c.join('\t')).join('\n');

(async () => {
  fs.mkdirSync(SALIDA, { recursive: true });
  const srv = servidor().listen(0);
  const url = 'http://127.0.0.1:' + srv.address().port + '/';
  // --lang: los campos de fecha toman el idioma del navegador (dd/mm/aaaa).
  const browser = await chromium.launch({ args: ['--lang=es-AR'] });
  const capturas = [];

  async function contexto(viewport, opciones) {
    const ctx = await browser.newContext(Object.assign({
      viewport, deviceScaleFactor: 2, serviceWorkers: 'block', colorScheme: 'light',
      locale: 'es-AR', timezoneId: 'America/Argentina/Buenos_Aires', isMobile: viewport.width < 500, hasTouch: viewport.width < 500
    }, opciones || {}));
    const page = await ctx.newPage();
    // Reloj fijo en el 11/11: los ejemplos se arman desde "hoy" y ese día se lee igual en
    // dd/mm y en mm/dd. Las capturas salen iguales cada vez.
    await page.clock.setFixedTime(new Date(HOY + 'T10:30:00-03:00'));
    page.on('dialog', d => d.accept());
    page.on('pageerror', e => { throw e; });
    // La app arranca vacía: se cargan los ejemplos con su propia capa de datos y se recarga.
    await page.goto(url);
    await page.waitForFunction(() => typeof DB !== 'undefined');
    await page.evaluate(async ([filas, marca]) => {
      localStorage.setItem('nc_marca.v1', JSON.stringify(marca));
      localStorage.setItem('nc_tema', 'light');
      await DB.reemplazarTodo(filas);
    }, [Ejemplo.filas(HOY), Ejemplo.MARCA]);
    await page.reload();
    await page.waitForSelector('#tBody tr');
    // Quién elaboró y aprobó el registro: personas inventadas, como los datos (no los de brand.js).
    await page.evaluate(() => { BRAND.elaboro = 'Laura Gómez'; BRAND.aprobo = 'Pablo Díaz'; pintarEncabezados(); });
    return { ctx, page };
  }

  // Pantalla completa o, con selector, solo ese bloque (la barra de arriba es fija: se suelta).
  async function foto(page, nombre, selector, completa) {
    await page.waitForTimeout(350);
    const destino = path.join(SALIDA, nombre + '.png');
    const estilo = await page.addStyleTag({ content: '.topbar { position: static !important; }' });
    if (selector) await page.locator(selector).first().screenshot({ path: destino });
    else await page.screenshot({ path: destino, fullPage: !!completa });
    await estilo.evaluate(e => e.remove());
    capturas.push(nombre);
  }
  const sinToast = page => page.waitForFunction(() => !document.getElementById('toast').classList.contains('show'), null, { timeout: 6000 });

  // ── Compu: el registro del mes ──
  let { ctx, page } = await contexto(COMPU);
  await foto(page, '01-registro');
  await foto(page, '02-indicadores', '.kpi-bar');
  await page.selectOption('#sel-mes', 'abiertas');
  await foto(page, '03-abiertas');
  await page.selectOption('#sel-mes', HOY.slice(0, 7));
  await page.setViewportSize({ width: 1000, height: 900 });   // a lo ancho de 1600 la lista se estira demasiado
  await page.click('#btn-cod');
  await foto(page, '04-configuracion', '#panel-codificacion');
  await page.click('#btn-cod');
  // Impresión: A4 apaisado
  await page.setViewportSize({ width: 1123, height: 794 });
  await page.emulateMedia({ media: 'print' });
  await page.evaluate(() => { window.scrollTo(0, 0); prepararImpresion(); });
  await foto(page, '05-impresion', '.page');
  await foto(page, '06-impresion-acciones', '#print-acciones');
  await page.emulateMedia({ media: 'screen' });
  await ctx.close();

  // ── Celular: la carga del día ──
  ({ ctx, page } = await contexto(CELULAR));
  await foto(page, '07-celular');
  await page.click('#btn-add');
  await page.fill('#tBody tr:first-child td.c2 input', 'L-0444');
  await page.fill('#tBody tr:first-child td.c3 input', 'Detergente 5 L');
  await page.fill('#tBody tr:first-child td.c3b input', 'Distribuidora Norte SA');
  await page.selectOption('#tBody tr:first-child td.c4 select', 'Envase dañado');
  await page.selectOption('#tBody tr:first-child td.c5b select', 'CONTROL FINAL');
  await page.fill('#tBody tr:first-child td.c6 input', '6 bidones con la manija rota');
  await sinToast(page);
  await foto(page, '08-nc-del-dia', '#tBody tr:first-child');
  // Pegar desvíos de QualityOS
  await page.click('#btn-pegar');
  await page.fill('#in-pegar', COPIADO);
  await foto(page, '09-pegar-qualityos', '#panel-pegar');
  await page.click('#btn-pegar-cancelar');
  await ctx.close();

  // ── Recorrido animado: cargar la NC del día y ver las abiertas ──
  const carpetaVideo = fs.mkdtempSync(path.join(os.tmpdir(), 'nc-gif-'));
  ({ ctx, page } = await contexto(CELULAR, { deviceScaleFactor: 1, recordVideo: { dir: carpetaVideo, size: CELULAR } }));
  await page.waitForTimeout(900);
  const tipear = async (sel, txt) => { await page.click(sel); await page.keyboard.type(txt, { delay: 55 }); await page.waitForTimeout(250); };
  await page.click('#btn-add');
  await page.waitForTimeout(700);
  await tipear('#tBody tr:first-child td.c2 input', 'L-0444');
  await tipear('#tBody tr:first-child td.c3 input', 'Detergente 5 L');
  await page.selectOption('#tBody tr:first-child td.c4 select', 'Envase dañado');
  await page.waitForTimeout(900);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await page.waitForTimeout(1500);
  await page.selectOption('#sel-mes', 'abiertas');
  await page.waitForTimeout(2000);
  const video = await page.video().path();
  await ctx.close();
  await browser.close();
  srv.close();

  // webm → GIF liviano (6 cuadros por segundo, 320 px; solo se guarda lo que cambia).
  const gif = path.join(SALIDA, 'demo.gif');
  const filtro = 'fps=6,scale=320:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=64:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle';
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', video, '-vf', filtro, gif]);
  fs.rmSync(carpetaVideo, { recursive: true, force: true });

  console.log('Capturas:', capturas.join(', '));
  console.log('GIF:', path.relative(RAIZ, gif), Math.round(fs.statSync(gif).size / 1024) + ' KB');
})().catch(e => { console.error('✗', e.message); process.exit(1); });
