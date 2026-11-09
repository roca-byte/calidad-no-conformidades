/* Graba el video de demostración: docs/video/calidad-no-conformidades-demo.mp4
 *
 * Uso:  node tools/video.js
 * Necesita Playwright y ffmpeg. Recorre la app en un celular con los datos de ejemplo de
 * tools/ejemplo.js (inventados): la carga de la NC del día, pegar desvíos de QualityOS, el
 * seguimiento de las abiertas, la entrega del mes, la configuración y el uso sin señal, con
 * carteles que explican cada paso, un círculo en cada toque y placas de apertura y cierre.
 * Volver a correrlo cada vez que cambie algo visible de la app.
 */
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { servidor, RAIZ } = require('./servidor');
const Ejemplo = require('./ejemplo');

const SALIDA = path.join(RAIZ, 'docs', 'video');
const ANCHO = 390, ALTO = 844;
const HOY = '2026-11-11';

// Se inyecta en la página: carteles, placas y marca de toques. Vive fuera de la tabla, así
// sobrevive a los redibujos de la app. El cartel va ARRIBA (debajo de la barra) para no tapar
// lo que se toca.
function preparar() {
  const css = document.createElement('style');
  css.textContent = `
    #v-cartel { position: fixed; left: 12px; right: 12px; top: 72px; z-index: 99; padding: 12px 16px; pointer-events: none;
      background: rgba(10, 70, 84, .94); color: #fff; border-radius: 14px; font: 600 17px/1.35 "Segoe UI", Roboto, sans-serif;
      box-shadow: 0 6px 24px rgba(0,0,0,.25); transition: opacity .35s, transform .35s; }
    #v-cartel.oculto { opacity: 0; transform: translateY(-14px); }
    #v-cartel small { display: block; font-weight: 400; font-size: 14px; opacity: .85; margin-top: 2px; }
    #v-placa { position: fixed; inset: 0; z-index: 100; display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 14px; text-align: center; padding: 24px; background: #0f5c6e; color: #fff;
      font-family: "Segoe UI", Roboto, sans-serif; transition: opacity .6s; }
    #v-placa.oculto { opacity: 0; pointer-events: none; }
    #v-placa img { width: 112px; height: 112px; }
    #v-placa h1 { margin: 0; font-size: 34px; } #v-placa h1 span { color: #00c896; }
    #v-placa p { margin: 0; font-size: 18px; opacity: .9; max-width: 300px; line-height: 1.4; }
    #v-placa b { color: #00c896; }
    .v-toque { position: fixed; z-index: 98; width: 44px; height: 44px; margin: -22px 0 0 -22px; border-radius: 50%;
      background: rgba(0, 200, 150, .35); border: 3px solid #00c896; pointer-events: none; animation: v-toque .6s ease-out forwards; }
    @keyframes v-toque { from { transform: scale(.4); opacity: 1; } to { transform: scale(1.4); opacity: 0; } }`;
  document.head.appendChild(css);
  const cartel = document.createElement('div');
  cartel.id = 'v-cartel'; cartel.className = 'oculto';
  document.body.appendChild(cartel);
  const placa = document.createElement('div');
  placa.id = 'v-placa'; placa.className = 'oculto';
  document.body.appendChild(placa);
  document.addEventListener('pointerdown', e => {
    const t = document.createElement('div');
    t.className = 'v-toque'; t.style.left = e.clientX + 'px'; t.style.top = e.clientY + 'px';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 700);
  }, true);
  window.vCartel = (titulo, detalle) => {
    cartel.innerHTML = titulo ? titulo + (detalle ? '<small>' + detalle + '</small>' : '') : '';
    cartel.className = titulo ? '' : 'oculto';
  };
  window.vPlaca = html => {
    if (html) placa.innerHTML = html;
    placa.className = html ? '' : 'oculto';
  };
}

