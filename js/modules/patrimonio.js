/* Módulo Patrimonio y grandes fortunas (Tema 5 de HP II):
   Impuesto sobre el Patrimonio (Ley 19/1991) e Impuesto Temporal de Solidaridad de las
   Grandes Fortunas (Ley 38/2022). Muestra el mínimo exento, las exenciones de vivienda
   habitual y empresa familiar, el límite conjunto con el IRPF, la bonificación autonómica
   y cómo el ITSGF neutraliza esa bonificación. Todas las cifras se leen de TAX.P.patrimonio. */
(function () {
  'use strict';
  const F = SIM.fmt, C = SIM.color;
  const P = TAX.P.patrimonio;
  const GF = P.grandesFortunas;

  // Límite conjunto IRPF + IP del art. 31 de la Ley 19/1991. No está en params.js
  // (allí solo hay escalas, mínimo exento y bonificaciones), así que se fija aquí.
  const LIMITE_PCT = 0.60;      // cuota IP + cuota IRPF ≤ 60 % de la base imponible del IRPF
  const REDUCCION_MAX = 0.80;   // la cuota del IP no puede reducirse más del 80 %

  const CCAAS = ['and', 'mad', 'est'];
  const nombreCcaa = c => (P.ccaa[c] || P.ccaa.est).nombre;

  const BASE = {};
  function reg(id, v) { BASE[id] = v; return id; }

  /* ---------- Cálculo ---------- */
  // p = { neto, vivienda, empresa, ccaa, irpfBI, cuotaIRPF }
  function liquida(p) {
    const neto = Math.max(0, p.neto || 0);
    const exVivienda = Math.min(Math.max(0, p.vivienda || 0), P.viviendaExenta);
    const exEmpresa = Math.max(0, p.empresa || 0);
    const exenciones = Math.min(exVivienda + exEmpresa, neto);
    const baseImponible = Math.max(0, neto - exenciones);

    // --- Impuesto sobre el Patrimonio ---
    const baseLiquidable = Math.max(0, baseImponible - P.minimoExento);
    const escIP = TAX.aplicaEscala(baseLiquidable, P.escala);
    const cuotaIntegra = escIP.cuota;
    const irpfBI = Math.max(0, p.irpfBI || 0);
    const cuotaIRPF = Math.max(0, p.cuotaIRPF || 0);
    const limite = LIMITE_PCT * irpfBI;
    const exceso = cuotaIRPF + cuotaIntegra - limite;
    const reduccionLimite = Math.min(Math.max(0, exceso), REDUCCION_MAX * cuotaIntegra);
    const trasLimite = cuotaIntegra - reduccionLimite;
    const pctBonif = P.ccaa[p.ccaa] ? P.ccaa[p.ccaa].bonificacion : 0;
    const bonificacion = trasLimite * pctBonif;
    const cuotaIP = Math.max(0, trasLimite - bonificacion);

    // --- Impuesto Temporal de Solidaridad de las Grandes Fortunas ---
    const baseLiqGF = Math.max(0, baseImponible - GF.minimoExento);
    const escGF = TAX.aplicaEscala(baseLiqGF, GF.escala);
    const cuotaGF = escGF.cuota;
    const itsgf = Math.max(0, cuotaGF - cuotaIP);   // se deduce el IP efectivamente pagado

    const total = cuotaIP + itsgf;
    return {
      neto, exVivienda, exEmpresa, exenciones, baseImponible,
      baseLiquidable, escIP, cuotaIntegra, limite, reduccionLimite, trasLimite,
      pctBonif, bonificacion, cuotaIP,
      baseLiqGF, escGF, cuotaGF, itsgf, total,
      tipoEfectivo: neto > 0 ? total / neto : 0,
      cuotaIRPF, irpfBI
    };
  }

  /* ---------- HTML ---------- */
  const html = `
  <div class="grid-2">
    <div class="card">
      <h3>El patrimonio del contribuyente</h3>
      ${SIM.slider(reg('pat-bruto', 2500000), { label: 'Patrimonio bruto', help: 'bienes y derechos a 31 de diciembre', min: 0, max: 20000000, step: 100000, value: 2500000 })}
      <div class="row">
        ${SIM.number(reg('pat-bruto-num', 2500000), { label: 'Importe exacto (€)', value: 2500000, step: 10000 })}
        ${SIM.number(reg('pat-deudas', 200000), { label: 'Deudas y cargas (€)', value: 200000, step: 10000 })}
      </div>
      <div class="row">
        ${SIM.number(reg('pat-vivienda', 400000), { label: 'Valor de la vivienda habitual (€)', value: 400000, step: 10000 })}
        ${SIM.number(reg('pat-empresa', 0), { label: 'Participaciones en empresa familiar (€)', value: 0, step: 10000 })}
      </div>
      <p class="inline-note">La vivienda habitual está exenta hasta ${F.eur0(P.viviendaExenta)}; las participaciones en empresa familiar que cumplen los requisitos están exentas al 100 %. Ambas se descuentan del patrimonio neto para llegar a la base imponible.</p>

      <h3>Comunidad y renta del contribuyente</h3>
      <div class="row">
        ${SIM.select(reg('pat-ccaa', 'and'), { label: 'Comunidad de residencia', value: 'and', options: CCAAS.map(c => [c, P.ccaa[c].nombre]) })}
        ${SIM.number(reg('pat-irpf', 80000), { label: 'Base imponible del IRPF (€)', value: 80000, step: 1000 })}
      </div>
      <p class="inline-note">La base imponible del IRPF sirve para el <strong>límite conjunto</strong>: la suma de la cuota del IP y la del IRPF no puede superar el ${F.pct(LIMITE_PCT, 0)} de esa base, y si la supera se reduce la cuota del IP, pero como mucho en un ${F.pct(REDUCCION_MAX, 0)}.</p>

      <h3>Cómo se aproxima la cuota del IRPF</h3>
      <p class="inline-note">Para el límite conjunto el simulador aproxima la cuota íntegra del IRPF tratando toda la base imponible como rendimientos del trabajo, sin cotizaciones ni otros gastos ni retenciones: <code>TAX.liquidaIRPF({ trabajoBruto: BI, cotizaciones: 0, otrosGastos: 0, retencionesTrabajo: 0 }).cuotaIntegra</code>. La ley excluye además la parte de la cuota del IRPF que corresponde a elementos improductivos; aquí no se modela esa exclusión.</p>
      <div class="results-grid">
        ${SIM.result('pat-r-cuotairpf', 'Cuota íntegra del IRPF (aproximada)', '€')}
        ${SIM.result('pat-r-limite60', `Límite: ${F.pct(LIMITE_PCT, 0)} de la base del IRPF`, '€')}
      </div>
    </div>

    <div class="card">
      <h3>Resultado de la liquidación</h3>
      <div class="results-grid">
        ${SIM.result('pat-r-neto', 'Patrimonio neto', 'bruto − deudas')}
        ${SIM.result('pat-r-base', 'Base imponible', 'tras exenciones')}
        ${SIM.result('pat-r-bl', 'Base liquidable', 'tras el mínimo exento', 'green')}
        ${SIM.result('pat-r-integra', 'Cuota íntegra del IP', '€')}
      </div>
      <div class="results-grid">
        ${SIM.result('pat-r-limite', 'Reducción por límite conjunto', '€', 'orange')}
        ${SIM.result('pat-r-bonif', 'Bonificación autonómica', '€', 'green')}
        ${SIM.result('pat-r-ip', 'IP a ingresar', '€', 'red')}
        ${SIM.result('pat-r-gf', 'ITSGF a ingresar', '€', 'red')}
        ${SIM.result('pat-r-total', 'Total a ingresar', 'IP + ITSGF', 'red')}
        ${SIM.result('pat-r-tipo', 'Tipo efectivo', 'sobre el patrimonio neto', 'orange')}
      </div>

      <h3>Cascada del Impuesto sobre el Patrimonio</h3>
      <div class="liq-flow" id="pat-flow"></div>
      <h3>Y encima, el impuesto de solidaridad</h3>
      <div class="liq-flow" id="pat-flow-gf"></div>
      <div class="aviso" id="pat-aviso"></div>

      <h3>Tarifa del Impuesto sobre el Patrimonio</h3>
      <table class="tabla" id="pat-tabla-ip"></table>
      <h3>Tarifa del impuesto de solidaridad de las grandes fortunas</h3>
      <table class="tabla" id="pat-tabla-gf"></table>

      <h3>El mismo patrimonio en tres comunidades</h3>
      <table class="tabla" id="pat-tabla-ccaa"></table>
    </div>
  </div>

  <div class="grid-2">
    <div class="card">
      <h3>Cuota total (IP + ITSGF) según el patrimonio neto</h3>
      ${SIM.chartBox('pat-chart-total', 320)}
      <p class="inline-note">Se mantienen las exenciones y la base del IRPF del escenario: solo cambia el patrimonio neto. Las tres curvas casi se solapan a partir del umbral del ITSGF: esa es justamente la intención de la ley.</p>
    </div>
    <div class="card">
      <h3>Quién cobra: IP autonómico frente a ITSGF estatal</h3>
      ${SIM.chartBox('pat-chart-barras', 320)}
      <p class="inline-note">Misma persona y mismo patrimonio en las tres comunidades. La altura total es casi la misma; lo que cambia es a qué administración va el dinero.</p>
    </div>
  </div>
  <div class="card interpretation" id="pat-interp"></div>`;

  /* ---------- Lectura ---------- */
  function leer() {
    const bruto = Math.max(0, SIM.val('pat-bruto-num'));
    const deudas = Math.max(0, SIM.val('pat-deudas'));
    const irpfBI = Math.max(0, SIM.val('pat-irpf'));
    // Cuota íntegra del IRPF aproximada: toda la base imponible como rendimientos del trabajo
    const cuotaIRPF = TAX.liquidaIRPF({ trabajoBruto: irpfBI, cotizaciones: 0, otrosGastos: 0, retencionesTrabajo: 0 }).cuotaIntegra;
    return {
      bruto, deudas,
      neto: Math.max(0, bruto - deudas),
      vivienda: Math.max(0, SIM.val('pat-vivienda')),
      empresa: Math.max(0, SIM.val('pat-empresa')),
      ccaa: SIM.val('pat-ccaa') || 'and',
      irpfBI, cuotaIRPF
    };
  }

  function init(root) {
    const sl = root.querySelector('#pat-bruto'), num = root.querySelector('#pat-bruto-num');
    if (!sl || !num) return;
    sl.addEventListener('input', () => { num.value = sl.value; });
    num.addEventListener('input', () => { sl.value = Math.min(Math.max(num.value, sl.min), sl.max); });
  }

  /* ---------- Tabla de una escala ---------- */
  function tablaEscala(esc, base, etiqueta) {
    const trs = esc.desglose.map(t => `<tr class="${t.activo ? 'active-row' : ''}">`
      + `<td>${F.n0(t.desde)} – ${t.hasta === Infinity ? '∞' : F.n0(t.hasta)} €</td>`
      + `<td>${F.pct(t.tipo, 3)}</td><td>${F.n2(t.baseTramo)}</td><td>${F.n2(t.cuotaTramo)}</td><td>${F.n2(t.cuotaAcum)}</td></tr>`).join('');
    return `<thead><tr><th>Tramo de base liquidable</th><th>Tipo</th><th>Base en el tramo</th><th>Cuota del tramo</th><th>Acumulada</th></tr></thead>`
      + `<tbody>${trs}</tbody>`
      + `<tfoot><tr class="total"><td>${etiqueta}</td><td>${F.pct(esc.marginal, 3)} marginal</td><td>${F.n2(base)}</td><td></td><td>${F.n2(esc.cuota)}</td></tr></tfoot>`;
  }

  /* ---------- Actualización ---------- */
  function update(root) {
    const p = leer();
    const L = liquida(p);
    SIM.show('pat-bruto-val', F.eur0(p.bruto));

    SIM.show('pat-r-cuotairpf', F.n2(p.cuotaIRPF));
    SIM.show('pat-r-limite60', F.n2(L.limite));
    SIM.show('pat-r-neto', F.n2(L.neto));
    SIM.show('pat-r-base', F.n2(L.baseImponible));
    SIM.show('pat-r-bl', F.n2(L.baseLiquidable));
    SIM.show('pat-r-integra', F.n2(L.cuotaIntegra));
    SIM.show('pat-r-limite', F.n2(L.reduccionLimite));
    SIM.show('pat-r-bonif', F.n2(L.bonificacion));
    SIM.show('pat-r-ip', F.n2(L.cuotaIP));
    SIM.show('pat-r-gf', F.n2(L.itsgf));
    SIM.show('pat-r-total', F.n2(L.total));
    SIM.show('pat-r-tipo', F.pct(L.tipoEfectivo, 3));

    // Cascadas
    const pasosIP = [
      ['Patrimonio bruto', p.bruto, ''],
      ['− Deudas', -p.deudas, 'negative'],
      ['− Vivienda habitual exenta', -L.exVivienda, 'negative'],
      ['− Empresa familiar exenta', -L.exEmpresa, 'negative'],
      ['Base imponible', L.baseImponible, 'hito'],
      [`− Mínimo exento (${F.eur0(P.minimoExento)})`, -Math.min(P.minimoExento, L.baseImponible), 'negative'],
      ['Base liquidable', L.baseLiquidable, 'hito'],
      ['Cuota íntegra (tarifa)', L.cuotaIntegra, 'hito'],
      ['− Límite conjunto con el IRPF', -L.reduccionLimite, 'positive'],
      ['− Bonificación autonómica', -L.bonificacion, 'positive'],
      ['IP a ingresar', L.cuotaIP, L.cuotaIP > 0 ? 'negative' : 'positive']
    ];
    SIM.html('pat-flow', pasosIP.map(([l, v, c], i) =>
      `${i ? '<span class="liq-arrow">→</span>' : ''}<div class="liq-step ${c}"><div class="liq-label">${l}</div><div class="liq-value">${F.eur(v, 2)}</div></div>`).join(''));

    const pasosGF = [
      ['Base imponible', L.baseImponible, ''],
      [`− Mínimo exento (${F.eur0(GF.minimoExento)})`, -Math.min(GF.minimoExento, L.baseImponible), 'negative'],
      ['Base liquidable', L.baseLiqGF, 'hito'],
      ['Cuota del ITSGF (tarifa)', L.cuotaGF, 'hito'],
      ['− IP efectivamente pagado', -Math.min(L.cuotaIP, L.cuotaGF), 'positive'],
      ['ITSGF a ingresar', L.itsgf, L.itsgf > 0 ? 'negative' : 'positive'],
      ['Total IP + ITSGF', L.total, 'hito']
    ];
    SIM.html('pat-flow-gf', pasosGF.map(([l, v, c], i) =>
      `${i ? '<span class="liq-arrow">→</span>' : ''}<div class="liq-step ${c}"><div class="liq-label">${l}</div><div class="liq-value">${F.eur(v, 2)}</div></div>`).join(''));

    // Aviso
    let aviso = '';
    if (L.baseImponible <= P.minimoExento) {
      aviso += `<strong>Sin base liquidable.</strong> El mínimo exento de ${F.eur0(P.minimoExento)} y la exención de la vivienda habitual dejan a este contribuyente fuera del impuesto. Es la situación de la inmensa mayoría de los hogares. `;
    }
    if (L.reduccionLimite > 0.005) {
      aviso += `<strong>Límite conjunto.</strong> La cuota del IRPF (${F.eur(p.cuotaIRPF, 2)}) más la cuota íntegra del IP (${F.eur(L.cuotaIntegra, 2)}) suman ${F.eur(p.cuotaIRPF + L.cuotaIntegra, 2)}, por encima del ${F.pct(LIMITE_PCT, 0)} de la base del IRPF (${F.eur(L.limite, 2)}). La cuota del IP se reduce en ${F.eur(L.reduccionLimite, 2)}, sin pasar del tope del ${F.pct(REDUCCION_MAX, 0)}. `;
    } else if (L.cuotaIntegra > 0) {
      aviso += `<strong>Límite conjunto.</strong> No se activa: la suma de las dos cuotas no llega al ${F.pct(LIMITE_PCT, 0)} de la base del IRPF (${F.eur(L.limite, 2)}). `;
    }
    aviso += `<br><strong>Aviso docente.</strong> Las bonificaciones autonómicas están modeladas como un porcentaje único sobre la cuota (Andalucía y Madrid al ${F.pct(P.ccaa.and.bonificacion, 0)}), y el límite conjunto se calcula con una cuota del IRPF aproximada. La normativa real añade matices —elementos improductivos excluidos del límite, valoraciones específicas, requisitos de la exención de empresa familiar— que no se recogen aquí.`;
    SIM.html('pat-aviso', aviso);

    // Tablas de escalas
    SIM.html('pat-tabla-ip', tablaEscala(L.escIP, L.baseLiquidable, 'Cuota íntegra del IP'));
    SIM.html('pat-tabla-gf', tablaEscala(L.escGF, L.baseLiqGF, 'Cuota del ITSGF'));

    // Tabla comparativa
    const comp = CCAAS.map(c => ({ c, L: liquida(Object.assign({}, p, { ccaa: c })) }));
    SIM.html('pat-tabla-ccaa',
      `<thead><tr><th>Comunidad de residencia</th><th>Bonificación del IP</th><th>IP a ingresar</th><th>ITSGF a ingresar</th><th>Total</th><th>Tipo efectivo</th></tr></thead><tbody>`
      + comp.map(x => `<tr class="${x.c === p.ccaa ? 'active-row' : ''}"><td>${nombreCcaa(x.c)}</td><td>${F.pct(x.L.pctBonif, 0)}</td><td>${F.n2(x.L.cuotaIP)}</td><td>${F.n2(x.L.itsgf)}</td><td><strong>${F.n2(x.L.total)}</strong></td><td>${F.pct(x.L.tipoEfectivo, 3)}</td></tr>`).join('')
      + `</tbody>`);

    // Gráfico 1: cuota total según el patrimonio neto
    const xs = [];
    for (let x = 0; x <= 20000000; x += 200000) xs.push(x);
    const datasets = CCAAS.map((c, i) => ({
      label: nombreCcaa(c),
      data: SIM.xy(xs.map(x => x / 1000000), xs.map(x => liquida(Object.assign({}, p, { ccaa: c, neto: x })).total)),
      borderColor: [C.verde, C.naranja, C.azul][i],
      borderWidth: c === p.ccaa ? 3 : 1.8,
      borderDash: c === p.ccaa ? [] : [6, 4]
    }));
    SIM.chart('pat-chart-total', {
      type: 'line',
      data: { datasets },
      options: {
        scales: {
          x: { type: 'linear', min: 0, max: 20, title: { text: 'Patrimonio neto (millones de €)' } },
          y: { min: 0, title: { text: 'Cuota total IP + ITSGF (€)' } }
        },
        plugins: {
          refs: {
            x: [{ value: (P.minimoExento + L.exenciones) / 1000000, label: 'mínimo exento', color: C.gris }],
            points: [{ x: L.neto / 1000000, y: L.total, label: `${F.eur0(L.total)} en ${nombreCcaa(p.ccaa)}`, color: C.rojo, dy: -10 }]
          },
          tooltip: { callbacks: { title: it => `Patrimonio neto de ${F.n0(it[0].parsed.x * 1000000)} €`, label: it => `${it.dataset.label}: ${F.eur(it.parsed.y, 2)}` } }
        }
      }
    });

    // Gráfico 2: barras apiladas IP / ITSGF por comunidad
    SIM.chart('pat-chart-barras', {
      type: 'bar',
      data: {
        labels: comp.map(x => nombreCcaa(x.c)),
        datasets: [
          { label: 'IP (cedido a la comunidad)', data: comp.map(x => x.L.cuotaIP), backgroundColor: C.azul },
          { label: 'ITSGF (estatal)', data: comp.map(x => x.L.itsgf), backgroundColor: C.naranja }
        ]
      },
      options: {
        scales: {
          x: { stacked: true, grid: { display: false }, title: { text: `Comunidad de residencia · patrimonio neto de ${F.eur0(L.neto)}` } },
          y: { stacked: true, min: 0, title: { text: 'Cuota a ingresar (€)' } }
        },
        plugins: { tooltip: { callbacks: { label: it => `${it.dataset.label}: ${F.eur(it.parsed.y, 2)}` } } }
      }
    });

    // Lectura
    const and = comp.find(x => x.c === 'and').L, est = comp.find(x => x.c === 'est').L;
    const rend = 0.03;   // rendimiento hipotético del patrimonio, solo para el contraste renta/riqueza
    let t = `<strong>Lectura.</strong> Con ${F.eur0(p.bruto)} de patrimonio bruto y ${F.eur0(p.deudas)} de deudas, el patrimonio neto es ${F.eur(L.neto, 2)}. `
      + `Las exenciones (vivienda habitual ${F.eur(L.exVivienda, 2)}, empresa familiar ${F.eur(L.exEmpresa, 2)}) dejan una base imponible de ${F.eur(L.baseImponible, 2)} y, tras el mínimo exento de ${F.eur0(P.minimoExento)}, una base liquidable de <strong>${F.eur(L.baseLiquidable, 2)}</strong>. `;
    t += L.baseLiquidable <= 0
      ? `No hay cuota: este contribuyente no paga Patrimonio. `
      : `La tarifa da ${F.eur(L.cuotaIntegra, 2)} de cuota íntegra`
        + (L.reduccionLimite > 0.005 ? `, que el límite conjunto con el IRPF rebaja en ${F.eur(L.reduccionLimite, 2)}` : '')
        + (L.bonificacion > 0.005 ? ` y que ${nombreCcaa(p.ccaa)} bonifica en ${F.eur(L.bonificacion, 2)}` : '')
        + `: se ingresan <strong>${F.eur(L.cuotaIP, 2)}</strong> de IP. `;
    t += L.itsgf > 0.005
      ? `Como la base supera el umbral del impuesto de solidaridad, hay además ${F.eur(L.itsgf, 2)} de ITSGF, que van íntegros al Estado: en total ${F.eur(L.total, 2)}. `
      : `El ITSGF no da cuota aquí${L.cuotaGF > 0.005 ? `: la cuota teórica (${F.eur(L.cuotaGF, 2)}) queda absorbida por el IP ya pagado` : ` porque la base no llega a su primer tramo gravado`}. `;
    t += `<br><strong>Bonificar el IP no abarata la factura.</strong> Este mismo patrimonio paga ${F.eur(and.total, 2)} en Andalucía y ${F.eur(est.total, 2)} en una comunidad sin bonificación`
      + (Math.abs(and.total - est.total) < 0.5
        ? `: exactamente lo mismo. Lo único que cambia es el destinatario: donde el IP está bonificado, el ITSGF recauda para el Estado lo que la comunidad renunció a cobrar.`
        : `. La diferencia (${F.eur(Math.abs(and.total - est.total), 2)}) se debe a que las dos tarifas no son idénticas en todos los tramos, pero el mecanismo es el mismo: el ITSGF recupera para el Estado lo que la comunidad deja de cobrar.`);
    if (L.neto > 0) {
      const renta = rend * L.neto;
      t += `<br><strong>Tipo sobre la riqueza frente a tipo sobre la renta.</strong> El ${F.pct(L.tipoEfectivo, 3)} sobre el patrimonio parece poco, pero si ese patrimonio rindiera un ${F.pct(rend, 0)} anual (${F.eur0(renta)}), la cuota equivaldría al ${renta > 0 ? F.pct(L.total / renta, 1) : '—'} de la renta que genera. Un impuesto sobre el <em>stock</em> con un tipo superior al rendimiento del activo se come el principal.`;
    }
    SIM.html('pat-interp', t);
  }

  /* ---------- Registro ---------- */
  const esc = cambios => Object.assign({}, BASE, cambios);
  SIM.register({
    id: 'patrimonio', nav: 'Patrimonio y grandes fortunas', tema: 'Tema 5',
    title: 'Impuesto sobre el Patrimonio y de solidaridad de las grandes fortunas',
    subtitle: `Del patrimonio bruto a la cuota: deudas, exención de la vivienda habitual (${F.eur0(P.viviendaExenta)}) y de la empresa familiar, mínimo exento de ${F.eur0(P.minimoExento)}, tarifa estatal, límite conjunto con el IRPF y bonificación autonómica. Encima, el Impuesto Temporal de Solidaridad de las Grandes Fortunas, que deduce el IP pagado y recauda justo donde las comunidades bonifican. Bonificaciones autonómicas y límite conjunto están modelados de forma simplificada, para ver el mecanismo.`,
    guia: {
      observa: [
        `El <strong>mínimo exento</strong> de ${F.eur0(P.minimoExento)} y la exención de ${F.eur0(P.viviendaExenta)} de la vivienda habitual dejan fuera del impuesto a la gran mayoría de los hogares: baja el patrimonio bruto a un millón y mira la base liquidable.`,
        `El IP es un impuesto <strong>cedido</strong> a las comunidades, y varias lo bonifican al ${F.pct(P.ccaa.and.bonificacion, 0)}. Cambia de comunidad con el mismo patrimonio: la cuota del IP desaparece sin que cambie ni la base ni la tarifa.`,
        'El <strong>ITSGF se diseñó para neutralizar esa bonificación</strong>: como deduce el IP efectivamente pagado, solo recauda donde el IP está bonificado. Mira las barras apiladas: la altura total apenas cambia entre comunidades, pero el color —quién cobra— sí.',
        `El <strong>límite conjunto</strong> con el IRPF protege a quien tiene patrimonio pero poca renta: si la cuota del IP más la del IRPF superan el ${F.pct(LIMITE_PCT, 0)} de la base del IRPF, la del IP se reduce hasta un ${F.pct(REDUCCION_MAX, 0)}. Baja la base del IRPF a 20.000 € con un patrimonio alto y observa la reducción.`,
        'El tipo efectivo sobre el <em>patrimonio</em> es pequeño, pero sobre la <em>renta</em> que ese patrimonio genera puede ser enorme: un tipo marginal del 3,5 % sobre un activo que rinde un 3 % supera el 100 % de la renta que produce. Ese es el argumento central del debate sobre la imposición de la riqueza.'
      ],
      pregunta: 'Un titular dice que «el impuesto a las grandes fortunas solo recauda 29 millones». ¿Es un fracaso recaudatorio?',
      respuesta: 'Depende de qué se le pidiera al impuesto. El ITSGF no se diseñó para recaudar mucho, sino para armonizar: al deducir el IP efectivamente pagado, solo genera cuota donde la comunidad ha bonificado el IP. Si todas las comunidades dejaran de bonificar, el ITSGF recaudaría cero y el IP recaudaría todo, y la carga sobre el contribuyente sería la misma. Una recaudación baja del ITSGF puede significar, precisamente, que ha cumplido su función: que las comunidades han dejado de bonificar, o que el patrimonio afectado es reducido porque el mínimo exento y las exenciones de vivienda y empresa familiar dejan fuera a casi todo el mundo. Para juzgarlo hay que mirar la recaudación conjunta IP + ITSGF, no la del ITSGF aislado.'
    },
    presets: [
      { label: 'Vivienda y ahorro de 1,5 M€ en Andalucía', values: esc({ 'pat-bruto': 1500000, 'pat-bruto-num': 1500000, 'pat-deudas': 0, 'pat-vivienda': 400000, 'pat-empresa': 0, 'pat-ccaa': 'and', 'pat-irpf': 60000 }) },
      { label: 'Mismo patrimonio sin bonificación', values: esc({ 'pat-bruto': 1500000, 'pat-bruto-num': 1500000, 'pat-deudas': 0, 'pat-vivienda': 400000, 'pat-empresa': 0, 'pat-ccaa': 'est', 'pat-irpf': 60000 }) },
      { label: 'Patrimonio de 5 M€ en Madrid', values: esc({ 'pat-bruto': 5000000, 'pat-bruto-num': 5000000, 'pat-deudas': 0, 'pat-vivienda': 400000, 'pat-empresa': 0, 'pat-ccaa': 'mad', 'pat-irpf': 150000 }) },
      { label: 'Patrimonio de 5 M€ sin bonificación', values: esc({ 'pat-bruto': 5000000, 'pat-bruto-num': 5000000, 'pat-deudas': 0, 'pat-vivienda': 400000, 'pat-empresa': 0, 'pat-ccaa': 'est', 'pat-irpf': 150000 }) },
      { label: 'Empresa familiar exenta de 8 M€', values: esc({ 'pat-bruto': 10000000, 'pat-bruto-num': 10000000, 'pat-deudas': 500000, 'pat-vivienda': 400000, 'pat-empresa': 8000000, 'pat-ccaa': 'est', 'pat-irpf': 200000 }) }
    ],
    html, init, update
  });
})();
