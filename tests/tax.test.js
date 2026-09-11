/* Tests de js/tax.js. Ejecutar (macOS, sin Node):
     /System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc js/tax.js tests/tax.test.js
   Con Node:  node tests/run.js
   Casos de referencia (IRPF 2025, Andalucía) contrastados a mano
   y con el simulador Renta WEB Open de la AEAT. */
(function () {
  let ok = 0, fail = 0;
  const near = (a, b, tol) => Math.abs(a - b) <= (tol == null ? 0.01 : tol);
  function eq(nombre, got, exp, tol) {
    if (near(got, exp, tol)) { ok++; print('  ok   ' + nombre + ' = ' + got.toFixed(2)); }
    else { fail++; print('  FALLO ' + nombre + ': obtenido ' + got.toFixed(4) + ', esperado ' + exp); }
  }

  print('Escala por tramos (tarifa didáctica del Tema 1)');
  const tarifa = [[0, 100, .05], [100, 200, .10], [200, 300, .20], [300, 500, .30], [500, Infinity, .40]];
  eq('base 220 → 19', TAX.aplicaEscala(220, tarifa).cuota, 19);
  eq('base 150 → 10', TAX.aplicaEscala(150, tarifa).cuota, 10);
  eq('base 350 → 50', TAX.aplicaEscala(350, tarifa).cuota, 50);
  eq('marginal en 350 = 30 %', TAX.aplicaEscala(350, tarifa).marginal, .30, 1e-9);
  const of = TAX.tablaOficial(tarifa);
  eq('tabla oficial: cuota acumulada hasta 500 = 95', of[4].cuota, 95);

  print('Escalas 2025');
  eq('estatal, base 30.000', TAX.aplicaEscala(30000, TAX.ESCALAS.estatal2025).cuota, 1182.75 + 930 + 1470);
  eq('Andalucía, base 30.000', TAX.aplicaEscala(30000, TAX.ESCALAS.andalucia2025).cuota, 1235 + 972 + 1335);
  eq('marginal Andalucía 21.100-35.200 = 30 %', TAX.aplicaEscala(30000, TAX.ESCALAS.estatal2025).marginal + TAX.aplicaEscala(30000, TAX.ESCALAS.andalucia2025).marginal, .30, 1e-9);
  eq('marginal Madrid en 27.277 = 27,8 %', TAX.aplicaEscala(27277.04, TAX.ESCALAS.estatal2025).marginal + TAX.aplicaEscala(27277.04, TAX.ESCALAS.madrid2025).marginal, .278, 1e-9);

  print('Rendimientos del trabajo');
  eq('cotizaciones 30.000 → 1.944', TAX.cotizacionTrabajador(30000), 1944);
  eq('cotizaciones SMI 16.576 → 1.074,12', TAX.cotizacionTrabajador(16576), 1074.12);
  eq('reducción art. 20 con RN 13.501,88 → 7.302', TAX.reduccionTrabajo(13501.88), 7302);
  eq('reducción art. 20 con RN 26.056 → 0', TAX.reduccionTrabajo(26056), 0);

  print('Caso A · Lucía (Málaga, SMI)');
  const lucia = TAX.liquidaIRPF({ trabajoBruto: 16576, retencionesTrabajo: 300, ccaa: 'and', dedAutonomicas: 81 });
  eq('rendimiento neto 13.501,88', lucia.rnTrabajo, 13501.88);
  eq('base liquidable general 6.199,88', lucia.baseLiqGeneral, 6199.88);
  eq('cuota íntegra 123,48', lucia.cuotaIntegra, (6199.88 - 5550) * 0.19);
  eq('deducción Ley 5/2025 = 340', lucia.deducciones.ley52025, 340);
  eq('cuota líquida 0 (las deducciones exceden la cuota)', lucia.cuotaLiquida, 0);
  eq('pierde deducciones por falta de cuota', lucia.totalPerdidas, 340 + 81 - lucia.cuotaIntegra);
  eq('a devolver 300', lucia.resultado, -300);

  print('Caso B · Marcos (Sevilla, 30.000 €, alquiler, ahorro)');
  const marcosBase = { trabajoBruto: 30000, inmobiliarioNeto: 901.04, imputacion: 320, capitalMobiliario: 770, gananciasNetas: 480, retencionesTrabajo: 4200, dedAutonomicas: 150, ccaa: 'and' };
  const M = TAX.liquidaIRPF(marcosBase);
  eq('RN trabajo 26.056', M.rnTrabajo, 26056);
  eq('base general 27.277,04', M.baseGeneral, 27277.04);
  eq('base ahorro 1.250', M.baseAhorro, 1250);
  eq('cuota íntegra 5.490,87', M.cuotaIntegra, 5490.87);
  eq('cuota líquida 5.340,87', M.cuotaLiquida, 5340.87);
  eq('retenciones del ahorro 146,30', M.retencionesAhorro, 146.30);
  eq('a ingresar 994,57', M.resultado, 994.57);
  eq('marginal 30 %', M.marginalGeneral, .30, 1e-9);
  const M2 = TAX.liquidaIRPF(Object.assign({}, marcosBase, { planPensiones: 1000 }));
  eq('con 1.000 € a plan de pensiones: cuota líquida 5.040,87', M2.cuotaLiquida, 5040.87);
  eq('ahorro fiscal = 300 (marginal 30 %)', M.cuotaLiquida - M2.cuotaLiquida, 300);
  const M3 = TAX.liquidaIRPF(Object.assign({}, marcosBase, { ccaa: 'mad', dedAutonomicas: 0 }));
  eq('Madrid: cuota líquida 5.211,21', M3.cuotaLiquida, 5211.21);
  eq('Madrid: cuota autonómica 279,66 menor', M.cuotaAutonomicaGeneral - M3.cuotaAutonomicaGeneral, 279.66);
  eq('Madrid: a ingresar 864,91', M3.resultado, 864.91);

  print('Mínimo personal y familiar');
  eq('2 hijos, uno menor de 3: 5.550+2.400+2.700+2.800', TAX.minimo({ hijos: 2, hijosMenores3: 1 }).total, 13450);

  print('Laffer y Diamond-Saez');
  eq('t* con ETI 0,25 = 80 %', TAX.lafferTstar(0.25), 0.8, 1e-9);
  eq('Diamond-Saez a=1,5 e=0,25 → 72,7 %', TAX.diamondSaez(1.5, 0.25), 1 / 1.375, 1e-9);

  print('\n' + ok + ' correctos, ' + fail + ' fallos');
  globalThis.__fallos = fail;
})();