(async () => {
  fs.mkdirSync(SALIDA, { recursive: true });
  const srv = servidor().listen(0);
  const url = 'http://127.0.0.1:' + srv.address().port + '/';
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'nc-video-'));
  const browser = await chromium.launch({ args: ['--lang=es-AR'] });
  const ctx = await browser.newContext({
    viewport: { width: ANCHO, height: ALTO }, deviceScaleFactor: 2, serviceWorkers: 'block', isMobile: true, hasTouch: true,
    locale: 'es-AR', timezoneId: 'America/Argentina/Buenos_Aires', colorScheme: 'light'
  });
  const page = await ctx.newPage();

  // Grabación: capturas de pantalla seguidas a resolución doble, cada una con su hora.
  // (La grabación propia de Playwright da cuadros de 390 px, que en un celular se ven borrosos.)
  const cuadros = [];
  let grabando = false;
  async function grabar() {
    while (grabando) {
      const t = Date.now() / 1000;
      const archivo = path.join(carpeta, 'c' + String(cuadros.length).padStart(5, '0') + '.jpg');
      try {
        await page.screenshot({ path: archivo, type: 'jpeg', quality: 88, animations: 'allow', caret: 'initial' });
        cuadros.push({ archivo, t });
      } catch (e) { /* la página se está redibujando: se saltea el cuadro */ }
    }
  }
  // Reloj en el 11/11: los ejemplos salen de "hoy" y ese día se lee igual en dd/mm y mm/dd.
  await page.clock.setFixedTime(new Date(HOY + 'T10:30:00-03:00'));
  page.on('dialog', d => d.accept());
  // Si algo no aparece, que falle enseguida (si no, el video queda con la pantalla quieta).
  page.setDefaultTimeout(5000);
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
  await page.evaluate(() => { BRAND.elaboro = 'Laura Gómez'; BRAND.aprobo = 'Pablo Díaz'; pintarEncabezados(); });

  const espera = ms => page.waitForTimeout(ms);
  const cartel = async (t, d, ms) => { await page.evaluate(([a, b]) => window.vCartel(a, b), [t, d || '']); await espera(ms || 3000); };
  const placa = async (html, ms) => { await page.evaluate(h => window.vPlaca(h), html); await espera(ms); };
  const ver = async sel => {
    await page.locator(sel).first().evaluate(e => e.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    await espera(800);
  };
  const tocar = async (sel, ms) => { await ver(sel); await page.locator(sel).first().click(); await espera(ms || 1000); };
  const tipear = async (sel, txt) => { await ver(sel); await page.locator(sel).first().click(); await page.keyboard.type(txt, { delay: 70 }); await espera(400); };
  // El desplegable nativo no se ve en la grabación: se elige directo.
  const elegir = async (sel, valor) => { await ver(sel); await page.selectOption(sel, valor); await espera(700); };
  const arriba = async ms => { await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' })); await espera(ms || 900); };
  const nueva = '#tBody tr:first-child';   // en el celular la NC nueva queda arriba

  await page.evaluate(preparar);
  grabando = true;
  const grabacion = grabar();
  await espera(300);
  const logo = await page.evaluate(() => new URL('icon.svg', location.href).href);

  // ── Apertura ──
  await placa('<img src="' + logo + '" alt=""><h1>Registro de <span>No Conformidades</span></h1>' +
    '<p>Cargá cada NC el día que aparece y entregá el registro del mes.</p><p><b>Gratis, sin cuenta y sin señal.</b></p>', 5000);
  await placa('', 900);

  await cartel('El registro del mes, con indicadores al día', 'NC del mes, tasa de litros, desvío más frecuente y reprocesos en plazo', 3600);

  // ── 1 · NC del día ──
  await cartel('1 · Cargá la NC del día', 'Trae la fecha de hoy y el plazo calculado', 800);
  await tocar('#btn-add', 900);
  await tipear(nueva + ' td.c2 input', 'L-0444');
  await tipear(nueva + ' td.c3 input', 'Detergente 5 L');
  await tipear(nueva + ' td.c3b input', 'Distribuidora Norte SA');
  await cartel('El tipo de desvío sugiere la gravedad', 'Los tipos los arma tu empresa', 800);
  await elegir(nueva + ' td.c4 select', 'Envase dañado');
  await elegir(nueva + ' td.c5b select', 'CONTROL FINAL');
  await tipear(nueva + ' td.c6 input', '6 bidones con la manija rota');
  await tipear(nueva + ' td.c7 input', '30');
  await tipear(nueva + ' td.c8 input', '5000');
  await tipear(nueva + ' td.c9 input', 'Trasvase a envases nuevos');
  await tipear(nueva + ' td.c14 input', 'Laura Gómez');
  await cartel('Se guarda sola, en el celular', 'No hace falta tocar Guardar', 2400);

  // ── 2 · Desde QualityOS ──
  await arriba();
  await cartel('2 · ¿Usás QualityOS? Pegá los desvíos del lote', 'El mismo control en varias unidades entra como una sola NC', 800);
  await tocar('#btn-pegar', 800);
  await page.fill('#in-pegar', [
    ['11/11/2026', 'L-0442', 'Almacén Central', 'Aceite girasol 1,5 L', 'Control en línea', 'Pallet 2', 'Peso por pico fuera de rango (1.46 L)', 'Abierto', ''],
    ['11/11/2026', 'L-0442', 'Almacén Central', 'Aceite girasol 1,5 L', 'Control en línea', 'Pallet 4', 'Peso por pico fuera de rango (1.47 L)', 'Abierto', '']
  ].map(c => c.join('\t')).join('\n'));
  await espera(1800);
  await tocar('#btn-pegar-ok', 1600);

  // ── 3 · Seguimiento ──
  await arriba();
  await cartel('3 · Seguimiento diario: las abiertas de todos los meses', 'Pendientes y en proceso, de este mes y de los anteriores', 800);
  await elegir('#sel-mes', 'abiertas');
  await espera(1600);
  await tocar('#tBody tr:has-text("L-0433") .nc-card-hdr', 900);
  await cartel('Cerrás la NC y verificás la eficacia', 'ISO 9001, 10.2', 800);
  await ver('#tBody tr:has-text("L-0433") td.c12 input');
  await page.fill('#tBody tr:has-text("L-0433") td.c12 input', HOY);
  await espera(700);
  await elegir('#tBody tr:has-text("L-0433") td.c15 select', 'Eficaz');
  // Al finalizarla deja de estar abierta: sale de esta vista (sigue en su mes).
  await elegir('#tBody tr:has-text("L-0433") td.c11 select', 'Finalizado');
  await cartel('Finalizada: sale de las abiertas', 'Sigue en el registro de su mes', 2400);

  // ── 4 · Entrega del mes ──
  await arriba();
  await cartel('4 · A fin de mes, elegís el mes y lo entregás', 'Imprimir / PDF en A4 y Excel, con tu empresa y tu logo', 800);
  await elegir('#sel-mes', HOY.slice(0, 7));
  await ver('#btn-print');
  await espera(2600);
  await cartel('No hace falta borrar nada para empezar el mes siguiente', 'Cada NC queda en el mes de su detección', 2800);

  // ── 5 · Configuración ──
  await tocar('#btn-cod', 900);
  await cartel('5 · Configuración: empresa, logo, unidades y tipos', 'Litros y pallets, o kg y cajas: lo que use tu planta', 800);
  await ver('.pcod-unidades');
  await espera(1800);
  await ver('#lista-tipos');
  await espera(2000);
  await tocar('#btn-cod', 600);

  // ── Sin señal y respaldo ──
  await arriba();
  await ctx.setOffline(true);
  await cartel('¿Sin señal en planta? Funciona igual', 'Los datos quedan en tu equipo: hacé un backup seguido', 2200);
  await ver('#btn-backup');
  await espera(2000);
  await ctx.setOffline(false);
  await cartel('', '', 300);

  // ── Cierre ──
  await placa('<img src="' + logo + '" alt=""><h1>Registro de <span>No Conformidades</span></h1>' +
    '<p>Usala gratis en</p><p><b>roca-byte.github.io/calidad-no-conformidades</b></p><p>Instalala en el celular o la compu</p>', 4500);

  grabando = false;
  await grabacion;
  const fin = Date.now() / 1000;
  await ctx.close();
  await browser.close();
  srv.close();

  // Lista de cuadros con cuánto dura cada uno en pantalla (hasta que llega el siguiente).
  const lista = path.join(carpeta, 'lista.txt');
  fs.writeFileSync(lista, cuadros.map((c, i) => {
    const hasta = i + 1 < cuadros.length ? cuadros[i + 1].t : fin;
    return "file '" + c.archivo + "'\nduration " + Math.max(0.04, hasta - c.t).toFixed(3);
  }).join('\n') + "\nfile '" + cuadros[cuadros.length - 1].archivo + "'\n");

  // Cuadros → MP4 (H.264) a 25 cuadros por segundo: se reproduce en celulares, WhatsApp,
  // LinkedIn y YouTube. El ancho y el alto tienen que ser pares para H.264.
  const mp4 = path.join(SALIDA, 'calidad-no-conformidades-demo.mp4');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lista,
    '-vf', 'fps=25,scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '23',
    '-movflags', '+faststart', '-an', mp4]);
  fs.rmSync(carpeta, { recursive: true, force: true });
  const dur = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4]).toString().trim();
  console.log('Cuadros:', cuadros.length, '≈', (cuadros.length / (fin - cuadros[0].t)).toFixed(1), 'por segundo');
  console.log('Video:', path.relative(RAIZ, mp4), Math.round(fs.statSync(mp4).size / 1024) + ' KB,', Math.round(dur) + ' s');
})().catch(e => { console.error('✗', e.message); process.exit(1); });
