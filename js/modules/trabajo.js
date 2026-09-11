/* =====================================================================
   Módulo «Oferta de trabajo» (Tema 9) — impuestos, prestaciones y horas
   Referencias: Blundell & MaCurdy (1999), «Labor supply: a review of
   alternative approaches», Handbook of Labor Economics 3A; Saez (2002),
   «Optimal income transfer programs», QJE 117(3); Immervoll et al. (2007),
   «Welfare reform in European countries», Economic Journal 117.

   MODELO
   ------
   Dotación de tiempo T = 2.000 horas al año (40 h/semana × 50 semanas).
   El individuo elige horas h ∈ [0, T]; el ocio es L = T − h.
   Salario por hora w, renta no laboral R (exenta), ingresos laborales
   brutos y = w·h. El consumo (= renta disponible) es

        C(h) = w·h + R − Imp(w·h) + Pres(w·h)

   con dos esquemas de impuesto seleccionables:
     (a) tarifa didáctica por tramos editable, Imp(y) = escala por tramos
         con umbrales u₁, u₂ y tipos t₁, t₂, t₃ (TAX.aplicaEscala);
     (b) tarifa real del IRPF 2025 (escala estatal + Andalucía, mínimo
         personal y familiar, reducción del art. 20 y cotizaciones
         calculadas automáticamente): Imp(y) = cuota líquida devuelta por
         TAX.liquidaIRPF({ trabajoBruto: y, retencionesTrabajo: 0 }).
         AVISO: en (b) el consumo descuenta solo la cuota líquida del
         IRPF. Las cotizaciones sociales entran en la liquidación como
         gasto deducible (determinan la base), pero no se restan otra vez
         del consumo; la cuña completa se estudia en el módulo «Cuña».

   Prestación condicionada a la renta (tipo ingreso mínimo vital):
        Pres(y) = max(0, B − φ·y),  φ = tasa de retirada (0-100 %).
   Se agota en y = B/φ, es decir en h = B/(φ·w).

   Tipo marginal efectivo (METR) en cada nodo de la rejilla:
        METR(h) = 1 − ΔC/Δy,  con Δ tomado sobre el paso de 10 horas.
   Tipo medio efectivo: (Imp − Pres)/y.

   Preferencias Cobb-Douglas  U = C^(1−α) · L^α,  α ∈ (0,1).
   El óptimo se busca por REJILLA (h = 0, 10, …, 2.000) porque la
   restricción es no lineal: tiene quiebros en los umbrales de la tarifa
   y en el punto donde se agota la prestación, de modo que las condiciones
   de primer orden no bastan (puede haber óptimos locales múltiples).

   DESCOMPOSICIÓN DE SLUTSKY-HICKS (numérica)
   ------------------------------------------
   1) h_ref  = óptimo sin impuesto ni prestación (restricción C = w·h + R)
              y U_ref = utilidad alcanzada ahí.
   2) h_imp  = óptimo con el esquema fiscal completo (rejilla).
   3) h_comp = óptimo sobre una restricción LINEAL auxiliar
              C = w_n·h + R + M, donde w_n = w·(1 − METR en h_imp) es el
              salario neto marginal vigente en el óptimo con impuesto, y M
              es la transferencia a tanto alzado (compensación de Hicks)
              que devuelve al individuo exactamente a U_ref. M se busca por
              BISECCIÓN: U(M) es creciente en M, así que basta acotar y
              partir por la mitad 36 veces.
      Efecto sustitución = h_comp − h_ref   (cambio de precio relativo del
          ocio a utilidad constante; con w_n < w es NEGATIVO siempre).
      Efecto renta       = h_imp − h_comp   (lo que queda: pérdida de poder
          adquisitivo → más horas si el ocio es normal; una prestación
          generosa lo vuelve negativo).
   Supuestos de la aproximación: (i) la compensación es de Hicks, no de
   Slutsky (iguala utilidad, no poder adquisitivo de la cesta inicial);
   (ii) la restricción auxiliar linealiza la verdadera con la pendiente
   del tramo en el que cae el óptimo, que es la práctica estándar con
   restricciones con quiebros; (iii) por tanto el «efecto renta» recoge
   también la curvatura de la restricción no lineal, no solo el cambio de
   renta virtual. Con tarifa proporcional (un solo tramo) la linealización
   es exacta y la descomposición es la de los manuales.

   COMPROBACIÓN NUMÉRICA (ejecutada con jsc, ver informe abajo)
   -----------------------------------------------------------
   Con tarifa nula y sin prestación, el óptimo Cobb-Douglas es analítico:
        h* = (1 − α)·T − α·R/w
   Resultados de la búsqueda en rejilla frente a la fórmula:
     α = 0,50  R =      0  w = 15  → rejilla 1.000 h  |  fórmula 1.000,0 h  Δ = 0  ✔
     α = 0,50  R =  6.000  w = 15  → rejilla   800 h  |  fórmula   800,0 h  Δ = 0  ✔
     α = 0,30  R =      0  w = 15  → rejilla 1.400 h  |  fórmula 1.400,0 h  Δ = 0  ✔
     α = 0,70  R =  3.000  w = 20  → rejilla   500 h  |  fórmula   495,0 h  Δ = 5  ✔
     α = 0,20  R =      0  w =  8  → rejilla 1.600 h  |  fórmula 1.600,0 h  Δ = 0  ✔ («a cero»)
     α = 0,80  R =      0  w = 60  → rejilla   400 h  |  fórmula   400,0 h  Δ = 0  ✔
     α = 0,65  R = 12.000  w = 25  → rejilla   390 h  |  fórmula   388,0 h  Δ = 2  ✔
   La desviación máxima es medio paso de la rejilla (5 h), como debe ser.

   Otras comprobaciones ejecutadas (ninguna produce NaN ni «—» indebido):
     · estado «Restablecer (a cero)» (w = 8, α = 0,2, tarifa nula, sin
       prestación): 1.600 h, METR 0 %, recaudación 0 €;
     · φ = 0 con B > 0 (transferencia universal): efecto sustitución 0 y
       efecto renta −290 h, que es la lectura de manual de una suma fija;
     · impuesto proporcional del 25 % con R = 0: sustitución −150 h y
       renta +150 h, cancelación EXACTA porque con Cobb-Douglas y sin
       renta no laboral h* = (1−α)·T no depende de w;
     · umbrales cruzados (u₂ < u₁), tipos que suman más del 100 % con la
       prestación, α en su máximo con R = 40.000 y w en sus extremos;
     · tarifa real del IRPF: con w = 25 €/h el óptimo cae en la retirada
       de la reducción del art. 20 y el METR llega al 66,4 % con un tipo
       medio del 1,8 %.
   Coste de cálculo de una actualización completa (los tres gráficos,
   con la bisección de Hicks repetida en el barrido de t₂): 5-18 ms.
   ===================================================================== */