/* Reducciones y deducciones adicionales */
(function () {
  let ok = 0, fail = 0;
  const eq = (n, g, e, tol) => { if (Math.abs(g - e) <= (tol == null ? 0.01 : tol)) { ok++; print('  ok   ' + n + ' = ' + g.toFixed(2)); } else { fail++; print('  FALLO ' + n + ': ' + g.toFixed(4) + ' ≠ ' + e); } };
  print('Reducciones');
  const r1 = TAX.liquidaIRPF({ trabajoBruto: 30000, planPensiones: 3000, planEmpresa: 9000, retencionesTrabajo: 0 });
  eq('planes: 1.500 propio + 8.500 empresa, tope 30 % de 26.056 = 7.816,80', r1.reducciones.prevision, 7816.80);
  const r2 = TAX.liquidaIRPF({ trabajoBruto: 30000, conjunta: 'bi', planConyuge: 2000, retencionesTrabajo: 0 });
  eq('conjunta 3.400 + cónyuge 1.000', r2.totalReducciones, 4400);
  print('Deducciones estatales');
  const d1 = TAX.liquidaIRPF({ trabajoBruto: 20000, alquilerPagado: 7000, retencionesTrabajo: 0 });
  eq('alquiler con BI 17.704 (< 17.707,20): 10,05 % de 7.000', d1.deducciones.alquiler, 703.5);
  const d2 = TAX.liquidaIRPF({ trabajoBruto: 40000, alquilerPagado: 7000, retencionesTrabajo: 0 });
  eq('alquiler con BI 35.408 (> 24.107,20): 0', d2.deducciones.alquiler, 0);
  const d3 = TAX.liquidaIRPF({ trabajoBruto: 40000, donativos: 1000, donativosTipo: 'partidos', retencionesTrabajo: 0 });
  eq('partidos políticos: 20 % de 600', d3.deducciones.donativos, 120);
  const d4 = TAX.liquidaIRPF({ trabajoBruto: 40000, vehiculoElectrico: 30000, eficienciaImporte: 9000, eficienciaPct: 40, retencionesTrabajo: 0 });
  eq('vehículo 15 % de 20.000 = 3.000', d4.deducciones.vehiculo, 3000);
  eq('eficiencia 40 % de 7.500 = 3.000', d4.deducciones.eficiencia, 3000);
  print('Deducciones andaluzas');
  const a1 = TAX.liquidaIRPF({ trabajoBruto: 22000, andalucia: { alquiler: 9000, deporte: 500, veterinario: 200, numerosa: 'especial', discapacidad: true }, retencionesTrabajo: 0 });
  eq('alquiler 15 % tope 1.200', a1.andalucia.items.find(x => x.clave === 'alquiler').importe, 1200);
  eq('deporte 15 % de 500 = 75', a1.andalucia.items.find(x => x.clave === 'deporte').importe, 75);
  eq('veterinario 30 % de 200 = 60', a1.andalucia.items.find(x => x.clave === 'veterinario').importe, 60);
  eq('familia numerosa especial 400', a1.andalucia.items.find(x => x.clave === 'numerosa').importe, 400);
  eq('total andaluzas 1.885', a1.andalucia.total, 1885);
  const a2 = TAX.liquidaIRPF({ trabajoBruto: 40000, andalucia: { alquiler: 9000, deporte: 500 }, retencionesTrabajo: 0 });
  eq('con renta > 25.000 el alquiler no se aplica', a2.andalucia.items.find(x => x.clave === 'alquiler').importe, 0);
  eq('pero el deporte (límite 80.000) sí', a2.andalucia.items.find(x => x.clave === 'deporte').importe, 75);
  const a3 = TAX.liquidaIRPF({ trabajoBruto: 22000, andalucia: { alquiler: 9000 }, retencionesTrabajo: 0 });
  eq('las autonómicas no pueden superar la cuota autonómica', a3.deduccionesAplicadas.autonomicas, Math.min(1200, a3.cuotaIntegraAutonomica));
  print('Reembolsables');
  const m = TAX.liquidaIRPF({ trabajoBruto: 12000, hijos: 1, hijosMenores3: 1, maternidad: true, familiaNumerosa: 'general', retencionesTrabajo: 0 });
  eq('maternidad + familia numerosa con cuota cero → a devolver 2.400', m.resultado, -2400);
  print('\n' + ok + ' correctos, ' + fail + ' fallos (bloque 2)');
  if (typeof quit === 'function') quit((fail + (globalThis.__fallos || 0)) ? 1 : 0);
})();
