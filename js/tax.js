/* =====================================================================
   tax.js — funciones fiscales puras (sin DOM). Se prueban con tests/tax.test.js
   Normativa: IRPF ejercicio 2025 (declaración de 2026).
   Fuentes: Ley 35/2006 (LIRPF) y Ley 5/2025, escalas autonómicas de Andalucía
   y Madrid vigentes en 2025, bases de cotización 2025.
   ===================================================================== */
(function (root) {
  'use strict';
  const TAX = {};

  /* ---------- Escalas ---------- */
  // Cada tramo: [desde, hasta, tipo]
  TAX.ESCALAS = {
    estatal2025: [[0, 12450, .095], [12450, 20200, .12], [20200, 35200, .15], [35200, 60000, .185], [60000, 300000, .225], [300000, Infinity, .245]],
    andalucia2025: [[0, 13000, .095], [13000, 21100, .12], [21100, 35200, .15], [35200, 60000, .185], [60000, Infinity, .225]],
    madrid2025: [[0, 13362.22, .085], [13362.22, 19004.63, .107], [19004.63, 35425.68, .128], [35425.68, 57320.40, .174], [57320.40, Infinity, .205]],
    // Base del ahorro: suma de la parte estatal y la autonómica (mitad y mitad)
    ahorro2025: [[0, 6000, .19], [6000, 50000, .21], [50000, 200000, .23], [200000, 300000, .27], [300000, Infinity, .30]]
  };
  TAX.CCAA = {
    and: { nombre: 'Andalucía', escala: 'andalucia2025' },
    mad: { nombre: 'Comunidad de Madrid', escala: 'madrid2025' },
    est: { nombre: 'Escala estatal duplicada (referencia)', escala: 'estatal2025' }
  };

  // Aplica una escala por tramos a una base. Devuelve cuota, tipo marginal y desglose.
  TAX.aplicaEscala = function (base, tramos) {
    let cuota = 0, marginal = 0;
    const desglose = [];
    for (const [desde, hasta, tipo] of tramos) {
      if (base <= desde) { desglose.push({ desde, hasta, tipo, baseTramo: 0, cuotaTramo: 0, cuotaAcum: cuota, activo: false }); continue; }
      const baseTramo = Math.min(base, hasta) - desde;
      const cuotaTramo = baseTramo * tipo;
      cuota += cuotaTramo;
      const activo = base > desde && base <= hasta;
      if (base > desde) marginal = tipo;
      desglose.push({ desde, hasta, tipo, baseTramo, cuotaTramo, cuotaAcum: cuota, activo });
    }
    return { cuota, marginal, desglose, medio: base > 0 ? cuota / base : 0 };
  };
  // Tabla oficial: "base hasta / cuota íntegra / resto base hasta / tipo"
  TAX.tablaOficial = function (tramos) {
    let acum = 0;
    return tramos.map(([desde, hasta, tipo]) => {
      const fila = { hasta: desde, cuota: acum, resto: hasta === Infinity ? Infinity : hasta - desde, tipo };
      acum += (hasta === Infinity ? 0 : (hasta - desde) * tipo);
      return fila;
    });
  };

  /* ---------- Rendimientos del trabajo ---------- */
  TAX.BASE_MAX_COTIZACION_2025 = 4909.50 * 12; // 58.914 €/año
  TAX.TIPO_COTIZACION_TRABAJADOR = 0.0648;      // 4,70 CC + 1,55 desempleo + 0,10 FP + 0,13 MEI
  TAX.TIPO_COTIZACION_EMPRESA = 0.3210;         // 23,60 CC + 5,50 desempleo + 0,20 FOGASA + 0,60 FP + 0,67 MEI + ~0,63 AT/EP (medio)
  TAX.OTROS_GASTOS = 2000;

  TAX.cotizacionTrabajador = bruto => Math.min(bruto, TAX.BASE_MAX_COTIZACION_2025) * TAX.TIPO_COTIZACION_TRABAJADOR;
  TAX.cotizacionEmpresa = bruto => Math.min(bruto, TAX.BASE_MAX_COTIZACION_2025) * TAX.TIPO_COTIZACION_EMPRESA;

  // Reducción por obtención de rendimientos del trabajo (art. 20 LIRPF, 2025)
  TAX.reduccionTrabajo = function (rendimientoNeto) {
    if (rendimientoNeto <= 14852) return 7302;
    if (rendimientoNeto <= 17673.52) return 7302 - 1.75 * (rendimientoNeto - 14852);
    if (rendimientoNeto <= 19747.50) return 2364.34 - 1.14 * (rendimientoNeto - 17673.52);
    return 0;
  };

  /* ---------- Mínimo personal y familiar (arts. 56-61 LIRPF) ---------- */
  TAX.minimo = function (p) {
    p = p || {};
    let personal = 5550;
    if (p.mayor75) personal += 1150 + 1400; else if (p.mayor65) personal += 1150;
    const porHijo = [2400, 2700, 4000, 4500];
    let descendientes = 0;
    const hijos = p.hijos || 0;
    for (let i = 0; i < hijos; i++) descendientes += i < 4 ? porHijo[i] : 4500;
    descendientes += 2800 * Math.min(p.hijosMenores3 || 0, hijos);
    let ascendientes = 0;
    if (p.ascendientes) ascendientes = 1150 * p.ascendientes;
    let discapacidad = 0;
    if (p.discapacidad === '33') discapacidad = 3000;
    if (p.discapacidad === '65') discapacidad = 9000 + 3000;
    return { personal, descendientes, ascendientes, discapacidad, total: personal + descendientes + ascendientes + discapacidad };
  };

  /* ---------- Deducciones ---------- */
  // Donativos a entidades de la Ley 49/2002 (desde 2024): 80 % hasta 250 €, 40 % del resto (45 % si recurrente)
  TAX.deduccionDonativos = function (importe, recurrente) {
    if (importe <= 0) return 0;
    return Math.min(importe, 250) * 0.80 + Math.max(0, importe - 250) * (recurrente ? 0.45 : 0.40);
  };
  // Vivienda habitual (régimen transitorio, adquisiciones anteriores a 2013): 15 % sobre un máximo de 9.040 €
  TAX.deduccionVivienda = base => Math.min(Math.max(base, 0), 9040) * 0.15;
  // Ley 5/2025: deducción para rendimientos del trabajo bajos (compensa la retención sobre el SMI).
  // 340 € si los rendimientos íntegros del trabajo no superan 16.576 €; decrece linealmente hasta 18.276 €.
  TAX.deduccionLey52025 = function (rendimientosIntegrosTrabajo) {
    const r = rendimientosIntegrosTrabajo;
    if (r <= 16576) return 340;
    if (r < 18276) return 340 - 0.20 * (r - 16576);
    return 0;
  };

  /* ---------- Liquidación completa ---------- */
  /*
   p = {
     trabajoBruto, cotizaciones (null → automáticas), otrosGastos (2000),
     capitalMobiliario, gananciasNetas, inmobiliarioNeto, imputacion,
     planPensiones, ccaa ('and'|'mad'|'est'),
     hijos, hijosMenores3, mayor65, mayor75, ascendientes, discapacidad,
     donativos, donativosRecurrente, viviendaBase, maternidad, dedAutonomicas, aplicarLey52025,
     retencionesTrabajo (null → 15 % del bruto), retencionAhorro (0.19)
   }
  */
  TAX.liquidaIRPF = function (p) {
    p = Object.assign({
      trabajoBruto: 0, cotizaciones: null, otrosGastos: TAX.OTROS_GASTOS,
      capitalMobiliario: 0, gananciasNetas: 0, inmobiliarioNeto: 0, imputacion: 0,
      planPensiones: 0, ccaa: 'and',
      hijos: 0, hijosMenores3: 0, mayor65: false, mayor75: false, ascendientes: 0, discapacidad: 'no',
      donativos: 0, donativosRecurrente: false, viviendaBase: 0, maternidad: false, dedAutonomicas: 0, aplicarLey52025: true,
      retencionesTrabajo: null, retencionAhorro: 0.19
    }, p || {});

    const escEst = TAX.ESCALAS.estatal2025;
    const escAut = TAX.ESCALAS[TAX.CCAA[p.ccaa].escala];
    const escAho = TAX.ESCALAS.ahorro2025;

    // 1. Rendimiento neto del trabajo
    const cotizaciones = p.cotizaciones == null ? TAX.cotizacionTrabajador(p.trabajoBruto) : p.cotizaciones;
    const rnTrabajo = Math.max(0, p.trabajoBruto - cotizaciones - (p.trabajoBruto > 0 ? p.otrosGastos : 0));
    const redTrabajo = p.trabajoBruto > 0 ? Math.min(TAX.reduccionTrabajo(rnTrabajo), rnTrabajo) : 0;
    const rnTrabajoReducido = rnTrabajo - redTrabajo;

    // 2. Bases imponibles
    const baseGeneral = rnTrabajoReducido + Math.max(0, p.inmobiliarioNeto) + Math.max(0, p.imputacion);
    const ahorroBruto = p.capitalMobiliario + p.gananciasNetas;
    const baseAhorro = Math.max(0, ahorroBruto); // el saldo negativo se compensaría en 4 años (no modelado)

    // 3. Reducciones: plan de pensiones (tope 1.500 € y 30 % de los rendimientos del trabajo)
    const pensiones = Math.min(p.planPensiones, 1500, 0.30 * rnTrabajo);
    const baseLiqGeneral = Math.max(0, baseGeneral - pensiones);
    const baseLiqAhorro = baseAhorro;

    // 4. Mínimo personal y familiar (como tramo a tipo cero); el remanente pasa a la base del ahorro
    const min = TAX.minimo(p);
    const minGeneral = Math.min(min.total, baseLiqGeneral);
    const minAhorro = Math.min(min.total - minGeneral, baseLiqAhorro);

    // 5. Cuotas íntegras
    const estG = TAX.aplicaEscala(baseLiqGeneral, escEst), estMin = TAX.aplicaEscala(minGeneral, escEst);
    const autG = TAX.aplicaEscala(baseLiqGeneral, escAut), autMin = TAX.aplicaEscala(minGeneral, escAut);
    const ahoG = TAX.aplicaEscala(baseLiqAhorro, escAho), ahoMin = TAX.aplicaEscala(minAhorro, escAho);
    const cuotaEstatalGeneral = estG.cuota - estMin.cuota;
    const cuotaAutonomicaGeneral = autG.cuota - autMin.cuota;
    const cuotaAhorro = ahoG.cuota - ahoMin.cuota; // mitad estatal, mitad autonómica
    const cuotaIntegraEstatal = cuotaEstatalGeneral + cuotaAhorro / 2;
    const cuotaIntegraAutonomica = cuotaAutonomicaGeneral + cuotaAhorro / 2;
    const cuotaIntegra = cuotaIntegraEstatal + cuotaIntegraAutonomica;

    // 6. Deducciones en cuota (no reembolsables: no pueden dejar la cuota por debajo de cero)
    const ded = {
      vivienda: TAX.deduccionVivienda(p.viviendaBase),
      donativos: TAX.deduccionDonativos(p.donativos, p.donativosRecurrente),
      ley52025: p.aplicarLey52025 ? TAX.deduccionLey52025(p.trabajoBruto) : 0,
      autonomicas: Math.max(0, p.dedAutonomicas)
    };
    // Orden de aplicación: estatales (vivienda, donativos, Ley 5/2025) y después autonómicas
    let restante = cuotaIntegra;
    const aplicadas = {}, perdidas = {};
    for (const k of ['vivienda', 'donativos', 'ley52025', 'autonomicas']) {
      aplicadas[k] = Math.min(ded[k], restante);
      perdidas[k] = ded[k] - aplicadas[k];
      restante -= aplicadas[k];
    }
    const totalDeducciones = Object.values(aplicadas).reduce((a, b) => a + b, 0);
    const totalPerdidas = Object.values(perdidas).reduce((a, b) => a + b, 0);
    const cuotaLiquida = Math.max(0, cuotaIntegra - totalDeducciones);

    // 7. Pagos a cuenta y deducción por maternidad (esta sí es reembolsable)
    const retencionesTrabajo = p.retencionesTrabajo == null ? 0.15 * p.trabajoBruto : p.retencionesTrabajo;
    const retencionesAhorro = Math.max(0, p.capitalMobiliario) * p.retencionAhorro;
    const maternidad = p.maternidad && p.hijosMenores3 > 0 ? 1200 * Math.min(p.hijosMenores3, 3) : 0;
    const pagosACuenta = retencionesTrabajo + retencionesAhorro;
    const cuotaDiferencial = cuotaLiquida - pagosACuenta;
    const resultado = cuotaDiferencial - maternidad; // >0 a ingresar, <0 a devolver

    // 8. Tipos
    const rentaBrutaTotal = p.trabajoBruto + Math.max(0, p.capitalMobiliario) + Math.max(0, p.gananciasNetas) + Math.max(0, p.inmobiliarioNeto) + Math.max(0, p.imputacion);
    const marginalGeneral = baseLiqGeneral > min.total ? estG.marginal + autG.marginal : 0;
    const tipoMedio = rentaBrutaTotal > 0 ? cuotaLiquida / rentaBrutaTotal : 0;
    const tipoMedioBase = (baseLiqGeneral + baseLiqAhorro) > 0 ? cuotaLiquida / (baseLiqGeneral + baseLiqAhorro) : 0;

    return {
      params: p, cotizaciones, otrosGastos: p.trabajoBruto > 0 ? p.otrosGastos : 0, rnTrabajo, redTrabajo, rnTrabajoReducido,
      baseGeneral, baseAhorro, pensiones, baseLiqGeneral, baseLiqAhorro,
      minimo: min, minGeneral, minAhorro,
      escalas: { estatal: estG, autonomica: autG, ahorro: ahoG, estatalMin: estMin, autonomicaMin: autMin },
      cuotaEstatalGeneral, cuotaAutonomicaGeneral, cuotaAhorro, cuotaIntegraEstatal, cuotaIntegraAutonomica, cuotaIntegra,
      deducciones: ded, deduccionesAplicadas: aplicadas, deduccionesPerdidas: perdidas, totalDeducciones, totalPerdidas,
      cuotaLiquida, retencionesTrabajo, retencionesAhorro, pagosACuenta, maternidad, cuotaDiferencial, resultado,
      rentaBrutaTotal, marginalGeneral, marginalEstatal: estG.marginal, marginalAutonomica: autG.marginal, tipoMedio, tipoMedioBase
    };
  };

  /* ---------- Cuña fiscal ---------- */
  // Coste laboral total → cotizaciones empresa → salario bruto → cotizaciones trabajador + IRPF → neto
  TAX.cunaFiscal = function (bruto, opts) {
    opts = opts || {};
    const cotEmpresa = TAX.cotizacionEmpresa(bruto);
    const cotTrabajador = TAX.cotizacionTrabajador(bruto);
    const L = TAX.liquidaIRPF(Object.assign({ trabajoBruto: bruto, retencionesTrabajo: 0 }, opts));
    const irpf = L.cuotaLiquida;
    const coste = bruto + cotEmpresa;
    const neto = bruto - cotTrabajador - irpf;
    return { coste, cotEmpresa, bruto, cotTrabajador, irpf, neto, cuna: coste > 0 ? (coste - neto) / coste : 0, liquidacion: L };
  };

  /* ---------- Curva de Laffer / tipo óptimo ---------- */
  TAX.laffer = (t, base, eti) => t * base * Math.pow(1 - t, eti);
  TAX.lafferTstar = eti => 1 / (1 + eti);
  // Diamond-Saez (2011): tipo marginal máximo que maximiza la recaudación, τ* = 1 / (1 + a·e)
  TAX.diamondSaez = (a, e) => 1 / (1 + a * e);

  /* ---------- Exceso de gravamen (Harberger) ---------- */
  TAX.harberger = (t, base, elas) => ({
    baseTrasImpuesto: base * (1 - elas * t / (1 + t)),
    recaudacion: t * base * (1 - elas * t / (1 + t)),
    exceso: 0.5 * elas * t * t * base / (1 + t)
  });

  root.TAX = TAX;
})(typeof window !== 'undefined' ? window : globalThis);
