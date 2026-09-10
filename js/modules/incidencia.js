/* Módulo de incidencia fiscal (Tema 7 de HP II)
   Mercado lineal calibrado en el equilibrio de partida P0 = 10 €, Q0 = 100 unidades,
   con las elasticidades que el alumno elige *en ese punto*. Un impuesto unitario t
   abre una cuña entre el precio que paga el comprador (Pd) y el que recibe el
   vendedor (Ps). El mensaje del módulo: quién ingresa el impuesto en Hacienda
   (incidencia legal) no cambia el reparto de la carga (incidencia económica). */
(function () {
  'use strict';
  const F = SIM.fmt, C = SIM.color;

  // Equilibrio de partida normalizado
  const P0 = 10, Q0 = 100;

  const html = `
  <div class="grid-2">
    <div class="card">
      <h3>Parámetros del mercado</h3>
      <p class="inline-note">Partimos de un equilibrio con precio ${P0} € y cantidad ${Q0} unidades. Las elasticidades son las del punto de partida; las curvas son lineales.</p>
      ${SIM.slider('inc-ed', { label: 'Elasticidad de la demanda |ε<sub>d</sub>|', help: 'cerca de 0 = demanda rígida', min: 0.1, max: 3, step: 0.1, value: 1 })}
      ${SIM.slider('inc-es', { label: 'Elasticidad de la oferta ε<sub>s</sub>', help: 'cerca de 0 = oferta rígida', min: 0.1, max: 3, step: 0.1, value: 1 })}
      ${SIM.slider('inc-t', { label: 'Impuesto unitario t', help: 'euros por unidad', min: 0.5, max: 5, step: 0.25, value: 2 })}
      <div class="row">
        ${SIM.select('inc-quien', { label: 'Quién ingresa legalmente el impuesto', value: 'vendedor', options: [['vendedor', 'El vendedor (se desplaza la oferta: O + t)'], ['comprador', 'El comprador (se desplaza la demanda: D − t)']] })}
      </div>
      <p class="inline-note">Cambia el desplegable y observa el dibujo: se mueve una curva distinta, pero <strong>ni Q₁, ni P<sub>d</sub>, ni P<sub>s</sub>, ni el reparto de la carga cambian</strong>. Es el resultado de equivalencia de la incidencia legal.</p>

      <h3>Reparto de la carga</h3>
      <div class="results-grid">
        ${SIM.result('inc-r-cons', 'Soporta el comprador', 'del impuesto', 'orange')}
        ${SIM.result('inc-r-prod', 'Soporta el vendedor', 'del impuesto')}
      </div>
      <div class="results-grid">
        ${SIM.result('inc-r-pd', 'Precio que paga el comprador P<sub>d</sub>', '€/unidad', 'orange')}
        ${SIM.result('inc-r-ps', 'Precio que recibe el vendedor P<sub>s</sub>', '€/unidad')}
        ${SIM.result('inc-r-q1', 'Cantidad intercambiada Q₁', 'unidades')}
      </div>
      <div class="results-grid">
        ${SIM.result('inc-r-rec', 'Recaudación t·Q₁', '€', 'green')}
        ${SIM.result('inc-r-eg', 'Exceso de gravamen', '€', 'red')}
        ${SIM.result('inc-r-perdida', 'Cantidad que desaparece', 'unidades', 'red')}
      </div>
      <div class="aviso" id="inc-veredicto"></div>
    </div>

    <div class="card">
      <h3>El diagrama de la cuña fiscal</h3>
      ${SIM.chartBox('inc-chart', 430)}
      <p class="inline-note">Las áreas sombreadas son la carga del comprador (naranja, entre P₀ y P<sub>d</sub>), la del vendedor (azul, entre P<sub>s</sub> y P₀) y el exceso de gravamen (rojo, el triángulo entre Q₁ y Q₀). Las dos primeras suman la recaudación.</p>
    </div>
  </div>

  <div class="card">
    <h3>La misma cuña, contada con números</h3>
    <table class="tabla" id="inc-tabla"></table>
  </div>

  <div class="card interpretation" id="inc-interp"></div>`;

  function leer() {
    return {
      ed: SIM.val('inc-ed'),
      es: SIM.val('inc-es'),
      t: SIM.val('inc-t'),
      quien: SIM.val('inc-quien') || 'vendedor'
    };
  }

  /* Modelo lineal. Demanda: P = P0 + (Q0 − Q)·P0/(Q0·ed). Oferta: P = P0 + (Q − Q0)·P0/(Q0·es).
     Con un impuesto unitario t el desplazamiento de cantidad es
     ΔQ = −Q0·(t/P0)·(ed·es)/(ed+es), y la cuña se reparte según las elasticidades. */
  function modelo(ed, es, t) {
    const partConsumidor = es / (es + ed);     // cuota de la carga que soporta el comprador
    const partProductor = ed / (es + ed);
    const dQ = -Q0 * (t / P0) * (ed * es) / (ed + es);
    const Q1 = Q0 + dQ;
    const Pd = P0 + t * partConsumidor;
    const Ps = P0 - t * partProductor;
    return {
      ed, es, t, partConsumidor, partProductor, dQ, Q1, Pd, Ps,
      recaudacion: t * Q1,
      cargaConsumidor: t * partConsumidor * Q1,
      cargaProductor: t * partProductor * Q1,
      exceso: 0.5 * t * Math.abs(dQ)
    };
  }

  function update(root) {
    const p = leer();
    const m = modelo(p.ed, p.es, p.t);

    SIM.show('inc-ed-val', F.n1(p.ed));
    SIM.show('inc-es-val', F.n1(p.es));
    SIM.show('inc-t-val', F.eur(p.t, 2));

    SIM.show('inc-r-cons', F.pct(m.partConsumidor, 1));
    SIM.show('inc-r-prod', F.pct(m.partProductor, 1));
    SIM.show('inc-r-pd', F.n2(m.Pd));
    SIM.show('inc-r-ps', F.n2(m.Ps));
    SIM.show('inc-r-q1', F.n1(m.Q1));
    SIM.show('inc-r-rec', F.n1(m.recaudacion));
    SIM.show('inc-r-eg', F.n1(m.exceso));
    SIM.show('inc-r-perdida', F.n1(Math.abs(m.dQ)));

    // ---------- Veredicto: quién paga de verdad ----------
    const legal = p.quien === 'vendedor' ? 'el vendedor' : 'el comprador';
    let quienPaga;
    if (m.partConsumidor > 0.65) quienPaga = `sobre todo <strong>el comprador</strong> (${F.pct(m.partConsumidor, 0)} del impuesto)`;
    else if (m.partProductor > 0.65) quienPaga = `sobre todo <strong>el vendedor</strong> (${F.pct(m.partProductor, 0)} del impuesto)`;
    else quienPaga = `<strong>de forma bastante repartida</strong> (${F.pct(m.partConsumidor, 0)} el comprador y ${F.pct(m.partProductor, 0)} el vendedor)`;
    SIM.html('inc-veredicto',
      `<strong>Quién paga de verdad.</strong> Legalmente ingresa el impuesto ${legal}, pero la carga recae ${quienPaga}. `
      + `Manda el cociente de elasticidades: el lado <em>más rígido</em> no puede escapar del impuesto y se come la mayor parte. `
      + `Aquí ε<sub>s</sub>/|ε<sub>d</sub>| = ${F.n2(p.es / p.ed)}, y esa cifra es exactamente la proporción en que se reparte la carga entre comprador y vendedor.`);

    // ---------- Ejes adaptados a los datos ----------
    const demandaP = Q => P0 + (Q0 - Q) * P0 / (Q0 * p.ed);
    const ofertaP = Q => P0 + (Q - Q0) * P0 / (Q0 * p.es);
    // Techo del eje de precios: lo marcan la cuña y el precio de partida, con holgura
    const pTop = Math.max(m.Pd, P0 + p.t, P0) * 1.45;
    // Anchura del eje de cantidades: hasta donde la oferta con impuesto sigue dentro del cuadro
    const qCandidato = Q0 * (1 + (pTop - p.t - P0) * p.es / P0);
    const qHi = Math.min(Q0 * 1.5, Math.max(Q0 * 1.25, qCandidato));

    const qs = [];
    for (let i = 0; i <= 80; i++) qs.push(qHi * i / 80);
    const dem = qs.map(demandaP);
    const ofe = qs.map(ofertaP);
    const desplazada = p.quien === 'vendedor' ? ofe.map(v => v + p.t) : dem.map(v => v - p.t);
    const etiquetaDesplazada = p.quien === 'vendedor' ? 'Oferta + t (la ingresa el vendedor)' : 'Demanda − t (lo ingresa el comprador)';

    // Polígonos sombreados (fill: 'shape' cierra el contorno del propio dataset)
    const areaConsumidor = [{ x: 0, y: P0 }, { x: m.Q1, y: P0 }, { x: m.Q1, y: m.Pd }, { x: 0, y: m.Pd }];
    const areaProductor = [{ x: 0, y: m.Ps }, { x: m.Q1, y: m.Ps }, { x: m.Q1, y: P0 }, { x: 0, y: P0 }];
    const areaExceso = [{ x: m.Q1, y: m.Pd }, { x: Q0, y: P0 }, { x: m.Q1, y: m.Ps }];
    const poligono = (label, pts, color, a) => ({
      label, data: pts, fill: 'shape', backgroundColor: SIM.alpha(color, a),
      borderColor: SIM.alpha(color, a), borderWidth: 0, pointRadius: 0, tension: 0
    });

    SIM.chart('inc-chart', {
      type: 'line',
      data: {
        datasets: [
          poligono('Carga del comprador', areaConsumidor, C.naranja, 0.30),
          poligono('Carga del vendedor', areaProductor, C.azul, 0.28),
          poligono('Exceso de gravamen', areaExceso, C.rojo, 0.45),
          { label: 'Demanda', data: SIM.xy(qs, dem), borderColor: C.azul, borderWidth: 2.4, pointRadius: 0, tension: 0 },
          { label: 'Oferta', data: SIM.xy(qs, ofe), borderColor: C.verde, borderWidth: 2.4, pointRadius: 0, tension: 0 },
          { label: etiquetaDesplazada, data: SIM.xy(qs, desplazada), borderColor: p.quien === 'vendedor' ? C.verde : C.azul, borderDash: [7, 4], borderWidth: 2, pointRadius: 0, tension: 0 }
        ]
      },
      options: {
        scales: {
          x: { type: 'linear', min: 0, max: qHi, title: { text: 'Cantidad (unidades)' } },
          y: { min: 0, max: pTop, title: { text: 'Precio (€ por unidad)' } }
        },
        plugins: {
          refs: {
            y: [
              { value: m.Pd, label: `P_d = ${F.n2(m.Pd)} €`, color: C.naranja },
              { value: P0, label: `P₀ = ${F.n2(P0)} €`, color: C.gris, dash: [3, 3] },
              { value: m.Ps, label: `P_s = ${F.n2(m.Ps)} €`, color: C.azul }
            ],
            x: [
              { value: m.Q1, label: `Q₁ = ${F.n1(m.Q1)}`, color: C.rojo, align: 'right' },
              { value: Q0, label: `Q₀ = ${F.n0(Q0)}`, color: C.gris, dash: [3, 3], dy: 14 }
            ],
            points: [
              { x: Q0, y: P0, label: '', color: C.gris },
              { x: m.Q1, y: m.Pd, label: '', color: C.naranja },
              { x: m.Q1, y: m.Ps, label: '', color: C.azul }
            ]
          },
          tooltip: {
            callbacks: {
              title: it => `Cantidad ${F.n1(it[0].parsed.x)}`,
              label: it => `${it.dataset.label}: ${F.n2(it.parsed.y)} €`
            }
          }
        }
      }
    });

    // ---------- Tabla ----------
    SIM.html('inc-tabla',
      `<thead><tr><th>Concepto</th><th>Antes del impuesto</th><th>Después del impuesto</th><th>Diferencia</th></tr></thead><tbody>`
      + `<tr><td>Precio que paga el comprador</td><td>${F.n2(P0)} €</td><td>${F.n2(m.Pd)} €</td><td>${F.signo(m.Pd - P0)} €</td></tr>`
      + `<tr><td>Precio que recibe el vendedor</td><td>${F.n2(P0)} €</td><td>${F.n2(m.Ps)} €</td><td>${F.signo(m.Ps - P0)} €</td></tr>`
      + `<tr><td>Cantidad intercambiada</td><td>${F.n1(Q0)}</td><td>${F.n1(m.Q1)}</td><td>${F.signo(m.dQ)}</td></tr>`
      + `<tr><td>Carga total del comprador (P<sub>d</sub> − P₀)·Q₁</td><td>—</td><td>${F.n1(m.cargaConsumidor)} €</td><td>${F.pct(m.partConsumidor, 1)} del impuesto</td></tr>`
      + `<tr><td>Carga total del vendedor (P₀ − P<sub>s</sub>)·Q₁</td><td>—</td><td>${F.n1(m.cargaProductor)} €</td><td>${F.pct(m.partProductor, 1)} del impuesto</td></tr>`
      + `<tr class="total"><td>Recaudación t·Q₁</td><td>—</td><td>${F.n1(m.recaudacion)} €</td><td>suma de las dos cargas</td></tr>`
      + `<tr><td>Exceso de gravamen ½·t·|ΔQ|</td><td>—</td><td>${F.n1(m.exceso)} €</td><td>${F.pct(m.exceso / m.recaudacion, 1)} de la recaudación</td></tr>`
      + `</tbody>`);

    // ---------- Lectura ----------
    const lado = m.partConsumidor > m.partProductor ? 'la demanda' : 'la oferta';
    const ladoElas = m.partConsumidor > m.partProductor ? p.ed : p.es;
    const otroElas = m.partConsumidor > m.partProductor ? p.es : p.ed;
    let txt = `<strong>Lectura.</strong> Con |ε<sub>d</sub>| = ${F.n1(p.ed)}, ε<sub>s</sub> = ${F.n1(p.es)} y un impuesto de ${F.eur(p.t, 2)} por unidad, `
      + `el precio que paga el comprador sube de ${F.n2(P0)} € a ${F.n2(m.Pd)} € (${F.signo(m.Pd - P0)} €) y el que recibe el vendedor baja a ${F.n2(m.Ps)} € (${F.signo(m.Ps - P0)} €). `
      + `Los dos movimientos suman exactamente el impuesto: ${F.n2(m.Pd - m.Ps)} €. `
      + `La cantidad cae de ${F.n0(Q0)} a ${F.n1(m.Q1)} unidades, así que Hacienda recauda ${F.n1(m.recaudacion)} € y se pierden otros ${F.n1(m.exceso)} € `
      + `que no recibe nadie: son los intercambios que valían la pena y ya no se hacen. `;
    txt += `<br><strong>Por qué se reparte así.</strong> ${lado.charAt(0).toUpperCase() + lado.slice(1)} es el lado más rígido (elasticidad ${F.n1(ladoElas)} frente a ${F.n1(otroElas)}), `
      + `y por eso soporta ${F.pct(Math.max(m.partConsumidor, m.partProductor), 0)} de la carga. La regla es simple: la carga del comprador es ε<sub>s</sub>/(ε<sub>s</sub>+|ε<sub>d</sub>|). `
      + `Si la demanda fuera perfectamente rígida el comprador pagaría el 100 %; si fuera perfectamente elástica, el 0 %. `;
    txt += `<br><strong>La incidencia legal es irrelevante.</strong> Ahora mismo el impuesto lo ingresa ${legal}. `
      + `Cambia el desplegable: en el dibujo se moverá la otra curva, pero P<sub>d</sub>, P<sub>s</sub>, Q₁ y el reparto se quedan clavados en ${F.n2(m.Pd)} €, ${F.n2(m.Ps)} €, ${F.n1(m.Q1)} y ${F.pct(m.partConsumidor, 0)}/${F.pct(m.partProductor, 0)}. `
      + `Por eso, cuando en el debate público se discute «quién paga» una cotización social, un impuesto a la banca o un arancel, la respuesta no está en el BOE sino en las elasticidades.`;
    if (m.exceso / m.recaudacion > 0.15) {
      txt += `<br><strong>Aviso de eficiencia.</strong> El exceso de gravamen ya supone ${F.pct(m.exceso / m.recaudacion, 0)} de lo recaudado: con dos lados relativamente elásticos, el impuesto destruye mucho intercambio por cada euro que ingresa. Ese es el argumento del Tema 8 para preferir bases amplias y tipos bajos.`;
    }
    SIM.html('inc-interp', txt);
  }

  SIM.register({
    id: 'incidencia', nav: 'Incidencia', tema: 'Tema 7',
    title: 'Incidencia fiscal: ¿quién paga realmente el impuesto?',
    subtitle: 'La carga económica de un impuesto no la decide la ley, sino las elasticidades relativas de la oferta y la demanda. El módulo dibuja la cuña fiscal en un mercado lineal, sombrea la carga de cada lado y el exceso de gravamen, y permite cambiar quién ingresa el impuesto en Hacienda para comprobar que el resultado no se mueve.',
    guia: {
      observa: [
        'La suma de las dos subidas y bajadas de precio (P<sub>d</sub> − P₀) + (P₀ − P<sub>s</sub>) es <strong>siempre</strong> igual al impuesto. Lo único que cambia con las elasticidades es cómo se reparte esa cuña.',
        'El lado <strong>más rígido</strong> paga más. Baja la elasticidad de la demanda a 0,2 dejando la oferta en 2: el comprador acaba soportando más del 90 % del impuesto porque no tiene a dónde ir.',
        'Cambia el desplegable de «quién ingresa legalmente el impuesto»: en el dibujo se desplaza otra curva, pero P<sub>d</sub>, P<sub>s</sub>, Q₁ y el reparto no se mueven ni un decimal. <strong>La incidencia legal no es la incidencia económica.</strong>',
        'El triángulo rojo (exceso de gravamen) crece cuando <em>ambos</em> lados son elásticos: la distorsión viene de la cantidad que deja de intercambiarse, no del dinero que cambia de manos.',
        'Mira el peso del triángulo rojo sobre la recaudación en la tabla: ese cociente es el anticipo del coste marginal de los fondos públicos del Tema 8.'
      ],
      pregunta: 'En 2024 el Gobierno bajó al 0 % el IVA del aceite de oliva y buena parte del debate fue si el precio en el lineal bajaba de verdad. Con este modelo, ¿de qué depende que la rebaja llegue al consumidor? ¿Y por qué en los aranceles estadounidenses de 2018-2019 los estudios encontraron que el precio de importación apenas cayó?',
      respuesta: 'De lo mismo en los dos casos: de las elasticidades relativas. La parte de una rebaja (o de una subida) que se traslada al precio final es ε<sub>s</sub>/(ε<sub>s</sub>+|ε<sub>d</sub>|). Con demanda de aceite rígida y oferta elástica, casi toda la rebaja debería llegar al consumidor; si no llega, el sospechoso es una oferta o una distribución con poca competencia, es decir, un supuesto del modelo que no se cumple. En los aranceles de 2018-2019, Amiti, Redding y Weinstein (2019) y Fajgelbaum y coautores (2020) encontraron un traslado casi completo al precio pagado en Estados Unidos: la oferta exportadora era muy elástica y quien acabó soportando el arancel fue el importador, no el país exportador, por mucho que el arancel lo recaude la aduana estadounidense.'
    },
    presets: [
      { label: 'Demanda inelástica (gasolina)', title: 'Demanda rígida frente a oferta elástica: paga el consumidor', values: { 'inc-ed': 0.3, 'inc-es': 1.5, 'inc-t': 2, 'inc-quien': 'vendedor' } },
      { label: 'Oferta inelástica (suelo)', title: 'Oferta rígida: la carga recae sobre el propietario', values: { 'inc-ed': 1.5, 'inc-es': 0.2, 'inc-t': 2, 'inc-quien': 'vendedor' } },
      { label: 'Simétrico', title: 'Elasticidades iguales: la carga se reparte al 50 %', values: { 'inc-ed': 1, 'inc-es': 1, 'inc-t': 2, 'inc-quien': 'vendedor' } },
      { label: 'Impuesto sobre el comprador (misma incidencia)', title: 'Mismo mercado que «gasolina», pero ahora lo ingresa el comprador', values: { 'inc-ed': 0.3, 'inc-es': 1.5, 'inc-t': 2, 'inc-quien': 'comprador' } },
      { label: 'Demanda perfectamente elástica (0,1 vs 3)', title: 'Oferta rígida (0,1) y demanda casi perfectamente elástica (3): paga el vendedor', values: { 'inc-ed': 3, 'inc-es': 0.1, 'inc-t': 3, 'inc-quien': 'vendedor' } }
    ],
    html, update
  });
})();
