/* Módulo IVA en cadena (Tema 6 de HP II: imposición sobre el consumo)
   Cadena de cuatro fases con valor añadido editable. Permite comparar:
     - el IVA «limpio» (cada fase ingresa t × su valor añadido),
     - una exención intermedia que rompe la cadena de deducciones (piramidación),
     - un impuesto plurifásico acumulativo (en cascada),
     - el caso en que el precio final no puede subir y el impuesto lo absorbe la cadena. */
(function () {
  'use strict';
  const F = SIM.fmt, C = SIM.color;

  const FASES = ['Materias primas', 'Fabricante', 'Mayorista', 'Minorista'];

  /* ---------- Cálculo ---------- */
  /* Cadena de IVA. `exenta` = 0 (ninguna) o 1..4.
     Regla clave: la fase exenta NO repercute IVA, pero tampoco deduce el que soportó.
     Ese IVA soportado no deducible se incorpora a su coste y, por tanto, a la base
     de las fases siguientes: es la piramidación (impuesto sobre impuesto). */
  function cadenaIVA(vas, t, exenta) {
    const filas = [];
    let precioAnterior = 0, repercutidoAnterior = 0;
    for (let i = 0; i < 4; i++) {
      const ex = (exenta === i + 1);
      const compras = precioAnterior;                 // precio de compra sin IVA
      const soportado = repercutidoAnterior;          // IVA que le repercutió el proveedor
      const deducible = ex ? 0 : soportado;
      const noDeducible = ex ? soportado : 0;
      const precio = compras + noDeducible + vas[i];  // precio de venta sin IVA
      const repercutido = ex ? 0 : t * precio;
      const ingresado = repercutido - deducible;      // lo que ingresa en Hacienda
      filas.push({ fase: FASES[i], exenta: ex, compras, va: vas[i], precio, repercutido, soportado, deducible, noDeducible, ingresado });
      precioAnterior = precio;
      repercutidoAnterior = repercutido;
    }
    const precioFinalSinIVA = filas[3].precio;
    const ivaFinal = filas[3].repercutido;
    return {
      filas,
      precioFinalSinIVA,
      ivaFinal,
      precioConsumidor: precioFinalSinIVA + ivaFinal,
      recaudacion: filas.reduce((a, f) => a + f.ingresado, 0),
      noDeducibleTotal: filas.reduce((a, f) => a + f.noDeducible, 0)
    };
  }

  /* Impuesto plurifásico acumulativo («en cascada»): cada fase paga t sobre su precio
     de venta, sin deducir nada de lo soportado. El impuesto de las fases previas viaja
     dentro del coste y vuelve a gravarse. */
  function cadenaCascada(vas, t) {
    const filas = [];
    let costeAnterior = 0;
    for (let i = 0; i < 4; i++) {
      const compras = costeAnterior;                  // coste de compra, impuesto incluido
      const precio = compras + vas[i];                // precio de venta antes de su impuesto
      const impuesto = t * precio;
      const conImpuesto = precio + impuesto;
      filas.push({ fase: FASES[i], compras, va: vas[i], precio, impuesto, conImpuesto });
      costeAnterior = conImpuesto;
    }
    return {
      filas,
      precioConsumidor: filas[3].conImpuesto,
      recaudacion: filas.reduce((a, f) => a + f.impuesto, 0)
    };
  }

  /* ---------- HTML ---------- */
  const html = `
  <div class="grid-2">
    <div class="card">
      <h3>Valor añadido en cada fase</h3>
      <p class="inline-note">Escribe cuánto valor añade cada eslabón. El precio de venta de una fase es lo que compra más lo que añade.</p>
      <div class="row">
        ${SIM.number('iva-va1', { label: '1. Materias primas (€)', value: 100, step: 5 })}
        ${SIM.number('iva-va2', { label: '2. Fabricante (€)', value: 150, step: 5 })}
        ${SIM.number('iva-va3', { label: '3. Mayorista (€)', value: 50, step: 5 })}
        ${SIM.number('iva-va4', { label: '4. Minorista (€)', value: 100, step: 5 })}
      </div>

      <h3>Régimen del impuesto</h3>
      <div class="row">
        ${SIM.select('iva-tipo', {
          label: 'Tipo de IVA', value: '0.21', options: [
            ['0.21', 'General, 21 %'], ['0.10', 'Reducido, 10 %'], ['0.04', 'Superreducido, 4 %'], ['0', 'Tipo cero, 0 % (exportaciones)']
          ]
        })}
        ${SIM.select('iva-exencion', {
          label: 'Exención (rompe la cadena)', value: '0', options: [
            ['0', 'Ninguna: cadena completa'], ['1', 'Fase 1: materias primas'], ['2', 'Fase 2: fabricante'], ['3', 'Fase 3: mayorista'], ['4', 'Fase 4: minorista']
          ]
        })}
      </div>
      <div class="checkbox-group">
        ${SIM.check('iva-cascada', 'Comparar con un <strong>impuesto en cascada</strong> (plurifásico acumulativo, sin deducción)')}
      </div>
      <div class="checkbox-group">
        ${SIM.check('iva-rigido', 'El <strong>precio final no puede subir</strong>: la cadena absorbe el IVA')}
      </div>
      <p class="inline-note">Una fase <em>exenta</em> no repercute IVA, pero tampoco deduce el que ha soportado: ese IVA se convierte en coste y se traslada a los precios siguientes.</p>
      <div class="aviso" id="iva-aviso"></div>
    </div>

    <div class="card">
      <h3>Resultado de la cadena</h3>
      <div class="results-grid">
        ${SIM.result('iva-r-precio', 'Precio final al consumidor', 'IVA incluido', 'green')}
        ${SIM.result('iva-r-sin', 'Precio final sin IVA', '€')}
        ${SIM.result('iva-r-recaudado', 'IVA total recaudado', '€', 'orange')}
        ${SIM.result('iva-r-efectivo', 'Tipo efectivo', 'impuesto / precio final')}
      </div>
      <div class="results-grid">
        ${SIM.result('iva-r-comprob', 'Comprobación: t × precio sin IVA', '€')}
        ${SIM.result('iva-r-difcascada', 'Sobrecoste del impuesto en cascada', 'sobre el precio final', 'red')}
      </div>
      <div class="liq-flow" id="iva-flow"></div>
      <h3>Detalle fase a fase</h3>
      <table class="tabla" id="iva-tabla"></table>
    </div>
  </div>

  <div id="iva-cascada-box"></div>

  <div class="grid-2">
    <div class="card">
      <h3>Quién añade valor y quién ingresa el impuesto</h3>
      ${SIM.chartBox('iva-chart-fases', 320)}
      <p class="inline-note">Sin exenciones, la barra naranja de cada fase es exactamente el tipo aplicado a su valor añadido.</p>
    </div>
    <div class="card">
      <h3>Comparación de regímenes</h3>
      ${SIM.chartBox('iva-chart-comp', 320)}
      <p class="inline-note">Mismo valor añadido total y mismo tipo nominal; cambia sólo la forma de recaudar.</p>
    </div>
  </div>
  <div class="card interpretation" id="iva-interp"></div>`;

  /* ---------- Actualización ---------- */
  function update(root) {
    const vas0 = [SIM.val('iva-va1'), SIM.val('iva-va2'), SIM.val('iva-va3'), SIM.val('iva-va4')].map(v => Math.max(0, v || 0));
    const t = parseFloat(SIM.val('iva-tipo')) || 0;
    const exenta = parseInt(SIM.val('iva-exencion'), 10) || 0;
    const verCascada = !!SIM.val('iva-cascada');
    const rigido = !!SIM.val('iva-rigido');
    const sumaVA = vas0.reduce((a, b) => a + b, 0);

    // Si el precio final está congelado, todo el sistema es homogéneo de grado 1 en el
    // valor añadido: basta reescalar los valores añadidos por k para que el precio con
    // impuesto coincida con el precio sin impuesto de partida (100 = PSI · 1,20 → PSI = 83,33).
    const previa = cadenaIVA(vas0, t, exenta);
    const k = (rigido && previa.precioConsumidor > 0) ? sumaVA / previa.precioConsumidor : 1;
    const vas = vas0.map(v => v * k);
    const R = cadenaIVA(vas, t, exenta);
    // Escenario de referencia: la misma cadena, con el mismo valor añadido, sin exención
    const limpia = cadenaIVA(vas, t, 0);
    const K = cadenaCascada(vas, t);
    const absorbido = sumaVA - R.precioFinalSinIVA;   // valor añadido que pierde la cadena

    /* Resultados */
    SIM.show('iva-r-precio', F.eur(R.precioConsumidor, 2));
    SIM.show('iva-r-sin', F.n2(R.precioFinalSinIVA));
    SIM.show('iva-r-recaudado', F.n2(R.recaudacion));
    SIM.show('iva-r-efectivo', R.precioConsumidor > 0 ? F.pct(R.recaudacion / R.precioConsumidor, 1) : '—');
    SIM.show('iva-r-comprob', F.n2(t * R.precioFinalSinIVA));
    SIM.show('iva-r-difcascada', F.n2(K.precioConsumidor - R.precioConsumidor));

    /* Cascada de precios: cómo crece el precio a lo largo de la cadena */
    const pasos = R.filas.map(f => [f.fase + (f.exenta ? ' (exenta)' : ''), f.precio, f.exenta ? 'negative' : '']);
    pasos.push(['Precio al consumidor', R.precioConsumidor, 'hito']);
    SIM.html('iva-flow', pasos.map(([l, v, c], i) =>
      `${i ? '<span class="liq-arrow">→</span>' : ''}<div class="liq-step ${c}"><div class="liq-label">${l}</div><div class="liq-value">${F.eur(v, 2)}</div></div>`).join(''));

    /* Tabla fase a fase */
    const tot = R.filas.reduce((a, f) => ({
      compras: a.compras + f.compras, va: a.va + f.va, precio: a.precio + f.precio,
      repercutido: a.repercutido + f.repercutido, soportado: a.soportado + f.soportado,
      noDeducible: a.noDeducible + f.noDeducible, ingresado: a.ingresado + f.ingresado
    }), { compras: 0, va: 0, precio: 0, repercutido: 0, soportado: 0, noDeducible: 0, ingresado: 0 });
    const filasHTML = R.filas.map(f => `<tr class="${f.exenta ? 'active-row' : ''}">
        <td>${f.fase}${f.exenta ? ' <em>(exenta)</em>' : ''}</td>
        <td>${F.n2(f.compras)}</td><td>${F.n2(f.va)}</td><td><strong>${F.n2(f.precio)}</strong></td>
        <td>${F.n2(f.repercutido)}</td><td>${F.n2(f.soportado)}</td>
        <td>${f.noDeducible > 0.005 ? F.n2(f.noDeducible) : '—'}</td>
        <td><strong>${F.n2(f.ingresado)}</strong></td></tr>`).join('');
    SIM.html('iva-tabla', `<thead><tr>
        <th>Fase</th><th>Compras</th><th>Valor añadido</th><th>Precio de venta sin IVA</th>
        <th>IVA repercutido</th><th>IVA soportado</th><th>IVA no deducible</th><th>IVA ingresado</th></tr></thead>
      <tbody>${filasHTML}
        <tr class="total"><td>Total</td><td>—</td><td>${F.n2(tot.va)}</td><td>—</td>
          <td>${F.n2(tot.repercutido)}</td><td>${F.n2(tot.soportado)}</td>
          <td>${F.n2(tot.noDeducible)}</td><td>${F.n2(tot.ingresado)}</td></tr></tbody>`);

    /* Aviso: comprobación de neutralidad */
    const desvio = R.recaudacion - t * R.precioFinalSinIVA;
    let aviso;
    if (t === 0) {
      aviso = '<strong>Tipo cero.</strong> No hay impuesto que repercutir, pero el derecho a deducir se mantiene: el tipo cero no es lo mismo que una exención.';
    } else if (Math.abs(desvio) < 0.005) {
      aviso = `<strong>Neutralidad.</strong> El IVA ingresado por las cuatro fases (${F.eur(R.recaudacion, 2)}) coincide con aplicar el tipo del ${F.pct(t, 0)} al precio final sin impuesto (${F.eur(R.precioFinalSinIVA, 2)}). El impuesto recae sobre el consumo, no sobre las empresas.`;
    } else {
      aviso = `<strong>La cadena está rota.</strong> Hacienda recauda ${F.eur(R.recaudacion, 2)}, pero el tipo del ${F.pct(t, 0)} sobre el precio final sin impuesto sólo daría ${F.eur(t * R.precioFinalSinIVA, 2)}: hay ${F.eur(Math.abs(desvio), 2)} de más porque ${F.eur(R.noDeducibleTotal, 2)} de IVA no deducible se han convertido en coste y se han vuelto a gravar.`;
    }
    SIM.html('iva-aviso', aviso);

    /* Tabla del impuesto en cascada (sólo si se activa la comparación) */
    if (verCascada) {
      const filasK = K.filas.map(f => `<tr>
          <td>${f.fase}</td><td>${F.n2(f.compras)}</td><td>${F.n2(f.va)}</td>
          <td>${F.n2(f.precio)}</td><td><strong>${F.n2(f.impuesto)}</strong></td><td>${F.n2(f.conImpuesto)}</td></tr>`).join('');
      const efectivoK = K.precioConsumidor > 0 ? K.recaudacion / K.precioConsumidor : 0;
      SIM.html('iva-cascada-box', `<div class="card">
        <h3>Impuesto en cascada: el mismo tipo, otro resultado</h3>
        <p class="inline-note">Cada fase paga el ${F.pct(t, 0)} sobre su precio de venta y no deduce nada. El impuesto de las fases anteriores forma parte del coste y vuelve a gravarse.</p>
        <table class="tabla"><thead><tr><th>Fase</th><th>Compras (impuesto incluido)</th><th>Valor añadido</th><th>Precio de venta</th><th>Impuesto pagado</th><th>Precio con impuesto</th></tr></thead>
          <tbody>${filasK}<tr class="total"><td>Total</td><td>—</td><td>${F.n2(sumaVA * k)}</td><td>—</td><td>${F.n2(K.recaudacion)}</td><td>${F.n2(K.precioConsumidor)}</td></tr></tbody></table>
        <div class="aviso">Con un tipo nominal del ${F.pct(t, 0)}, el tipo efectivo sobre el precio final es del <strong>${F.pct(efectivoK, 1)}</strong>: el impuesto en cascada penaliza a las cadenas con muchas fases e incentiva la integración vertical de las empresas. Ese fue el motivo de sustituir el antiguo Impuesto General sobre el Tráfico de Empresas por el IVA en 1986.</div>
      </div>`);
    } else {
      SIM.html('iva-cascada-box', '');
    }

    /* Gráfico 1: valor añadido e IVA ingresado por fase */
    SIM.chart('iva-chart-fases', {
      type: 'bar',
      data: {
        labels: R.filas.map(f => f.fase + (f.exenta ? ' (exenta)' : '')),
        datasets: [
          { label: 'Valor añadido', data: R.filas.map(f => f.va), backgroundColor: C.azul },
          { label: 'IVA ingresado en Hacienda', data: R.filas.map(f => f.ingresado), backgroundColor: C.naranja }
        ]
      },
      options: {
        scales: { x: { stacked: true, grid: { display: false }, title: { text: 'Fase de la cadena' } }, y: { stacked: true, title: { text: 'Euros' } } },
        plugins: { tooltip: { callbacks: { label: it => `${it.dataset.label}: ${F.eur(it.parsed.y, 2)}` } } }
      }
    });

    /* Gráfico 2: recaudación y precio final en los tres regímenes */
    SIM.chart('iva-chart-comp', {
      type: 'bar',
      data: {
        labels: ['IVA sin exención', 'Escenario actual', 'Impuesto en cascada'],
        datasets: [
          { label: 'Recaudación', data: [limpia.recaudacion, R.recaudacion, K.recaudacion], backgroundColor: C.naranja },
          { label: 'Precio final al consumidor', data: [limpia.precioConsumidor, R.precioConsumidor, K.precioConsumidor], backgroundColor: C.azul }
        ]
      },
      options: {
        scales: { x: { grid: { display: false }, title: { text: 'Régimen' } }, y: { title: { text: 'Euros' }, beginAtZero: true } },
        plugins: {
          tooltip: { callbacks: { label: it => `${it.dataset.label}: ${F.eur(it.parsed.y, 2)}` } },
          refs: { y: [{ value: limpia.precioConsumidor, label: 'precio con IVA limpio', color: C.gris }] }
        }
      }
    });

    /* Lectura */
    const nombreExenta = exenta ? FASES[exenta - 1].toLowerCase() : '';
    let txt = `<strong>Lectura.</strong> Las cuatro fases añaden ${F.eur(sumaVA * k, 2)} de valor. `;
    if (t === 0) {
      txt += `Al tipo cero no hay impuesto: el precio al consumidor es ${F.eur(R.precioConsumidor, 2)} y la recaudación, cero. `;
    } else if (!exenta) {
      txt += `Con el tipo del ${F.pct(t, 0)}, cada fase ingresa el impuesto correspondiente a <em>su</em> valor añadido `
        + `(${R.filas.map(f => F.eur(f.ingresado, 2)).join(' + ')} = ${F.eur(R.recaudacion, 2)}), y esa suma es exactamente el ${F.pct(t, 0)} del precio final sin impuesto. `
        + `Esa es la propiedad esencial del IVA: <strong>es un impuesto sobre el consumo recaudado por fases</strong>, neutral dentro de la cadena, porque el empresario repercute lo que cobra y deduce lo que soporta. `;
    } else {
      txt += `Con la exención en la fase de ${nombreExenta}, esa fase deja de repercutir IVA, pero también pierde el derecho a deducir los ${F.eur(R.filas[exenta - 1].soportado, 2)} que soportó. `
        + `Ese IVA se le queda dentro como coste, engorda su precio de venta y las fases siguientes vuelven a aplicar el impuesto sobre él. `
        + `Resultado: la recaudación sube a ${F.eur(R.recaudacion, 2)} (frente a ${F.eur(limpia.recaudacion, 2)} con la cadena completa) y el consumidor paga ${F.eur(R.precioConsumidor, 2)} en lugar de ${F.eur(limpia.precioConsumidor, 2)}. `
        + `<strong>La exención intermedia encarece el producto</strong>: exonerar a una fase del medio no abarata nada, rompe la cadena de deducciones. Sólo la exención de la última fase llega al consumidor. `;
    }
    if (verCascada) {
      txt += `<br><strong>IVA frente a impuesto en cascada.</strong> Con el mismo tipo nominal, el impuesto plurifásico acumulativo recauda ${F.eur(K.recaudacion, 2)} y deja el precio final en ${F.eur(K.precioConsumidor, 2)}: `
        + `${F.eur(K.precioConsumidor - R.precioConsumidor, 2)} más que con el IVA. La carga depende del número de fases, no del valor añadido, así que el impuesto premia a las empresas integradas verticalmente y castiga a las cadenas largas de pequeños proveedores. `;
    }
    if (rigido) {
      txt += `<br><strong>Precio rígido: ¿quién paga realmente?</strong> Si el mercado no admite subidas, el precio con IVA se queda en ${F.eur(sumaVA, 2)}, el mismo que sin impuesto. `
        + `La base imponible cae entonces a ${F.eur(R.precioFinalSinIVA, 2)} y el impuesto (${F.eur(R.recaudacion, 2)}) sale del bolsillo de la cadena, no del consumidor: el valor añadido se reduce en ${F.eur(absorbido, 2)}, un ${F.pct(sumaVA > 0 ? absorbido / sumaVA : 0, 1)} menos para repartir entre beneficios y salarios. `
        + `Es la aritmética del Tema 1 (100 = PSI × 1,20 → PSI = 83,33 y 16,67 de impuesto) y anticipa el Tema 7: <strong>quien ingresa el impuesto no es necesariamente quien lo soporta</strong>; el reparto lo deciden las elasticidades de oferta y demanda, no la ley. `;
    } else if (t > 0) {
      txt += `<br>Aquí se ha supuesto que el impuesto se traslada íntegramente al precio (el consumidor paga ${F.eur(R.precioConsumidor, 2)} por un producto que sin impuesto costaría ${F.eur(sumaVA, 2)}). Marca «el precio final no puede subir» para ver el caso contrario. `;
    }
    SIM.html('iva-interp', txt);
  }

  /* ---------- Registro ---------- */
  const base = { 'iva-va1': 100, 'iva-va2': 150, 'iva-va3': 50, 'iva-va4': 100, 'iva-tipo': '0.21', 'iva-exencion': '0', 'iva-cascada': false, 'iva-rigido': false };

  SIM.register({
    id: 'iva', nav: 'IVA en cadena', tema: 'Tema 6',
    title: 'El IVA a lo largo de la cadena de producción',
    subtitle: 'Cuatro fases (materias primas, fabricante, mayorista y minorista) con su valor añadido. Sirve para ver por qué el IVA es neutral entre empresas, qué ocurre cuando una exención rompe la cadena de deducciones, en qué se diferencia de un impuesto en cascada y quién soporta el impuesto cuando el precio no puede subir.',
    guia: {
      observa: [
        'Sin exenciones, el <strong>IVA ingresado por cada fase</strong> es el tipo aplicado a <em>su</em> valor añadido, y la suma coincide con el tipo aplicado al precio final. Cambia los valores añadidos y comprueba que la igualdad se mantiene.',
        'La empresa que está en medio de la cadena <strong>no soporta nada</strong>: repercute lo que cobra y deduce lo que paga. El IVA es un impuesto sobre el consumo, no sobre las empresas.',
        'Pon la exención en el mayorista: el precio final <strong>sube</strong> y la recaudación también. Exonerar una fase intermedia no abarata el producto, lo encarece (piramidación).',
        'Activa el impuesto en cascada: con el mismo tipo nominal, el tipo efectivo sobre el precio final es mucho mayor y depende del número de fases. Ese es el defecto que el IVA vino a corregir en 1986.',
        'Marca «el precio final no puede subir»: la base imponible pasa a ser P/(1+t) y el impuesto lo absorbe la cadena. Incidencia legal e incidencia económica no son lo mismo (Tema 7).'
      ],
      pregunta: 'Una asociación pide que se declare exenta de IVA la fase mayorista de un producto «para que baje el precio en la tienda». ¿Conseguiría su objetivo?',
      respuesta: 'No: lo empeoraría. El mayorista exento deja de repercutir IVA, pero pierde el derecho a deducir el que soportó del fabricante, así que ese IVA se convierte en coste y entra en la base sobre la que el minorista vuelve a aplicar el impuesto. Con los datos por defecto y un tipo del 21 %, el precio final pasa de 484 € a unos 547,5 € y la recaudación sube de 84 € a unos 147,5 €. Para abaratar el producto habría que bajar el tipo o exonerar la última fase, no una intermedia.'
    },
    presets: [
      { label: 'Cadena básica al 21 %', title: 'Caso de referencia: la neutralidad del IVA', values: Object.assign({}, base) },
      { label: 'Alimento al 4 %', title: 'Tipo superreducido: misma mecánica, menos carga', values: Object.assign({}, base, { 'iva-tipo': '0.04' }) },
      { label: 'Exención en el mayorista', title: 'La exención intermedia sube el precio final', values: Object.assign({}, base, { 'iva-exencion': '3' }) },
      { label: 'Impuesto en cascada', title: 'Plurifásico acumulativo: el defecto que corrigió el IVA', values: Object.assign({}, base, { 'iva-cascada': true }) },
      { label: 'Precio rígido: la empresa absorbe el IVA', title: 'Ejemplo del Tema 1: 100 = PSI × (1+t)', values: Object.assign({}, base, { 'iva-rigido': true }) }
    ],
    html, update
  });
})();
