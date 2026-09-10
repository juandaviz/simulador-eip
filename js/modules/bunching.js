/* =====================================================================
   Módulo «Bunching» (Tema 9) — amontonamiento en un kink de la tarifa
   Referencia: Saez, E. (2010): «Do Taxpayers Bunch at Kink Points?»,
   American Economic Journal: Economic Policy, 2(3), 180-212.

   Modelo. La renta gravable z responde al tipo marginal neto (1 − t).
   Con preferencias isoelásticas y elasticidad e de la base imponible,
   z(1 − t) = z0 · (1 − t)^e. Si el tipo marginal salta de t0 a t1 > t0 al
   cruzar el umbral K, todos los contribuyentes cuya renta contrafactual
   (la que tendrían si el tipo fuera t0 en todo el recorrido) cayera en
   el intervalo [K, K + ΔK] eligen situarse exactamente en el kink, con

        ΔK / K = ((1 − t0) / (1 − t1))^e − 1        [exacta]
        ΔK / K ≈ e · (t1 − t0) / (1 − t0)           [aproximación de Saez]

   El «hueco» (K, K + ΔK] queda vacío y su masa B se acumula en K. El
   exceso de masa normalizado b = B / (h0(K)·w) —en anchos de contenedor—
   identifica la elasticidad invirtiendo la fórmula anterior:

        ê = ln(1 + ΔK̂/K) / ln((1 − t0)/(1 − t1)),  con ΔK̂ = B / h0(K)

   CONSERVACIÓN DE LA MASA (verificación numérica). Por construcción,
   masa observada del contenedor i = masa contrafactual del contenedor i
   − masa solapada con el hueco (K, K+ΔK] + (B si K cae en ese contenedor).
   Al sumar sobre todos los contenedores, los solapamientos suman
   exactamente B = ∫_K^{K+ΔK} h0 dz, que es justo lo que se vuelve a
   añadir en el contenedor del kink: Σ observada = Σ contrafactual = 1.
   El código calcula ambas sumas en cada actualización y las imprime bajo
   el gráfico 1 (ambas deben leerse como 100,00 %).

   Comprobación ejecutada (jsc, valores por defecto: mediana 30.000 €,
   σ = 0,6, K = 35.200 €, t0 = 30 %, t1 = 37 %, e = 0,25):
     razón (1−t0)/(1−t1) = 0,70/0,63 = 1,111111
     ΔK = 35.200 · (1,111111^0,25 − 1) = 939,49 €   (2,669 % de K)
     aproximación de Saez: 35.200 · 0,25 · 0,07/0,70 = 880,00 €
     B = 1,6799 % de los contribuyentes;  b = B/(h0(K)·w) = 0,9215
     ê = ln(1 + 0,9215·1000/35.200)/ln(1,111111) = 0,2453  (sesgo −0,0047)
     Σ contrafactual = Σ observada = 100,0000 %  ✔
   Otros escenarios comprobados (e = 0; e = 1 con montón difuso; salto
   30→45 %; K = 60.000 con 37→45 %; t1 = t0; σ = 1,2; K en la cola
   derecha con mediana 10.000 €): en todos ellos las dos sumas coinciden
   y ninguna barra observada resulta negativa.
   ===================================================================== */
