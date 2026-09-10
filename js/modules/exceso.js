/* Módulo de exceso de gravamen (Tema 8 de HP II)
   Aproximación de Harberger: EG = ½·ε·t²·B/(1+t), con la base contrayéndose
   según B(t) = B·(1 − ε·t/(1+t)). La idea que hay que llevarse: el exceso crece
   con el CUADRADO del tipo, así que doblar el tipo casi cuadruplica la distorsión.
   La función vive en js/tax.js (TAX.harberger). */
(function () {
  'use strict';
  const F = SIM.fmt, C = SIM.color;

  const html = `
  <div class="grid-2">
    <div class="card">
      <h3>Parámetros</h3>
      ${SIM.slider('exc-t', { label: 'Tipo impositivo ad valorem', help: 'sobre el precio antes de impuesto', min: 1, max: 60, step: 1, value: 20 })}
      ${SIM.slider('exc-e', { label: 'Elasticidad de la demanda |ε|', help: 'cerca de 0 = base rígida', min: 0.1, max: 2, step: 0.1, value: 0.5 })}
      ${SIM.slider('exc-base', { label: 'Base imponible potencial', help: 'gasto gravable, en millones de €', min: 10000, max: 200000, step: 5000, value: 100000 })}

      <h3>Resultados</h3>
      <div class="results-grid">
        ${SIM.result('exc-r-rec', 'Recaudación', 'M€', 'green')}
        ${SIM.result('exc-r-eg', 'Exceso de gravamen', 'M€', 'red')}
        ${SIM.result('exc-r-base', 'Base tras el impuesto', 'M€')}
      </div>
      <div class="results-grid">
        ${SIM.result('exc-r-cmfp', 'Coste marginal de los fondos públicos', '€ de coste social por € recaudado', 'orange')}
        ${SIM.result('exc-r-porEuro', 'Exceso por euro recaudado', 'céntimos por € recaudado', 'red')}
      </div>
      <div class="aviso" id="exc-aviso"></div>
    </div>

    <div class="card">
      <h3>Doblar el tipo: la prueba del ×4</h3>
      <p class="inline-note">Comparamos el mismo bien y la misma base con el tipo actual y con el doble. Si el exceso fuera proporcional al tipo, la última columna diría «×2».</p>
      <table class="tabla" id="exc-tabla-doble"></table>
      <div class="results-grid">
        ${SIM.result('exc-r-factorRec', 'Al doblar el tipo, la recaudación se multiplica por', '', 'green')}
        ${SIM.result('exc-r-factorEg', 'Al doblar el tipo, el exceso se multiplica por', '', 'red')}
      </div>
      <p class="inline-note">Con la fórmula de Harberger el factor exacto es 4·(1+t)/(1+2t): tiende a 4 cuando el tipo es pequeño y se queda algo por debajo con tipos altos. La recaudación, en cambio, ni siquiera llega a doblarse, porque la base huye.</p>
    </div>
  </div>

  <div class="grid-2">
    <div class="card">
      <h3>Recaudación y exceso de gravamen según el tipo</h3>
      ${SIM.chartBox('exc-chart-curvas', 340)}
      <p class="inline-note">La recaudación crece y acaba doblándose hacia abajo; el exceso de gravamen despega como una parábola. Las líneas verticales marcan el tipo actual y su doble.</p>
    </div>
    <div class="card">
      <h3>El exceso no es lineal: es cuadrático</h3>
      ${SIM.chartBox('exc-chart-barras', 340)}
      <p class="inline-note">Barras del exceso de gravamen a cuatro tipos, con el mismo bien y la misma base. La serie gris es la referencia puramente cuadrática (el exceso al 10 % multiplicado por (t/10)²).</p>
    </div>
  </div>

  <div class="card interpretation" id="exc-interp"></div>`;

  function leer() {
    return {
      t: SIM.val('exc-t') / 100,
      e: SIM.val('exc-e'),
      base: SIM.val('exc-base')
    };
  }

  function update(root) {
    const p = leer();
    SIM.show('exc-t-val', F.pct(p.t, 0));
    SIM.show('exc-e-val', F.n1(p.e));
    SIM.show('exc-base-val', F.n0(p.base) + ' M€');

    const H = TAX.harberger(p.t, p.base, p.e);
    const t2 = p.t * 2;
    const H2 = TAX.harberger(t2, p.base, p.e);
    const porEuro = H.recaudacion > 0 ? H.exceso / H.recaudacion : 0;
    const cmfp = 1 + porEuro;

    SIM.show('exc-r-rec', F.n0(H.recaudacion));
    SIM.show('exc-r-eg', F.n0(H.exceso));
    SIM.show('exc-r-base', F.n0(H.baseTrasImpuesto));
    SIM.show('exc-r-cmfp', F.n2(cmfp));
    SIM.show('exc-r-porEuro', F.n1(porEuro * 100));

    // Con tipos muy altos y bases muy elásticas, la aproximación de Harberger
    // llega a predecir una base negativa al doblar el tipo: en ese caso no tiene
    // sentido dar factores de recaudación, solo el del exceso de gravamen.
    const dobleValido = H2.baseTrasImpuesto > 0;
    const factorRec = dobleValido && H.recaudacion > 0 ? H2.recaudacion / H.recaudacion : null;
    const factorEg = H.exceso > 0 ? H2.exceso / H.exceso : 0;
    SIM.show('exc-r-factorRec', factorRec == null ? '—' : '×' + F.n2(factorRec));
    SIM.show('exc-r-factorEg', '×' + F.n2(factorEg));

    // ---------- Tabla t frente a 2t ----------
    const fila = (etiqueta, tt, HH) => {
      const ok = HH.baseTrasImpuesto > 0;
      return `<tr><td>${etiqueta}</td><td>${F.pct(tt, 0)}</td>`
        + `<td>${ok ? F.n0(HH.baseTrasImpuesto) : '0 (la base se anula)'}</td>`
        + `<td>${ok ? F.n0(HH.recaudacion) : '—'}</td><td>${F.n0(HH.exceso)}</td>`
        + `<td>${ok && HH.recaudacion > 0 ? F.n1(HH.exceso / HH.recaudacion * 100) : '—'}</td></tr>`;
    };
    const factorBase = dobleValido && H.baseTrasImpuesto > 0 ? '×' + F.n2(H2.baseTrasImpuesto / H.baseTrasImpuesto) : '—';
    const factorPorEuro = dobleValido && H.exceso > 0 && H2.recaudacion > 0 ? '×' + F.n2((H2.exceso / H2.recaudacion) / (H.exceso / H.recaudacion)) : '—';
    SIM.html('exc-tabla-doble',
      `<thead><tr><th>Escenario</th><th>Tipo</th><th>Base tras el impuesto (M€)</th><th>Recaudación (M€)</th><th>Exceso (M€)</th><th>Céntimos de exceso por € recaudado</th></tr></thead><tbody>`
      + fila('Tipo actual (t)', p.t, H)
      + fila('El doble (2t)', t2, H2)
      + `<tr class="total"><td>Se multiplica por</td><td>×2</td><td>${factorBase}</td><td>${factorRec == null ? '—' : '×' + F.n2(factorRec)}</td><td><strong>×${F.n2(factorEg)}</strong></td><td>${factorPorEuro}</td></tr>`
      + `</tbody>`);

    // ---------- Aviso ----------
    let aviso = `<strong>Cómo leer el coste marginal de los fondos públicos.</strong> Aquí se calcula en su versión media: 1 € de transferencia al Estado más ${F.n2(cmfp - 1)} € de eficiencia perdida por el camino. `
      + `Un CMFP de ${F.n2(cmfp)} significa que un gasto público financiado con este impuesto solo merece la pena si produce beneficios sociales por encima de ${F.n2(cmfp)} € por cada euro gastado. `;
    if (H2.baseTrasImpuesto <= 0) {
      aviso += `<span class="perdida">Ojo: al doblar el tipo hasta el ${F.pct(t2, 0)} la base estimada se anularía por completo</span>, así que la comparación del ×4 hay que tomarla como un ejercicio de fórmula, no como una predicción.`;
    } else if (cmfp > 1.3) {
      aviso += `<span class="perdida">El coste es alto</span>: este impuesto distorsiona mucho por cada euro que ingresa. Baja el tipo o el módulo de Ramsey te dirá que amplíes la base.`;
    } else {
      aviso += `El coste es moderado: la distorsión, con esta elasticidad y este tipo, es asumible.`;
    }
    SIM.html('exc-aviso', aviso);

    // ---------- Gráfico 1: recaudación y exceso frente al tipo ----------
    const tipos = [], recs = [], egs = [];
    for (let r = 0; r <= 70; r++) {
      const rt = r / 100;
      const HH = TAX.harberger(rt, p.base, p.e);
      tipos.push(r);
      recs.push(HH.recaudacion / 1000);
      egs.push(HH.exceso / 1000);
    }
    const refsX = [{ value: p.t * 100, label: `t = ${F.pct(p.t, 0)}`, color: C.azul }];
    if (t2 * 100 <= 70) refsX.push({ value: t2 * 100, label: `2t = ${F.pct(t2, 0)}`, color: C.rojo, dy: 14 });

    SIM.chart('exc-chart-curvas', {
      type: 'line',
      data: {
        datasets: [
          { label: 'Recaudación', data: SIM.xy(tipos, recs), borderColor: C.verde, backgroundColor: SIM.alpha(C.verde, .10), fill: 'origin', borderWidth: 2.4, pointRadius: 0, tension: 0 },
          { label: 'Exceso de gravamen', data: SIM.xy(tipos, egs), borderColor: C.rojo, backgroundColor: SIM.alpha(C.rojo, .12), fill: 'origin', borderWidth: 2.4, pointRadius: 0, tension: 0 }
        ]
      },
      options: {
        scales: {
          x: { type: 'linear', min: 0, max: 70, title: { text: 'Tipo impositivo (%)' } },
          y: { beginAtZero: true, title: { text: 'Miles de millones de € (miles de M€)' } }
        },
        plugins: {
          refs: {
            x: refsX,
            points: [
              { x: p.t * 100, y: H.recaudacion / 1000, label: `${F.n0(H.recaudacion)} M€`, color: C.verde, dy: -10 },
              { x: p.t * 100, y: H.exceso / 1000, label: `${F.n0(H.exceso)} M€`, color: C.rojo, dy: 16 }
            ]
          },
          tooltip: {
            callbacks: {
              title: it => `Tipo del ${F.n0(it[0].parsed.x)} %`,
              label: it => `${it.dataset.label}: ${F.n1(it.parsed.y)} miles de M€`
            }
          }
        }
      }
    });

    // ---------- Gráfico 2: barras a 10/20/30/40 % ----------
    const escalones = [10, 20, 30, 40];
    const egEscalones = escalones.map(r => TAX.harberger(r / 100, p.base, p.e).exceso);
    const cuadratica = escalones.map(r => egEscalones[0] * Math.pow(r / 10, 2));
    SIM.chart('exc-chart-barras', {
      type: 'bar',
      data: {
        labels: escalones.map(r => r + ' %'),
        datasets: [
          { label: 'Exceso de gravamen (Harberger)', data: egEscalones, backgroundColor: C.rojo },
          { label: 'Referencia puramente cuadrática', data: cuadratica, backgroundColor: SIM.alpha(C.gris, .55) }
        ]
      },
      options: {
        scales: {
          x: { title: { text: 'Tipo impositivo' }, grid: { display: false } },
          y: { beginAtZero: true, title: { text: 'Exceso de gravamen (M€)' } }
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: it => `${it.dataset.label}: ${F.n0(it.parsed.y)} M€ (×${F.n2(egEscalones[0] > 0 ? it.parsed.y / egEscalones[0] : 0)} respecto al 10 %)`
            }
          }
        }
      }
    });

    // ---------- Lectura ----------
    const rigidez = p.e <= 0.4 ? 'una base bastante rígida' : (p.e >= 1.2 ? 'una base muy elástica' : 'una base de elasticidad intermedia');
    let txt = `<strong>Lectura.</strong> Con un tipo del ${F.pct(p.t, 0)} sobre una base potencial de ${F.n0(p.base)} M€ y ${rigidez} (|ε| = ${F.n1(p.e)}), `
      + `la base se encoge hasta ${F.n0(H.baseTrasImpuesto)} M€, Hacienda ingresa ${F.n0(H.recaudacion)} M€ y la sociedad pierde además ${F.n0(H.exceso)} M€ `
      + `que no acaban en ninguna caja: son los intercambios que ya no se producen. Eso equivale a ${F.n1(porEuro * 100)} céntimos de despilfarro por cada euro recaudado, `
      + `es decir, un coste marginal de los fondos públicos de ${F.n2(cmfp)} €. `;
    txt += `<br><strong>La prueba del ×4.</strong> Si doblásemos el tipo hasta el ${F.pct(t2, 0)}, el exceso de gravamen pasaría de ${F.n0(H.exceso)} a ${F.n0(H2.exceso)} M€: `
      + `<strong>×${F.n2(factorEg)}</strong>, no ×2. `
      + (factorRec == null
        ? `La recaudación, en cambio, ni siquiera se puede calcular: con este tipo y esta elasticidad la fórmula predice que la base habría desaparecido del todo. `
        : `La recaudación, en cambio, solo se multiplicaría por ${F.n2(factorRec)}, porque parte de la base desaparece. `)
      + `Dicho de otro modo: al doblar el tipo, el coste social sube casi cuatro veces mientras el ingreso ni siquiera se dobla. `;
    txt += `<br><strong>La consecuencia de política fiscal.</strong> Como el exceso va con t² y la recaudación va con t, para recaudar lo mismo siempre es más barato `
      + `<em>ampliar la base y bajar el tipo</em> que estrechar la base y subirlo. Ese es el argumento técnico que hay detrás de las críticas a los tipos reducidos, `
      + `las exenciones y los beneficios fiscales del IVA y del impuesto de sociedades; en el módulo de Ramsey verás la otra cara del argumento, la de la equidad. `;
    const H10 = TAX.harberger(0.10, p.base, p.e), H20 = TAX.harberger(0.20, p.base, p.e);
    txt += `<br><strong>Con este mismo bien:</strong> un tipo del 10 % costaría ${F.n0(H10.exceso)} M€ de exceso y uno del 20 %, ${F.n0(H20.exceso)} M€ `
      + `(×${F.n2(H10.exceso > 0 ? H20.exceso / H10.exceso : 0)}). Dos impuestos del 10 % sobre dos bases distintas recaudan más o menos lo mismo que uno del 20 % sobre una sola, `
      + `pero cuestan aproximadamente la mitad en eficiencia.`;
    SIM.html('exc-interp', txt);
  }

  SIM.register({
    id: 'exceso', nav: 'Exceso de gravamen', tema: 'Tema 8',
    title: 'Exceso de gravamen: la factura invisible del impuesto',
    subtitle: 'El exceso de gravamen (o pérdida irrecuperable de eficiencia) es lo que la sociedad pierde por encima de lo que Hacienda ingresa. Con la aproximación de Harberger, EG = ½·ε·t²·B/(1+t): crece con el cuadrado del tipo, de modo que doblar el tipo casi cuadruplica la distorsión. De ahí sale el coste marginal de los fondos públicos y el argumento de «bases amplias, tipos bajos».',
    guia: {
      observa: [
        'Mueve el tipo del 10 % al 20 % con la elasticidad fija: la recaudación no llega a doblarse, pero el exceso de gravamen se multiplica <strong>casi por cuatro</strong>. Es la no linealidad del t².',
        'Con elasticidad 0,1 (una base casi rígida) el exceso es casi cero por mucho que subas el tipo. Esa intuición es la que lleva directamente a la regla de Ramsey del módulo siguiente.',
        'El <strong>coste marginal de los fondos públicos</strong> es la cifra que convierte esto en una decisión de gasto: si vale 1,25, un programa público solo merece la pena si rinde más de 1,25 € por cada euro que cuesta.',
        'La base imponible <em>no</em> es fija: fíjate en cómo el cuadro «base tras el impuesto» se encoge al subir el tipo. Sin esa contracción no habría exceso de gravamen ni curva de Laffer.',
        'En el gráfico de la izquierda, la distancia vertical entre las dos curvas es lo que se pierde por el camino. A tipos altos la curva roja se acerca a la verde: cada vez recaudamos peor.'
      ],
      pregunta: 'El IVA español grava a tipos distintos (4 %, 10 % y 21 %) bienes con elasticidades muy distintas. Si solo nos importara la eficiencia, ¿preferirías un IVA uniforme del 15 % sobre todo o los tipos actuales? ¿Y qué te falta saber para responder de verdad?',
      respuesta: 'Solo con eficiencia, la respuesta depende de dos cosas que este módulo separa. Primero, la <em>base</em>: un tipo único del 15 % sobre absolutamente todo el consumo recauda lo mismo que un 21 % sobre una base recortada por tipos reducidos y exenciones, y cuesta bastante menos exceso de gravamen, porque el exceso va con el cuadrado del tipo (la mitad del tipo cuesta la cuarta parte). Segundo, la <em>elasticidad</em>: si los bienes a tipo reducido fueran los más elásticos, gravarlos poco tendría sentido de eficiencia (eso es Ramsey). Ocurre lo contrario: los alimentos son los más rígidos. Lo que falta saber es lo que no cabe en este módulo: quién consume cada bien. El tipo reducido a los alimentos es una decisión de equidad, no de eficiencia, y el simulador de Ramsey pone las dos caras del dilema una al lado de la otra.'
    },
    presets: [
      { label: 'Bien inelástico (tabaco)', title: 'Base muy rígida y tipo alto: mucha recaudación, poco exceso', values: { 'exc-t': 50, 'exc-e': 0.3, 'exc-base': 20000 } },
      { label: 'Bien elástico (ocio)', title: 'Base que huye: el mismo tipo cuesta mucho más', values: { 'exc-t': 21, 'exc-e': 1.5, 'exc-base': 50000 } },
      { label: 'Tipo del 10 %', title: 'Mismo bien y misma base que el escenario siguiente', values: { 'exc-t': 10, 'exc-e': 0.5, 'exc-base': 100000 } },
      { label: 'Tipo del 20 %', title: 'Mismo bien: compara el exceso con el escenario del 10 %', values: { 'exc-t': 20, 'exc-e': 0.5, 'exc-base': 100000 } },
      { label: 'Base grande', title: 'Bases amplias y tipos bajos: el lema de la imposición eficiente', values: { 'exc-t': 10, 'exc-e': 0.5, 'exc-base': 200000 } }
    ],
    html, update
  });
})();
