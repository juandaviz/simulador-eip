/* =====================================================================
   params.js — TODOS los parámetros normativos, por ejercicio.
   Para actualizar el simulador a un año nuevo: copiar el bloque del último
   año, cambiar las cifras que hayan cambiado y poner EJERCICIO_ACTUAL.
   Las funciones de js/tax.js leen de TAX.P (el bloque del ejercicio activo).
   Fuentes: Ley 35/2006 (IRPF), Ley 27/2014 (IS), Ley 29/1987 (ISD),
   Ley 19/1991 (IP), Ley 38/2022 (ITSGF), Orden de cotización, guía del
   Modelo 100 y normativa autonómica de Andalucía y Madrid vigente en el año.
   ===================================================================== */
(function (root) {
  'use strict';
  const PARAMS = {};

  PARAMS[2025] = {
    ejercicio: 2025,
    smi: 16576,                 // 14 pagas de 1.184 €
    salarioMedio: 29540,        // EAES 2024 (INE)

    cotizaciones: {
      baseMaxMes: 4909.50,
      trabajador: { cc: 0.047, desempleo: 0.0155, fp: 0.001, mei: 0.0013 },              // 6,48 %
      empresa: { cc: 0.236, desempleo: 0.055, fogasa: 0.002, fp: 0.006, mei: 0.0067, atep: 0.0063 } // ≈ 32,10 %
    },

    irpf: {
      escalas: {
        estatal: [[0, 12450, .095], [12450, 20200, .12], [20200, 35200, .15], [35200, 60000, .185], [60000, 300000, .225], [300000, Infinity, .245]],
        andalucia: [[0, 13000, .095], [13000, 21100, .12], [21100, 35200, .15], [35200, 60000, .185], [60000, Infinity, .225]],
        madrid: [[0, 13362.22, .085], [13362.22, 19004.63, .107], [19004.63, 35425.68, .128], [35425.68, 57320.40, .174], [57320.40, Infinity, .205]],
        ahorro: [[0, 6000, .19], [6000, 50000, .21], [50000, 200000, .23], [200000, 300000, .27], [300000, Infinity, .30]]
      },
      otrosGastos: 2000,
      // Reducción por rendimientos del trabajo (art. 20): [umbral1, importe, pendiente1, umbral2, pendiente2, umbral3]
      reduccionTrabajo: { max: 7302, t1: 14852, p1: 1.75, t2: 17673.52, p2: 1.14, t3: 19747.50 },
      minimo: { personal: 5550, mayor65: 1150, mayor75: 1400, descendientes: [2400, 2700, 4000, 4500], menor3: 2800, ascendiente: 1150, discapacidad33: 3000, discapacidad65: 9000, asistencia: 3000 },
      reducciones: { planPropio: 1500, planEmpresa: 8500, planConyuge: 1000, previsionDiscapacidad: 10000, patrimonioProtegido: 10000, conjuntaBi: 3400, conjuntaMono: 2150, topeRendimientos: 0.30 },
      deducciones: {
        viviendaPct: 0.15, viviendaBase: 9040,
        alquilerPct: 0.1005, alquilerBase: 9040, alquilerBI1: 17707.20, alquilerBI2: 24107.20,
        donativos: { primeros: 250, pct1: 0.80, pct2: 0.40, pct2rec: 0.45, prioritarias1: 0.85, prioritarias2: 0.45, prioritarias2rec: 0.50, partidos: 0.20, partidosBase: 600, otras: 0.10 },
        empresaNuevaPct: 0.50, empresaNuevaBase: 100000,
        vehiculoPct: 0.15, vehiculoBase: 20000, recargaBase: 4000,
        eficiencia: { 20: 5000, 40: 7500, 60: 5000 },
        ley52025: { importe: 340, umbral1: 16576, umbral2: 18276 },
        maternidad: 1200, familiaNumerosa: 1200, familiaNumerosaEspecial: 2400, discapacidadCargo: 1200
      },
      retencionAhorro: 0.19
    },

    // Impuesto sobre Sociedades (Ley 27/2014, redacción de la Ley 7/2024 para 2025)
    sociedades: {
      tipos: {
        general: 0.25,
        microempresa: { hasta: 50000, tipo1: 0.21, tipo2: 0.22 },  // cifra de negocios < 1 M€
        reducidaDimension: 0.24,                                     // cifra de negocios < 10 M€
        nuevaCreacion: 0.15,                                         // dos primeros periodos con base positiva
        cooperativa: 0.20,
        sinFinesLucro: 0.10,
        minimoGrandes: 0.15                                          // tributación mínima, cifra de negocios ≥ 20 M€
      },
      bins: { limitePct: 0.70, limitePctGrande: 0.50, limitePctMuyGrande: 0.25, minimo: 1000000, umbralGrande: 20000000, umbralMuyGrande: 60000000 },
      deducciones: {
        idPct: 0.25, idExcesoPct: 0.42, idPersonalPct: 0.17, itPct: 0.12,
        donativosPct: 0.40, donativosRecPct: 0.50, donativosLimiteBase: 0.15,
        limiteConjunto: 0.25, limiteConjuntoID: 0.50
      },
      pagoFraccionadoPct: 0.18,
      dividendos: { exencionInterna: 0.95 }  // exención del 95 % de dividendos entre sociedades (participación ≥ 5 %)
    },

    // Impuesto sobre Sucesiones y Donaciones (Ley 29/1987; normativa estatal)
    sucesiones: {
      // Tarifa del art. 21: [desde, hasta, tipo]
      escala: [[0, 7993.46, .0765], [7993.46, 15980.91, .085], [15980.91, 23968.36, .0935], [23968.36, 31955.81, .102], [31955.81, 39943.26, .1105], [39943.26, 47930.72, .119], [47930.72, 55918.17, .1275], [55918.17, 63905.62, .136], [63905.62, 71893.07, .1445], [71893.07, 79880.52, .153], [79880.52, 119757.67, .1615], [119757.67, 159634.83, .187], [159634.83, 239389.13, .2125], [239389.13, 398777.54, .255], [398777.54, 797555.08, .2975], [797555.08, Infinity, .34]],
      // Reducciones por parentesco (art. 20.2.a)
      grupos: {
        I: { nombre: 'Grupo I: descendientes menores de 21 años', base: 15956.87, porAnio: 3990.72, max: 47858.59 },
        II: { nombre: 'Grupo II: descendientes de 21 o más, cónyuge y ascendientes', base: 15956.87 },
        III: { nombre: 'Grupo III: hermanos, tíos, sobrinos y afines', base: 7993.46 },
        IV: { nombre: 'Grupo IV: primos y extraños', base: 0 }
      },
      discapacidad: { g33: 47858.59, g65: 150253.03 },
      viviendaHabitual: { pct: 0.95, limite: 122606.47 },
      seguroVida: 9195.49,
      // Coeficientes multiplicadores por patrimonio preexistente (art. 22): tramos y coeficientes por grupo
      coeficientes: { tramos: [402678.11, 2007380.43, 4020770.98], I_II: [1.0, 1.05, 1.10, 1.20], III: [1.5882, 1.6676, 1.7471, 1.9059], IV: [2.0, 2.1, 2.2, 2.4] },
      // Beneficios autonómicos (aproximación docente: reducción propia y bonificación de la cuota por grupo)
      ccaa: {
        and: { nombre: 'Andalucía', reduccionPropia: { I: 1000000, II: 1000000 }, bonificacion: { I: 0.99, II: 0.99, III: 0, IV: 0 } },
        mad: { nombre: 'Comunidad de Madrid', reduccionPropia: {}, bonificacion: { I: 0.99, II: 0.99, III: 0.25, IV: 0 } },
        est: { nombre: 'Sin beneficios autonómicos (normativa estatal)', reduccionPropia: {}, bonificacion: { I: 0, II: 0, III: 0, IV: 0 } }
      }
    },

    // Impuesto sobre el Patrimonio (Ley 19/1991) e Impuesto Temporal de Solidaridad de las Grandes Fortunas (Ley 38/2022)
    patrimonio: {
      minimoExento: 700000,
      viviendaExenta: 300000,
      escala: [[0, 167129.45, .002], [167129.45, 334252.88, .003], [334252.88, 668499.75, .005], [668499.75, 1336999.51, .009], [1336999.51, 2673999.01, .013], [2673999.01, 5347998.03, .017], [5347998.03, 10695996.06, .021], [10695996.06, Infinity, .035]],
      ccaa: {
        and: { nombre: 'Andalucía', bonificacion: 1.00 },
        mad: { nombre: 'Comunidad de Madrid', bonificacion: 1.00 },
        est: { nombre: 'Sin bonificación (escala estatal)', bonificacion: 0 }
      },
      grandesFortunas: {
        minimoExento: 700000,
        escala: [[0, 3000000, 0], [3000000, 5347998.03, .017], [5347998.03, 10695996.06, .021], [10695996.06, Infinity, .035]]
      }
    }
  };

  const EJERCICIO_ACTUAL = 2025;
  root.PARAMS = PARAMS;
  root.EJERCICIO_ACTUAL = EJERCICIO_ACTUAL;
})(typeof window !== 'undefined' ? window : globalThis);
