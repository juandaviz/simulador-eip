/* Módulo de la regla de Ramsey (Tema 8 de HP II)
   Regla de la elasticidad inversa: para recaudar una cantidad dada con el mínimo
   exceso de gravamen, los tipos deben ser inversamente proporcionales a las
   elasticidades de demanda, t_i = λ/ε_i. Se compara con un tipo uniforme que
   recauda lo mismo, en eficiencia (exceso de gravamen) y en equidad (tipo efectivo
   sobre la cesta del quintil más pobre y del más rico).
   Supuestos: demandas independientes, consumidor representativo (Ramsey ignora la
   distribución por construcción) y exceso de gravamen aproximado por ½·ε·t²·B. */
(function () {
  'use strict';
  const F = SIM.fmt, C = SIM.color;

  // Bases imponibles fijas (gasto gravable, M€) y participación de cada bien
  // en el gasto total del quintil más pobre y del más rico (cifras estilizadas
  // en la línea de la Encuesta de Presupuestos Familiares del INE).
  const BIENES = [
    { nombre: 'Alimentación básica', base: 80000, pobre: 0.35, rico: 0.12, id: 'ram-e1' },
    { nombre: 'Energía doméstica', base: 40000, pobre: 0.15, rico: 0.08, id: 'ram-e2' },
    { nombre: 'Ropa y calzado', base: 30000, pobre: 0.12, rico: 0.10, id: 'ram-e3' },
    { nombre: 'Ocio y restauración', base: 50000, pobre: 0.10, rico: 0.25, id: 'ram-e4' }
  ];
  const BASE_TOTAL = BIENES.reduce((s, g) => s + g.base, 0);

  const html = `
  <div class="grid-2">
    <div class="card">
      <h3>Cuatro bienes, una recaudación que conseguir</h3>
      <p class="inline-note">Las bases están fijas (alimentación 80.000 M€, energía 40.000, ropa 30.000, ocio 50.000; ${F.n0(BASE_TOTAL)} M€ en total). Tú eliges lo elástica que es la demanda de cada uno y cuánto hay que recaudar.</p>
      ${SIM.slider('ram-e1', { label: 'Alimentación básica |ε|', min: 0.1, max: 2, step: 0.1, value: 0.3 })}
      ${SIM.slider('ram-e2', { label: 'Energía doméstica |ε|', min: 0.1, max: 2, step: 0.1, value: 0.4 })}
      ${SIM.slider('ram-e3', { label: 'Ropa y calzado |ε|', min: 0.1, max: 2, step: 0.1, value: 0.8 })}
      ${SIM.slider('ram-e4', { label: 'Ocio y restauración |ε|', min: 0.1, max: 2, step: 0.1, value: 1.5 })}
      ${SIM.slider('ram-target', { label: 'Recaudación objetivo', help: 'la misma para las dos alternativas, en millones de €', min: 10000, max: 100000, step: 5000, value: 50000 })}

      <h3>Eficiencia</h3>
      <div class="results-grid">
        ${SIM.result('ram-r-tunif', 'Tipo uniforme', 'igual para los cuatro bienes')}
        ${SIM.result('ram-r-egram', 'Exceso con Ramsey', 'M€', 'green')}
        ${SIM.result('ram-r-egunif', 'Exceso con tipo uniforme', 'M€', 'red')}
        ${SIM.result('ram-r-ahorro', 'Ahorro de eficiencia', 'menos exceso de gravamen', 'green')}
      </div>

      <h3>Equidad</h3>
      <div class="results-grid">
        ${SIM.result('ram-r-pobre', 'Carga sobre el quintil pobre (Ramsey)', 'de su gasto total', 'red')}
        ${SIM.result('ram-r-rico', 'Carga sobre el quintil rico (Ramsey)', 'de su gasto total')}
        ${SIM.result('ram-r-ratio', 'Cuántas veces más paga el pobre', 'bajo Ramsey', 'red')}
        ${SIM.result('ram-r-ratiou', 'Cuántas veces más paga el pobre', 'bajo el tipo uniforme', 'orange')}
      </div>
      <div class="aviso" id="ram-aviso"></div>
    </div>

    <div class="card">
      <h3>Tipos óptimos frente a tipo uniforme</h3>
      ${SIM.chartBox('ram-chart-tipos', 290)}
      <h3>Lo que cuesta cada alternativa</h3>
      ${SIM.chartBox('ram-chart-exceso', 190)}
      <h3>Quién soporta la carga</h3>
      ${SIM.chartBox('ram-chart-equidad', 260)}
      <p class="inline-note">Tipo efectivo soportado por cada quintil: suma de los tipos de cada bien ponderada por lo que ese quintil gasta en él. Aquí es donde Ramsey enseña los dientes.</p>
    </div>
  </div>

  <div class="card">
    <h3>Bien a bien</h3>
    <table class="tabla" id="ram-tabla"></table>
  </div>

  <div class="card interpretation" id="ram-interp"></div>`;

  function calcular() {
    const target = SIM.val('ram-target');
    const bienes = BIENES.map(g => Object.assign({}, g, { elas: SIM.val(g.id) || 0.1 }));

    // Ramsey: t_i = λ/ε_i, con λ fijado para alcanzar la recaudación objetivo
    const sumaBaseEntreElas = bienes.reduce((s, g) => s + g.base / g.elas, 0);
    const lambda = target / sumaBaseEntreElas;
    bienes.forEach(g => { g.tRamsey = lambda / g.elas; });

    // Tipo uniforme que recauda lo mismo
    const tUnif = target / BASE_TOTAL;
    bienes.forEach(g => {
      g.tUnif = tUnif;
      g.egRamsey = 0.5 * g.elas * g.tRamsey * g.tRamsey * g.base;
      g.egUnif = 0.5 * g.elas * tUnif * tUnif * g.base;
      g.recRamsey = g.tRamsey * g.base;
      g.recUnif = tUnif * g.base;
    });

    const egRamsey = bienes.reduce((s, g) => s + g.egRamsey, 0);
    const egUnif = bienes.reduce((s, g) => s + g.egUnif, 0);
    const ahorro = egUnif > 0 ? (egUnif - egRamsey) / egUnif : 0;

    // Tipo efectivo sobre el gasto total de cada quintil
    const carga = (clave, tipo) => bienes.reduce((s, g) => s + g[tipo] * g[clave], 0);
    return {
      target, bienes, lambda, tUnif, egRamsey, egUnif, ahorro,
      pobreRamsey: carga('pobre', 'tRamsey'), ricoRamsey: carga('rico', 'tRamsey'),
      pobreUnif: carga('pobre', 'tUnif'), ricoUnif: carga('rico', 'tUnif'),
      dispersion: Math.max.apply(null, bienes.map(g => g.tRamsey)) / Math.min.apply(null, bienes.map(g => g.tRamsey))
    };
  }

  function update(root) {
    BIENES.forEach(g => SIM.show(g.id + '-val', F.n1(SIM.val(g.id))));
    const m = calcular();
    SIM.show('ram-target-val', F.n0(m.target) + ' M€');

    SIM.show('ram-r-tunif', F.pct(m.tUnif, 1));
    SIM.show('ram-r-egram', F.n0(m.egRamsey));
    SIM.show('ram-r-egunif', F.n0(m.egUnif));
    SIM.show('ram-r-ahorro', F.pct(m.ahorro, 1));
    SIM.show('ram-r-pobre', F.pct(m.pobreRamsey, 1));
    SIM.show('ram-r-rico', F.pct(m.ricoRamsey, 1));
    SIM.show('ram-r-ratio', '×' + F.n2(m.ricoRamsey > 0 ? m.pobreRamsey / m.ricoRamsey : 0));
    SIM.show('ram-r-ratiou', '×' + F.n2(m.ricoUnif > 0 ? m.pobreUnif / m.ricoUnif : 0));

    // ---------- Aviso ----------
    let aviso;
    if (m.dispersion < 1.02) {
      aviso = `<strong>Ramsey coincide con el tipo uniforme.</strong> Has puesto la misma elasticidad en los cuatro bienes, así que la regla de la elasticidad inversa no tiene nada que diferenciar: `
        + `el tipo óptimo es el mismo para todos y el ahorro de eficiencia es cero. <em>La uniformidad no es un principio: es el caso particular de Ramsey cuando todas las demandas responden igual.</em>`;
    } else {
      aviso = `<strong>Dispersión de tipos.</strong> Ramsey grava el bien más rígido ${F.n1(m.dispersion)} veces más que el más elástico. `
        + `Cuanto más separadas estén las elasticidades, más se aleja el óptimo de la uniformidad y más grande es el ahorro de eficiencia, `
        + `pero también más regresivo se vuelve el sistema si los bienes rígidos son los de primera necesidad.`;
    }
    SIM.html('ram-aviso', aviso);

    // ---------- Gráfico 1: tipos ----------
    SIM.chart('ram-chart-tipos', {
      type: 'bar',
      data: {
        labels: m.bienes.map(g => g.nombre),
        datasets: [
          { label: 'Tipo Ramsey (óptimo en eficiencia)', data: m.bienes.map(g => g.tRamsey * 100), backgroundColor: C.azul },
          { label: 'Tipo uniforme (misma recaudación)', data: m.bienes.map(() => m.tUnif * 100), backgroundColor: SIM.alpha(C.gris, .55) }
        ]
      },
      options: {
        scales: {
          x: { grid: { display: false }, title: { display: false } },
          y: { beginAtZero: true, title: { text: 'Tipo impositivo (%)' } }
        },
        plugins: {
          tooltip: { callbacks: { label: it => `${it.dataset.label}: ${F.n1(it.parsed.y)} %` } }
        }
      }
    });

    // ---------- Gráfico 2: exceso de gravamen ----------
    SIM.chart('ram-chart-exceso', {
      type: 'bar',
      data: {
        labels: ['Tipo uniforme', 'Tipos de Ramsey'],
        datasets: [{ label: 'Exceso de gravamen (M€)', data: [m.egUnif, m.egRamsey], backgroundColor: [C.rojo, C.verde] }]
      },
      options: {
        indexAxis: 'y',
        scales: {
          x: { beginAtZero: true, title: { text: 'Exceso de gravamen (M€) para la misma recaudación' } },
          y: { grid: { display: false }, title: { display: false } }
        },
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: it => `${F.n0(it.parsed.x)} M€` } } }
      }
    });

    // ---------- Gráfico 3: carga por quintil ----------
    SIM.chart('ram-chart-equidad', {
      type: 'bar',
      data: {
        labels: ['Quintil más pobre', 'Quintil más rico'],
        datasets: [
          { label: 'Tipos de Ramsey', data: [m.pobreRamsey * 100, m.ricoRamsey * 100], backgroundColor: C.azul },
          { label: 'Tipo uniforme', data: [m.pobreUnif * 100, m.ricoUnif * 100], backgroundColor: SIM.alpha(C.gris, .55) }
        ]
      },
      options: {
        scales: {
          x: { grid: { display: false }, title: { display: false } },
          y: { beginAtZero: true, title: { text: 'Tipo efectivo sobre el gasto total del hogar (%)' } }
        },
        plugins: { tooltip: { callbacks: { label: it => `${it.dataset.label}: ${F.n2(it.parsed.y)} % del gasto` } } }
      }
    });

    // ---------- Tabla ----------
    SIM.html('ram-tabla',
      `<thead><tr><th>Bien</th><th>Base (M€)</th><th>|ε|</th><th>Tipo Ramsey</th><th>Tipo uniforme</th><th>Recaudación Ramsey (M€)</th><th>Exceso Ramsey (M€)</th><th>Exceso uniforme (M€)</th><th>% del gasto del quintil pobre</th><th>% del gasto del quintil rico</th></tr></thead><tbody>`
      + m.bienes.map(g => `<tr><td>${g.nombre}</td><td>${F.n0(g.base)}</td><td>${F.n1(g.elas)}</td><td><strong>${F.pct(g.tRamsey, 1)}</strong></td><td>${F.pct(g.tUnif, 1)}</td><td>${F.n0(g.recRamsey)}</td><td>${F.n0(g.egRamsey)}</td><td>${F.n0(g.egUnif)}</td><td>${F.pct(g.pobre, 0)}</td><td>${F.pct(g.rico, 0)}</td></tr>`).join('')
      + `<tr class="total"><td>Total</td><td>${F.n0(BASE_TOTAL)}</td><td>—</td><td>—</td><td>${F.pct(m.tUnif, 1)}</td><td>${F.n0(m.target)}</td><td>${F.n0(m.egRamsey)}</td><td>${F.n0(m.egUnif)}</td><td>—</td><td>—</td></tr>`
      + `</tbody>`);

    // ---------- Lectura ----------
    const ali = m.bienes[0], ocio = m.bienes[3];
    let txt = `<strong>Lectura.</strong> Para recaudar ${F.n0(m.target)} M€, la regla de la elasticidad inversa grava la alimentación al ${F.pct(ali.tRamsey, 1)} y el ocio al ${F.pct(ocio.tRamsey, 1)}: `
      + `justo al revés de lo que hace el IVA español. El motivo es puramente de eficiencia: el impuesto debe recaer donde la cantidad consumida se mueve menos, porque el exceso de gravamen nace de la cantidad que se deja de comprar, no del dinero que cambia de manos. `;
    if (m.ahorro > 0.005) {
      txt += `Con estas elasticidades, Ramsey ahorra ${F.pct(m.ahorro, 1)} de exceso de gravamen frente a un tipo uniforme del ${F.pct(m.tUnif, 1)} que recauda exactamente lo mismo: `
        + `${F.n0(m.egRamsey)} M€ en lugar de ${F.n0(m.egUnif)} M€, es decir, ${F.n0(m.egUnif - m.egRamsey)} M€ de bienestar rescatados sin que Hacienda ingrese ni un euro menos. `;
    } else {
      txt += `Con estas elasticidades no hay nada que ahorrar: los cuatro bienes responden igual, así que el óptimo de Ramsey <em>es</em> el tipo uniforme del ${F.pct(m.tUnif, 1)}. `;
    }
    txt += `<br><strong>Y aquí llega la factura.</strong> Bajo Ramsey, el quintil más pobre entrega el ${F.pct(m.pobreRamsey, 1)} de su gasto total y el más rico el ${F.pct(m.ricoRamsey, 1)}: `
      + `<strong>×${F.n2(m.ricoRamsey > 0 ? m.pobreRamsey / m.ricoRamsey : 0)}</strong>. Con el tipo uniforme la brecha sería ×${F.n2(m.ricoUnif > 0 ? m.pobreUnif / m.ricoUnif : 0)}. `
      + `Fíjate en que incluso el tipo uniforme resulta regresivo en esta medida, porque los hogares de renta baja dedican una parte mayor de su gasto a estos bienes; `
      + `lo que hace Ramsey es <em>amplificar</em> esa regresividad, al concentrar los tipos altos precisamente en los productos de primera necesidad. `
      + `Este es el dilema eficiencia-equidad en su forma más desnuda. `;
    txt += `<br><strong>Lo que Ramsey no ve.</strong> La regla se deriva para un consumidor representativo: por construcción no hay ricos ni pobres en el modelo, así que la distribución no puede aparecer en el resultado. `
      + `En cuanto se admiten pesos sociales distintos por hogar (Diamond y Mirrlees, 1971), la fórmula corregida rebaja el tipo de los bienes que pesan más en la cesta de los pobres. `
      + `Y el teorema de Atkinson y Stiglitz (1976) añade el argumento decisivo: si ya existe un impuesto sobre la renta progresivo y bien diseñado, la redistribución conviene hacerla ahí y no diferenciando tipos indirectos. `
      + `Por eso la <em>Mirrlees Review</em> (2011) recomienda un IVA lo más uniforme posible acompañado de transferencias a los hogares de renta baja, en vez de tipos reducidos que también se lleva quien no los necesita.`;
    SIM.html('ram-interp', txt);
  }

  SIM.register({
    id: 'ramsey', nav: 'Ramsey', tema: 'Tema 8',
    title: 'La regla de Ramsey: imposición óptima sobre el consumo',
    subtitle: 'Ramsey (1927) demostró que, para recaudar una cantidad dada con el mínimo exceso de gravamen, los tipos deben ser inversamente proporcionales a las elasticidades de demanda. La consecuencia incomoda: hay que gravar más los alimentos y la energía que el ocio. El módulo calcula los tipos óptimos, los compara con un tipo uniforme que recauda lo mismo y pone al lado quién acaba pagando.',
    guia: {
      observa: [
        'Los tipos de Ramsey son <strong>inversamente proporcionales</strong> a las elasticidades: si un bien es cinco veces más rígido que otro, su tipo es cinco veces mayor. Cambia una elasticidad y verás moverse todos los tipos, porque λ se reajusta para seguir recaudando lo mismo.',
        'Pon las cuatro elasticidades iguales: Ramsey y el tipo uniforme se superponen y el ahorro de eficiencia cae a cero. <strong>La uniformidad no es un principio rival de Ramsey: es Ramsey cuando las demandas responden igual.</strong>',
        'El ahorro de eficiencia es real pero suele ser modesto (rara vez pasa del 20-30 %); la diferencia de carga entre quintiles, en cambio, es inmediata y visible. Compara las dos magnitudes antes de decidir.',
        'El tercer gráfico enseña que incluso el <em>tipo uniforme</em> es regresivo sobre el gasto, porque los hogares pobres gastan una fracción mayor de su presupuesto en estos bienes. Ramsey no crea la regresividad: la multiplica.',
        'Sube la recaudación objetivo: los tipos crecen de forma proporcional pero el exceso de gravamen crece con el cuadrado. Es el mismo t² del módulo anterior, ahora repartido entre cuatro bienes.'
      ],
      pregunta: 'El IVA español grava los alimentos al 4 % o al 10 % y la restauración al 10 %, mientras el tipo general es del 21 %. Es decir, hace más o menos lo contrario de lo que recomienda Ramsey. ¿Por qué? ¿Qué principio del Tema 2 está pesando más que la eficiencia, y hay una forma mejor de servirlo?',
      respuesta: 'Pesa la <strong>equidad vertical</strong>, la traducción fiscal del principio de capacidad de pago: los alimentos son una parte mucho mayor del gasto de un hogar de renta baja, de modo que gravarlos al tipo general sería fuertemente regresivo. El legislador acepta a sabiendas un exceso de gravamen mayor a cambio de una distribución de la carga menos desigual, exactamente el intercambio que muestra el simulador. Ahora bien, la teoría posterior sugiere que hay una manera mejor de servir ese mismo principio. El teorema de Atkinson y Stiglitz (1976) muestra que, con un impuesto sobre la renta progresivo disponible, la diferenciación de tipos indirectos es un instrumento redundante e ineficiente para redistribuir; y el tipo reducido tiene una fuga evidente, porque el hogar rico también compra alimentos y en términos absolutos se lleva más subvención implícita que el pobre. De ahí la recomendación de la Mirrlees Review: IVA uniforme y amplio, con la compensación por la vía de transferencias o del IRPF, que sí se pueden dirigir a quien las necesita.'
    },
    presets: [
      { label: 'Elasticidades del ejemplo', title: 'Caso de referencia del Tema 8', values: { 'ram-e1': 0.3, 'ram-e2': 0.4, 'ram-e3': 0.8, 'ram-e4': 1.5, 'ram-target': 50000 } },
      { label: 'Todos los bienes iguales (Ramsey = uniforme)', title: 'Si todas las demandas responden igual, el óptimo es la uniformidad', values: { 'ram-e1': 0.8, 'ram-e2': 0.8, 'ram-e3': 0.8, 'ram-e4': 0.8, 'ram-target': 50000 } },
      { label: 'Alimentos muy inelásticos', title: 'La regla se vuelve extrema y la carga se concentra en la cesta básica', values: { 'ram-e1': 0.1, 'ram-e2': 0.4, 'ram-e3': 0.8, 'ram-e4': 1.5, 'ram-target': 50000 } },
      { label: 'Recaudación alta', title: 'Duplicar el objetivo: los tipos se doblan, el exceso se cuadruplica', values: { 'ram-e1': 0.3, 'ram-e2': 0.4, 'ram-e3': 0.8, 'ram-e4': 1.5, 'ram-target': 100000 } }
    ],
    html, update
  });
})();
