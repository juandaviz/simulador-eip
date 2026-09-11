# Simulador de Hacienda Pública

Simuladores interactivos para **Hacienda Pública II** (Grado en Economía) y **Economía de los Ingresos Públicos** (MAES), Universidad de Málaga. Página estática: se sirve desde GitHub Pages y funciona sin conexión (Chart.js va incluido en `vendor/`).

**Web:** https://juandaviz.github.io/simulador-eip/

## Módulos

| Módulo | Tema HP II | Qué enseña |
|---|---|---|
| Liquidar un impuesto | Tema 1 | La cascada hecho imponible → deuda tributaria con tarifa editable; cuota = área bajo la escalera del marginal; proporcional, progresivo y de suma fija. |
| IRPF 2025 | Tema 3 | Liquidación completa con escala estatal y autonómica (Andalucía, Madrid), base general y del ahorro, mínimo como tramo a tipo cero, y casillas con cuantía para cada reducción de la base y cada deducción de la cuota (estatales, reembolsables y las 17 autonómicas de Andalucía). |
| Impuesto sobre sociedades | Tema 4 | Cuenta de resultados, ajustes extracontables, compensación de bases negativas, tipos por tamaño, deducciones con su límite, tributación mínima; doble imposición del dividendo. |
| Sucesiones | Tema 5 | Herencia de un heredero: reducciones por parentesco, discapacidad y vivienda, escala, coeficiente multiplicador y bonificaciones autonómicas; comparación entre comunidades. |
| Patrimonio y grandes fortunas | Tema 5 | Impuesto sobre el Patrimonio con mínimo exento, exenciones, límite conjunto con el IRPF y bonificación autonómica; el ITSGF como impuesto que neutraliza la bonificación. |
| IVA en cadena | Tema 6 | Repercutido, soportado e ingresado por fases; exención intermedia (piramidación), impuesto en cascada, IVA absorbido cuando el precio no puede subir. |
| Incidencia | Tema 7 | Reparto de la carga según elasticidades; la incidencia legal no cambia la económica. |
| Exceso de gravamen | Tema 8 | Harberger: el exceso crece con el cuadrado del tipo; coste marginal de los fondos públicos. |
| Laffer y tipo óptimo | Tema 8 | Curva de Laffer con ETI y tipo marginal máximo de Diamond y Saez, τ* = 1/(1 + a·e). |
| Ramsey | Tema 8 | Regla de la elasticidad inversa y el dilema eficiencia-equidad. |
| Bunching | Tema 9 | Amontonamiento en un kink de la tarifa (Saez 2010) y cómo se recupera la elasticidad. |
| Oferta de trabajo | Tema 9 | Restricción presupuestaria con tramos y prestación condicionada, efecto renta y sustitución (Slutsky numérico), tipo marginal efectivo y trampa de la pobreza. |
| Progresividad en frío | Tema 10 | Qué pasa con el tipo medio cuando la tarifa no se deflacta. |
| Cuña fiscal | Tema 11 | Del coste laboral al salario neto: cotizaciones de empresa y trabajador e IRPF. |
| Cuentas públicas | Tema 12 | Ingresos, gastos, déficit y deuda a 10 años, calibrado a Eurostat 2025. |

Cada módulo tiene **escenarios predefinidos**, un botón **«Restablecer (a cero)»** para trabajar el ejercicio a mano, un **modo examen** que oculta resultados, tablas y gráficos hasta pulsar «Comprobar», una caja **«Qué observar»** con pregunta de repaso, un texto de lectura que traduce los números, y botón para **descargar cada gráfico en PNG**.

## Enlaces con estado

La URL guarda el escenario: `#irpf?irpf-bruto-num=45000&irpf-ccaa=mad` abre el IRPF con ese salario en Madrid. Sirve para enlazar un escenario concreto desde las diapositivas o desde el Campus Virtual.

## Estructura

```
index.html          cabecera, barra de navegación y carga de módulos (en el orden de la barra)
css/style.css       estilos y paleta (la misma de los materiales de clase)
js/core.js          registro de módulos, navegación por #hash, estado en la URL, presets, tema de Chart.js, exportación PNG
js/params.js        TODOS los parámetros normativos por ejercicio (escalas, cotizaciones, mínimos, reducciones, deducciones, IS, ISD, IP, ITSGF)
js/tax.js           funciones fiscales puras que leen de los parámetros: liquidación del IRPF, cuña fiscal, Laffer, Harberger
js/modules/*.js     un archivo por módulo (contrato en js/core.js)
tests/              tests de tax.js y comprobación de módulos
vendor/chart.umd.js Chart.js 4.4.1
```

## Tests

Sin Node, con el motor JavaScript de macOS:

```
JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc
$JSC js/params.js js/tax.js tests/tax.test.js
for m in js/modules/*.js; do $JSC js/params.js js/tax.js tests/stub.js "$m" tests/check-module.js; done
```

Los tests del IRPF reproducen liquidaciones de referencia contrastadas con Renta WEB Open de la AEAT.

## Normativa y datos

- IRPF ejercicio 2025: Ley 35/2006 (escala estatal, reducción del art. 20, mínimos, reducciones de la base, deducciones estatales y reembolsables), Ley 5/2025 (deducción para rendimientos del trabajo bajos), escalas autonómicas 2025 de Andalucía y Madrid, deducciones autonómicas de Andalucía (guía del Modelo 100, apartado 10.1) y bases de cotización 2025. Para otras comunidades, las deducciones autonómicas se introducen como importe.
- Cuentas públicas: Eurostat, `gov_10a_main` y `gov_10a_taxag`, actualización de julio de 2026. Cifras de 2025 provisionales.

## Actualizar a un ejercicio nuevo

Copiar el bloque `PARAMS[2025]` de `js/params.js` como `PARAMS[2026]`, cambiar las cifras que hayan cambiado (escalas, bases de cotización, SMI, mínimos, límites de reducciones y deducciones, tipos del IS, tablas del ISD y del IP) y poner `EJERCICIO_ACTUAL = 2026`. Los módulos no llevan cifras normativas: todas salen de ahí. Después, pasar los tests.

## Añadir un módulo

Crear `js/modules/nombre.js` siguiendo el contrato de `js/core.js` (ver `irpf.js` como ejemplo), añadir la etiqueta `<script>` en `index.html` en la posición deseada de la barra, y validar con `tests/check-module.js`.
