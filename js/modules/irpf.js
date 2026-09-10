/* Módulo IRPF 2025 (Tema 3 de HP II; Práctica 1 con el simulador de la AEAT) */
(function () {
  'use strict';
  const F = SIM.fmt, C = SIM.color;

  const html = `
  <div class="grid-2">
    <div class="card">
      <h3>Rendimientos del trabajo</h3>
      ${SIM.slider('irpf-bruto', { label: 'Salario bruto anual', min: 0, max: 150000, step: 500, value: 30000 })}
      <div class="row">
        ${SIM.number('irpf-bruto-num', { label: 'Importe exacto (€)', value: 30000, step: 1 })}
        ${SIM.number('irpf-cotiz', { label: 'Cotizaciones del trabajador (€)', value: 1944, step: 0.01 })}
        ${SIM.number('irpf-ret', { label: 'Retenciones practicadas (€)', value: 4200, step: 1 })}
      </div>
      <div class="checkbox-group">${SIM.check('irpf-cotiz-auto', 'Calcular las cotizaciones automáticamente (6,48 % hasta la base máxima)', true)}</div>

      <h3>Otras rentas</h3>
      <div class="row">
        ${SIM.number('irpf-cap', { label: 'Intereses y dividendos (€)', value: 770, step: 1 })}
        ${SIM.number('irpf-gan', { label: 'Ganancias netas de patrimonio (€)', value: 480, step: 1, min: -100000 })}
        ${SIM.number('irpf-inmo', { label: 'Alquileres: rendimiento neto reducido (€)', value: 901.04, step: 0.01, min: -100000 })}
        ${SIM.number('irpf-imput', { label: 'Imputación de rentas inmobiliarias (€)', value: 320, step: 1 })}
      </div>
      <p class="inline-note">Intereses, dividendos y ganancias forman la base del ahorro; alquileres e imputaciones van a la base general.</p>

      <h3>Situación personal y comunidad</h3>
      <div class="row">
        ${SIM.select('irpf-ccaa', { label: 'Comunidad autónoma (escala 2025)', value: 'and', options: [['and', 'Andalucía'], ['mad', 'Comunidad de Madrid'], ['est', 'Escala estatal ×2 (referencia)']] })}
        ${SIM.number('irpf-hijos', { label: 'Descendientes', value: 0, max: 8 })}
        ${SIM.number('irpf-hijos3', { label: 'De ellos, menores de 3 años', value: 0, max: 8 })}
        ${SIM.select('irpf-disc', { label: 'Discapacidad', value: 'no', options: [['no', 'No'], ['33', '≥ 33 %'], ['65', '≥ 65 %']] })}
      </div>
      <div class="checkbox-group">${SIM.check('irpf-m65', 'Mayor de 65 años')} ${SIM.check('irpf-m75', 'Mayor de 75 años')} ${SIM.check('irpf-mater', 'Deducción por maternidad (1.200 € por hijo menor de 3)')}</div>

      <h3>Reducciones y deducciones</h3>
      ${SIM.slider('irpf-plan', { label: 'Aportación a plan de pensiones', help: 'reduce la base; tope 1.500 €', min: 0, max: 1500, step: 100, value: 0 })}
      <div class="row">
        ${SIM.number('irpf-donat', { label: 'Donativos (€)', value: 0 })}
        ${SIM.number('irpf-viv', { label: 'Vivienda habitual, base pagada (€, solo compras anteriores a 2013)', value: 0, max: 9040 })}
        ${SIM.number('irpf-dedaut', { label: 'Deducciones autonómicas (€)', value: 150, step: 1 })}
      </div>
      <div class="checkbox-group">${SIM.check('irpf-ley5', 'Aplicar la deducción de la Ley 5/2025 para rendimientos del trabajo bajos (hasta 340 €)', true)} ${SIM.check('irpf-donrec', 'Donativos recurrentes (45 %)')}</div>
    </div>

    <div class="card">
      <h3>Resultado de la liquidación</h3>
      <div class="results-grid">
        ${SIM.result('irpf-r-integra', 'Cuota íntegra', '€')}
        ${SIM.result('irpf-r-liquida', 'Cuota líquida', '€', 'green')}
        ${SIM.result('irpf-r-pagos', 'Pagos a cuenta', '€')}
        ${SIM.result('irpf-r-result', 'Resultado', '€', 'red')}
      </div>
      <div class="results-grid">
        ${SIM.result('irpf-r-marg', 'Tipo marginal', 'estatal + autonómico')}
        ${SIM.result('irpf-r-medio', 'Tipo medio', 'cuota líquida / renta bruta', 'green')}
        ${SIM.result('irpf-r-perdidas', 'Deducciones perdidas', 'por falta de cuota', 'orange')}
      </div>
      <div class="liq-flow" id="irpf-flow"></div>
      <div class="aviso" id="irpf-aviso"></div>
      <h3>Tarifa general aplicada a la base liquidable</h3>
      <table class="tabla" id="irpf-tabla"></table>
    </div>
  </div>

  <div class="grid-2">
    <div class="card">
      <h3>Tipo marginal y tipo medio según el salario</h3>
      ${SIM.chartBox('irpf-chart-tipos', 320)}
      <p class="inline-note">La curva del tipo medio se calcula manteniendo el resto de rentas y circunstancias del escenario. El punto marca tu salario.</p>
    </div>
    <div class="card">
      <h3>De la renta bruta al resultado</h3>
      ${SIM.chartBox('irpf-chart-cascada', 320)}
    </div>
  </div>
  <div class="card interpretation" id="irpf-interp"></div>`;

  function leer() {
    const bruto = SIM.val('irpf-bruto-num');
    const auto = SIM.val('irpf-cotiz-auto');
    return {
      trabajoBruto: bruto,
      cotizaciones: auto ? null : SIM.val('irpf-cotiz'),
      retencionesTrabajo: SIM.val('irpf-ret'),
      capitalMobiliario: SIM.val('irpf-cap'), gananciasNetas: SIM.val('irpf-gan'),
      inmobiliarioNeto: SIM.val('irpf-inmo'), imputacion: SIM.val('irpf-imput'),
      ccaa: SIM.val('irpf-ccaa'), hijos: SIM.val('irpf-hijos'), hijosMenores3: SIM.val('irpf-hijos3'),
      discapacidad: SIM.val('irpf-disc'), mayor65: SIM.val('irpf-m65'), mayor75: SIM.val('irpf-m75'), maternidad: SIM.val('irpf-mater'),
      planPensiones: SIM.val('irpf-plan'), donativos: SIM.val('irpf-donat'), donativosRecurrente: SIM.val('irpf-donrec'),
      viviendaBase: SIM.val('irpf-viv'), dedAutonomicas: SIM.val('irpf-dedaut'), aplicarLey52025: SIM.val('irpf-ley5')
    };
  }

  function init(root) {
    // Slider y campo numérico del salario sincronizados
    const sl = root.querySelector('#irpf-bruto'), num = root.querySelector('#irpf-bruto-num');
    sl.addEventListener('input', () => { num.value = sl.value; });
    num.addEventListener('input', () => { sl.value = Math.min(Math.max(num.value, sl.min), sl.max); });
  }

  function update(root) {
    const p = leer();
    // cotizaciones automáticas → refleja el importe en el campo
    const cotizEl = document.getElementById('irpf-cotiz');
    cotizEl.disabled = !!SIM.val('irpf-cotiz-auto');
    if (cotizEl.disabled) cotizEl.value = TAX.cotizacionTrabajador(p.trabajoBruto).toFixed(2);
    SIM.show('irpf-bruto-val', F.eur0(p.trabajoBruto));
    SIM.show('irpf-plan-val', F.eur0(p.planPensiones));

    const L = TAX.liquidaIRPF(p);
    const ccaaNombre = TAX.CCAA[p.ccaa].nombre;

    SIM.show('irpf-r-integra', F.n2(L.cuotaIntegra));
    SIM.show('irpf-r-liquida', F.n2(L.cuotaLiquida));
    SIM.show('irpf-r-pagos', F.n2(L.pagosACuenta + L.maternidad));
    const rb = document.getElementById('irpf-r-result');
    rb.textContent = (L.resultado >= 0 ? 'A ingresar ' : 'A devolver ') + F.n2(Math.abs(L.resultado));
    rb.parentElement.className = 'result-box ' + (L.resultado > 0 ? 'red' : 'green');
    SIM.show('irpf-r-marg', F.pct(L.marginalGeneral, 1));
    SIM.show('irpf-r-medio', F.pct(L.tipoMedio, 1));
    SIM.show('irpf-r-perdidas', F.n2(L.totalPerdidas));

    // Cascada
    const pasos = [
      ['Bruto trabajo', L.params.trabajoBruto, ''],
      ['− Cotizaciones y gastos', -(L.cotizaciones + L.otrosGastos), 'negative'],
      ['− Reducción art. 20', -L.redTrabajo, 'negative'],
      ['Base general', L.baseGeneral, 'hito'],
      ['Base ahorro', L.baseAhorro, 'hito'],
      ['− Plan pensiones', -L.pensiones, 'negative'],
      ['Cuota íntegra', L.cuotaIntegra, 'hito'],
      ['− Deducciones', -L.totalDeducciones, 'negative'],
      ['Cuota líquida', L.cuotaLiquida, 'hito'],
      ['− Pagos a cuenta', -(L.pagosACuenta + L.maternidad), 'negative'],
      [L.resultado >= 0 ? 'A ingresar' : 'A devolver', L.resultado, L.resultado >= 0 ? 'negative' : 'positive']
    ];
    SIM.html('irpf-flow', pasos.map(([l, v, c], i) => `${i ? '<span class="liq-arrow">→</span>' : ''}<div class="liq-step ${c}"><div class="liq-label">${l}</div><div class="liq-value">${F.eur(v, 2)}</div></div>`).join(''));

    // Aviso de deducciones perdidas y mínimo
    let aviso = `<strong>Mínimo personal y familiar:</strong> ${F.eur0(L.minimo.total)}, aplicado como tramo a tipo cero `
      + `(descuenta ${F.eur(L.escalas.estatalMin.cuota + L.escalas.autonomicaMin.cuota, 2)} de la cuota general`
      + (L.minAhorro > 0 ? ` y el remanente de ${F.eur0(L.minAhorro)} pasa a la base del ahorro` : '') + `). `;
    if (L.totalPerdidas > 0.005) {
      const det = Object.entries(L.deduccionesPerdidas).filter(([, v]) => v > 0.005).map(([k, v]) => `${({ vivienda: 'vivienda', donativos: 'donativos', ley52025: 'Ley 5/2025', autonomicas: 'autonómicas' })[k]} ${F.eur(v, 2)}`).join(', ');
      aviso += `<span class="perdida">Se pierden ${F.eur(L.totalPerdidas, 2)} de deducciones</span> (${det}): las deducciones en cuota no son reembolsables, así que no valen nada para quien no tiene cuota que reducir.`;
    } else {
      aviso += `Todas las deducciones se han podido aplicar.`;
    }
    SIM.html('irpf-aviso', aviso);

    // Tabla de tramos (estatal + autonómica) sobre la base liquidable general
    const est = L.escalas.estatal.desglose, aut = L.escalas.autonomica.desglose;
    const filas = [];
    const cortes = [...new Set([...est.map(t => t.desde), ...aut.map(t => t.desde)])].sort((a, b) => a - b);
    let acum = 0;
    cortes.forEach((desde, i) => {
      const hasta = cortes[i + 1] ?? Infinity;
      const tE = est.find(t => desde >= t.desde && desde < t.hasta), tA = aut.find(t => desde >= t.desde && desde < t.hasta);
      const tipo = tE.tipo + tA.tipo;
      const baseTramo = Math.max(0, Math.min(L.baseLiqGeneral, hasta) - desde);
      const cuota = baseTramo * tipo; acum += cuota;
      const activo = L.baseLiqGeneral > desde && L.baseLiqGeneral <= hasta;
      if (baseTramo === 0 && desde > L.baseLiqGeneral && i > 0 && !activo) return;
      filas.push(`<tr class="${activo ? 'active-row' : ''}"><td>${F.n0(desde)} – ${hasta === Infinity ? '∞' : F.n0(hasta)} €</td><td>${F.pct(tE.tipo, 1)}</td><td>${F.pct(tA.tipo, 1)}</td><td><strong>${F.pct(tipo, 1)}</strong></td><td>${F.n2(baseTramo)}</td><td>${F.n2(cuota)}</td><td>${F.n2(acum)}</td></tr>`);
    });
    SIM.html('irpf-tabla', `<thead><tr><th>Tramo de base liquidable</th><th>Estatal</th><th>${ccaaNombre.split(' ')[0] === 'Escala' ? 'Autonómica' : ccaaNombre}</th><th>Marginal</th><th>Base en el tramo</th><th>Cuota del tramo</th><th>Acumulada</th></tr></thead><tbody>${filas.join('')}</tbody>`);

    // Gráfico 1: marginal y tipo medio según el salario bruto
    const xs = [], marg = [], medio = [], medioSinDed = [];
    for (let b = 0; b <= 150000; b += 1000) {
      const Lb = TAX.liquidaIRPF(Object.assign({}, p, { trabajoBruto: b, cotizaciones: p.cotizaciones == null ? null : TAX.cotizacionTrabajador(b), retencionesTrabajo: 0 }));
      xs.push(b / 1000); marg.push(Lb.marginalGeneral * 100); medio.push(Lb.tipoMedio * 100);
      medioSinDed.push(Lb.rentaBrutaTotal > 0 ? Lb.cuotaIntegra / Lb.rentaBrutaTotal * 100 : 0);
    }
    SIM.chart('irpf-chart-tipos', {
      type: 'line',
      data: { datasets: [
        { label: 'Tipo marginal', data: SIM.xy(xs, marg), borderColor: C.rojo, stepped: true, borderWidth: 2 },
        { label: 'Tipo medio antes de deducciones', data: SIM.xy(xs, medioSinDed), borderColor: C.gris, borderDash: [5, 4], borderWidth: 1.5 },
        { label: 'Tipo medio (cuota líquida / renta bruta)', data: SIM.xy(xs, medio), borderColor: C.azul, backgroundColor: SIM.alpha(C.azul, .08), fill: true, borderWidth: 2.4 }
      ] },
      options: {
        scales: { x: { type: 'linear', min: 0, max: 150, title: { text: 'Salario bruto (miles de €)' } }, y: { min: 0, max: 50, title: { text: 'Tipo (%)' } } },
        plugins: { refs: { points: [{ x: p.trabajoBruto / 1000, y: L.tipoMedio * 100, label: `${F.pct(L.tipoMedio, 1)} medio`, color: C.azul, dy: 16 }, { x: p.trabajoBruto / 1000, y: L.marginalGeneral * 100, label: `${F.pct(L.marginalGeneral, 1)} marginal`, color: C.rojo }] },
          tooltip: { callbacks: { title: it => `Salario ${F.n0(it[0].parsed.x * 1000)} €`, label: it => `${it.dataset.label}: ${F.n1(it.parsed.y)} %` } } }
      }
    });

    // Gráfico 2: cascada horizontal
    const etiquetas = ['Renta bruta total', 'Cotizaciones y gastos', 'Reducción art. 20', 'Plan de pensiones', 'Bases liquidables', 'Cuota íntegra', 'Deducciones', 'Cuota líquida', 'Pagos a cuenta', L.resultado >= 0 ? 'A ingresar' : 'A devolver'];
    const valores = [L.rentaBrutaTotal, -(L.cotizaciones + L.otrosGastos), -L.redTrabajo, -L.pensiones, L.baseLiqGeneral + L.baseLiqAhorro, L.cuotaIntegra, -L.totalDeducciones, L.cuotaLiquida, -(L.pagosACuenta + L.maternidad), L.resultado];
    const colores = valores.map((v, i) => [4, 5, 7].includes(i) ? C.azul : (i === 0 ? C.azulClaro : (i === 9 ? (v >= 0 ? C.rojo : C.verde) : C.naranja)));
    SIM.chart('irpf-chart-cascada', {
      type: 'bar',
      data: { labels: etiquetas, datasets: [{ data: valores, backgroundColor: colores }] },
      options: { indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { label: it => F.eur(it.parsed.x, 2) } } },
        scales: { x: { title: { text: 'Euros' } }, y: { grid: { display: false }, title: { display: false } } } }
    });

    // Interpretación
    const comp = (p.ccaa !== 'mad') ? TAX.liquidaIRPF(Object.assign({}, p, { ccaa: 'mad', dedAutonomicas: 0 })) : TAX.liquidaIRPF(Object.assign({}, p, { ccaa: 'and', dedAutonomicas: 0 }));
    const otra = p.ccaa !== 'mad' ? 'Madrid' : 'Andalucía';
    const dif = L.cuotaLiquida - comp.cuotaLiquida;
    let t = `<strong>Lectura.</strong> Con ${F.eur0(p.trabajoBruto)} de salario bruto en ${ccaaNombre}, el rendimiento neto del trabajo queda en ${F.eur(L.rnTrabajo, 2)} `
      + `(tras ${F.eur(L.cotizaciones, 2)} de cotizaciones y ${F.eur0(L.otrosGastos)} de otros gastos)`
      + (L.redTrabajo > 0 ? ` y la reducción del art. 20 lo baja a ${F.eur(L.rnTrabajoReducido, 2)}` : '') + `. `
      + `La base liquidable general es ${F.eur(L.baseLiqGeneral, 2)}` + (L.baseLiqAhorro > 0 ? ` y la del ahorro ${F.eur(L.baseLiqAhorro, 2)}` : '') + `. `
      + `La cuota íntegra suma ${F.eur(L.cuotaIntegra, 2)} (estatal ${F.eur(L.cuotaIntegraEstatal, 2)}, autonómica ${F.eur(L.cuotaIntegraAutonomica, 2)}); `
      + `tras ${F.eur(L.totalDeducciones, 2)} de deducciones, la cuota líquida es ${F.eur(L.cuotaLiquida, 2)}, un tipo medio del ${F.pct(L.tipoMedio, 1)} frente a un marginal del ${F.pct(L.marginalGeneral, 1)}. `
      + `Como ya se adelantaron ${F.eur(L.pagosACuenta, 2)} en retenciones` + (L.maternidad ? ` y hay ${F.eur0(L.maternidad)} de deducción por maternidad` : '') + `, el resultado es <strong>${L.resultado >= 0 ? 'a ingresar' : 'a devolver'} ${F.eur(Math.abs(L.resultado), 2)}</strong>. `;
    t += `<br><strong>Competencia fiscal (Tema 10).</strong> El mismo contribuyente en ${otra}, sin deducciones autonómicas, pagaría ${F.eur(comp.cuotaLiquida, 2)}: `
      + (Math.abs(dif) < 0.5 ? 'prácticamente lo mismo.' : `${F.eur(Math.abs(dif), 2)} ${dif > 0 ? 'menos' : 'más'}. `
        + (p.ccaa === 'and' && p.dedAutonomicas > 0 ? `Ojo: la comparación de escalas exagera la diferencia, porque al mudarse se pierden los ${F.eur0(p.dedAutonomicas)} de deducciones andaluzas.` : ''));
    if (p.planPensiones > 0) t += `<br><strong>Marginal revelado.</strong> Los ${F.eur0(L.pensiones)} aportados al plan de pensiones ahorran ${F.eur(L.pensiones * L.marginalGeneral, 2)}: cada euro que sale de la base ahorra el tipo marginal, no el medio.`;
    SIM.html('irpf-interp', t);
  }

  const marcos = { 'irpf-bruto': 30000, 'irpf-bruto-num': 30000, 'irpf-cotiz-auto': true, 'irpf-ret': 4200, 'irpf-cap': 770, 'irpf-gan': 480, 'irpf-inmo': 901.04, 'irpf-imput': 320, 'irpf-ccaa': 'and', 'irpf-hijos': 0, 'irpf-hijos3': 0, 'irpf-disc': 'no', 'irpf-m65': false, 'irpf-m75': false, 'irpf-mater': false, 'irpf-plan': 0, 'irpf-donat': 0, 'irpf-viv': 0, 'irpf-dedaut': 150, 'irpf-ley5': true, 'irpf-donrec': false };

  SIM.register({
    id: 'irpf', nav: 'IRPF 2025', tema: 'Tema 3 · Práctica 1',
    title: 'Simulador del IRPF español (ejercicio 2025)',
    subtitle: 'Liquidación completa con escala estatal y autonómica (Andalucía, Madrid), base general y del ahorro, mínimo personal y familiar como tramo a tipo cero, reducciones, deducciones y pagos a cuenta. Los escenarios reproducen los casos de la Práctica 1, contrastados con Renta WEB Open de la AEAT.',
    guia: {
      observa: [
        'El <strong>tipo medio</strong> (lo que pagas sobre lo que ganas) está siempre por debajo del <strong>marginal</strong> (lo que pagas del último euro). Mueve el salario y mira cuánto tardan en acercarse.',
        'El mínimo personal no se resta de la base: se aplica como <em>tramo a tipo cero</em>. Por eso vale lo mismo para todos los contribuyentes dentro del primer tramo.',
        'Las deducciones en cuota <strong>no son reembolsables</strong>: con salarios bajos (escenario Lucía) se pierden. Compara con la deducción por maternidad, que sí lo es.',
        'Aportar a un plan de pensiones ahorra el tipo <strong>marginal</strong>, no el medio: el simulador lo usa para «revelar» tu marginal.',
        'Cambiar de comunidad mueve la escala autonómica, pero también las deducciones autonómicas: el efecto neto es menor de lo que sugiere comparar tarifas.'
      ],
      pregunta: 'Un contribuyente andaluz con 30.000 € de salario dice que «Hacienda se lleva el 30 % de mi sueldo». ¿Qué confunde?',
      respuesta: 'Confunde el tipo marginal (30 % entre 21.100 y 35.200 € de base liquidable) con el tipo medio, que en este escenario ronda el 17-18 % de la renta bruta. El 30 % solo se aplica a los euros del último tramo.'
    },
    presets: [
      { label: 'Lucía (SMI, Málaga)', title: 'Caso A de la Práctica 1', values: Object.assign({}, marcos, { 'irpf-bruto': 16576, 'irpf-bruto-num': 16576, 'irpf-ret': 300, 'irpf-cap': 0, 'irpf-gan': 0, 'irpf-inmo': 0, 'irpf-imput': 0, 'irpf-dedaut': 81 }) },
      { label: 'Marcos (30.000 €, Sevilla)', title: 'Caso B de la Práctica 1, simulación base', values: marcos },
      { label: 'Marcos + plan de pensiones', title: 'Simulación 2: 1.000 € al plan', values: Object.assign({}, marcos, { 'irpf-plan': 1000 }) },
      { label: 'Marcos en Madrid', title: 'Simulación 3: cambio de residencia', values: Object.assign({}, marcos, { 'irpf-ccaa': 'mad', 'irpf-dedaut': 0 }) },
      { label: 'Salario medio con 2 hijos', values: Object.assign({}, marcos, { 'irpf-bruto': 29540, 'irpf-bruto-num': 29540, 'irpf-ret': 3500, 'irpf-cap': 0, 'irpf-gan': 0, 'irpf-inmo': 0, 'irpf-imput': 0, 'irpf-hijos': 2, 'irpf-hijos3': 1, 'irpf-mater': true, 'irpf-dedaut': 0 }) },
      { label: 'Directivo (120.000 €)', values: Object.assign({}, marcos, { 'irpf-bruto': 120000, 'irpf-bruto-num': 120000, 'irpf-ret': 40000, 'irpf-cap': 5000, 'irpf-gan': 10000, 'irpf-inmo': 0, 'irpf-imput': 0, 'irpf-plan': 1500, 'irpf-dedaut': 0 }) }
    ],
    html, init, update
  });
})();