(function () {
  'use strict';
  const F = SIM.fmt, C = SIM.color;

  const W = 1000;        // ancho del contenedor (bin) en euros
  const ZMAX = 400000;   // techo de la rejilla; recoge prácticamente toda la masa
  const NBINS = ZMAX / W;

  /* ---------- Utilidades estadísticas ---------- */
  // erf por la aproximación 7.1.26 de Abramowitz & Stegun (error < 1,5·10⁻⁷)
  function erf(x) {
    const s = x < 0 ? -1 : 1;
    const a = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * a);
    const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
    return s * (1 - poly * Math.exp(-a * a));
  }
  const Phi = x => 0.5 * (1 + erf(x / Math.SQRT2));
  // Log-normal con mediana m (μ = ln m) y dispersión σ
  const cdfLN = (z, mu, sg) => (z <= 0 ? 0 : Phi((Math.log(z) - mu) / sg));
  const pdfLN = (z, mu, sg) => (z <= 0 ? 0 : Math.exp(-Math.pow(Math.log(z) - mu, 2) / (2 * sg * sg)) / (z * sg * Math.sqrt(2 * Math.PI)));

  /* ---------- HTML ---------- */
  const html = `
  <div class="grid-2">
    <div class="card">
      <h3>Distribución contrafactual de la renta gravable</h3>
      ${SIM.slider('bunch-mediana', { label: 'Mediana de la renta gravable', help: 'log-normal', min: 10000, max: 80000, step: 500, value: 30000 })}
      ${SIM.slider('bunch-sigma', { label: 'Dispersión σ (log-normal)', help: 'a mayor σ, más desigualdad', min: 0.2, max: 1.2, step: 0.05, value: 0.6 })}

      <h3>La tarifa: un salto del tipo marginal en K</h3>
      ${SIM.slider('bunch-K', { label: 'Umbral del kink K (€)', help: '35.200 € es el corte real de la tarifa española', min: 15000, max: 60000, step: 100, value: 35200 })}
      ${SIM.slider('bunch-t0', { label: 'Tipo marginal por debajo de K, t₀ (%)', min: 0, max: 50, step: 0.5, value: 30 })}
      ${SIM.slider('bunch-t1', { label: 'Tipo marginal por encima de K, t₁ (%)', min: 0, max: 60, step: 0.5, value: 37 })}

      <h3>Respuesta de comportamiento</h3>
      ${SIM.slider('bunch-e', { label: 'Elasticidad de la base imponible, e', help: 'Saez (2010) estima ≈ 0,2-0,3 en autónomos', min: 0, max: 1, step: 0.05, value: 0.25 })}
      <div class="row">
        ${SIM.select('bunch-vent', { label: 'Ventana del histograma alrededor de K', value: '20000', options: [['10000', '± 10.000 €'], ['20000', '± 20.000 €'], ['40000', '± 40.000 €']] })}
      </div>
      <div class="checkbox-group">${SIM.check('bunch-difuso', 'Amontonamiento difuso: fricciones de optimización reparten el montón entre el contenedor de K y sus dos vecinos (50 / 25 / 25)', false)}</div>
      <div class="aviso" id="bunch-aviso"></div>
    </div>

    <div class="card">
      <h3>Del montón a la elasticidad</h3>
      <div class="results-grid">
        ${SIM.result('bunch-r-dk', 'Anchura del hueco ΔK', '€ por encima de K')}
        ${SIM.result('bunch-r-pct', 'Contribuyentes amontonados', '% del total', 'orange')}
        ${SIM.result('bunch-r-b', 'Exceso de masa b', 'en anchos de contenedor', 'orange')}
        ${SIM.result('bunch-r-e', 'Elasticidad recuperada ê', 'a partir de b', 'green')}
      </div>
      <div class="results-grid">
        ${SIM.result('bunch-r-ratio', 'Hueco relativo ΔK / K', '%')}
        ${SIM.result('bunch-r-salto', 'Salto del marginal', 't₁ − t₀')}
        ${SIM.result('bunch-r-sesgo', 'Sesgo de estimación', 'ê − e verdadera')}
      </div>
      <h3>Los contenedores alrededor del umbral</h3>
      <table class="tabla" id="bunch-tabla"></table>
      <p class="inline-note">La masa observada de cada contenedor es la contrafactual menos lo que cae dentro del hueco (K, K+ΔK]; todo eso reaparece en el contenedor donde está K.</p>
    </div>
  </div>

  <div class="card">
    <h3>Histograma: densidad contrafactual frente a densidad observada</h3>
    ${SIM.chartBox('bunch-chart-hist', 340)}
    <p class="inline-note" id="bunch-nota-masa">—</p>
  </div>

  <div class="grid-2">
    <div class="card">
      <h3>La restricción presupuestaria con el kink</h3>
      ${SIM.chartBox('bunch-chart-brc', 300)}
      <p class="inline-note">La recta de trazos es la renta neta sin impuesto (45°). En K la restricción se «quiebra»: por encima, cada euro adicional rinde 1 − t₁ en vez de 1 − t₀. Las curvas de indiferencia de un intervalo entero de tipos se hacen tangentes justo en el vértice.</p>
    </div>
    <div class="card">
      <h3>Del exceso de masa observado a la elasticidad</h3>
      ${SIM.chartBox('bunch-chart-eb', 300)}
      <p class="inline-note">Esta curva es el estimador: dado el tamaño del montón que se mide en los datos, devuelve la elasticidad compatible con él. El punto marca el escenario actual.</p>
    </div>
  </div>

  <div class="card interpretation" id="bunch-interp"></div>`;

  /* ---------- Cálculo ---------- */
  function calcula(p) {
    const mu = Math.log(p.mediana), sg = p.sigma;
    const razon = (1 - p.t0) / (1 - p.t1);                 // (1−t0)/(1−t1) > 1 si t1 > t0
    const hayKink = razon > 1 && p.e > 0;
    const dK = hayKink ? p.K * (Math.pow(razon, p.e) - 1) : 0;
    const dKaprox = p.K * p.e * (p.t1 - p.t0) / (1 - p.t0); // aproximación de Saez

    // Rejilla de contenedores y masas contrafactuales normalizadas
    const S = cdfLN(ZMAX, mu, sg);                          // ≈ 1
    const bordes = new Array(NBINS + 1);
    for (let i = 0; i <= NBINS; i++) bordes[i] = cdfLN(i * W, mu, sg) / S;

    const iK = Math.min(NBINS - 1, Math.floor(p.K / W));    // contenedor que contiene K
    const cf = new Array(NBINS), obs = new Array(NBINS);
    let hueco = 0;
    for (let i = 0; i < NBINS; i++) {
      const a = i * W, b = a + W;
      cf[i] = bordes[i + 1] - bordes[i];
      // masa que emigra al kink: solapamiento del contenedor con (K, K+ΔK]
      const lo = Math.max(a, p.K), hi = Math.min(b, p.K + dK);
      const fuga = hi > lo ? (cdfLN(hi, mu, sg) - cdfLN(lo, mu, sg)) / S : 0;
      hueco += fuga;
      obs[i] = cf[i] - fuga;
    }
    const B = (cdfLN(p.K + dK, mu, sg) - cdfLN(p.K, mu, sg)) / S; // = hueco (salvo redondeo)

    // Colocación del montón: en el contenedor de K o repartido (fricciones)
    const exceso = new Array(NBINS).fill(0);
    if (p.difuso && iK > 0 && iK < NBINS - 1) {
      exceso[iK] = 0.5 * B; exceso[iK - 1] = 0.25 * B; exceso[iK + 1] = 0.25 * B;
    } else {
      exceso[iK] = B;
    }

    // Comprobación de la conservación de la masa (debe dar 1 en ambos casos)
    let sumaCf = 0, sumaObs = 0;
    for (let i = 0; i < NBINS; i++) { sumaCf += cf[i]; sumaObs += obs[i] + exceso[i]; }

    // Identificación: del montón a la elasticidad
    const h0K = pdfLN(p.K, mu, sg) / S;        // densidad contrafactual por euro en K
    const dKest = h0K > 0 ? B / h0K : 0;       // ΔK̂ = B / h0(K)
    const b = dKest / W;                       // exceso de masa en anchos de contenedor
    const eRec = razon > 1 ? Math.log(1 + dKest / p.K) / Math.log(razon) : NaN;

    return { mu, sg, razon, hayKink, dK, dKaprox, cf, obs, exceso, B, hueco, iK, h0K, dKest, b, eRec, sumaCf, sumaObs };
  }

  /* ---------- Actualización ---------- */
  function update(root) {
    const p = {
      mediana: SIM.val('bunch-mediana'), sigma: SIM.val('bunch-sigma'), K: SIM.val('bunch-K'),
      t0: SIM.val('bunch-t0') / 100, t1: SIM.val('bunch-t1') / 100, e: SIM.val('bunch-e'),
      vent: +SIM.val('bunch-vent'), difuso: SIM.val('bunch-difuso')
    };
    SIM.show('bunch-mediana-val', F.eur0(p.mediana));
    SIM.show('bunch-sigma-val', F.n2(p.sigma));
    SIM.show('bunch-K-val', F.eur0(p.K));
    SIM.show('bunch-t0-val', F.pct(p.t0, 1));
    SIM.show('bunch-t1-val', F.pct(p.t1, 1));
    SIM.show('bunch-e-val', F.n2(p.e));

    const R = calcula(p);

    /* --- Cajas de resultados --- */
    SIM.show('bunch-r-dk', F.n0(R.dK));
    SIM.show('bunch-r-pct', F.n2(R.B * 100));
    SIM.show('bunch-r-b', R.b > 0 ? F.n2(R.b) : '0,00');
    SIM.show('bunch-r-e', isFinite(R.eRec) ? F.n2(R.eRec) : 'no identificada');
    SIM.show('bunch-r-ratio', F.n2(R.dK / p.K * 100));
    SIM.show('bunch-r-salto', F.pp((p.t1 - p.t0) * 100));
    SIM.show('bunch-r-sesgo', isFinite(R.eRec) ? F.signo(R.eRec - p.e) : '—');

    /* --- Aviso sobre el escenario --- */
    let aviso;
    if (!(R.razon > 1)) {
      aviso = `<strong>No hay kink convexo.</strong> Con t₁ ≤ t₀ la restricción presupuestaria no se quiebra hacia dentro: `
        + `no hay ningún intervalo de tipos que quiera situarse en el umbral y el modelo no predice amontonamiento. `
        + `Sube t₁ por encima de t₀ para reproducir un tramo de la tarifa.`;
    } else if (p.e === 0) {
      aviso = `<strong>Elasticidad nula.</strong> La densidad observada coincide con la contrafactual: el salto del tipo marginal `
        + `recauda más de quienes están arriba, pero nadie mueve su renta gravable. Sin respuesta de comportamiento no hay montón, `
        + `y sin montón no hay nada que estimar.`;
    } else {
      aviso = `<strong>Cómo leer el gráfico.</strong> El hueco entre ${F.eur0(p.K)} y ${F.eur0(p.K + R.dK)} está vacío porque todos los que `
        + `«deberían» estar ahí se han desplazado al vértice. La aproximación de Saez ΔK ≈ K·e·(t₁−t₀)/(1−t₀) daría ${F.n0(R.dKaprox)} € `
        + `frente a los ${F.n0(R.dK)} € exactos: con saltos pequeños las dos coinciden.`
        + (p.difuso ? ` Con fricciones de optimización el montón se ensancha y se aplana, que es lo que se ve en los datos reales.` : '');
    }
    SIM.html('bunch-aviso', aviso);

    /* --- Tabla de contenedores alrededor de K --- */
    const filas = [];
    for (let i = R.iK - 2; i <= R.iK + 3; i++) {
      if (i < 0 || i >= NBINS) continue;
      const a = i * W;
      const obsTot = R.obs[i] + R.exceso[i];
      const dif = obsTot - R.cf[i];
      filas.push(`<tr class="${i === R.iK ? 'active-row' : ''}"><td>${F.n0(a)} – ${F.n0(a + W)} €</td>`
        + `<td>${F.n2(R.cf[i] * 100)} %</td><td>${F.n2(obsTot * 100)} %</td>`
        + `<td class="${dif > 1e-9 ? 'positive' : (dif < -1e-9 ? 'negative' : '')}">${F.signo(dif * 100)} pp</td></tr>`);
    }
    SIM.html('bunch-tabla', `<thead><tr><th>Contenedor de renta gravable</th><th>Contrafactual</th><th>Observada</th><th>Diferencia</th></tr></thead><tbody>${filas.join('')}</tbody>`);

    /* --- Gráfico 1: histograma --- */
    const iA = Math.max(0, Math.floor((p.K - p.vent) / W));
    const iB = Math.min(NBINS - 1, Math.ceil((p.K + p.vent) / W));
    const etiquetas = [], serieCf = [], serieObs = [], serieExc = [];
    for (let i = iA; i <= iB; i++) {
      etiquetas.push(F.n0(i * W / 1000));
      serieCf.push(R.cf[i] * 100);
      serieObs.push(R.obs[i] * 100);
      serieExc.push(R.exceso[i] * 100);
    }
    const idxK = R.iK - iA;
    const idxFin = Math.min(iB, Math.floor((p.K + R.dK) / W)) - iA;
    SIM.chart('bunch-chart-hist', {
      type: 'bar',
      data: {
        labels: etiquetas,
        datasets: [
          { label: 'Densidad contrafactual (sin kink)', data: serieCf, backgroundColor: SIM.alpha(C.grisClaro, .85), borderColor: C.gris, borderWidth: .5, stack: 'cf' },
          { label: 'Densidad observada', data: serieObs, backgroundColor: C.azul, stack: 'obs' },
          { label: 'Exceso de masa (el montón)', data: serieExc, backgroundColor: C.naranja, stack: 'obs' }
        ]
      },
      options: {
        barPercentage: 1, categoryPercentage: .88,
        scales: {
          x: { stacked: true, grid: { display: false }, title: { text: 'Renta gravable (miles de €), contenedores de 1.000 €' }, ticks: { autoSkip: true, maxTicksLimit: 14 } },
          y: { stacked: true, beginAtZero: true, title: { text: '% de contribuyentes en el contenedor' } }
        },
        plugins: {
          refs: {
            x: [{ value: idxK, label: `K = ${F.eur0(p.K)}`, color: C.rojo, dash: [4, 3], align: 'right' }].concat(
              R.dK > 0 && idxFin >= 0 && idxFin !== idxK ? [{ value: idxFin, label: `K + ΔK = ${F.eur0(p.K + R.dK)}`, color: C.naranja, dash: [4, 3] }] : [])
          },
          tooltip: { callbacks: { title: it => `${F.n0(+it[0].label * 1000)} – ${F.n0(+it[0].label * 1000 + W)} €`, label: it => `${it.dataset.label}: ${F.n2(it.parsed.y)} %` } }
        }
      }
    });
    SIM.show('bunch-nota-masa', `Comprobación de la conservación de la masa: la densidad contrafactual suma ${F.n2(R.sumaCf * 100)} % `
      + `y la observada (barras azules más el montón naranja) suma ${F.n2(R.sumaObs * 100)} %. Nadie desaparece: los contribuyentes del hueco `
      + `están dentro de la barra naranja.`);

    /* --- Gráfico 2: restricción presupuestaria con el kink --- */
    const zMax = Math.max(2 * p.K, p.K + p.vent);
    const zs = [], neta = [], sinImp = [];
    for (let z = 0; z <= zMax; z += zMax / 200) {
      zs.push(z / 1000);
      neta.push((z <= p.K ? z * (1 - p.t0) : p.K * (1 - p.t0) + (z - p.K) * (1 - p.t1)) / 1000);
      sinImp.push(z / 1000);
    }
    SIM.chart('bunch-chart-brc', {
      type: 'line',
      data: {
        datasets: [
          { label: 'Renta neta sin impuesto (45°)', data: SIM.xy(zs, sinImp), borderColor: C.grisClaro, borderDash: [5, 4], borderWidth: 1.5 },
          { label: 'Renta neta con la tarifa', data: SIM.xy(zs, neta), borderColor: C.azul, backgroundColor: SIM.alpha(C.azul, .08), fill: true, borderWidth: 2.4 }
        ]
      },
      options: {
        scales: {
          x: { type: 'linear', min: 0, max: zMax / 1000, title: { text: 'Renta gravable z (miles de €)' } },
          y: { beginAtZero: true, title: { text: 'Renta neta después de impuestos (miles de €)' } }
        },
        plugins: {
          refs: {
            x: [{ value: p.K / 1000, label: `K = ${F.eur0(p.K)}`, color: C.rojo, dash: [4, 3] }],
            points: [{ x: p.K / 1000, y: p.K * (1 - p.t0) / 1000, label: 'kink', color: C.rojo, dy: 16 }]
              .concat(R.dK > 0 ? [{ x: (p.K + R.dK) / 1000, y: (p.K * (1 - p.t0) + R.dK * (1 - p.t1)) / 1000, label: 'K + ΔK', color: C.naranja, align: 'left' }] : [])
          },
          tooltip: { callbacks: { title: it => `z = ${F.n0(it[0].parsed.x * 1000)} €`, label: it => `${it.dataset.label}: ${F.n0(it.parsed.y * 1000)} €` } }
        }
      }
    });

    /* --- Gráfico 3: elasticidad recuperada frente al exceso de masa --- */
    const bs = [], es = [];
    if (R.razon > 1) {
      for (let x = 0; x <= 4.0001; x += 0.05) { bs.push(x); es.push(Math.log(1 + x * W / p.K) / Math.log(R.razon)); }
    }
    SIM.chart('bunch-chart-eb', {
      type: 'line',
      data: { datasets: [{ label: 'ê = ln(1 + b·w/K) / ln((1−t₀)/(1−t₁))', data: SIM.xy(bs, es), borderColor: C.verde, backgroundColor: SIM.alpha(C.verde, .08), fill: true, borderWidth: 2.4 }] },
      options: {
        scales: {
          x: { type: 'linear', min: 0, max: 4, title: { text: 'Exceso de masa b (en anchos de contenedor de 1.000 €)' } },
          y: { beginAtZero: true, title: { text: 'Elasticidad de la base imponible recuperada' } }
        },
        plugins: {
          refs: {
            points: isFinite(R.eRec) && R.b >= 0 && R.b <= 4 ? [{ x: R.b, y: R.eRec, label: `b = ${F.n2(R.b)} → ê = ${F.n2(R.eRec)}`, color: C.rojo, align: R.b > 2.5 ? 'right' : 'left' }] : []
          },
          tooltip: { callbacks: { title: it => `b = ${F.n2(it[0].parsed.x)}`, label: it => `ê = ${F.n2(it.parsed.y)}` } }
        }
      }
    });

    /* --- Lectura --- */
    let t = `<strong>Lectura.</strong> `;
    if (!(R.razon > 1)) {
      t += `Con t₁ = ${F.pct(p.t1, 1)} ≤ t₀ = ${F.pct(p.t0, 1)} no existe un vértice convexo en la restricción presupuestaria, así que el modelo `
        + `no genera amontonamiento y el estimador no está definido: el <em>bunching</em> solo identifica la elasticidad allí donde la tarifa se quiebra.`;
    } else if (p.e === 0) {
      t += `El tipo marginal salta ${F.pp((p.t1 - p.t0) * 100)} en ${F.eur0(p.K)}, pero con e = 0 la densidad observada es indistinguible de la contrafactual. `
        + `Este es el contrafactual del método: <strong>la ausencia de montón es evidencia de ausencia de respuesta</strong>, no de que el impuesto no duela. `
        + `Los que están por encima de K pagan más; simplemente no cambian su renta declarada.`;
    } else {
      t += `Con una elasticidad de la base imponible e = ${F.n2(p.e)} y un salto del marginal de ${F.pct(p.t0, 1)} a ${F.pct(p.t1, 1)} en ${F.eur0(p.K)}, `
        + `el intervalo de rentas contrafactuales que se desplaza al umbral tiene una anchura de <strong>ΔK = ${F.n0(R.dK)} €</strong> `
        + `(un ${F.n2(R.dK / p.K * 100)} % del umbral). Eso amontona al <strong>${F.n2(R.B * 100)} % de los contribuyentes</strong> exactamente en K `
        + `y deja vacío el tramo hasta ${F.eur0(p.K + R.dK)}. Medido como exceso de masa, el montón equivale a <strong>b = ${F.n2(R.b)}</strong> veces `
        + `la masa de un contenedor normal de 1.000 €.<br>`
        + `<strong>La inferencia va al revés.</strong> En los datos reales no observamos e: observamos b. Invirtiendo la fórmula del modelo, `
        + `ê = ln(1 + ΔK̂/K)/ln((1−t₀)/(1−t₁)) = <strong>${F.n2(R.eRec)}</strong>, frente a la e verdadera de ${F.n2(p.e)} `
        + (Math.abs(R.eRec - p.e) < 0.005
          ? `: la recuperación es casi exacta.`
          : `: el estimador se desvía ${F.signo((R.eRec - p.e))} porque la aproximación ΔK̂ = B/h₀(K) supone la densidad plana dentro del hueco, y la log-normal cae. `
            + `Cuanto más ancho es el hueco (mayor e o mayor salto de tipos), más se nota.`);
    }
    t += `<br><strong>Por qué esto importa (Tema 9).</strong> El amontonamiento es la evidencia más limpia que tenemos de que la base imponible responde a los tipos: `
      + `no hace falta comparar reformas ni construir grupos de control, basta con mirar la forma de la distribución alrededor de un umbral que la propia ley crea. `
      + `Y lo que se estima es exactamente el parámetro que gobierna el exceso de gravamen y el pico de la curva de Laffer, la elasticidad de la renta gravable, `
      + `no la elasticidad de las horas trabajadas.<br>`
      + `<strong>El hallazgo incómodo de Saez (2010).</strong> En los datos estadounidenses el amontonamiento es <em>muy pequeño</em> en los kinks del IRPF para asalariados: `
      + `apenas se ve. Solo aparece con claridad entre <strong>autónomos</strong> y, sobre todo, en el primer kink del <em>Earned Income Tax Credit</em>, donde el marginal efectivo `
      + `pasa de negativo (subvención del 34-40 %) a cero. La lectura estándar: el asalariado no puede ajustar su salario bruto al euro —hay costes de ajuste, contratos, jornadas—, `
      + `mientras que quien declara sus propios ingresos sí puede situarse en el vértice. Las elasticidades pequeñas que salen del <em>bunching</em> en asalariados `
      + `(por debajo de 0,1) son, entonces, una cota inferior de la respuesta a largo plazo.`;
    SIM.html('bunch-interp', t);
  }

  /* ---------- Presets ---------- */
  const base = {
    'bunch-mediana': 30000, 'bunch-sigma': 0.6, 'bunch-K': 35200,
    'bunch-t0': 30, 'bunch-t1': 37, 'bunch-e': 0.25, 'bunch-vent': '20000', 'bunch-difuso': false
  };

  SIM.register({
    id: 'bunching', nav: 'Bunching (Saez 2010)', tema: 'Tema 9',
    title: 'Amontonamiento en los kinks de la tarifa',
    subtitle: 'Cuando el tipo marginal salta en un umbral, un intervalo entero de contribuyentes elige situarse exactamente ahí. El tamaño de ese montón identifica la elasticidad de la base imponible sin necesidad de una reforma. Modelo isoelástico de Saez (2010, AEJ: Economic Policy) con la distribución contrafactual log-normal y contenedores de 1.000 €.',
    guia: {
      observa: [
        'Sube la <strong>elasticidad e</strong> desde cero: el hueco a la derecha del umbral se ensancha y la barra naranja crece. Con e = 0 las dos densidades coinciden exactamente.',
        'La anchura del hueco depende del <strong>salto de tipos</strong>, no del nivel: ΔK/K ≈ e·(t₁−t₀)/(1−t₀). Sube t₁ de 37 a 45 % y compara.',
        'Fíjate en la caja «Sesgo de estimación»: la elasticidad recuperada del montón no es exactamente la verdadera, porque el estimador supone la densidad plana dentro del hueco.',
        'Con la <strong>ventana de ±40.000 €</strong> el montón casi no se aprecia. Es el problema empírico real: el exceso de masa es diminuto comparado con el tamaño de la distribución.',
        'Activa el <strong>amontonamiento difuso</strong>: con fricciones de optimización el pico se ensancha y se aplana, que es lo que de verdad se ve en los microdatos.'
      ],
      pregunta: '¿El amontonamiento mide respuesta real de la oferta de trabajo o evasión y elusión fiscal?',
      respuesta: 'Mide la respuesta de la <em>renta gravable declarada</em>, que es la suma de las dos cosas y no las distingue. Un autónomo puede situarse en el kink trabajando menos horas (respuesta real), retrasando una factura a enero (desplazamiento temporal), reclasificando renta como societaria, inflando gastos deducibles u ocultando ingresos. El diseño no identifica cuál de estos canales opera. Esto tiene una consecuencia importante de política: para el cálculo del exceso de gravamen la distinción sí importa —la elusión mediante gasto deducible con externalidades no tiene el mismo coste social que dejar de trabajar—, pero para el diseño de la tarifa lo relevante suele ser precisamente la elasticidad total de la base declarada (Feldstein). La pista que da Saez es indirecta: si el montón aparece solo donde es fácil manipular la declaración (autónomos) y no donde el ingreso lo fija un tercero (nóminas), la interpretación de «elusión y reporte» gana peso frente a la de «horas trabajadas».'
    },
    presets: [
      { label: 'Elasticidad de Saez (0,25) en el corte de 35.200 €', title: 'Kink real de la tarifa española: el marginal pasa del 30 % al 37 %', values: base },
      { label: 'Sin respuesta (e = 0)', title: 'Contrafactual del método: sin respuesta de comportamiento no hay montón', values: Object.assign({}, base, { 'bunch-e': 0 }) },
      { label: 'Respuesta fuerte (e = 1: autónomos)', title: 'Elasticidad alta, del orden de la que Saez encuentra en el primer kink del EITC', values: Object.assign({}, base, { 'bunch-e': 1, 'bunch-difuso': true }) },
      { label: 'Salto grande de tipo (30 → 45 %)', title: 'Un salto de 15 pp: el hueco se multiplica', values: Object.assign({}, base, { 'bunch-t1': 45 }) },
      { label: 'Umbral de 60.000 €', title: 'Corte superior de la tarifa española: 37 % → 45 % en 60.000 €', values: Object.assign({}, base, { 'bunch-K': 60000, 'bunch-t0': 37, 'bunch-t1': 45, 'bunch-vent': '40000' }) }
    ],
    html, update
  });
})();
