/* =====================================================================
   Módulo «Cuentas públicas» (Tema 12) — ingresos, gastos y sostenibilidad
   Porta el simulador fiscal del prototipo (legacy_index.html, panel-5:
   FISCAL_BASELINE + updateFiscal) y lo recalibra a las cuentas de las
   Administraciones Públicas de 2025.

   CALIBRACIÓN (aproximada, Eurostat — cuentas de las AAPP, actualización
   de julio de 2026; deuda del Banco de España, cierre de 2025):
     PIB 2025 ................................ 1.690.000 M€
     Ingresos no financieros ................. 42,9 % del PIB
     Gastos no financieros ................... 45,3 % del PIB
     Déficit ................................. 2,4 % del PIB
     Deuda pública (PDE) ..................... 101,5 % del PIB
     Intereses ............................... 2,4 % del PIB
   Ingresos (% del PIB), desglose coherente con Eurostat:
     Impuestos sobre la producción y las importaciones .... 11,3
        de los cuales IVA 7,0 y especiales y otros indirectos 4,3
     Impuestos corrientes sobre la renta y el patrimonio .. 13,1
        de los cuales IRPF 8,4, Sociedades 2,4 y otros 2,3
     Impuestos sobre el capital ........................... 0,4
     Cotizaciones sociales ................................ 13,2
     Resto de ingresos .................................... 4,9
     Suma: 11,3 + 13,1 + 0,4 + 13,2 + 4,9 = 42,9 ✔
   Gastos (% del PIB):
     pensiones 13,0 + sanidad 6,2 + educación 4,2 + desempleo 1,2
     + intereses 2,4 + defensa 1,4 + resto 16,9 = 45,3 ✔
   El gasto primario (sin intereses) es 42,9: exactamente igual a los
   ingresos, de modo que en la línea base el SALDO PRIMARIO ES CERO y
   todo el déficit son intereses. Con el tipo implícito por defecto
   (2,4 %) los intereses del año 1 son 1,015 · 0,024 = 2,44 % del PIB.

   Dinámica de la deuda (la del prototipo, ampliada):
     d(t+1) = d(t) · (1 + r) / (1 + g_nominal) − sp
     saldo primario estabilizador: sp* = d · (r − g) / (1 + g)
   ===================================================================== */