(function () {
  'use strict';
  const F = SIM.fmt, C = SIM.color;

  const T = 2000;                 // dotación de tiempo (horas/año) = 40 h × 50 semanas
  const PASO = 10;                // paso de la rejilla de horas
  const N = T / PASO;             // 200 intervalos → 201 nodos
  const HS = []; for (let i = 0; i <= N; i++) HS.push(i * PASO);

  /* ---------- Preferencias ---------- */
  // U = C^(1−α)·L^α. Consumo u ocio no positivos ⇒ utilidad nula (evita NaN).
  function util(c, l, a) {
    if (!(c > 0) || !(l > 0)) return 0;
    return Math.pow(c, 1 - a) * Math.pow(l, a);
  }

  /* ---------- Esquema fiscal ---------- */
  // Tramos de la tarifa didáctica, saneados (u₂ nunca por debajo de u₁).
  function tramos(p) {
    const a = Math.max(0, p.u1), b = Math.max(a, p.u2);
    const tr = [];
    if (a > 0) tr.push([0, a, p.t1]);
    if (b > a) tr.push([a, b, p.t2]);
    tr.push([b, Infinity, p.t3]);
    return tr;
  }
  function esquema(p) {
    const tr = tramos(p);
    const impuesto = p.modo === 'irpf'
      ? y => (y > 0 ? TAX.liquidaIRPF({ trabajoBruto: y, ccaa: 'and', retencionesTrabajo: 0 }).cuotaLiquida : 0)
      : y => (y > 0 ? TAX.aplicaEscala(y, tr).cuota : 0);
    const prestacion = p.presta ? y => Math.max(0, p.B - p.phi * Math.max(0, y)) : () => 0;
    return { tramos: tr, impuesto, prestacion };
  }

  /* ---------- Restricción presupuestaria sobre la rejilla ---------- */
  function restriccion(p, esq) {
    const y = [], imp = [], pres = [], c = [];
    for (let i = 0; i <= N; i++) {
      const yi = p.w * HS[i];
      const ti = esq.impuesto(yi), bi = esq.prestacion(yi);
      y.push(yi); imp.push(ti); pres.push(bi);
      c.push(yi + p.R - ti + bi);
    }
    // METR por diferencias sobre el paso de la rejilla (hacia delante; en el último nodo, hacia atrás)
    const metr = [];
    for (let i = 0; i <= N; i++) {
      const j = i < N ? i + 1 : i, k = i < N ? i : i - 1;
      const dy = y[j] - y[k];
      metr.push(dy > 1e-9 ? 1 - (c[j] - c[k]) / dy : NaN);
    }
    return { y, imp, pres, c, metr };
  }

  /* ---------- Óptimos ---------- */
  // Óptimo sobre una restricción cualquiera dada por el vector de consumos.
  function optimo(c, a) {
    let best = 0, bu = -1;
    for (let i = 0; i <= N; i++) {
      const u = util(c[i], T - HS[i], a);
      if (u > bu + 1e-12) { bu = u; best = i; }
    }
    return { i: best, h: HS[best], c: c[best], u: bu };
  }
  // Óptimo sobre la restricción lineal auxiliar C = wn·h + Y (misma rejilla).
  function optimoLineal(wn, Y, a) {
    let best = 0, bu = -1;
    for (let i = 0; i <= N; i++) {
      const u = util(wn * HS[i] + Y, T - HS[i], a);
      if (u > bu + 1e-12) { bu = u; best = i; }
    }
    return { i: best, h: HS[best], u: bu };
  }
  // Compensación de Hicks por bisección: M tal que max U(C = wn·h + R + M) = uRef.
  function compensa(wn, R, a, uRef) {
    if (!(uRef > 0)) return null;
    let lo = -R, hi = 1000, k = 0;
    while (optimoLineal(wn, R + lo, a).u > uRef && k++ < 40) lo = lo * 2 - 1000;
    k = 0;
    while (optimoLineal(wn, R + hi, a).u < uRef && k++ < 40) hi *= 2;
    for (let it = 0; it < 36; it++) {
      const mid = (lo + hi) / 2;
      if (optimoLineal(wn, R + mid, a).u < uRef) lo = mid; else hi = mid;
    }
    const M = (lo + hi) / 2;
    return { M, opt: optimoLineal(wn, R + M, a) };
  }

  /* ---------- Cálculo completo ---------- */
  function calcula(p) {
    const esq = esquema(p);
    const B = restriccion(p, esq);

    // Referencia: ni impuesto ni prestación
    const cRef = HS.map(h => p.w * h + p.R);
    const ref = optimo(cRef, p.alpha);
    const hFormula = p.w > 0 ? Math.min(T, Math.max(0, (1 - p.alpha) * T - p.alpha * p.R / p.w)) : 0;

    // Con el esquema fiscal
    const opt = optimo(B.c, p.alpha);
    const yOpt = B.y[opt.i], impOpt = B.imp[opt.i], presOpt = B.pres[opt.i];
    const metrOpt = isNaN(B.metr[opt.i]) ? 0 : B.metr[opt.i];
    const medioOpt = yOpt > 0 ? (impOpt - presOpt) / yOpt : 0;

    // Descomposición de Slutsky-Hicks
    const wn = p.w * (1 - metrOpt);
    const comp = compensa(wn, p.R, p.alpha, ref.u);
    const hComp = comp ? comp.opt.h : NaN;
    const sust = comp ? hComp - ref.h : NaN;
    const renta = comp ? opt.h - hComp : NaN;

    // Punto donde se agota la prestación
    const yAgota = p.presta && p.B > 0 && p.phi > 0 ? p.B / p.phi : NaN;
    const hAgota = isNaN(yAgota) || p.w <= 0 ? NaN : yAgota / p.w;

    // Tramo de trampa de la pobreza: nodos con METR ≥ 80 %
    let trampaDesde = NaN, trampaHasta = NaN, nTrampa = 0;
    for (let i = 0; i <= N; i++) {
      if (B.metr[i] >= 0.8) { nTrampa++; if (isNaN(trampaDesde)) trampaDesde = B.y[i]; trampaHasta = B.y[i + 1 <= N ? i + 1 : i]; }
    }

    return {
      esq, B, ref, hFormula, opt, yOpt, impOpt, presOpt, metrOpt, medioOpt,
      wn, M: comp ? comp.M : NaN, hComp, sust, renta,
      variacion: opt.h - ref.h, recaudacion: impOpt - presOpt,
      yAgota, hAgota, trampaDesde, trampaHasta, nTrampa
    };
  }

  /* ---------- Curva de oferta frente al tipo t₂ (gráfico 3) ---------- */
  function barridoT2(p) {
    const ts = [], hNoComp = [], hComp = [];
    const cRef = HS.map(h => p.w * h + p.R);
    const ref = optimo(cRef, p.alpha);
    for (let t = 0; t <= 60.001; t += 2.5) {
      const q = Object.assign({}, p, { modo: 'didactica', t2: t / 100 });
      const e = esquema(q), B = restriccion(q, e);
      const o = optimo(B.c, q.alpha);
      const m = isNaN(B.metr[o.i]) ? 0 : B.metr[o.i];
      const c = compensa(q.w * (1 - m), q.R, q.alpha, ref.u);
      ts.push(t); hNoComp.push(o.h); hComp.push(c ? c.opt.h : null);
    }
    return { ts, hNoComp, hComp, hRef: ref.h };
  }

  /* ---------- HTML ---------- */
  const html = `
  <div class="grid-2">
    <div class="card">
      <h3>El trabajador</h3>
      <p class="inline-note">Dotación de tiempo <strong>T = 2.000 horas al año</strong> (40 h/semana × 50 semanas). El ocio es lo que queda: L = 2.000 − h.</p>
      ${SIM.slider('trab-w', { label: 'Salario por hora, w', help: '€ brutos por hora', min: 8, max: 60, step: 0.5, value: 15 })}
      ${SIM.slider('trab-alpha', { label: 'Peso del ocio en las preferencias, α', help: 'U = C<sup>1−α</sup>·L<sup>α</sup>', min: 0.2, max: 0.8, step: 0.05, value: 0.5 })}
      <div class="row">
        ${SIM.number('trab-R', { label: 'Renta no laboral R (€/año)', value: 0, step: 500, min: 0 })}
      </div>

      <h3>El impuesto sobre la renta del trabajo</h3>
      ${SIM.select('trab-tarifa', {
        label: 'Esquema impositivo', value: 'didactica', options: [
          ['didactica', 'Tarifa didáctica editable (3 tramos)'],
          ['irpf', 'Tarifa real del IRPF 2025 (estatal + Andalucía, con mínimo personal)']
        ]
      })}
      <div class="row">
        ${SIM.number('trab-u1', { label: 'Umbral 1 (€)', value: 12000, step: 500, min: 0 })}
        ${SIM.number('trab-u2', { label: 'Umbral 2 (€)', value: 35000, step: 500, min: 0 })}
      </div>
      <div class="row">
        ${SIM.number('trab-t1', { label: 'Tipo t₁ hasta el umbral 1 (%)', value: 0, step: 1, min: 0, max: 100 })}
        ${SIM.number('trab-t2', { label: 'Tipo t₂ tramo intermedio (%)', value: 24, step: 1, min: 0, max: 100 })}
        ${SIM.number('trab-t3', { label: 'Tipo t₃ tramo superior (%)', value: 37, step: 1, min: 0, max: 100 })}
      </div>

      <h3>La prestación condicionada a la renta</h3>
      <div class="checkbox-group">${SIM.check('trab-presta', 'Aplicar una prestación tipo ingreso mínimo vital: Pres(y) = max(0, B − φ·y)', false)}</div>
      <div class="row">
        ${SIM.number('trab-B', { label: 'Cuantía máxima B (€/año)', value: 7000, step: 500, min: 0 })}
      </div>
      ${SIM.slider('trab-phi', { label: 'Tasa de retirada φ', help: 'cuánto se pierde de prestación por cada euro ganado', min: 0, max: 100, step: 5, value: 100 })}
      <div class="aviso" id="trab-aviso"></div>
    </div>

    <div class="card">
      <h3>La decisión de horas</h3>
      <div class="results-grid">
        ${SIM.result('trab-r-href', 'Horas sin impuesto ni prestación', 'horas/año')}
        ${SIM.result('trab-r-hopt', 'Horas con el esquema fiscal', 'horas/año', 'orange')}
        ${SIM.result('trab-r-var', 'Variación de horas', 'con impuesto − sin impuesto', 'orange')}
      </div>
      <div class="results-grid">
        ${SIM.result('trab-r-sust', 'Efecto sustitución', 'horas (a utilidad constante)', 'red')}
        ${SIM.result('trab-r-renta', 'Efecto renta', 'horas (resto)', 'green')}
        ${SIM.result('trab-r-metr', 'Tipo marginal efectivo en el óptimo', '1 − ΔC/Δy', 'red')}
      </div>
      <div class="results-grid">
        ${SIM.result('trab-r-bruto', 'Renta laboral bruta', '€/año')}
        ${SIM.result('trab-r-imp', 'Impuesto pagado', '€/año', 'red')}
        ${SIM.result('trab-r-pres', 'Prestación cobrada', '€/año', 'green')}
      </div>
      <div class="results-grid">
        ${SIM.result('trab-r-cons', 'Consumo (renta disponible)', '€/año')}
        ${SIM.result('trab-r-medio', 'Tipo medio efectivo', '(Imp − Pres) / bruto')}
        ${SIM.result('trab-r-rec', 'Recaudación neta', 'impuesto − prestación')}
      </div>
      <h3>La restricción presupuestaria, punto a punto</h3>
      <table class="tabla" id="trab-tabla"></table>
      <p class="inline-note">El tipo marginal efectivo de cada fila mide lo que el individuo pierde —en impuesto más prestación retirada— de los diez euros siguientes que gana.</p>
    </div>
  </div>

  <div class="card">
    <h3>Restricción presupuestaria y elección óptima</h3>
    ${SIM.chartBox('trab-chart-brc', 360)}
    <p class="inline-note">La línea gris de trazos es la restricción sin impuesto ni prestación; la azul, la que de verdad afronta el individuo. La naranja es la curva de indiferencia que pasa por el óptimo con impuesto: C = (U*/L<sup>α</sup>)<sup>1/(1−α)</sup>. Donde la azul se aplana, trabajar una hora más casi no aumenta el consumo.</p>
  </div>

  <div class="card">
    <h3>Tipo marginal efectivo a lo largo de la escalera de rentas</h3>
    ${SIM.chartBox('trab-chart-metr', 320)}
    <p class="inline-note" id="trab-nota-metr">—</p>
  </div>

  <div class="card">
    <h3>Curva de oferta de trabajo: horas frente al tipo t₂</h3>
    ${SIM.chartBox('trab-chart-oferta', 320)}
    <p class="inline-note" id="trab-nota-oferta">—</p>
  </div>

  <div class="card interpretation" id="trab-interp"></div>`;

  /* ---------- Actualización ---------- */
  function update(root) {
    const p = {
      w: SIM.val('trab-w'), alpha: SIM.val('trab-alpha'), R: Math.max(0, SIM.val('trab-R')),
      modo: SIM.val('trab-tarifa'),
      u1: Math.max(0, SIM.val('trab-u1')), u2: Math.max(0, SIM.val('trab-u2')),
      t1: SIM.val('trab-t1') / 100, t2: SIM.val('trab-t2') / 100, t3: SIM.val('trab-t3') / 100,
      presta: SIM.val('trab-presta'), B: Math.max(0, SIM.val('trab-B')), phi: SIM.val('trab-phi') / 100
    };
    SIM.show('trab-w-val', F.eur(p.w, 2) + '/h');
    SIM.show('trab-alpha-val', F.n2(p.alpha));
    SIM.show('trab-phi-val', F.pct(p.phi, 0));

    const R = calcula(p);
    const hayW = p.w > 0;

    /* --- Cajas de resultados --- */
    SIM.show('trab-r-href', F.n0(R.ref.h));
    SIM.show('trab-r-hopt', F.n0(R.opt.h));
    SIM.show('trab-r-var', (R.variacion >= 0 ? '+' : '−') + F.n0(Math.abs(R.variacion)));
    SIM.show('trab-r-sust', isNaN(R.sust) ? '—' : (R.sust >= 0 ? '+' : '−') + F.n0(Math.abs(R.sust)));
    SIM.show('trab-r-renta', isNaN(R.renta) ? '—' : (R.renta >= 0 ? '+' : '−') + F.n0(Math.abs(R.renta)));
    SIM.show('trab-r-metr', hayW ? F.pct(R.metrOpt, 1) : '—');
    SIM.show('trab-r-bruto', F.eur0(R.yOpt));
    SIM.show('trab-r-imp', F.eur0(R.impOpt));
    SIM.show('trab-r-pres', F.eur0(R.presOpt));
    SIM.show('trab-r-cons', F.eur0(R.opt.c));
    SIM.show('trab-r-medio', R.yOpt > 0 ? F.pct(R.medioOpt, 1) : '—');
    SIM.show('trab-r-rec', F.eur0(R.recaudacion));

    /* --- Aviso --- */
    let aviso = '';
    if (p.modo === 'irpf') {
      aviso = `<strong>Tarifa real del IRPF 2025.</strong> El impuesto de cada punto es la <em>cuota líquida</em> que devuelve `
        + `<code>TAX.liquidaIRPF</code> con la escala estatal más la de Andalucía, el mínimo personal de ${F.eur0(TAX.P.irpf.minimo.personal)}, `
        + `la reducción por rendimientos del trabajo del artículo 20 y las cotizaciones calculadas automáticamente. `
        + `El consumo descuenta solo esa cuota: las cotizaciones entran en la liquidación como gasto deducible, pero no se restan otra vez `
        + `(para la cuña completa, el módulo «Cuña fiscal»). Los umbrales y tipos editables quedan inactivos mientras esta opción esté seleccionada.`
        + (R.metrOpt > 0.5
          ? ` <strong>Fíjate en el tipo marginal efectivo:</strong> supera el ${F.pct(R.metrOpt, 0)} con un tipo medio de apenas ${F.pct(R.medioOpt, 1)}. `
            + `No es un error: entre ${F.eur0(TAX.P.irpf.reduccionTrabajo.t1)} y ${F.eur0(TAX.P.irpf.reduccionTrabajo.t3)} de rendimiento neto, la reducción del artículo 20 se retira a razón de 1,75 € por euro `
            + `y la deducción de la Ley 5/2025 se agota en paralelo. El propio impuesto genera ahí un tramo de desincentivo comparable al de una prestación mal diseñada.`
          : '');
    } else if (p.t1 === p.t2 && p.t2 === p.t3) {
      aviso = `<strong>Impuesto proporcional del ${F.pct(p.t3, 0)}.</strong> Con un tipo único no hay quiebros por la tarifa: la restricción es una recta `
        + `de pendiente w·(1 − t) = ${F.eur(p.w * (1 - p.t3), 2)} por hora. Es el caso de manual, donde la descomposición en efecto sustitución y efecto renta es exacta.`
        + (p.R === 0 && !p.presta
          ? ` <strong>Ojo al resultado:</strong> con preferencias Cobb-Douglas y renta no laboral nula, h* = (1−α)·T no depende del salario, así que los dos efectos se cancelan <em>exactamente</em> y las horas no se mueven. `
            + `No es que el impuesto no duela —el consumo cae y hay exceso de gravamen—, es que esta función de utilidad impone una elasticidad no compensada nula. `
            + `Sube la renta no laboral R o activa la prestación para romper la simetría.`
          : '');
    } else {
      aviso = `<strong>Tarifa didáctica.</strong> Tres tramos: ${F.pct(p.t1, 0)} hasta ${F.eur0(Math.max(0, p.u1))}, `
        + `${F.pct(p.t2, 0)} hasta ${F.eur0(Math.max(p.u1, p.u2))} y ${F.pct(p.t3, 0)} en adelante. `
        + `Cada umbral introduce un quiebro en la restricción presupuestaria; ahí es donde el módulo «Bunching» encuentra los montones.`;
    }
    if (p.presta && p.B > 0) {
      aviso += ` <strong>Prestación activa:</strong> ${F.eur0(p.B)} al año que se retiran a razón de ${F.pct(p.phi, 0)} por euro ganado`
        + (isNaN(R.yAgota) ? ` (con φ = 0 no se retira nunca: es una transferencia universal).` : `, y se agotan en ${F.eur0(R.yAgota)} de renta bruta, es decir a las ${F.n0(R.hAgota)} horas.`);
    }
    SIM.html('trab-aviso', aviso);

    /* --- Tabla de la restricción --- */
    const filas = [0, 500, 1000, 1500, 2000].map(h => {
      const i = h / PASO;
      const act = i === R.opt.i;
      return `<tr class="${act ? 'active-row' : ''}"><td>${F.n0(h)} h${act ? ' <em>(óptimo)</em>' : ''}</td>`
        + `<td>${F.eur0(R.B.y[i])}</td><td>${F.eur0(R.B.imp[i])}</td><td>${F.eur0(R.B.pres[i])}</td>`
        + `<td><strong>${F.eur0(R.B.c[i])}</strong></td>`
        + `<td class="${R.B.metr[i] >= 0.8 ? 'negative' : ''}">${isNaN(R.B.metr[i]) ? '—' : F.pct(R.B.metr[i], 1)}</td></tr>`;
    });
    SIM.html('trab-tabla', `<thead><tr><th>Horas</th><th>Bruto</th><th>Impuesto</th><th>Prestación</th><th>Neto</th><th>METR</th></tr></thead><tbody>${filas.join('')}</tbody>`);

    /* --- Gráfico 1: restricción presupuestaria --- */
    const cSin = HS.map(h => p.w * h + p.R);
    let yMax = 0;
    for (let i = 0; i <= N; i++) yMax = Math.max(yMax, cSin[i], R.B.c[i]);
    yMax = Math.max(1000, yMax * 1.12);
    // Curva de indiferencia por el óptimo: C = (U*/L^α)^(1/(1−α))
    const xInd = [], yInd = [];
    if (R.opt.u > 0 && p.alpha < 1) {
      for (let i = 0; i <= N; i++) {
        const L = T - HS[i];
        if (L <= 0) continue;
        const c = Math.pow(R.opt.u / Math.pow(L, p.alpha), 1 / (1 - p.alpha));
        if (c <= yMax) { xInd.push(HS[i]); yInd.push(c); }
      }
    }
    const refsX = [];
    if (!isNaN(R.hAgota) && R.hAgota > 0 && R.hAgota <= T) {
      refsX.push({ value: R.hAgota, label: 'la prestación se agota', color: C.verde, dash: [4, 3], align: R.hAgota > T * 0.6 ? 'right' : 'left' });
    }
    if (p.modo === 'didactica' && p.w > 0) {
      [Math.max(0, p.u1), Math.max(p.u1, p.u2)].forEach((u, k) => {
        const h = u / p.w;
        if (u > 0 && h > 0 && h < T) refsX.push({ value: h, label: `umbral ${k + 1}`, color: C.grisClaro, dash: [3, 3], align: 'left', dy: 14 * (k + 1) });
      });
    }
    SIM.chart('trab-chart-brc', {
      type: 'line',
      data: {
        datasets: [
          { label: 'Sin impuesto ni prestación: C = w·h + R', data: SIM.xy(HS, cSin), borderColor: C.grisClaro, borderDash: [6, 4], borderWidth: 1.8 },
          { label: 'Con impuesto y prestación: C(h)', data: SIM.xy(HS, R.B.c), borderColor: C.azul, backgroundColor: SIM.alpha(C.azul, .07), fill: 'origin', borderWidth: 2.6 },
          { label: 'Curva de indiferencia por el óptimo', data: SIM.xy(xInd, yInd), borderColor: C.naranja, borderWidth: 2, borderDash: [2, 2] }
        ]
      },
      options: {
        scales: {
          x: { type: 'linear', min: 0, max: T, title: { text: 'Horas de trabajo al año, h (ocio = 2.000 − h)' }, ticks: { stepSize: 250 } },
          y: { beginAtZero: true, max: yMax, title: { text: 'Consumo = renta disponible (€/año)' }, ticks: { callback: v => F.n0(v) } }
        },
        plugins: {
          refs: {
            x: refsX,
            points: [
              { x: R.ref.h, y: R.ref.c, label: `sin impuesto: ${F.n0(R.ref.h)} h`, color: C.gris, align: R.ref.h > T * 0.6 ? 'right' : 'left' },
              { x: R.opt.h, y: R.opt.c, label: `óptimo: ${F.n0(R.opt.h)} h`, color: C.rojo, align: R.opt.h > T * 0.6 ? 'right' : 'left', dy: 16 }
            ]
          },
          tooltip: { callbacks: { title: it => `h = ${F.n0(it[0].parsed.x)} horas`, label: it => `${it.dataset.label}: ${F.eur0(it.parsed.y)}` } }
        }
      }
    });

    /* --- Gráfico 2: tipo marginal efectivo --- */
    const yy = R.B.y.slice(), mm = R.B.metr.map(v => isNaN(v) ? null : v * 100);
    const trampa = R.B.metr.map(v => (!isNaN(v) && v >= 0.8) ? v * 100 : null);
    const medio = R.B.y.map((yi, i) => {
      if (!(yi > 0)) return null;
      const v = 100 * (R.B.imp[i] - R.B.pres[i]) / yi;
      return v < -120 ? null : v;
    });
    const yTope = Math.max(110, ...mm.filter(v => v != null).concat([0])) + 8;
    SIM.chart('trab-chart-metr', {
      type: 'line',
      data: {
        datasets: [
          { label: 'Tramos con METR ≥ 80 % (trampa de la pobreza)', data: SIM.xy(yy, trampa), borderColor: SIM.alpha(C.rojo, .9), backgroundColor: SIM.alpha(C.rojo, .18), fill: 'origin', stepped: 'after', borderWidth: 0, spanGaps: false },
          { label: 'Tipo marginal efectivo, 1 − ΔC/Δy', data: SIM.xy(yy, mm), borderColor: C.azul, borderWidth: 2.4, stepped: 'after' },
          { label: 'Tipo medio efectivo, (Imp − Pres)/y', data: SIM.xy(yy, medio), borderColor: C.naranja, borderWidth: 2, borderDash: [5, 4] }
        ]
      },
      options: {
        scales: {
          x: { type: 'linear', min: 0, max: Math.max(1000, p.w * T), title: { text: 'Renta laboral bruta anual (€)' }, ticks: { callback: v => F.n0(v) } },
          y: { suggestedMin: -20, max: yTope, title: { text: 'Tipo efectivo (%)' } }
        },
        plugins: {
          refs: {
            y: [{ value: 80, label: 'umbral de trampa: 80 %', color: C.rojo, dash: [3, 3] }, { value: 0, label: '', color: C.grisClaro, dash: [2, 2] }],
            points: R.yOpt > 0 ? [{ x: R.yOpt, y: R.metrOpt * 100, label: `óptimo: ${F.pct(R.metrOpt, 0)}`, color: C.rojo, align: R.yOpt > p.w * T * 0.6 ? 'right' : 'left' }] : []
          },
          tooltip: { callbacks: { title: it => `y = ${F.eur0(it[0].parsed.x)}`, label: it => `${it.dataset.label}: ${F.n1(it.parsed.y)} %` } }
        }
      }
    });
    SIM.html('trab-nota-metr', R.nTrampa > 0
      ? `Hay ${F.n0(R.nTrampa)} nodos de la rejilla con un tipo marginal efectivo del 80 % o más, entre ${F.eur0(R.trampaDesde)} y ${F.eur0(R.trampaHasta)} de renta bruta: en ese tramo cada euro ganado deja menos de veinte céntimos en el bolsillo. La escalera azul es el tipo marginal efectivo; la línea naranja, el tipo medio. Cuando el medio es negativo, el individuo recibe más de lo que paga.`
      : `Ningún tramo alcanza el 80 % de tipo marginal efectivo con estos parámetros. La escalera azul es el tipo marginal efectivo y la línea naranja el tipo medio: el marginal manda sobre el margen intensivo (cuántas horas) y el medio sobre el extensivo (trabajar o no).`);

    /* --- Gráfico 3: curva de oferta frente a t₂ --- */
    const S = barridoT2(p);
    SIM.chart('trab-chart-oferta', {
      type: 'line',
      data: {
        datasets: [
          { label: 'Oferta no compensada (marshalliana): horas óptimas', data: SIM.xy(S.ts, S.hNoComp), borderColor: C.azul, borderWidth: 2.6 },
          { label: 'Oferta compensada (hicksiana): a utilidad constante', data: SIM.xy(S.ts, S.hComp), borderColor: C.rojo, borderWidth: 2, borderDash: [5, 4], spanGaps: true },
          { label: 'Horas sin impuesto ni prestación', data: SIM.xy(S.ts, S.ts.map(() => S.hRef)), borderColor: C.grisClaro, borderWidth: 1.6, borderDash: [3, 3] }
        ]
      },
      options: {
        scales: {
          x: { type: 'linear', min: 0, max: 60, title: { text: 'Tipo del tramo intermedio, t₂ (%)' } },
          y: { beginAtZero: true, max: T, title: { text: 'Horas óptimas al año' } }
        },
        plugins: {
          refs: {
            x: p.modo === 'didactica' ? [{ value: p.t2 * 100, label: `t₂ actual = ${F.pct(p.t2, 0)}`, color: C.naranja, dash: [4, 3], align: p.t2 > 0.35 ? 'right' : 'left' }] : []
          },
          tooltip: { callbacks: { title: it => `t₂ = ${F.n1(it[0].parsed.x)} %`, label: it => `${it.dataset.label}: ${F.n0(it.parsed.y)} h` } }
        }
      }
    });
    SIM.html('trab-nota-oferta', `La distancia vertical entre la línea roja y la gris es el <strong>efecto sustitución</strong> (a utilidad constante): siempre hacia menos horas cuando el tipo sube. `
      + `La distancia entre la azul y la roja es el <strong>efecto renta</strong>: normalmente hacia más horas, porque el individuo es más pobre y el ocio es un bien normal. `
      + `La línea azul —lo que se observa en los datos— es la suma de ambos, y por eso puede ser plana, creciente o decreciente.`
      + (p.modo === 'irpf' ? ` <strong>Nota:</strong> este barrido usa siempre la tarifa didáctica, porque la escala real del IRPF no tiene un «t₂» que se pueda mover; el resto de resultados sí usan el IRPF 2025.` : ''));

    /* --- Lectura --- */
    let t = `<strong>Lectura.</strong> `;
    if (!hayW) {
      t += `Con un salario por hora nulo no hay decisión de oferta de trabajo que analizar: trabajar no reporta nada y el individuo consume su renta no laboral.`;
    } else {
      t += `Sin impuesto ni prestación, este trabajador elegiría <strong>${F.n0(R.ref.h)} horas al año</strong> `
        + `(la fórmula cerrada de Cobb-Douglas, h* = (1−α)·T − α·R/w, da ${F.n1(R.hFormula)}: la rejilla de 10 en 10 horas la reproduce). `
        + `Con el esquema fiscal en vigor elige <strong>${F.n0(R.opt.h)} horas</strong>, es decir `
        + (Math.abs(R.variacion) < 1e-9 ? `exactamente las mismas` : `${F.n0(Math.abs(R.variacion))} horas ${R.variacion < 0 ? 'menos' : 'más'}`)
        + `. Gana ${F.eur0(R.yOpt)} brutos, paga ${F.eur0(R.impOpt)} de impuesto, cobra ${F.eur0(R.presOpt)} de prestación y consume ${F.eur0(R.opt.c)}. `
        + `Su tipo medio efectivo es ${F.pct(R.medioOpt, 1)} y su tipo marginal efectivo, <strong>${F.pct(R.metrOpt, 1)}</strong>: `
        + `de los diez euros siguientes que gane se quedará con ${F.eur((1 - R.metrOpt) * 10, 2)}.<br>`;

      if (isNaN(R.sust)) {
        t += `<strong>Descomposición.</strong> Con estos parámetros la utilidad de referencia es nula y la compensación de Hicks no está definida, así que no se puede separar el efecto sustitución del efecto renta.<br>`;
      } else {
        const signoS = R.sust < -0.5 ? 'negativo' : (R.sust > 0.5 ? 'positivo' : 'nulo');
        const signoR = R.renta < -0.5 ? 'negativo' : (R.renta > 0.5 ? 'positivo' : 'nulo');
        t += `<strong>Descomposición de Slutsky-Hicks.</strong> El salario neto marginal en el óptimo es w·(1−METR) = ${F.eur(R.wn, 2)} por hora frente a los ${F.eur(p.w, 2)} brutos. `
          + `Sobre una restricción lineal a ese salario, la transferencia que devuelve al individuo a su utilidad de referencia es ${F.eur0(R.M)}; con ella elegiría ${F.n0(R.hComp)} horas. `
          + `De ahí: <strong>efecto sustitución = ${(R.sust >= 0 ? '+' : '−') + F.n0(Math.abs(R.sust))} horas</strong> (${signoS}) `
          + (R.sust < -0.5
            ? `— el impuesto abarata el ocio en términos relativos, y a igual utilidad el individuo sustituye trabajo por ocio. Este efecto es el que genera el exceso de gravamen y su signo no es discutible: siempre va en contra del trabajo.`
            : R.sust > 0.5
              ? `— aparece con signo positivo porque el salario neto marginal en el óptimo es mayor que el bruto, algo que solo ocurre con subvenciones al trabajo en el margen.`
              : `— el salario neto marginal coincide con el bruto, de modo que no hay cambio de precios relativos que sustituir.`)
          + ` Y <strong>efecto renta = ${(R.renta >= 0 ? '+' : '−') + F.n0(Math.abs(R.renta))} horas</strong> (${signoR}) `
          + (R.renta > 0.5
            ? `— el impuesto empobrece, y si el ocio es un bien normal quien es más pobre consume menos ocio, o sea trabaja más.`
            : R.renta < -0.5
              ? `— aquí el individuo no acaba más pobre sino más rico en el punto relevante (la prestación o la parte de renta que no se grava lo compensan), y usa parte de ese margen en comprar ocio.`
              : `— prácticamente inexistente con estos parámetros.`)
          + ` El efecto neto sobre las horas, ${(R.variacion >= 0 ? '+' : '−') + F.n0(Math.abs(R.variacion))}, es la suma de los dos: `
          + `<strong>el signo es una cuestión empírica, no teórica</strong>.<br>`;
      }

      if (p.presta && p.B > 0 && R.nTrampa > 0) {
        t += `<strong>Trampa de la pobreza.</strong> Con una cuantía de ${F.eur0(p.B)} y una tasa de retirada del ${F.pct(p.phi, 0)}, el tipo marginal efectivo llega al ${F.pct(Math.max.apply(null, R.B.metr.filter(v => !isNaN(v))), 0)} `
          + `entre ${F.eur0(R.trampaDesde)} y ${F.eur0(R.trampaHasta)}. `
          + (p.phi >= 0.999
            ? `Con retirada del 100 % el tramo es plano: cada euro ganado se descuenta euro a euro de la prestación y trabajar más no mejora el consumo en absoluto hasta superar la cuantía de la prestación. No es pereza: es aritmética.`
            : `Al bajar la retirada por debajo del 100 % el tramo deja de ser plano y trabajar vuelve a compensar, pero a cambio la prestación se extiende hasta ${F.eur0(R.yAgota)} de renta: alcanza a más gente y cuesta más. Ese es el dilema del diseño de las prestaciones condicionadas.`)
          + `<br>`;
      } else if (p.presta && p.B > 0) {
        t += `<strong>Prestación sin trampa.</strong> La retirada del ${F.pct(p.phi, 0)} mantiene el tipo marginal efectivo por debajo del 80 % en todo el recorrido, al precio de que la prestación llegue hasta ${isNaN(R.yAgota) ? 'cualquier nivel de renta' : F.eur0(R.yAgota)} y su coste total sea mayor.<br>`;
      }

      t += `<strong>Recaudación neta.</strong> El esquema ingresa ${F.eur0(R.recaudacion)} de este individuo `
        + (R.recaudacion < 0 ? `(es decir, le transfiere ${F.eur0(-R.recaudacion)} netos).` : `netos.`)
        + ` Cuidado con leer esta cifra como si fuera exógena: está calculada <em>en el óptimo de comportamiento</em>, no sobre las horas de partida. Esa diferencia es, exactamente, la que separa la recaudación mecánica de la efectiva en la curva de Laffer.`;
    }
    SIM.html('trab-interp', t);
  }

  /* ---------- Presets ---------- */
  const base = {
    'trab-w': 15, 'trab-alpha': 0.5, 'trab-R': 0, 'trab-tarifa': 'didactica',
    'trab-u1': 12000, 'trab-u2': 35000, 'trab-t1': 0, 'trab-t2': 24, 'trab-t3': 37,
    'trab-presta': false, 'trab-B': 7000, 'trab-phi': 100
  };

  SIM.register({
    id: 'trabajo', nav: 'Oferta de trabajo', tema: 'Tema 9',
    title: 'Impuestos, prestaciones y oferta de trabajo',
    subtitle: 'La restricción presupuestaria entre consumo y ocio con una tarifa por tramos y una prestación condicionada a la renta. Efecto renta y efecto sustitución con la descomposición de Slutsky-Hicks calculada numéricamente, tipo marginal efectivo y trampa de la pobreza. Dotación de tiempo de 2.000 horas al año y preferencias Cobb-Douglas.',
    guia: {
      observa: [
        'Sube el tipo t₂ y mira las dos líneas del último gráfico: el <strong>efecto sustitución</strong> (roja frente a gris) siempre empuja a trabajar menos, mientras que el <strong>efecto renta</strong> (azul frente a roja) empuja a trabajar más porque el individuo es más pobre. <strong>El signo neto es una cuestión empírica</strong>, no algo que la teoría resuelva.',
        'Activa la prestación con <strong>retirada del 100 %</strong>: el tipo marginal efectivo se pone en el 100 % y la restricción se vuelve horizontal. Trabajar la primera hora no aporta ni un euro de consumo hasta superar la cuantía de la prestación. Es la trampa de la pobreza, y no tiene nada que ver con la voluntad de trabajar.',
        'Baja la tasa de retirada al 50 %: el tramo deja de ser plano y el METR cae, pero fíjate en dónde se agota ahora la prestación. <strong>Menos desincentivo se paga con más beneficiarios y más gasto</strong>: ese es el dilema del diseño, no un fallo del simulador.',
        'Compara la <strong>tarifa real del IRPF 2025</strong> con la didáctica. El mínimo personal deja exento un tramo inicial, pero justo encima la <strong>reducción por rendimientos del trabajo del artículo 20 se retira a razón de 1,75 € por cada euro ganado</strong>, y eso empuja el tipo marginal efectivo por encima del 60 % con un tipo medio todavía cercano a cero. La trampa no la crean solo las prestaciones: la lleva dentro el propio impuesto.',
        'Las horas se mueven poco aunque los tipos cambien mucho: la <strong>elasticidad de las horas de los asalariados es pequeña</strong> (en torno a 0,1-0,3), bastante mayor en segundos perceptores del hogar. Por eso el trabajo empírico moderno mide la elasticidad de la <em>base imponible</em> —la del módulo de bunching— y no la de las horas.'
      ],
      pregunta: '«Bajar los impuestos siempre aumenta la oferta de trabajo». ¿Verdadero o falso?',
      respuesta: 'Falso como proposición general, y el simulador enseña por qué. Una bajada del tipo marginal sube el salario neto y provoca dos movimientos de signo contrario: por <strong>sustitución</strong>, el ocio se encarece en términos relativos y se trabaja más; por <strong>renta</strong>, el individuo es más rico con las mismas horas y, si el ocio es un bien normal, compra más ocio, es decir trabaja menos. La teoría no fija el signo de la suma. Tres matices importantes. Primero, hay que distinguir el margen <strong>intensivo</strong> (cuántas horas, gobernado por el tipo marginal) del <strong>extensivo</strong> (trabajar o no, gobernado por el tipo medio y por la prestación que se pierde al entrar a trabajar); la evidencia encuentra respuestas mucho mayores en el extensivo, sobre todo en madres y en segundos perceptores. Segundo, una reforma que baje tipos y a la vez recorte prestaciones es una <em>compensación</em>, y ahí el efecto renta se anula por construcción: solo queda el de sustitución, que sí tiene signo inequívoco. Tercero, la respuesta que sí está bien documentada no son las horas sino la <strong>renta gravable declarada</strong>, que incluye elusión, reclasificación de rentas y ajustes de esfuerzo; es el parámetro que gobierna el exceso de gravamen y el pico de la curva de Laffer.'
    },
    presets: [
      {
        label: 'Trampa de la pobreza: prestación con retirada del 100 %',
        title: 'Ingreso mínimo de 7.000 € que se retira euro a euro: METR del 100 % en todo el tramo inicial',
        values: Object.assign({}, base, { 'trab-w': 12, 'trab-presta': true, 'trab-B': 7000, 'trab-phi': 100 })
      },
      {
        label: 'Ingreso mínimo con retirada del 50 %',
        title: 'La misma cuantía retirada al 50 %: menos desincentivo marginal, más beneficiarios y más coste',
        values: Object.assign({}, base, { 'trab-w': 12, 'trab-presta': true, 'trab-B': 7000, 'trab-phi': 50 })
      },
      {
        label: 'Subida del marginal máximo (37 → 50 %)',
        title: 'Salario alto (45 €/h) para que el óptimo caiga en el tramo superior: ahí sí muerde la subida del marginal',
        values: Object.assign({}, base, { 'trab-w': 45, 'trab-t3': 50 })
      },
      {
        label: 'Impuesto proporcional del 25 %',
        title: 'Tipo único sin quiebros: la restricción es una recta y la descomposición es la de los manuales',
        values: Object.assign({}, base, { 'trab-t1': 25, 'trab-t2': 25, 'trab-t3': 25 })
      },
      {
        label: 'Tarifa real del IRPF 2025',
        title: 'Escala estatal más Andalucía: la retirada de la reducción del artículo 20 dispara el tipo marginal efectivo por encima del 60 % con un tipo medio casi nulo',
        values: Object.assign({}, base, { 'trab-tarifa': 'irpf', 'trab-w': 25 })
      }
    ],
    html, update
  });
})();
