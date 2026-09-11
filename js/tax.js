/* =====================================================================
   tax.js — funciones fiscales puras (sin DOM). Se prueban con tests/tax.test.js
   Normativa: IRPF ejercicio 2025 (declaración de 2026).
   Fuentes: Ley 35/2006 (LIRPF) y Ley 5/2025, escalas autonómicas de Andalucía
   y Madrid vigentes en 2025, bases de cotización 2025.
   ===================================================================== */
(function (root) {
  'use strict';
  const TAX = {};

  /* ---------- Parámetros del ejercicio activo ---------- */
  TAX.setYear = function (y) {
    const P = root.PARAMS && root.PARAMS[y];
    if (!P) throw new Error('No hay parámetros para el ejercicio ' + y);
    TAX.P = P; TAX.ejercicio = y;
    TAX.ESCALAS = {
      estatal2025: P.irpf.escalas.estatal, andalucia2025: P.irpf.escalas.andalucia, madrid2025: P.irpf.escalas.madrid, ahorro2025: P.irpf.escalas.ahorro,
      estatal: P.irpf.escalas.estatal, andalucia: P.irpf.escalas.andalucia, madrid: P.irpf.escalas.madrid, ahorro: P.irpf.escalas.ahorro
    };
    TAX.BASE_MAX_COTIZACION_2025 = P.cotizaciones.baseMaxMes * 12;
    TAX.TIPO_COTIZACION_TRABAJADOR = Object.values(P.cotizaciones.trabajador).reduce((a, b) => a + b, 0);
    TAX.TIPO_COTIZACION_EMPRESA = Object.values(P.cotizaciones.empresa).reduce((a, b) => a + b, 0);
    TAX.OTROS_GASTOS = P.irpf.otrosGastos;
  };
  TAX.CCAA = {
    and: { nombre: 'Andalucía', escala: 'andalucia' },
    mad: { nombre: 'Comunidad de Madrid', escala: 'madrid' },
    est: { nombre: 'Escala estatal duplicada (referencia)', escala: 'estatal' }
  };
  TAX.setYear(root.EJERCICIO_ACTUAL || 2025);

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
  TAX.cotizacionTrabajador = bruto => Math.min(bruto, TAX.BASE_MAX_COTIZACION_2025) * TAX.TIPO_COTIZACION_TRABAJADOR;
  TAX.cotizacionEmpresa = bruto => Math.min(bruto, TAX.BASE_MAX_COTIZACION_2025) * TAX.TIPO_COTIZACION_EMPRESA;

  // Reducción por obtención de rendimientos del trabajo (art. 20 LIRPF, 2025)
  TAX.reduccionTrabajo = function (rendimientoNeto) {
    const r = TAX.P.irpf.reduccionTrabajo;
    if (rendimientoNeto <= r.t1) return r.max;
    if (rendimientoNeto <= r.t2) return r.max - r.p1 * (rendimientoNeto - r.t1);
    if (rendimientoNeto <= r.t3) return (r.max - r.p1 * (r.t2 - r.t1)) - r.p2 * (rendimientoNeto - r.t2);
    return 0;
  };

  /* ---------- Mínimo personal y familiar (arts. 56-61 LIRPF) ---------- */
  TAX.minimo = function (p) {
    p = p || {}; const M = TAX.P.irpf.minimo;
    let personal = M.personal;
    if (p.mayor75) personal += M.mayor65 + M.mayor75; else if (p.mayor65) personal += M.mayor65;
    let descendientes = 0;
    const hijos = p.hijos || 0;
    for (let i = 0; i < hijos; i++) descendientes += i < M.descendientes.length ? M.descendientes[i] : M.descendientes[M.descendientes.length - 1];
    descendientes += M.menor3 * Math.min(p.hijosMenores3 || 0, hijos);
    const ascendientes = M.ascendiente * (p.ascendientes || 0);
    let discapacidad = 0;
    if (p.discapacidad === '33') discapacidad = M.discapacidad33;
    if (p.discapacidad === '65') discapacidad = M.discapacidad65 + M.asistencia;
    return { personal, descendientes, ascendientes, discapacidad, total: personal + descendientes + ascendientes + discapacidad };
  };

  /* ---------- Deducciones ---------- */
  // Donativos a entidades de la Ley 49/2002 (desde 2024): 80 % hasta 250 €, 40 % del resto (45 % si recurrente)
  TAX.deduccionDonativos = function (importe, recurrente) {
    const D = TAX.P.irpf.deducciones.donativos;
    if (importe <= 0) return 0;
    return Math.min(importe, D.primeros) * D.pct1 + Math.max(0, importe - D.primeros) * (recurrente ? D.pct2rec : D.pct2);
  };
  // Vivienda habitual (régimen transitorio, adquisiciones anteriores a 2013): 15 % sobre un máximo de 9.040 €
  TAX.deduccionVivienda = base => Math.min(Math.max(base, 0), TAX.P.irpf.deducciones.viviendaBase) * TAX.P.irpf.deducciones.viviendaPct;
  // Ley 5/2025: deducción para rendimientos del trabajo bajos (compensa la retención sobre el SMI).
  // 340 € si los rendimientos íntegros del trabajo no superan 16.576 €; decrece linealmente hasta 18.276 €.
  TAX.deduccionLey52025 = function (rendimientosIntegrosTrabajo) {
    const L = TAX.P.irpf.deducciones.ley52025, r = rendimientosIntegrosTrabajo;
    if (r <= L.umbral1) return L.importe;
    if (r < L.umbral2) return L.importe * (1 - (r - L.umbral1) / (L.umbral2 - L.umbral1));
    return 0;
  };

  /* ---------- Deducciones autonómicas de Andalucía (2025) ---------- */
  // a: importes/indicadores introducidos; ctx: { renta: base imponible general + ahorro, conjunta: bool, hijos }
  // Límites de renta: individual / conjunta. Fuente: guía del Modelo 100, apartado 10.1.
  TAX.ANDALUCIA = [
    { clave: 'nacimiento', nombre: 'Nacimiento, adopción o acogimiento', regla: '200 € por hijo nacido o adoptado en el año', tipo: 'n', limite: [25000, 30000], calc: n => 200 * n },
    { clave: 'adopcionInt', nombre: 'Adopción internacional', regla: '600 € por hijo', tipo: 'n', limite: [80000, 100000], calc: n => 600 * n },
    { clave: 'monoparental', nombre: 'Familia monoparental', regla: '100 €, más 100 € por ascendiente a cargo', tipo: 'n', limite: [80000, 100000], calc: n => 100 + 100 * n, nLabel: 'ascendientes a cargo' },
    { clave: 'numerosa', nombre: 'Familia numerosa', regla: '200 € (general) o 400 € (especial)', tipo: 'sel', opciones: [['general', 'General, 200 €'], ['especial', 'Especial, 400 €']], limite: [25000, 30000], calc: v => v === 'especial' ? 400 : 200 },
    { clave: 'educacion', nombre: 'Gastos de enseñanza de idiomas o informática', regla: '15 % del gasto, máximo 150 € por descendiente', tipo: 'eur', limite: [80000, 100000], calc: (x, ctx) => Math.min(0.15 * x, 150 * Math.max(1, ctx.hijos)) },
    { clave: 'discapacidad', nombre: 'Contribuyente con discapacidad', regla: '150 €', tipo: 'si', limite: [25000, 30000], calc: () => 150 },
    { clave: 'conyugeDisc', nombre: 'Cónyuge o pareja con discapacidad ≥ 65 %', regla: '100 €', tipo: 'si', limite: [25000, 30000], calc: () => 100 },
    { clave: 'asistencia', nombre: 'Asistencia a personas con discapacidad', regla: '100 € por persona asistida', tipo: 'n', limite: [80000, 100000], calc: n => 100 * n },
    { clave: 'celiaca', nombre: 'Enfermedad celíaca', regla: '100 € por miembro diagnosticado', tipo: 'n', limite: [80000, 100000], calc: n => 100 * n },
    { clave: 'viviendaProt', nombre: 'Vivienda habitual protegida o de personas jóvenes', regla: '6 % de lo pagado, base máxima 9.040 €', tipo: 'eur', limite: [25000, 30000], calc: x => 0.06 * Math.min(x, 9040) },
    { clave: 'alquiler', nombre: 'Alquiler de la vivienda habitual', regla: '15 % del alquiler, máximo 1.200 €', tipo: 'eur', limite: [25000, 30000], calc: x => Math.min(0.15 * x, 1200) },
    { clave: 'acciones', nombre: 'Inversión en acciones o participaciones de nuevas sociedades', regla: '20 %, máximo 4.000 €', tipo: 'eur', limite: null, calc: x => Math.min(0.20 * x, 4000) },
    { clave: 'domestica', nombre: 'Ayuda doméstica', regla: '20 % de la cotización pagada, máximo 500 €', tipo: 'eur', limite: null, calc: x => Math.min(0.20 * x, 500) },
    { clave: 'defensa', nombre: 'Defensa jurídica de la relación laboral', regla: 'gasto pagado, máximo 200 €', tipo: 'eur', limite: null, calc: x => Math.min(x, 200) },
    { clave: 'ecologico', nombre: 'Donativos con finalidad ecológica', regla: '10 %, máximo 150 €', tipo: 'eur', limite: [80000, 100000], calc: x => Math.min(0.10 * x, 150) },
    { clave: 'deporte', nombre: 'Ejercicio físico y práctica deportiva', regla: '15 % de las cuotas, máximo 100 €', tipo: 'eur', limite: [80000, 100000], calc: x => Math.min(0.15 * x, 100) },
    { clave: 'veterinario', nombre: 'Gastos veterinarios y tenencia de animales', regla: '30 %, máximo 100 €', tipo: 'eur', limite: [80000, 100000], calc: x => Math.min(0.30 * x, 100) }
  ];
  TAX.deduccionesAndalucia = function (a, ctx) {
    a = a || {}; ctx = ctx || {};
    const items = [];
    let total = 0;
    for (const d of TAX.ANDALUCIA) {
      const v = a[d.clave];
      if (v == null || v === false || v === 0 || v === '' || v === 'no') continue;
      const lim = d.limite ? d.limite[ctx.conjunta ? 1 : 0] : null;
      const excede = lim != null && ctx.renta > lim;
      const bruto = d.calc(d.tipo === 'sel' ? v : (d.tipo === 'si' ? 1 : Number(v)), ctx);
      const importe = excede ? 0 : Math.max(0, bruto);
      items.push({ clave: d.clave, nombre: d.nombre, importe, bruto, excede, limite: lim });
      total += importe;
    }
    return { items, total };
  };

  /* ---------- Deducciones estatales (cuantías a partir de los importes introducidos) ---------- */
  TAX.deduccionesEstatales = function (p, baseImponible) {
    const d = {};
    d.vivienda = TAX.deduccionVivienda(p.viviendaBase);
    // Alquiler (régimen transitorio): 10,05 % de lo pagado; base máxima 9.040 € hasta BI 17.707,20, decreciente hasta 24.107,20
    let baseAlq = 0;
    const K = TAX.P.irpf.deducciones;
    if (p.alquilerPagado > 0 && baseImponible < K.alquilerBI2) {
      const max = baseImponible <= K.alquilerBI1 ? K.alquilerBase : K.alquilerBase * (1 - (baseImponible - K.alquilerBI1) / (K.alquilerBI2 - K.alquilerBI1));
      baseAlq = Math.min(p.alquilerPagado, Math.max(0, max));
    }
    d.alquiler = K.alquilerPct * baseAlq;
    // Donativos según destino
    const x = Math.max(0, p.donativos || 0);
    switch (p.donativosTipo) {
      case 'prioritarias': d.donativos = Math.min(x, K.donativos.primeros) * K.donativos.prioritarias1 + Math.max(0, x - K.donativos.primeros) * (p.donativosRecurrente ? K.donativos.prioritarias2rec : K.donativos.prioritarias2); break;
      case 'partidos': d.donativos = K.donativos.partidos * Math.min(x, K.donativos.partidosBase); break;
      case 'otras': d.donativos = K.donativos.otras * x; break;
      default: d.donativos = TAX.deduccionDonativos(x, p.donativosRecurrente);
    }
    d.empresaNueva = K.empresaNuevaPct * Math.min(Math.max(0, p.empresaNueva || 0), K.empresaNuevaBase);
    d.vehiculo = K.vehiculoPct * Math.min(Math.max(0, p.vehiculoElectrico || 0), K.vehiculoBase) + K.vehiculoPct * Math.min(Math.max(0, p.puntoRecarga || 0), K.recargaBase);
    const baseEf = K.eficiencia[p.eficienciaPct] || 0;
    d.eficiencia = (p.eficienciaPct / 100) * Math.min(Math.max(0, p.eficienciaImporte || 0), baseEf);
    d.ley52025 = p.aplicarLey52025 ? TAX.deduccionLey52025(p.trabajoBruto) : 0;
    return d;
  };

  /* ---------- Liquidación completa ---------- */
  /*
   p = {
     trabajoBruto, cotizaciones (null → automáticas), otrosGastos (2000),
     capitalMobiliario, gananciasNetas, inmobiliarioNeto, imputacion,
     ccaa ('and'|'mad'|'est'), hijos, hijosMenores3, mayor65, mayor75, ascendientes, discapacidad,
     — reducciones —  planPensiones, planEmpresa, planConyuge, pensionCompensatoria, previsionDiscapacidad, patrimonioProtegido, conjunta ('no'|'bi'|'mono')
     — deducciones estatales —  viviendaBase, alquilerPagado, donativos, donativosTipo, donativosRecurrente, empresaNueva, vehiculoElectrico, puntoRecarga, eficienciaImporte, eficienciaPct, aplicarLey52025
     — autonómicas —  dedAutonomicas (importe directo), andalucia (objeto para TAX.deduccionesAndalucia; solo si ccaa = 'and')
     — reembolsables —  maternidad, familiaNumerosa ('no'|'general'|'especial'), descendientesDiscapacidad
     retencionesTrabajo (null → 15 % del bruto), retencionAhorro (0.19)
   }
  */
  TAX.liquidaIRPF = function (p) {
    p = Object.assign({
      trabajoBruto: 0, cotizaciones: null, otrosGastos: TAX.OTROS_GASTOS,
      capitalMobiliario: 0, gananciasNetas: 0, inmobiliarioNeto: 0, imputacion: 0,
      ccaa: 'and', hijos: 0, hijosMenores3: 0, mayor65: false, mayor75: false, ascendientes: 0, discapacidad: 'no',
      planPensiones: 0, planEmpresa: 0, planConyuge: 0, pensionCompensatoria: 0, previsionDiscapacidad: 0, patrimonioProtegido: 0, conjunta: 'no',
      viviendaBase: 0, alquilerPagado: 0, donativos: 0, donativosTipo: '49', donativosRecurrente: false, empresaNueva: 0, vehiculoElectrico: 0, puntoRecarga: 0, eficienciaImporte: 0, eficienciaPct: 0, aplicarLey52025: true,
      dedAutonomicas: 0, andalucia: null,
      maternidad: false, familiaNumerosa: 'no', descendientesDiscapacidad: 0,
      retencionesTrabajo: null, retencionAhorro: TAX.P.irpf.retencionAhorro
    }, p || {});

    const escEst = TAX.ESCALAS.estatal;
    const escAut = TAX.ESCALAS[TAX.CCAA[p.ccaa].escala];
    const escAho = TAX.ESCALAS.ahorro;

    // 1. Rendimiento neto del trabajo
    const cotizaciones = p.cotizaciones == null ? TAX.cotizacionTrabajador(p.trabajoBruto) : p.cotizaciones;
    const rnTrabajo = Math.max(0, p.trabajoBruto - cotizaciones - (p.trabajoBruto > 0 ? p.otrosGastos : 0));
    const redTrabajo = p.trabajoBruto > 0 ? Math.min(TAX.reduccionTrabajo(rnTrabajo), rnTrabajo) : 0;
    const rnTrabajoReducido = rnTrabajo - redTrabajo;

    // 2. Bases imponibles
    const baseGeneral = rnTrabajoReducido + Math.max(0, p.inmobiliarioNeto) + Math.max(0, p.imputacion);
    const ahorroBruto = p.capitalMobiliario + p.gananciasNetas;
    const baseAhorro = Math.max(0, ahorroBruto); // el saldo negativo se compensaría en 4 años (no modelado)
    const baseImponible = baseGeneral + baseAhorro;

    // 3. Reducciones de la base imponible general
    const red = {};
    const RR = TAX.P.irpf.reducciones;
    const propio = Math.min(Math.max(0, p.planPensiones), RR.planPropio);
    const empresa = Math.min(Math.max(0, p.planEmpresa), RR.planEmpresa);
    red.prevision = Math.min(propio + empresa, RR.topeRendimientos * rnTrabajo);           // límite conjunto: 30 % de los rendimientos del trabajo
    red.conyuge = Math.min(Math.max(0, p.planConyuge), RR.planConyuge);
    red.pensionCompensatoria = Math.max(0, p.pensionCompensatoria);
    red.previsionDiscapacidad = Math.min(Math.max(0, p.previsionDiscapacidad), RR.previsionDiscapacidad);
    red.patrimonioProtegido = Math.min(Math.max(0, p.patrimonioProtegido), RR.patrimonioProtegido);
    red.conjunta = p.conjunta === 'bi' ? RR.conjuntaBi : p.conjunta === 'mono' ? RR.conjuntaMono : 0;
    const totalReducciones = Object.values(red).reduce((a, b) => a + b, 0);
    const pensiones = red.prevision; // compatibilidad con versiones anteriores
    const reduccionesGeneral = Math.min(totalReducciones, baseGeneral);
    const reduccionesAhorro = Math.min(totalReducciones - reduccionesGeneral, baseAhorro); // el remanente pasa a la base del ahorro
    const baseLiqGeneral = baseGeneral - reduccionesGeneral;
    const baseLiqAhorro = baseAhorro - reduccionesAhorro;

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

    // 6. Deducciones en cuota (no reembolsables)
    const ded = TAX.deduccionesEstatales(p, baseImponible);
    const and = (p.ccaa === 'and' && p.andalucia) ? TAX.deduccionesAndalucia(p.andalucia, { renta: baseImponible, conjunta: p.conjunta !== 'no', hijos: p.hijos }) : { items: [], total: 0 };
    ded.autonomicas = Math.max(0, p.dedAutonomicas) + and.total;
    // Las estatales minoran la cuota íntegra total; las autonómicas, solo lo que quede de la cuota autonómica
    let restante = cuotaIntegra;
    const aplicadas = {}, perdidas = {};
    for (const k of ['vivienda', 'alquiler', 'donativos', 'empresaNueva', 'vehiculo', 'eficiencia', 'ley52025']) {
      aplicadas[k] = Math.min(ded[k], restante); perdidas[k] = ded[k] - aplicadas[k]; restante -= aplicadas[k];
    }
    const topeAut = Math.min(restante, cuotaIntegraAutonomica);
    aplicadas.autonomicas = Math.min(ded.autonomicas, topeAut); perdidas.autonomicas = ded.autonomicas - aplicadas.autonomicas; restante -= aplicadas.autonomicas;
    const totalDeducciones = Object.values(aplicadas).reduce((a, b) => a + b, 0);
    const totalPerdidas = Object.values(perdidas).reduce((a, b) => a + b, 0);
    const cuotaLiquida = Math.max(0, cuotaIntegra - totalDeducciones);

    // 7. Pagos a cuenta y deducciones reembolsables (minoran la cuota diferencial, puedan o no absorberse)
    const retencionesTrabajo = p.retencionesTrabajo == null ? 0.15 * p.trabajoBruto : p.retencionesTrabajo;
    const retencionesAhorro = Math.max(0, p.capitalMobiliario) * p.retencionAhorro;
    const KD = TAX.P.irpf.deducciones;
    const reemb = {
      maternidad: p.maternidad && p.hijosMenores3 > 0 ? KD.maternidad * p.hijosMenores3 : 0,
      familiaNumerosa: p.familiaNumerosa === 'especial' ? KD.familiaNumerosaEspecial : p.familiaNumerosa === 'general' ? KD.familiaNumerosa : 0,
      descendientesDiscapacidad: KD.discapacidadCargo * Math.max(0, p.descendientesDiscapacidad || 0)
    };
    const maternidad = reemb.maternidad;
    const reembolsables = reemb.maternidad + reemb.familiaNumerosa + reemb.descendientesDiscapacidad;
    const pagosACuenta = retencionesTrabajo + retencionesAhorro;
    const cuotaDiferencial = cuotaLiquida - pagosACuenta;
    const resultado = cuotaDiferencial - reembolsables; // >0 a ingresar, <0 a devolver

    // 8. Tipos
    const rentaBrutaTotal = p.trabajoBruto + Math.max(0, p.capitalMobiliario) + Math.max(0, p.gananciasNetas) + Math.max(0, p.inmobiliarioNeto) + Math.max(0, p.imputacion);
    const marginalGeneral = baseLiqGeneral > min.total ? estG.marginal + autG.marginal : 0;
    const tipoMedio = rentaBrutaTotal > 0 ? cuotaLiquida / rentaBrutaTotal : 0;
    const tipoMedioBase = (baseLiqGeneral + baseLiqAhorro) > 0 ? cuotaLiquida / (baseLiqGeneral + baseLiqAhorro) : 0;

    return {
      params: p, cotizaciones, otrosGastos: p.trabajoBruto > 0 ? p.otrosGastos : 0, rnTrabajo, redTrabajo, rnTrabajoReducido,
      baseGeneral, baseAhorro, baseImponible, reducciones: red, totalReducciones, reduccionesGeneral, reduccionesAhorro, pensiones, baseLiqGeneral, baseLiqAhorro,
      minimo: min, minGeneral, minAhorro,
      escalas: { estatal: estG, autonomica: autG, ahorro: ahoG, estatalMin: estMin, autonomicaMin: autMin },
      cuotaEstatalGeneral, cuotaAutonomicaGeneral, cuotaAhorro, cuotaIntegraEstatal, cuotaIntegraAutonomica, cuotaIntegra,
      deducciones: ded, andalucia: and, deduccionesAplicadas: aplicadas, deduccionesPerdidas: perdidas, totalDeducciones, totalPerdidas,
      cuotaLiquida, retencionesTrabajo, retencionesAhorro, pagosACuenta, reembolsables: reemb, totalReembolsables: reembolsables, maternidad, cuotaDiferencial, resultado,
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
