# Registro de No Conformidades

[![QualityOS](https://img.shields.io/badge/QualityOS-calidad_en_planta-0f5c6e?style=flat-square)](https://github.com/roca-byte)

App para llevar el **registro mensual de No Conformidades (NC)** del área de Calidad:
una planilla con todas las NC del mes, sus acciones correctivas e indicadores al día.
Funciona en la compu, la tablet o el celular, y **sin conexión**.

**Abrir la app:** https://roca-byte.github.io/calidad-no-conformidades/

## Para qué sirve

Reemplaza el Excel de No Conformidades: cargás cada NC en una fila, la app sugiere la
severidad y el plazo, calcula los indicadores sola y te deja el registro listo para imprimir
o pasar a Excel.

## Qué podés hacer

- **Una fila por NC**: fecha, lote, cliente, producto, tipo de desvío, severidad, cómo se
  detectó, descripción, litros no conformes y totales, acción correctiva, plazo, estado,
  fecha de cierre, pallets, responsable y verificación de eficacia.
- **Severidad sugerida** según el tipo de desvío (Leve, Moderado o Crítico).
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
- **Nombre y logo de tu empresa** en las hojas impresas (botón **⚙️ Codificación**).
- **Modo claro u oscuro** y diseño que se adapta al celular (las filas se ven como tarjetas).

## Cómo se usa

1. La primera vez, tocá **⚙️ Codificación** y cargá el nombre de la empresa y el logo (opcional).
2. Tocá **+ Agregar fila** y completá los datos de la NC. Se guarda sola.
3. Actualizá el estado, el cierre y la eficacia a medida que avanza cada NC.
4. Para entregar el registro: **🖨 Imprimir / PDF** o **⬇ Descargar Excel**.

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
