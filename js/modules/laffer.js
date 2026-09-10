/* Módulo de curva de Laffer y tipo marginal máximo óptimo (Tema 8 de HP II)
   Parte A — Laffer agregada: R(t) = t·B·(1−t)^e, con máximo en t* = 1/(1+e).
   Parte B — Diamond y Saez (2011): tipo marginal máximo que maximiza la recaudación
             sobre las rentas altas, τ* = 1/(1 + a·e), con a el parámetro de Pareto
             de la cola de la distribución de la renta.
   Las dos comparten la misma elasticidad de la renta gravable (ETI), pero responden
   a preguntas distintas y no hay que confundirlas. */
(function () {
  'use strict';
  const F = SIM.fmt, C = SIM.color;

  const MARGINAL_ESP = 0.47;   // marginal máximo estatal + autonómico de referencia en España

  const html = `
  <div class="card">
    <h3>Parte A · La curva de Laffer agregada</h3>
    <div class="grid-2">
      <div>
        ${SIM.slider('laf-t', { label: 'Tipo impositivo actual', min: 1, max: 80, step: 1, value: 35 })}
        ${SIM.slider('laf-e', { label: 'Elasticidad de la renta gravable (ETI) <em>e</em>', help: 'Saez, Slemrod y Giertz (2012): estimación central 0,25; rango habitual 0,12-0,40, más alto en rentas muy altas', min: 0.1, max: 1.5, step: 0.05, value: 0.25 })}
        ${SIM.slider('laf-base', { label: 'Base imponible potencial', help: 'la que habría con un tipo del 0 %, en millones de €', min: 100000, max: 1000000, step: 50000, value: 500000 })}
        <div class="results-grid">
          ${SIM.result('laf-r-rec', 'Recaudación actual', 'M€', 'green')}
          ${SIM.result('laf-r-tstar', 'Tipo maximizador t*', '= 1/(1+e)', 'orange')}
          ${SIM.result('laf-r-max', 'Recaudación máxima', 'M€')}
          ${SIM.result('laf-r-gap', 'Margen recaudatorio', 'M€ que quedan sobre la mesa')}
        </div>
        <div class="aviso" id="laf-lado"></div>
      </div>
      <div>
        ${SIM.chartBox('laf-chart-a', 360)}
        <p class="inline-note">La zona roja es el <strong>lado prohibitivo</strong>: ahí, bajar el tipo aumentaría la recaudación. El punto azul es tu escenario; la línea vertical, el tipo maximizador.</p>
      </div>
    </div>
  </div>

  <div class="card">
    <h3>Parte B · El tipo marginal máximo óptimo (Diamond y Saez, 2011)</h3>
    <p class="subtitle">La curva de Laffer de arriba habla de un impuesto medio sobre toda la base. La fórmula de Diamond y Saez responde a otra pregunta, más precisa: ¿cuál es el tipo <em>marginal</em> que maximiza lo que se recauda del último tramo, el de las rentas altas? La respuesta es τ* = 1/(1 + a·e), donde <em>a</em> mide lo gruesa que es la cola de la distribución.</p>
    <div class="grid-2">
      <div>
        ${SIM.slider('laf-a', { label: 'Parámetro de Pareto de la cola <em>a</em>', help: 'Diamond y Saez estiman a ≈ 1,5 para Estados Unidos; en España la cola es algo menos gruesa, en torno a 2. Cuanto mayor es a, menos renta hay por encima del umbral', min: 1.2, max: 3, step: 0.1, value: 2 })}
        <p class="inline-note">La elasticidad <em>e</em> es la misma que en la Parte A: muévela allí y este resultado cambia con ella.</p>
        <div class="results-grid">
          ${SIM.result('laf-r-tau', 'Tipo marginal máximo óptimo τ*', '= 1/(1+a·e)', 'orange')}
          ${SIM.result('laf-r-esp', 'Marginal máximo español de referencia', '47 % (estatal + autonómico)')}
          ${SIM.result('laf-r-dif', 'Distancia', 'puntos porcentuales')}
        </div>
        <div class="aviso" id="laf-veredicto"></div>
      </div>
      <div>
        ${SIM.chartBox('laf-chart-b', 330)}
        <p class="inline-note">τ* frente a la elasticidad, para tres colas distintas. La línea horizontal es el 47 % español de referencia; el punto, tu escenario.</p>
      </div>
    </div>
  </div>

  <div class="card interpretation" id="laf-interp"></div>`;

  function leer() {
    return {
      t: SIM.val('laf-t') / 100,
      e: SIM.val('laf-e'),
      base: SIM.val('laf-base'),
      a: SIM.val('laf-a')
    };
  }

  function update(root) {
    const p = leer();
    SIM.show('laf-t-val', F.pct(p.t, 0));
    SIM.show('laf-e-val', F.n2(p.e));
    SIM.show('laf-base-val', F.n0(p.base) + ' M€');
    SIM.show('laf-a-val', F.n1(p.a));

    /* ---------------- Parte A ---------------- */
    const tStar = TAX.lafferTstar(p.e);
    const recActual = TAX.laffer(p.t, p.base, p.e);
    const recMax = TAX.laffer(tStar, p.base, p.e);
    const margen = recMax - recActual;

    SIM.show('laf-r-rec', F.n0(recActual));
    SIM.show('laf-r-tstar', F.pct(tStar, 1));
    SIM.show('laf-r-max', F.n0(recMax));
    SIM.show('laf-r-gap', (margen >= 0 ? '+' : '') + F.n0(margen));

    const enProhibitivo = p.t > tStar + 0.005;
    const enMaximo = Math.abs(p.t - tStar) <= 0.005;
    let ladoTxt;
    if (enMaximo) {
      ladoTxt = `<strong>Estás justo en el máximo.</strong> Ni subir ni bajar el tipo cambiaría apreciablemente la recaudación: la respuesta de la base compensa exactamente el cambio de tipo.`;
    } else if (enProhibitivo) {
      const recBaja = TAX.laffer(Math.max(0.01, p.t - 0.05), p.base, p.e);
      ladoTxt = `<strong>Lado prohibitivo.</strong> El tipo actual (${F.pct(p.t, 0)}) está por encima de t* = ${F.pct(tStar, 1)}. `
        + `Bajarlo cinco puntos, hasta el ${F.pct(p.t - 0.05, 0)}, <span class="perdida">aumentaría</span> la recaudación en ${F.n0(recBaja - recActual)} M€. `
        + `Es el único tramo en el que «bajar impuestos para recaudar más» es literalmente cierto.`;
    } else {
      const recSube = TAX.laffer(Math.min(0.99, p.t + 0.05), p.base, p.e);
      ladoTxt = `<strong>Lado normal (creciente).</strong> El tipo actual (${F.pct(p.t, 0)}) está por debajo de t* = ${F.pct(tStar, 1)}: `
        + `subirlo cinco puntos aportaría ${F.n0(recSube - recActual)} M€ más. Ojo: que recaude más no significa que sea buena idea; el módulo del exceso de gravamen mide lo que cuesta.`;
    }
    SIM.html('laf-lado', ladoTxt);

    // Curva y sombreado del lado prohibitivo
    const ts = [], rs = [];
    for (let r = 0; r <= 95; r++) { ts.push(r); rs.push(TAX.laffer(r / 100, p.base, p.e) / 1000); }
    const tsProh = [], rsProh = [];
    for (let r = 0; r <= 95; r++) { if (r / 100 >= tStar) { tsProh.push(r); rsProh.push(TAX.laffer(r / 100, p.base, p.e) / 1000); } }

    SIM.chart('laf-chart-a', {
      type: 'line',
      data: {
        datasets: [
          { label: 'Lado prohibitivo (bajar el tipo recaudaría más)', data: SIM.xy(tsProh, rsProh), borderColor: SIM.alpha(C.rojo, .22), backgroundColor: SIM.alpha(C.rojo, .22), fill: 'origin', borderWidth: 0, pointRadius: 0, tension: 0 },
          { label: 'Recaudación R(t) = t·B·(1−t)^e', data: SIM.xy(ts, rs), borderColor: C.azul, backgroundColor: SIM.alpha(C.azul, .08), fill: 'origin', borderWidth: 2.6, pointRadius: 0, tension: 0 }
        ]
      },
      options: {
        scales: {
          x: { type: 'linear', min: 0, max: 95, title: { text: 'Tipo impositivo (%)' } },
          y: { beginAtZero: true, title: { text: 'Recaudación (miles de M€)' } }
        },
        plugins: {
          refs: {
            x: [{ value: tStar * 100, label: `t* = ${F.pct(tStar, 1)}`, color: C.naranja }],
            points: [
              { x: tStar * 100, y: recMax / 1000, label: `máximo ${F.n0(recMax)} M€`, color: C.naranja, align: 'right', dy: -10 },
              { x: p.t * 100, y: recActual / 1000, label: `hoy ${F.n0(recActual)} M€`, color: C.azul, dy: 18 }
            ]
          },
          tooltip: {
            callbacks: {
              title: it => `Tipo del ${F.n0(it[0].parsed.x)} %`,
              label: it => `Recaudación: ${F.n1(it.parsed.y)} miles de M€`
            }
          }
        }
      }
    });

    /* ---------------- Parte B ---------------- */
    const tau = TAX.diamondSaez(p.a, p.e);
    const dif = (tau - MARGINAL_ESP) * 100;
    SIM.show('laf-r-tau', F.pct(tau, 1));
    SIM.show('laf-r-esp', F.pct(MARGINAL_ESP, 0));
    SIM.show('laf-r-dif', F.pp(dif));

    let veredicto;
    if (dif > 2) {
      veredicto = `<strong>El 47 % español queda por debajo de τ*.</strong> Con estos parámetros, la fórmula dice que todavía habría margen recaudatorio: subir el marginal máximo aumentaría lo que se ingresa de las rentas altas, `
        + `porque el efecto mecánico (más tipo sobre la misma renta) pesa más que el efecto conductual (menos renta declarada). `;
    } else if (dif < -2) {
      veredicto = `<strong>El 47 % español queda por encima de τ*.</strong> Con estos parámetros, el marginal máximo español estaría en el lado prohibitivo: bajarlo aumentaría la recaudación procedente de las rentas altas, `
        + `porque la respuesta de la base declarada domina al efecto mecánico. `;
    } else {
      veredicto = `<strong>El 47 % español está prácticamente en τ*.</strong> Con estos parámetros, ni subir ni bajar el marginal máximo movería mucho la recaudación de las rentas altas. `;
    }
    veredicto += `Recuerda que τ* es el tipo que <em>maximiza la recaudación</em>, no el socialmente óptimo: solo coinciden si al Estado le da exactamente igual el bienestar de quien está en la cola (peso social cero). `
      + `Con cualquier peso positivo, el tipo deseable es menor que τ*. Y la elasticidad <em>e</em> no es un dato de la naturaleza: depende del diseño de la base, de las oportunidades de elusión y del control tributario.`;
    SIM.html('laf-veredicto', veredicto);

    const es = [], curvas = { 1.5: [], 2: [], 2.5: [] };
    for (let i = 5; i <= 150; i += 1) {
      const e = i / 100;
      es.push(e);
      curvas[1.5].push(TAX.diamondSaez(1.5, e) * 100);
      curvas[2].push(TAX.diamondSaez(2, e) * 100);
      curvas[2.5].push(TAX.diamondSaez(2.5, e) * 100);
    }
    SIM.chart('laf-chart-b', {
      type: 'line',
      data: {
        datasets: [
          { label: 'a = 1,5 (cola gruesa, Estados Unidos)', data: SIM.xy(es, curvas[1.5]), borderColor: C.naranja, borderWidth: 2.2, pointRadius: 0, tension: 0 },
          { label: 'a = 2 (referencia para España)', data: SIM.xy(es, curvas[2]), borderColor: C.azul, borderWidth: 2.6, pointRadius: 0, tension: 0 },
          { label: 'a = 2,5 (cola fina)', data: SIM.xy(es, curvas[2.5]), borderColor: C.verde, borderWidth: 2.2, borderDash: [6, 4], pointRadius: 0, tension: 0 }
        ]
      },
      options: {
        scales: {
          x: { type: 'linear', min: 0.05, max: 1.5, title: { text: 'Elasticidad de la renta gravable (ETI)' } },
          y: { beginAtZero: true, max: 100, title: { text: 'Tipo marginal máximo óptimo τ* (%)' } }
        },
        plugins: {
          refs: {
            y: [{ value: MARGINAL_ESP * 100, label: 'España: marginal máximo 47 %', color: C.rojo }],
            points: [{ x: p.e, y: tau * 100, label: `τ* = ${F.pct(tau, 1)}`, color: C.tinta, dy: -10 }]
          },
          tooltip: {
            callbacks: {
              title: it => `ETI = ${F.n2(it[0].parsed.x)}`,
              label: it => `${it.dataset.label}: τ* = ${F.n1(it.parsed.y)} %`
            }
          }
        }
      }
    });

    /* ---------------- Lectura ---------------- */
    let txt = `<strong>Lectura.</strong> Con una elasticidad de la renta gravable de ${F.n2(p.e)}, la curva de Laffer agregada alcanza su máximo en t* = ${F.pct(tStar, 1)}. `
      + `Con el tipo actual del ${F.pct(p.t, 0)} sobre una base potencial de ${F.n0(p.base)} M€, la recaudación es ${F.n0(recActual)} M€, frente a un máximo teórico de ${F.n0(recMax)} M€. `;
    if (enProhibitivo) {
      txt += `Estás en el lado prohibitivo: <strong>bajar el tipo aumentaría la recaudación</strong>. Conviene subrayar que casi ningún país desarrollado está ahí en su impuesto sobre la renta agregado; hacen falta elasticidades muy altas para que t* baje al entorno de los tipos reales. `;
    } else {
      txt += `Estás en el tramo creciente: subir el tipo recaudaría ${F.n0(margen)} M€ más, aunque a costa de más exceso de gravamen. `;
    }
    txt += `<br><strong>No confundas las dos preguntas.</strong> La curva de Laffer de la Parte A habla del tipo <em>medio</em> sobre toda la base imponible; `
      + `la fórmula de Diamond y Saez de la Parte B habla del tipo <em>marginal del último tramo</em>, el que se aplica solo a los euros por encima de un umbral alto. `
      + `Por eso τ* = 1/(1+a·e) = ${F.pct(tau, 1)} con a = ${F.n1(p.a)} es un número mucho mayor que t* = ${F.pct(tStar, 1)}: gravar al 70 % el último euro de quien gana un millón no es lo mismo que gravar al 70 % toda la renta del país. `
      + `El parámetro a recoge cuánta renta hay por encima del umbral: cuanto más gruesa es la cola (a pequeño), más se gana subiendo el marginal y mayor es τ*. `;
    txt += `<br><strong>¿Y si el tipo actual supera τ*?</strong> Entonces el último tramo del IRPF estaría autoderrotándose: cada punto adicional de tipo reduciría la renta declarada lo suficiente `
      + `como para que la recaudación bajase. La respuesta de política no es automáticamente «bajar el tipo»: como recuerdan Saez, Slemrod y Giertz (2012), buena parte de la elasticidad medida es `
      + `<em>elusión y desplazamiento temporal de rentas</em>, no menos esfuerzo. Si la e alta viene de agujeros en la base, la reforma eficiente es cerrar los agujeros (lo que reduce e y sube τ*), no rebajar el tipo. `;
    txt += `<br><strong>Contexto español.</strong> El marginal máximo combinado ronda el ${F.pct(MARGINAL_ESP, 0)} en la mayoría de comunidades (el 45 % en Madrid, y por encima del 50 % en Cataluña o la Comunidad Valenciana en los tramos más altos); `
      + `usamos el 47 % como referencia porque es el que resulta de sumar la escala estatal y una autonómica de tipo medio. Con tu combinación actual (a = ${F.n1(p.a)}, e = ${F.n2(p.e)}), τ* = ${F.pct(tau, 1)}, `
      + `es decir, ${Math.abs(dif) < 2 ? 'prácticamente el mismo nivel' : (dif > 0 ? `${F.n1(Math.abs(dif))} puntos por encima` : `${F.n1(Math.abs(dif))} puntos por debajo`)}.`;
    SIM.html('laf-interp', txt);
  }

  SIM.register({
    id: 'laffer', nav: 'Laffer y tipo óptimo', tema: 'Tema 8',
    title: 'Curva de Laffer y tipo marginal máximo óptimo',
    subtitle: 'Dos preguntas que se parecen y no son la misma. La curva de Laffer, R = t·B·(1−t)^e, busca el tipo medio que maximiza la recaudación agregada. La fórmula de Diamond y Saez (2011), τ* = 1/(1+a·e), busca el tipo marginal máximo que maximiza lo que se ingresa del tramo más alto. Las dos dependen de la elasticidad de la renta gravable, pero dan números muy distintos y sirven para argumentos distintos.',
    guia: {
      observa: [
        'El máximo de la curva de Laffer, t* = 1/(1+e), <strong>solo depende de la elasticidad</strong>: la base potencial estira la curva hacia arriba pero no mueve el máximo ni un punto. Compruébalo moviendo la base.',
        'Con la ETI central de Saez, Slemrod y Giertz (2012) —0,25— el tipo maximizador está en el 80 %. Hacen falta elasticidades superiores a 1,5 para que t* baje del 40 %: <strong>estar en el lado prohibitivo es mucho más difícil de lo que sugiere el debate público.</strong>',
        'La zona roja del gráfico es el único tramo donde «bajar impuestos para recaudar más» es cierto. Fuera de ella, una rebaja siempre cuesta recaudación.',
        'En la Parte B, sube <em>a</em> de 1,5 a 3 dejando la elasticidad quieta: τ* se desploma. La cola de la distribución importa tanto como la conducta de los contribuyentes.',
        'τ* maximiza la recaudación, no el bienestar. Solo sería el tipo óptimo si al planificador le diera exactamente igual lo que le pase a quien está en la cola. Cualquier peso social positivo empuja el tipo deseable por debajo de τ*.'
      ],
      pregunta: 'Un partido propone bajar el marginal máximo del 47 % al 43 % «porque así se recaudará más». ¿Qué tendría que ser cierto sobre e y sobre a para que esa frase se sostenga? Y si el número saliera, ¿bastaría para justificar la medida?',
      respuesta: 'Para que bajar del 47 % suba la recaudación del tramo alto haría falta que 47 % > τ* = 1/(1+a·e), es decir, a·e > 1,13. Con a = 2 eso exige una ETI por encima de 0,57, más del doble de la estimación central de Saez, Slemrod y Giertz (0,25) y en el extremo superior del rango que se estima para rentas muy altas. Es posible, pero no es el escenario de referencia. Y aunque el número saliera, no bastaría: τ* es el tipo que maximiza el ingreso, no el que maximiza el bienestar. Estar por debajo de τ* es perfectamente compatible con querer bajar el tipo (si valoramos el bienestar de los afectados) y estar por encima no obliga a bajarlo si la elasticidad viene de elusión: en ese caso la reforma correcta es ensanchar la base y reforzar el control, lo que reduce e y sube τ*.'
    },
    presets: [
      { label: 'ETI central (0,25), a = 1,5 (EE. UU.)', title: 'Estimación central de Saez, Slemrod y Giertz con la cola estadounidense de Diamond-Saez', values: { 'laf-t': 35, 'laf-e': 0.25, 'laf-base': 500000, 'laf-a': 1.5 } },
      { label: 'ETI alta (rentas altas, 0,6)', title: 'Extremo superior del rango estimado para los contribuyentes de renta más alta', values: { 'laf-t': 45, 'laf-e': 0.6, 'laf-base': 500000, 'laf-a': 2 } },
      { label: 'Lado prohibitivo de Laffer (t = 80 %)', title: 'Tipo por encima de t*: bajarlo aumentaría la recaudación', values: { 'laf-t': 80, 'laf-e': 0.4, 'laf-base': 500000, 'laf-a': 2 } },
      { label: 'España: a = 2, e = 0,3', title: 'Cola algo menos gruesa que la estadounidense y ETI en el rango habitual', values: { 'laf-t': 47, 'laf-e': 0.3, 'laf-base': 500000, 'laf-a': 2 } }
    ],
    html, update
  });
})();