(function () {
  'use strict';
  const F = SIM.fmt, C = SIM.color;

  // Línea base 2025 (% del PIB salvo indicación)
  const B = {
    anio: 2025,
    pib: 1690000,          // M€
    // Ingresos
    irpf: 8.4, iva: 7.0, is: 2.4, especiales: 4.3, otrosDir: 2.3, capital: 0.4, css: 13.2, restoIng: 4.9,
    // Gastos
    pensiones: 13.0, sanidad: 6.2, educacion: 4.2, desempleo: 1.2, defensa: 1.4, restoGas: 16.9, intereses: 2.4,
    // Deuda
    deuda: 101.5
  };
  B.ingresos = B.irpf + B.iva + B.is + B.especiales + B.otrosDir + B.capital + B.css + B.restoIng;   // 42,9
  B.impuestos = B.ingresos - B.restoIng;                                                             // 38,0 (presión fiscal)
  B.gastoPrimario = B.pensiones + B.sanidad + B.educacion + B.desempleo + B.defensa + B.restoGas;     // 42,9
  B.gastos = B.gastoPrimario + B.intereses;                                                          // 45,3

  const M = v => v / 100 * B.pib;   // de % del PIB a millones de euros

  /* ---------- HTML ---------- */
  const html = `
  <div class="grid-2">
    <div class="card">
      <h3>Variación de ingresos (pp del PIB)</h3>
      ${SIM.slider('fis-irpf', { label: 'IRPF', help: 'base 8,4', min: -2, max: 2, step: 0.1, value: 0 })}
      ${SIM.slider('fis-iva', { label: 'IVA', help: 'base 7,0', min: -2, max: 2, step: 0.1, value: 0 })}
      ${SIM.slider('fis-is', { label: 'Impuesto sobre sociedades', help: 'base 2,4', min: -1, max: 1, step: 0.1, value: 0 })}
      ${SIM.slider('fis-esp', { label: 'Impuestos especiales y otros indirectos', help: 'base 4,3', min: -1, max: 1, step: 0.1, value: 0 })}
      ${SIM.slider('fis-css', { label: 'Cotizaciones sociales', help: 'base 13,2', min: -2, max: 2, step: 0.1, value: 0 })}
      ${SIM.slider('fis-otros-ing', { label: 'Resto de ingresos', help: 'base 4,9: tasas, transferencias, rentas de la propiedad', min: -1, max: 1, step: 0.1, value: 0 })}

      <h3>Variación de gastos (pp del PIB)</h3>
      ${SIM.slider('fis-pens', { label: 'Pensiones', help: 'base 13,0', min: -2, max: 3, step: 0.1, value: 0 })}
      ${SIM.slider('fis-san', { label: 'Sanidad', help: 'base 6,2', min: -1, max: 2, step: 0.1, value: 0 })}
      ${SIM.slider('fis-edu', { label: 'Educación', help: 'base 4,2', min: -1, max: 2, step: 0.1, value: 0 })}
      ${SIM.slider('fis-def', { label: 'Defensa', help: 'base 1,4', min: -0.5, max: 2, step: 0.1, value: 0 })}
      ${SIM.slider('fis-otros-gas', { label: 'Resto de gastos', help: 'base 16,9', min: -3, max: 3, step: 0.1, value: 0 })}
      <p class="inline-note">Los intereses no se tocan a mano: son endógenos, iguales al tipo implícito por la deuda viva de cada año.</p>
    </div>

    <div class="card">
      <h3>Escenario macroeconómico y punto de partida</h3>
      ${SIM.slider('fis-growth', { label: 'Crecimiento real del PIB (%)', min: 0, max: 4, step: 0.1, value: 2 })}
      ${SIM.slider('fis-infl', { label: 'Inflación, deflactor del PIB (%)', min: 0, max: 6, step: 0.1, value: 2 })}
      ${SIM.slider('fis-rate', { label: 'Tipo de interés implícito de la deuda (%)', help: 'coste medio de la deuda viva, no el tipo de emisión', min: 1, max: 6, step: 0.1, value: 2.4 })}
      ${SIM.slider('fis-deuda0', { label: 'Deuda pública de partida (% del PIB)', min: 60, max: 140, step: 0.5, value: 101.5 })}

      <h3>Resultado del escenario</h3>
      <div class="results-grid">
        ${SIM.result('fis-r-ing', 'Ingresos no financieros', '% del PIB', 'green')}
        ${SIM.result('fis-r-presion', 'Presión fiscal', 'impuestos + cotizaciones, % PIB')}
        ${SIM.result('fis-r-saldo1', 'Saldo público (año 1)', '% del PIB, − = déficit', 'red')}
        ${SIM.result('fis-r-deuda10', 'Deuda en ' + (B.anio + 10), '% del PIB', 'orange')}
      </div>
      <div class="results-grid">
        ${SIM.result('fis-r-sp', 'Saldo primario', '% del PIB')}
        ${SIM.result('fis-r-spest', 'Saldo primario estabilizador', 'sp* = d(r−g)/(1+g)')}
        ${SIM.result('fis-r-rg', 'Brecha r − g', 'pp, nominal')}
        ${SIM.result('fis-r-int10', 'Intereses en ' + (B.anio + 10), '% del PIB')}
      </div>
      <div class="aviso" id="fis-aviso"></div>
    </div>
  </div>

  <div class="card">
    <h3>Las cuentas de las Administraciones Públicas: base ${B.anio} y escenario</h3>
    <table class="tabla" id="fis-tabla"></table>
    <div class="aviso" id="fis-fuente"><strong>Cifras aproximadas, calibradas a Eurostat 2025</strong> (cuentas de las Administraciones Públicas, actualización de julio de 2026) y a la deuda según el Protocolo de Déficit Excesivo publicada por el Banco de España para el cierre de 2025. Los importes en millones se obtienen aplicando el porcentaje a un PIB de ${F.n0(B.pib)} M€. Redondeadas para el aula: no sustituyen a la fuente oficial.</div>
  </div>

  <div class="grid-2">
    <div class="card">
      <h3>Composición de los ingresos: base frente a escenario</h3>
      ${SIM.chartBox('fis-chart-ing', 330)}
    </div>
    <div class="card">
      <h3>Trayectoria de la deuda</h3>
      ${SIM.chartBox('fis-chart-deuda', 330)}
    </div>
  </div>

  <div class="grid-2">
    <div class="card">
      <h3>Saldo público y saldo primario</h3>
      ${SIM.chartBox('fis-chart-saldo', 320)}
    </div>
    <div class="card">
      <h3>¿Por qué se mueve la deuda? Bola de nieve frente a saldo primario</h3>
      ${SIM.chartBox('fis-chart-bola', 320)}
      <p class="inline-note">Descomposición de la variación anual de la ratio: Δd = d·(r−g)/(1+g) − sp. La primera barra es la inercia financiera; la segunda, lo que hace el presupuesto.</p>
    </div>
  </div>

  <div class="card interpretation" id="fis-interp"></div>`;

  /* ---------- Cálculo ---------- */
  function calcula(v) {
    const ing = {
      'IRPF': B.irpf + v.irpf,
      'IVA': B.iva + v.iva,
      'Sociedades': B.is + v.is,
      'Especiales y otros indirectos': B.especiales + v.esp,
      'Otros impuestos directos y sobre el capital': B.otrosDir + B.capital,
      'Cotizaciones sociales': B.css + v.css,
      'Resto de ingresos': B.restoIng + v.otrosIng
    };
    const gas = {
      'Pensiones': B.pensiones + v.pens,
      'Sanidad': B.sanidad + v.san,
      'Educación': B.educacion + v.edu,
      'Prestaciones por desempleo': B.desempleo,
      'Defensa': B.defensa + v.def,
      'Resto de gastos': B.restoGas + v.otrosGas
    };
    const ingresos = Object.values(ing).reduce((a, b) => a + b, 0);
    const presion = ingresos - ing['Resto de ingresos'];
    const gastoPrimario = Object.values(gas).reduce((a, b) => a + b, 0);
    const sp = ingresos - gastoPrimario;                       // saldo primario, % del PIB

    const g = (1 + v.growth / 100) * (1 + v.infl / 100) - 1;   // crecimiento nominal
    const r = v.rate / 100;
    const brecha = (r - g) * 100;

    const anios = [], deuda = [], saldo = [], primario = [], intereses = [], bola = [], efectoSp = [];
    let d = v.deuda0 / 100;
    for (let t = 0; t <= 10; t++) {
      const int = d * r * 100;                                 // intereses del año, % del PIB
      anios.push(String(B.anio + t));
      deuda.push(d * 100);
      intereses.push(int);
      primario.push(sp);
      saldo.push(sp - int);                                    // negativo = déficit
      const bn = d * (r - g) / (1 + g) * 100;                  // efecto bola de nieve
      bola.push(bn); efectoSp.push(-sp);
      if (t < 10) { d = Math.max(0, d * (1 + r) / (1 + g) - sp / 100); }
    }
    const spEstab = (v.deuda0 / 100) * (r - g) / (1 + g) * 100;
    return { ing, gas, ingresos, presion, gastoPrimario, sp, g, r, brecha, anios, deuda, saldo, primario, intereses, bola, efectoSp, spEstab };
  }

  function pintaCaja(id, cls) {
    const el = document.getElementById(id);
    if (el && el.parentElement) el.parentElement.className = 'result-box ' + cls;
  }

  /* ---------- Actualización ---------- */
  function update(root) {
    const v = {
      irpf: SIM.val('fis-irpf'), iva: SIM.val('fis-iva'), is: SIM.val('fis-is'), esp: SIM.val('fis-esp'),
      css: SIM.val('fis-css'), otrosIng: SIM.val('fis-otros-ing'),
      pens: SIM.val('fis-pens'), san: SIM.val('fis-san'), edu: SIM.val('fis-edu'), def: SIM.val('fis-def'), otrosGas: SIM.val('fis-otros-gas'),
      growth: SIM.val('fis-growth'), infl: SIM.val('fis-infl'), rate: SIM.val('fis-rate'), deuda0: SIM.val('fis-deuda0')
    };
    [['fis-irpf', v.irpf], ['fis-iva', v.iva], ['fis-is', v.is], ['fis-esp', v.esp], ['fis-css', v.css], ['fis-otros-ing', v.otrosIng],
     ['fis-pens', v.pens], ['fis-san', v.san], ['fis-edu', v.edu], ['fis-def', v.def], ['fis-otros-gas', v.otrosGas]]
      .forEach(([id, x]) => SIM.show(id + '-val', F.pp(x)));
    SIM.show('fis-growth-val', F.n1(v.growth) + ' %');
    SIM.show('fis-infl-val', F.n1(v.infl) + ' %');
    SIM.show('fis-rate-val', F.n1(v.rate) + ' %');
    SIM.show('fis-deuda0-val', F.n1(v.deuda0) + ' % del PIB');

    const R = calcula(v);
    const saldo1 = R.saldo[0], deuda10 = R.deuda[10];

    /* --- Resultados --- */
    SIM.show('fis-r-ing', F.n1(R.ingresos) + ' %');
    SIM.show('fis-r-presion', F.n1(R.presion) + ' %');
    SIM.show('fis-r-saldo1', F.signo(saldo1) + ' %');
    SIM.show('fis-r-deuda10', F.n1(deuda10) + ' %');
    SIM.show('fis-r-sp', F.signo(R.sp) + ' %');
    SIM.show('fis-r-spest', F.signo(R.spEstab) + ' %');
    SIM.show('fis-r-rg', F.signo(R.brecha) + ' pp');
    SIM.show('fis-r-int10', F.n1(R.intereses[10]) + ' %');
    pintaCaja('fis-r-saldo1', saldo1 < -3 ? 'red' : (saldo1 < 0 ? 'orange' : 'green'));
    pintaCaja('fis-r-deuda10', deuda10 > 100 ? 'red' : (deuda10 > 60 ? 'orange' : 'green'));
    pintaCaja('fis-r-spest', R.sp >= R.spEstab ? 'green' : 'red');
    pintaCaja('fis-r-rg', R.brecha > 0 ? 'red' : 'green');

    /* --- Aviso: la regla de gasto y el ajuste necesario --- */
    const ajuste = R.spEstab - R.sp;   // pp del PIB de esfuerzo primario que faltan para estabilizar la deuda
    let aviso;
    if (ajuste <= 0.05) {
      aviso = `<strong>Deuda estabilizada o a la baja.</strong> El saldo primario del escenario (${F.signo(R.sp)} % del PIB) alcanza o supera `
        + `el estabilizador (${F.signo(R.spEstab)} %). La ratio de deuda no crece por sí sola.`;
    } else {
      aviso = `<strong>Falta esfuerzo primario.</strong> Para congelar la deuda en ${F.n1(v.deuda0)} % del PIB haría falta un saldo primario de `
        + `${F.signo(R.spEstab)} % y el escenario deja ${F.signo(R.sp)} %: un ajuste pendiente de <strong>${F.n1(ajuste)} pp del PIB</strong>, `
        + `unos ${F.n0(M(ajuste))} M€ al año a precios de ${B.anio}.`;
    }
    SIM.html('fis-aviso', aviso);

    /* --- Tabla de las cuentas --- */
    const fila = (nom, base, esc, hito) => {
      const dif = esc - base;
      return `<tr class="${hito ? 'active-row' : ''}"><td>${hito ? '<strong>' + nom + '</strong>' : nom}</td>`
        + `<td>${F.n1(base)}</td><td>${F.n0(M(base))}</td><td>${F.n1(esc)}</td>`
        + `<td class="${dif > 1e-9 ? 'positive' : (dif < -1e-9 ? 'negative' : '')}">${Math.abs(dif) < 1e-9 ? '—' : F.pp(dif)}</td></tr>`;
    };
    const baseIng = { 'IRPF': B.irpf, 'IVA': B.iva, 'Sociedades': B.is, 'Especiales y otros indirectos': B.especiales, 'Otros impuestos directos y sobre el capital': B.otrosDir + B.capital, 'Cotizaciones sociales': B.css, 'Resto de ingresos': B.restoIng };
    const baseGas = { 'Pensiones': B.pensiones, 'Sanidad': B.sanidad, 'Educación': B.educacion, 'Prestaciones por desempleo': B.desempleo, 'Defensa': B.defensa, 'Resto de gastos': B.restoGas };
    let filas = `<tr><td colspan="5"><strong>Ingresos no financieros</strong></td></tr>`;
    Object.keys(baseIng).forEach(k => { filas += fila(k, baseIng[k], R.ing[k]); });
    filas += fila('Total de ingresos', B.ingresos, R.ingresos, true);
    filas += `<tr><td colspan="5"><strong>Gastos no financieros</strong></td></tr>`;
    Object.keys(baseGas).forEach(k => { filas += fila(k, baseGas[k], R.gas[k]); });
    filas += fila('Intereses de la deuda (endógenos)', B.intereses, R.intereses[0]);
    filas += fila('Total de gastos', B.gastos, R.gastoPrimario + R.intereses[0], true);
    filas += fila('Saldo público (− = déficit)', B.ingresos - B.gastos, saldo1, true);
    SIM.html('fis-tabla', `<thead><tr><th>Partida</th><th>Base ${B.anio} (% PIB)</th><th>Base (M€)</th><th>Escenario (% PIB)</th><th>Variación</th></tr></thead><tbody>${filas}</tbody>`);

    /* --- Gráfico 1: composición de los ingresos, base frente a escenario --- */
    const claves = Object.keys(baseIng);
    const colores = [C.azul, C.azulOsc, C.naranja, C.naranjaClaro, C.verde, C.azulClaro, C.gris];
    SIM.chart('fis-chart-ing', {
      type: 'bar',
      data: {
        labels: [`Base ${B.anio}`, 'Escenario'],
        datasets: claves.map((k, i) => ({ label: k, data: [baseIng[k], R.ing[k]], backgroundColor: colores[i % colores.length] }))
      },
      options: {
        scales: {
          x: { stacked: true, grid: { display: false }, title: { display: false } },
          y: { stacked: true, beginAtZero: true, title: { text: '% del PIB' } }
        },
        plugins: {
          legend: { labels: { font: { size: 10 } } },
          refs: { y: [{ value: B.ingresos, label: `ingresos base ${F.n1(B.ingresos)} %`, color: C.rojo, dash: [4, 3] }] },
          tooltip: { callbacks: { label: it => `${it.dataset.label}: ${F.n1(it.parsed.y)} % del PIB (${F.n0(M(it.parsed.y))} M€)` } }
        }
      }
    });

    /* --- Gráfico 2: trayectoria de la deuda --- */
    SIM.chart('fis-chart-deuda', {
      type: 'line',
      data: {
        labels: R.anios,
        datasets: [{ label: 'Deuda pública (% del PIB)', data: R.deuda, borderColor: C.azul, backgroundColor: SIM.alpha(C.azul, .1), fill: true, borderWidth: 2.6, pointRadius: 3, pointBackgroundColor: C.azul }]
      },
      options: {
        scales: { x: { grid: { display: false }, title: { text: 'Año' } }, y: { title: { text: 'Deuda / PIB (%)' } } },
        plugins: {
          refs: { y: [{ value: 60, label: 'referencia de Maastricht, 60 %', color: C.verde, dash: [6, 4] }, { value: 90, label: '90 %', color: C.naranja, dash: [3, 3] }] },
          tooltip: { callbacks: { label: it => `${F.n1(it.parsed.y)} % del PIB` } }
        }
      }
    });

    /* --- Gráfico 3: saldo público y saldo primario --- */
    SIM.chart('fis-chart-saldo', {
      type: 'line',
      data: {
        labels: R.anios,
        datasets: [
          { label: 'Saldo público (− = déficit)', data: R.saldo, borderColor: saldo1 < -3 ? C.rojo : C.naranja, backgroundColor: SIM.alpha(saldo1 < 0 ? C.rojo : C.verde, .08), fill: true, borderWidth: 2.6, pointRadius: 3 },
          { label: 'Saldo primario (sin intereses)', data: R.primario, borderColor: C.azul, borderDash: [5, 4], borderWidth: 2 },
          { label: 'Intereses de la deuda', data: R.intereses.map(x => -x), borderColor: C.gris, borderWidth: 1.6 }
        ]
      },
      options: {
        scales: { x: { grid: { display: false }, title: { text: 'Año' } }, y: { title: { text: '% del PIB' } } },
        plugins: {
          refs: { y: [{ value: -3, label: 'límite del 3 % de déficit', color: C.rojo, dash: [6, 4] }, { value: 0, label: 'equilibrio', color: C.gris, dash: [3, 3] }] },
          tooltip: { callbacks: { label: it => `${it.dataset.label}: ${F.signo(it.parsed.y)} % del PIB` } }
        }
      }
    });

    /* --- Gráfico 4: descomposición de la variación de la deuda --- */
    const total = R.bola.map((x, i) => x + R.efectoSp[i]);
    SIM.chart('fis-chart-bola', {
      type: 'bar',
      data: {
        labels: R.anios.slice(0, 10),
        datasets: [
          { label: 'Efecto bola de nieve, d·(r−g)/(1+g)', data: R.bola.slice(0, 10), backgroundColor: R.brecha > 0 ? C.rojo : C.verde },
          { label: 'Aportación del presupuesto, −sp', data: R.efectoSp.slice(0, 10), backgroundColor: C.azulClaro },
          { label: 'Variación total de la deuda, Δd', data: total.slice(0, 10), type: 'line', borderColor: C.tinta, borderWidth: 2, pointRadius: 3, pointBackgroundColor: C.tinta }
        ]
      },
      options: {
        scales: { x: { grid: { display: false }, title: { text: 'Año' } }, y: { title: { text: 'Variación de la deuda (pp del PIB al año)' } } },
        plugins: {
          refs: { y: [{ value: 0, label: 'deuda constante', color: C.gris, dash: [3, 3] }] },
          tooltip: { callbacks: { label: it => `${it.dataset.label}: ${F.signo(it.parsed.y)} pp` } }
        }
      }
    });

    /* --- Lectura --- */
    const dVar = R.ingresos - B.ingresos, gVar = R.gastoPrimario - B.gastoPrimario;
    let t = `<strong>Lectura.</strong> Los ingresos no financieros del escenario son el <strong>${F.n1(R.ingresos)} % del PIB</strong> `
      + `(${F.n0(M(R.ingresos))} M€), ${Math.abs(dVar) < 0.05 ? 'igual que en la base' : F.pp(dVar) + ' respecto a la base de ' + F.n1(B.ingresos) + ' %'}. `
      + `De ellos, ${F.n1(R.presion)} pp son impuestos y cotizaciones: esa es la <em>presión fiscal</em> propiamente dicha, `
      + `y el resto (${F.n1(R.ingresos - R.presion)} pp) son tasas, transferencias y rentas de la propiedad, que no son un impuesto. `
      + `El gasto primario queda en ${F.n1(R.gastoPrimario)} % (${Math.abs(gVar) < 0.05 ? 'sin cambios' : F.pp(gVar)}) y los intereses del primer año, `
      + `endógenos, en ${F.n1(R.intereses[0])} %.<br>`;

    t += `<strong>La regla del 3 %.</strong> El saldo del primer año es ${F.signo(saldo1)} % del PIB `;
    if (saldo1 >= 0) t += `—superávit—, muy por encima de lo que exige el marco fiscal europeo. `;
    else if (saldo1 > -3) t += `(déficit de ${F.n1(-saldo1)} %), por debajo del límite del 3 % del Pacto de Estabilidad. `;
    else t += `(déficit de ${F.n1(-saldo1)} %), <strong>por encima del límite del 3 %</strong>: el país entraría en el procedimiento de déficit excesivo. `;
    t += `Conviene separar el déficit primario del coste de la deuda heredada: con un saldo primario de ${F.signo(R.sp)} %, `
      + (Math.abs(R.sp) < 0.05 ? `todo el déficit son intereses. ` : (R.sp > 0 ? `el presupuesto corriente ya está en superávit y el déficit lo explican los intereses. ` : `el desequilibrio no es solo financiero: también el gasto corriente supera a los ingresos. `));

    t += `<br><strong>El efecto bola de nieve.</strong> Con un tipo implícito del ${F.n1(v.rate)} % y un crecimiento nominal del ${F.n1(R.g * 100)} % `
      + `(${F.n1(v.growth)} % real más ${F.n1(v.infl)} % de inflación), la brecha r − g es de <strong>${F.signo(R.brecha)} pp</strong>. `;
    if (R.brecha > 0) {
      t += `Al ser positiva, la deuda crece por sí sola aunque el presupuesto primario esté equilibrado: la ratio se autoalimenta y solo un superávit primario de `
        + `${F.signo(R.spEstab)} % la mantendría constante. Esta es la aritmética que Domar formalizó y la razón por la que el nivel de partida de la deuda importa tanto. `;
    } else {
      t += `Al ser negativa, el crecimiento nominal erosiona la ratio por el denominador: la deuda baja incluso con un déficit primario de hasta ${F.n1(-R.spEstab)} % del PIB. `
        + `Es el mecanismo que ha reducido la deuda española desde los máximos de 2020, y es reversible: sube el tipo implícito y verás el signo cambiar. `;
    }
    const tend = deuda10 > v.deuda0 + 0.5 ? 'creciente' : (deuda10 < v.deuda0 - 0.5 ? 'decreciente' : 'plana');
    t += `<br><strong>A diez años.</strong> La ratio sigue una trayectoria <strong>${tend}</strong> y termina en el <strong>${F.n1(deuda10)} % del PIB</strong> en ${B.anio + 10}, `
      + `con una carga de intereses del ${F.n1(R.intereses[10])} % (${F.n0(M(R.intereses[10]))} M€ a precios de hoy). `
      + (deuda10 > 100 ? `Sigue por encima del 100 %, más de tres veces la referencia del 60 % del Tratado; el nuevo marco fiscal europeo exigiría una senda de reducción plurianual del gasto primario neto.`
        : deuda10 > 60 ? `Sigue por encima de la referencia del 60 % del Tratado, aunque convergiendo hacia ella.`
          : `Queda ya por debajo de la referencia del 60 % del Tratado.`)
      + ` Recuerda que el ejercicio mantiene constantes los porcentajes de ingreso y gasto sobre el PIB: no hay respuesta de comportamiento, ni ciclo, ni multiplicador fiscal. `
      + `Es aritmética de sostenibilidad, no una previsión.`;
    SIM.html('fis-interp', t);
  }

  /* ---------- Presets ---------- */
  const base = {
    'fis-irpf': 0, 'fis-iva': 0, 'fis-is': 0, 'fis-esp': 0, 'fis-css': 0, 'fis-otros-ing': 0,
    'fis-pens': 0, 'fis-san': 0, 'fis-edu': 0, 'fis-def': 0, 'fis-otros-gas': 0,
    'fis-growth': 2, 'fis-infl': 2, 'fis-rate': 2.4, 'fis-deuda0': 101.5
  };

  SIM.register({
    id: 'fiscal', nav: 'Cuentas públicas', tema: 'Tema 12',
    title: 'Las cuentas públicas españolas y la sostenibilidad de la deuda',
    subtitle: `Ingresos, gastos, saldo y dinámica de la deuda a diez años. Línea base aproximada, calibrada a Eurostat 2025 (cuentas de las Administraciones Públicas, actualización de julio de 2026) y a la deuda del Banco de España al cierre de 2025: ingresos ${F.n1(B.ingresos)} % del PIB, gastos ${F.n1(B.gastos)} %, déficit ${F.n1(B.gastos - B.ingresos)} %, deuda ${F.n1(B.deuda)} %, PIB ${F.n0(B.pib)} M€.`,
    guia: {
      observa: [
        'En la línea base el <strong>saldo primario es cero</strong>: los ingresos (42,9 % del PIB) igualan al gasto sin intereses. Todo el déficit del 2,4 % son intereses de la deuda heredada.',
        'Mueve solo el <strong>tipo de interés implícito</strong> hasta 4,5 % sin tocar nada más: el presupuesto no ha cambiado y, sin embargo, la deuda pasa de caer a subir. Ese es el efecto bola de nieve.',
        'Compara el esfuerzo que exige <strong>+2 pp de pensiones</strong> con el que exige <strong>+1 pp de IRPF</strong>: en pp del PIB, y también en millones de euros, en la tabla.',
        'La <strong>presión fiscal</strong> (38,0 %) no coincide con los ingresos totales (42,9 %): hay casi 5 pp que no son impuestos ni cotizaciones. Es un error de examen habitual.',
        'El gráfico de descomposición separa lo que hace el presupuesto (−sp) de lo que hace la aritmética financiera. Casi siempre manda la segunda.'
      ],
      pregunta: 'España cerró 2025 con un déficit del 2,4 % del PIB y una deuda del 101,5 %. ¿Basta con mantener ese déficit para que la deuda deje de ser un problema?',
      respuesta: 'Depende por completo de la brecha r − g, no del déficit en sí. Con la calibración base (tipo implícito 2,4 %, crecimiento nominal ~4,0 %) la brecha es negativa: el saldo primario estabilizador es un <em>déficit</em> primario del 1,6 % del PIB, y como el escenario base tiene saldo primario cero, la ratio cae unos 1,6 pp al año hasta rondar el 86 % en 2035. Es decir, sí basta… mientras dure esa configuración. Si el tipo implícito subiera al 4,5 % —lo que ocurre gradualmente cuando la deuda emitida a tipos bajos vence y se refinancia—, la brecha se volvería positiva y el mismo presupuesto haría crecer la deuda. La lección del Tema 12: la sostenibilidad no se juzga por el saldo de un año, sino por la relación entre el coste de la deuda, el crecimiento nominal y el nivel de partida.'
    },
    presets: [
      { label: 'Escenario base', title: `Cuentas de ${B.anio} sin cambios de política`, values: base },
      { label: 'Consolidación: +1 pp IRPF y −1 pp otros gastos', title: 'Ajuste de 2 pp del PIB, mitad ingresos, mitad gastos', values: Object.assign({}, base, { 'fis-irpf': 1, 'fis-otros-gas': -1 }) },
      { label: 'Envejecimiento: +2 pp pensiones', title: 'El gasto en pensiones sube del 13,0 al 15,0 % del PIB', values: Object.assign({}, base, { 'fis-pens': 2 }) },
      { label: 'Subida de tipos: r = 4,5 %', title: 'Refinanciación de la deuda a tipos más altos, sin cambiar el presupuesto', values: Object.assign({}, base, { 'fis-rate': 4.5 }) },
      { label: 'Crecimiento fuerte 3 % con inflación 2 %', title: 'El denominador hace el trabajo: crecimiento nominal del 5,1 %', values: Object.assign({}, base, { 'fis-growth': 3, 'fis-infl': 2 }) }
    ],
    html, update
  });
})();
