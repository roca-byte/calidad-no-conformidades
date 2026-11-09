# Registro de No Conformidades

[![QualityOS](https://img.shields.io/badge/QualityOS-calidad_en_planta-0f5c6e?style=flat-square)](https://github.com/roca-byte)

App para llevar el **registro de No Conformidades (NC)** del área de Calidad: se carga
**todos los días**, a medida que aparecen las NC, y se entrega **por mes** con sus acciones
correctivas e indicadores al día.
Funciona en la compu, la tablet o el celular, y **sin conexión**.

**Abrir la app:** https://roca-byte.github.io/calidad-no-conformidades/

## Para qué sirve

Reemplaza el Excel de No Conformidades. En vez de juntar todo a fin de mes, cargás cada NC el
día que la detectás (con la fecha y el plazo ya puestos), la app sugiere la gravedad, calcula
los indicadores y cada mes queda listo para imprimir o pasar a Excel.

## Qué podés hacer

- **Una fila por NC**: fecha, lote, cliente, producto, tipo de desvío, severidad, cómo se
  detectó, descripción, litros no conformes y totales, acción correctiva, plazo, estado,
  fecha de cierre, pallets, responsable y verificación de eficacia.
- **Carga del día**: **+ Agregar NC de hoy** crea la NC con la fecha de hoy y el plazo calculado.
- **Un registro por mes** sin borrar nada: en **Ver** elegís el mes (los indicadores, la
  impresión y el Excel son de ese mes) o **Abiertas**, que junta las NC pendientes y en proceso
  de todos los meses para el seguimiento diario.
- **Pegar desvíos de QualityOS**: en un lote de [QualityOS](https://github.com/roca-byte/qualityos),
  *Copiar para el registro de NC*, y acá **📋 Pegar de QualityOS**. El mismo control que falló en
  varias unidades de un lote entra como una sola NC, y pegar dos veces no duplica.
- **Tipos de desvío de tu empresa**, con su gravedad sugerida (Leve, Moderado o Crítico).
  Se arman en **⚙️ Configuración**, con ejemplos por rubro para empezar (general, alimentos y
  bebidas, agroquímicos, cosmética).
- **Plazo automático** de reproceso en días hábiles (si cargás uno a mano, la app no lo cambia).
- **Estados**: Pendiente, En proceso, Finalizado y Anulado. **Eficacia**: Pendiente, Eficaz
  o No eficaz.
- **Indicadores** que se actualizan solos:
  - NC activas
  - Porcentaje de litros no conformes sobre el total
  - Desvío más frecuente
  - Porcentaje de reprocesos terminados dentro del plazo
  - Cantidad de NC por severidad
- **Imprimir o guardar como PDF**, con el encabezado de tu empresa, el código y la versión del
  registro, más una segunda hoja con las acciones.
- **Descargar a Excel** las NC del período.
- **Quitar duplicados** y **borrar todo**.
- **Nombre y logo de tu empresa** en las hojas impresas (botón **⚙️ Configuración**).
- **Modo claro u oscuro** y diseño que se adapta al celular (las filas se ven como tarjetas).

## Cómo se usa

1. La primera vez, tocá **⚙️ Configuración**: cargá el nombre de la empresa, el logo
   (opcional) y revisá los tipos de desvío.
2. **Cada día**, tocá **+ Agregar NC de hoy** (o **📋 Pegar de QualityOS**) y completá los datos.
   Se guarda sola.
3. Para el seguimiento, elegí **Ver → Abiertas** y actualizá estado, cierre y eficacia.
4. **A fin de mes**, elegí el mes en **Ver** y entregalo con **🖨 Imprimir / PDF** o
   **⬇ Descargar Excel**. No hace falta borrar nada para empezar el mes siguiente.

## Instalarla

1. Abrí el link de la app.
2. **Android (Chrome):** menú ⋮ → *Instalar app* (o *Agregar a la pantalla principal*).
   **iPhone (Safari):** botón Compartir → *Agregar a inicio*.
   **Compu (Chrome o Edge):** ícono de instalar en la barra de direcciones.
3. Listo: después de abrirla una vez, funciona sin señal.

## Tus datos

- Todo lo que cargás queda **solo en tu dispositivo**. No hay cuentas ni servidor.
- Si borrás los datos del navegador o cambiás de equipo, se pierden. Usá **💾 Exportar
  backup** cada tanto para guardar una copia y **⬆ Importar backup** para recuperarla.

## Licencia

Libre para usar, copiar y modificar ([MIT](LICENSE)). © 2026 Maximiliano Roca.

---

Parte de la suite [**QualityOS**](https://github.com/roca-byte) · Información técnica para
modificarla: [DESARROLLO.md](DESARROLLO.md)
