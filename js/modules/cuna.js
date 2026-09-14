/* Módulo Cuña fiscal (Tema 11 de HP II: cotizaciones sociales e imposición del trabajo)
   Del coste laboral total al salario neto: cotizaciones de empresa, cotizaciones del
   trabajador e IRPF. Permite ver el peso de cada componente, el tipo marginal efectivo
   sobre el coste laboral y el efecto de la base máxima de cotización. */
(function () {
  'use strict';
  const F = SIM.fmt, C = SIM.color;

  const BM = TAX.BASE_MAX_COTIZACION_2025;   // 58.914 € anuales en 2025

  // Desglose del tipo de cotización empresarial (régimen general, 2025), en tanto por uno
  const EMPRESA = [
    ['Contingencias comunes', 0.2360],
    ['Desempleo (tipo general)', 0.0550],
    ['FOGASA', 0.0020],
    ['Formación profesional', 0.0060],
    ['MEI (mecanismo de equidad intergeneracional)', 0.0067]
  ];
  const TRABAJADOR = [
    ['Contingencias comunes', 0.0470],
    ['Desempleo', 0.0155],
    ['Formación profesional', 0.0010],
    ['MEI', 0.0013]
  ];

  /* ---------- Cálculo ---------- */
  // Tipo de cotización empresarial vigente según los controles
  function tipoEmpresa(detalle, atep) {
    if (!detalle) return TAX.TIPO_COTIZACION_EMPRESA;   // 32,10 % (incluye una AT/EP media)
    return EMPRESA.reduce((a, [, x]) => a + x, 0) + atep;
  }

  // Cuña fiscal para un salario bruto dado. Cuando el tipo empresarial es el estándar,
  // reproduce exactamente TAX.cunaFiscal.
  function cuna(bruto, opts, te) {
    if (Math.abs(te - TAX.TIPO_COTIZACION_EMPRESA) < 1e-12) return TAX.cunaFiscal(bruto, opts);
    const cotEmpresa = Math.min(bruto, BM) * te;
    const cotTrabajador = TAX.cotizacionTrabajador(bruto);
    const L = TAX.liquidaIRPF(Object.assign({ trabajoBruto: bruto, retencionesTrabajo: 0 }, opts));
    const irpf = L.cuotaLiquida;
    const coste = bruto + cotEmpresa;
    const neto = bruto - cotTrabajador - irpf;
    return { coste, cotEmpresa, bruto, cotTrabajador, irpf, neto, cuna: coste > 0 ? (coste - neto) / coste : 0, liquidacion: L };
  }

  // Salario bruto compatible con un coste laboral dado (invierte coste = bruto + min(bruto,BM)·te)
  function brutoDesdeCoste(coste, te) {
    const costeEnBaseMax = BM * (1 + te);
    return coste <= costeEnBaseMax ? coste / (1 + te) : coste - BM * te;
  }

  /* ---------- HTML ---------- */
  const html = `
  <div class="grid-2">
    <div class="card">
      <h3>El puesto de trabajo</h3>
      ${SIM.slider('cuna-bruto', { label: 'Salario bruto anual', help: 'lo que figura en el contrato', min: 10000, max: 120000, step: 100, value: 29540 })}
      <div class="row">
        ${SIM.number('cuna-bruto-num', { label: 'Importe exacto (€)', value: 29540, step: 1, min: 0, max: 200000 })}
        ${SIM.select('cuna-ccaa', { label: 'Comunidad autónoma (IRPF 2025)', value: 'and', options: [['and', 'Andalucía'], ['mad', 'Comunidad de Madrid'], ['est', 'Escala estatal ×2 (referencia)']] })}
        ${SIM.number('cuna-hijos', { label: 'Hijos a cargo', value: 0, min: 0, max: 3 })}
      </div>
      <p class="inline-note">El IRPF se calcula como cuota líquida anual (soltero, sin otras rentas), no como retención mensual.</p>

      <h3>Cotizaciones sociales (2025)</h3>
      <div class="checkbox-group">${SIM.check('cuna-detalle', 'Ver el desglose del tipo de cotización empresarial')}</div>
      ${SIM.number('cuna-atep', { label: 'Tipo por accidentes de trabajo y enfermedad profesional, AT/EP (%)', value: 1.5, step: 0.1, min: 0.5, max: 3 })}
      <div id="cuna-desglose"></div>
      <div class="aviso" id="cuna-aviso"></div>
    </div>

    <div class="card">
      <h3>Del coste laboral al salario neto</h3>
      <div class="liq-flow" id="cuna-flow"></div>
      <div class="results-grid">
        ${SIM.result('cuna-r-cuna', 'Cuña fiscal total', '% del coste laboral', 'red')}
        ${SIM.result('cuna-r-neto', 'Salario neto', '€ al año', 'green')}
        ${SIM.result('cuna-r-coste', 'Coste laboral total', '€ al año')}
        ${SIM.result('cuna-r-tme', 'Tipo marginal efectivo', 'de 1 € más de coste laboral', 'orange')}
      </div>
      <div class="results-grid">
        ${SIM.result('cuna-r-emp', 'Cotización de la empresa', 'puntos de la cuña')}
        ${SIM.result('cuna-r-trab', 'Cotización del trabajador', 'puntos de la cuña')}
        ${SIM.result('cuna-r-irpf', 'IRPF', 'puntos de la cuña')}
      </div>
      <table class="tabla" id="cuna-tabla"></table>

      <h3>La nómina de cada mes: 12 o 14 pagas</h3>
      <table class="tabla" id="cuna-tabla-meses"></table>
      <p class="inline-note" id="cuna-meses-nota"></p>
    </div>
  </div>

  <div class="grid-2">
    <div class="card">
      <h3>Reparto de cada euro de coste laboral</h3>
      ${SIM.chartBox('cuna-chart-barra', 200)}
      <p class="inline-note">Lo que la empresa desembolsa se reparte entre el trabajador (neto) y el sector público (cotizaciones e IRPF).</p>
    </div>
    <div class="card">
      <h3>La cuña fiscal según el salario</h3>
      ${SIM.chartBox('cuna-chart-curva', 340)}
      <p class="inline-note">Las tres bandas suman la cuña total. A partir de la base máxima de cotización las cotizaciones dejan de crecer y sólo aumenta el peso del IRPF.</p>
    </div>
  </div>
  <div class="card interpretation" id="cuna-interp"></div>`;

  function init(root) {
    const sl = root.querySelector('#cuna-bruto'), num = root.querySelector('#cuna-bruto-num');
    if (!sl || !num) return;
    sl.addEventListener('input', () => { num.value = sl.value; });
    num.addEventListener('input', () => { sl.value = Math.min(Math.max(num.value, sl.min), sl.max); });
  }

  /* ---------- Actualización ---------- */
  function update(root) {
    const bruto = Math.max(0, SIM.val('cuna-bruto-num'));
    const ccaa = SIM.val('cuna-ccaa');
    const hijos = Math.max(0, Math.min(3, SIM.val('cuna-hijos')));
    const detalle = !!SIM.val('cuna-detalle');
    const atep = Math.min(0.03, Math.max(0.005, (SIM.val('cuna-atep') || 1.5) / 100));
    const te = tipoEmpresa(detalle, atep);
    const opts = { ccaa: ccaa, hijos: hijos };

    SIM.show('cuna-bruto-val', F.eur0(bruto));
    const atepEl = document.getElementById('cuna-atep');
    if (atepEl) atepEl.disabled = !detalle;

    const R = cuna(bruto, opts, te);
    const tt = TRABAJADOR.reduce((a, [, x]) => a + x, 0);

    /* Desglose de tipos (sólo con el interruptor activado) */
    if (detalle) {
      const filasE = EMPRESA.map(([n, x]) => `<tr><td>${n}</td><td>${F.pct(x, 2)}</td></tr>`).join('')
        + `<tr><td>AT/EP (según la actividad)</td><td>${F.pct(atep, 2)}</td></tr>`;
      const filasT = TRABAJADOR.map(([n, x]) => `<tr><td>${n}</td><td>${F.pct(x, 2)}</td></tr>`).join('');
      SIM.html('cuna-desglose', `<table class="tabla"><thead><tr><th>Concepto</th><th>Tipo sobre la base de cotización</th></tr></thead><tbody>
        ${filasE}<tr class="total"><td>Total empresa</td><td>${F.pct(te, 2)}</td></tr>
        ${filasT}<tr class="total"><td>Total trabajador</td><td>${F.pct(tt, 2)}</td></tr></tbody></table>`);
    } else {
      SIM.html('cuna-desglose', '');
    }

    /* Tipo marginal efectivo sobre el coste laboral: 100 € más de coste laboral */
    const paso = 100;
    const bruto2 = brutoDesdeCoste(R.coste + paso, te);
    const R2 = cuna(bruto2, opts, te);
    const tme = 1 - (R2.neto - R.neto) / paso;

    /* Resultados */
    SIM.show('cuna-r-cuna', F.pct(R.cuna, 1));
    SIM.show('cuna-r-neto', F.n0(R.neto));
    SIM.show('cuna-r-coste', F.n0(R.coste));
    SIM.show('cuna-r-tme', F.pct(tme, 1));
    const pEmp = R.coste > 0 ? R.cotEmpresa / R.coste : 0;
    const pTrab = R.coste > 0 ? R.cotTrabajador / R.coste : 0;
    const pIrpf = R.coste > 0 ? R.irpf / R.coste : 0;
    SIM.show('cuna-r-emp', F.pct(pEmp, 1));
    SIM.show('cuna-r-trab', F.pct(pTrab, 1));
    SIM.show('cuna-r-irpf', F.pct(pIrpf, 1));

    /* Cascada */
    const pasos = [
      ['Coste laboral', R.coste, 'hito'],
      ['− Cotización empresa', -R.cotEmpresa, 'negative'],
      ['Salario bruto', R.bruto, 'hito'],
      ['− Cotización trabajador', -R.cotTrabajador, 'negative'],
      ['− IRPF', -R.irpf, 'negative'],
      ['Salario neto', R.neto, 'positive']
    ];
    SIM.html('cuna-flow', pasos.map(([l, v, c], i) =>
      `${i ? '<span class="liq-arrow">→</span>' : ''}<div class="liq-step ${c}"><div class="liq-label">${l}</div><div class="liq-value">${F.eur(v, 0)}</div></div>`).join(''));

    /* Tabla de componentes */
    const fila = (n, v, extra) => `<tr><td>${n}</td><td>${F.n0(v)}</td><td>${F.pct(R.coste > 0 ? v / R.coste : 0, 1)}</td><td>${extra}</td></tr>`;
    SIM.html('cuna-tabla', `<thead><tr><th>Concepto</th><th>Importe (€)</th><th>% del coste laboral</th><th>Sobre qué se calcula</th></tr></thead><tbody>
      ${fila('Coste laboral total', R.coste, 'salario bruto + cotización empresarial')}
      ${fila('Cotización de la empresa', R.cotEmpresa, `${F.pct(te, 2)} sobre ${F.eur0(Math.min(bruto, BM))}`)}
      ${fila('Salario bruto', R.bruto, 'el del contrato')}
      ${fila('Cotización del trabajador', R.cotTrabajador, `${F.pct(tt, 2)} sobre ${F.eur0(Math.min(bruto, BM))}`)}
      ${fila('IRPF (cuota líquida)', R.irpf, `tipo medio del ${F.pct(R.liquidacion.tipoMedio, 1)}; marginal del ${F.pct(R.liquidacion.marginalGeneral, 1)}`)}
      <tr class="total"><td>Salario neto</td><td>${F.n0(R.neto)}</td><td>${F.pct(R.coste > 0 ? R.neto / R.coste : 0, 1)}</td><td>lo que llega a la cuenta corriente</td></tr>
      <tr class="total"><td>Cuña fiscal</td><td>${F.n0(R.coste - R.neto)}</td><td>${F.pct(R.cuna, 1)}</td><td>coste laboral − salario neto</td></tr></tbody>`);

    /* La nómina de cada mes, con 12 y con 14 pagas.
       Reglas reales de la nómina española:
       - La base de cotización mensual incluye la prorrata de las pagas extra (= bruto anual / 12,
         con el tope de la base máxima mensual), así que las cotizaciones —de empresa y de
         trabajador— se ingresan en 12 mensualidades iguales y las extras no cotizan aparte.
       - La retención del IRPF se aplica con el mismo tipo a todas las pagas, extras incluidas:
         el mes con paga extra retiene el doble. Aquí el tipo de retención se toma igual al
         tipo medio de la cuota líquida (IRPF anual / bruto anual), de modo que las retenciones
         del año suman exactamente el IRPF anual. */
    const tRet = R.bruto > 0 ? R.irpf / R.bruto : 0;
    const n12 = {   // 12 pagas: todos los meses iguales
      bruto: R.bruto / 12, cotT: R.cotTrabajador / 12, cotE: R.cotEmpresa / 12
    };
    const n14 = {   // 14 pagas, mes sin extra (10 al año)
      bruto: R.bruto / 14, cotT: R.cotTrabajador / 12, cotE: R.cotEmpresa / 12
    };
    const n14x = {  // 14 pagas, mes con extra (junio y diciembre): dos pagas, una sola cotización
      bruto: 2 * R.bruto / 14, cotT: R.cotTrabajador / 12, cotE: R.cotEmpresa / 12
    };
    [n12, n14, n14x].forEach(m => {
      m.irpf = tRet * m.bruto;
      m.neto = m.bruto - m.cotT - m.irpf;
      m.coste = m.bruto + m.cotE;
    });
    const filaM = (n, k, cls) => `<tr${cls ? ` class="${cls}"` : ''}><td>${n}</td><td>${F.n0(n12[k])}</td><td>${F.n0(n14[k])}</td><td>${F.n0(n14x[k])}</td></tr>`;
    SIM.html('cuna-tabla-meses', `<thead><tr><th>Concepto (€ del mes)</th><th>12 pagas<br>cada mes</th><th>14 pagas<br>mes normal (×10)</th><th>14 pagas<br>mes con extra (×2)</th></tr></thead><tbody>
      ${filaM('Coste para la empresa', 'coste')}
      ${filaM('Cotización de la empresa', 'cotE')}
      ${filaM('Salario bruto de la nómina', 'bruto')}
      ${filaM('Cotización del trabajador', 'cotT')}
      ${filaM(`Retención IRPF (${F.pct(tRet, 1)})`, 'irpf')}
      ${filaM('Salario neto (lo que se ingresa)', 'neto', 'total')}</tbody>`);
    SIM.html('cuna-meses-nota',
      `Las cotizaciones se calculan sobre la <strong>base de cotización mensual</strong> (${F.eur0(Math.min(R.bruto, BM) / 12)}), que ya incluye la prorrata de las pagas extra: por eso son iguales todos los meses y las extras de junio y diciembre no cotizan aparte. `
      + `La retención se aplica al ${F.pct(tRet, 1)} sobre todas las pagas, extras incluidas, así que el mes con extra retiene el doble. `
      + `Comprobación: 10 meses normales + 2 con extra = 12 meses de 12 pagas = ${F.eur0(R.neto)} netos al año. `
      + `Con 14 pagas el neto mensual normal es ${F.eur0(n12.neto - n14.neto)} menor que con 12, y en junio y diciembre se cobran ${F.eur0(n14x.neto)}.`);

    /* Aviso sobre la base máxima */
    let aviso = `<strong>Base máxima de cotización 2025:</strong> ${F.eur0(BM)} al año (4.909,50 € al mes). `;
    if (bruto > BM) {
      aviso += `Este salario la supera en ${F.eur0(bruto - BM)}: sobre ese exceso no se cotiza, así que las cotizaciones ya no crecen y la cuña marginal baja. Las cotizaciones sociales son <strong>regresivas por arriba</strong>; sólo el IRPF sigue subiendo.`;
    } else {
      aviso += `Este salario está por debajo, de modo que cada euro adicional cotiza al ${F.pct(te + tt, 2)} entre empresa y trabajador. Sube el salario por encima de ${F.eur0(BM)} y observa qué le pasa a la cuña.`;
    }
    SIM.html('cuna-aviso', aviso);

    /* Gráfico 1: barra apilada horizontal única */
    SIM.chart('cuna-chart-barra', {
      type: 'bar',
      data: {
        labels: ['Coste laboral'],
        datasets: [
          { label: 'Salario neto', data: [R.neto], backgroundColor: C.verde },
          { label: 'IRPF', data: [R.irpf], backgroundColor: C.rojo },
          { label: 'Cotización del trabajador', data: [R.cotTrabajador], backgroundColor: C.naranja },
          { label: 'Cotización de la empresa', data: [R.cotEmpresa], backgroundColor: C.azul }
        ]
      },
      options: {
        indexAxis: 'y',
        scales: { x: { stacked: true, title: { text: 'Euros al año' } }, y: { stacked: true, grid: { display: false }, title: { display: false } } },
        plugins: { tooltip: { callbacks: { label: it => `${it.dataset.label}: ${F.eur0(it.parsed.x)} (${F.pct(R.coste > 0 ? it.parsed.x / R.coste : 0, 1)} del coste)` } } }
      }
    });

    /* Gráfico 2: componentes de la cuña en función del salario bruto */
    const xs = [], sEmp = [], sTrab = [], sIrpf = [];
    for (let b = 10000; b <= 120000; b += 1000) {
      const Rb = cuna(b, opts, te);
      xs.push(b / 1000);
      sEmp.push(Rb.cotEmpresa / Rb.coste * 100);
      sTrab.push(Rb.cotTrabajador / Rb.coste * 100);
      sIrpf.push(Rb.irpf / Rb.coste * 100);
    }
    SIM.chart('cuna-chart-curva', {
      type: 'line',
      data: {
        datasets: [
          { label: 'Cotización de la empresa', data: SIM.xy(xs, sEmp), borderColor: C.azul, backgroundColor: SIM.alpha(C.azul, .35), fill: 'origin', borderWidth: 1.8 },
          { label: 'Cotización del trabajador', data: SIM.xy(xs, sTrab), borderColor: C.naranja, backgroundColor: SIM.alpha(C.naranja, .35), fill: '-1', borderWidth: 1.8 },
          { label: 'IRPF', data: SIM.xy(xs, sIrpf), borderColor: C.rojo, backgroundColor: SIM.alpha(C.rojo, .35), fill: '-1', borderWidth: 1.8 }
        ]
      },
      options: {
        scales: {
          x: { type: 'linear', min: 10, max: 120, title: { text: 'Salario bruto (miles de € al año)' } },
          y: { stacked: true, min: 0, max: 60, title: { text: 'Cuña fiscal (% del coste laboral)' } }
        },
        plugins: {
          refs: {
            x: [
              { value: bruto / 1000, label: 'salario actual', color: C.tinta },
              { value: BM / 1000, label: 'base máxima 58.914 €', color: C.gris, dash: [2, 3] }
            ],
            points: [{ x: bruto / 1000, y: R.cuna * 100, label: `cuña ${F.pct(R.cuna, 1)}`, color: C.tinta, align: bruto > 80000 ? 'right' : 'left' }]
          },
          tooltip: { callbacks: { title: it => `Salario bruto ${F.eur0(it[0].parsed.x * 1000)}`, label: it => `${it.dataset.label}: ${F.n1(it.parsed.y)} puntos` } }
        }
      }
    });

    /* Lectura */
    const cotTotal = R.cotEmpresa + R.cotTrabajador;
    const partCot = (R.coste - R.neto) > 0 ? cotTotal / (R.coste - R.neto) : 0;
    let txt = `<strong>Lectura.</strong> Para pagar un salario bruto de ${F.eur0(bruto)} la empresa desembolsa ${F.eur0(R.coste)}: `
      + `${F.eur0(R.cotEmpresa)} son cotizaciones a la Seguridad Social (${F.pct(te, 2)} de la base). `
      + `Del bruto se descuentan después ${F.eur0(R.cotTrabajador)} de cotizaciones del trabajador (${F.pct(tt, 2)}) y ${F.eur0(R.irpf)} de IRPF, `
      + `de modo que llegan a la cuenta ${F.eur0(R.neto)}. La <strong>cuña fiscal</strong> —la diferencia entre lo que cuesta el trabajo y lo que recibe quien trabaja— es de ${F.eur0(R.coste - R.neto)}, `
      + `un <strong>${F.pct(R.cuna, 1)}</strong> del coste laboral. `
      + `De esa cuña, ${F.pct(partCot, 0)} son cotizaciones sociales y el resto IRPF. `;
    txt += `<br><strong>De cada euro adicional.</strong> Si la empresa aumenta el coste laboral en 100 €, el trabajador se lleva ${F.eur(R2.neto - R.neto, 2)} netos: el tipo marginal efectivo sobre el coste laboral es del ${F.pct(tme, 1)}, `
      + `bastante por encima del tipo medio, y muy por encima del marginal del IRPF (${F.pct(R.liquidacion.marginalGeneral, 1)}) que suele citarse en el debate público. `;
    if (bruto > BM) {
      txt += `Como el salario supera la base máxima (${F.eur0(BM)}), el euro adicional no cotiza: sólo tributa en el IRPF. Por eso la cuña marginal cae justo después de ese umbral, aunque el tipo del IRPF siga subiendo. `;
    } else if (bruto > BM * 0.85) {
      txt += `El salario está cerca de la base máxima (${F.eur0(BM)}); a partir de ahí las cotizaciones se congelan y la cuña marginal cae de golpe. `;
    }
    txt += `<br><strong>¿Quién paga las cotizaciones?</strong> Formalmente, ${F.pct(R.cotEmpresa / (cotTotal || 1), 0)} de las cotizaciones las ingresa la empresa. `
      + `Pero la incidencia legal no es la incidencia económica (Tema 7): si la oferta de trabajo es poco elástica —y la evidencia sugiere que lo es—, la mayor parte de la cotización empresarial se traslada a salarios brutos más bajos. `
      + `Es decir, el reparto «empresa/trabajador» que aparece en la nómina es contable, no económico: lo que importa es el total, ${F.pct(R.cuna, 1)} del coste laboral. `;
    txt += `<br><strong>Comparación internacional.</strong> La OCDE (<em>Taxing Wages</em>) sitúa la cuña española en torno al 40 % para un soltero sin hijos con el salario medio, algo por encima de la media de la OCDE, que está en torno al 35 %. `
      + `Los países con cuñas mayores (Bélgica, Alemania, Francia, Italia, Austria) financian con cotizaciones una parte grande de su gasto social; los de cuña menor (Chile, México, Nueva Zelanda, Suiza) recurren más a la imposición general. `
      + `El escenario actual da ${F.pct(R.cuna, 1)}: ${R.cuna > 0.40 ? 'por encima' : 'por debajo'} de esa referencia. `;
    if (hijos > 0) {
      const sinHijos = cuna(bruto, { ccaa: ccaa, hijos: 0 }, te);
      const difPuntos = (sinHijos.cuna - R.cuna) * 100;
      const nHijos = hijos === 1 ? 'un hijo' : hijos + ' hijos';
      txt += difPuntos < 0.05
        ? `<br><strong>Los hijos y la cuña.</strong> Con ${nHijos} la cuña no se mueve: a este salario el IRPF ya era cero, así que el mínimo familiar no tiene cuota que reducir. Las cotizaciones, que son el grueso de la cuña, no atienden a las circunstancias personales.`
        : `<br><strong>Los hijos y la cuña.</strong> Con ${nHijos} el mínimo familiar rebaja el IRPF en ${F.eur0(sinHijos.irpf - R.irpf)} y la cuña baja ${F.n1(difPuntos)} puntos respecto al mismo salario sin hijos: sólo se mueve el IRPF, porque las cotizaciones no dependen de la situación familiar.`;
    }
    SIM.html('cuna-interp', txt);
  }

  /* ---------- Registro ---------- */
  const base = { 'cuna-bruto': 29540, 'cuna-bruto-num': 29540, 'cuna-ccaa': 'and', 'cuna-hijos': 0, 'cuna-detalle': false, 'cuna-atep': 1.5 };

  SIM.register({
    id: 'cuna', nav: 'Cuña fiscal', tema: 'Tema 11',
    title: 'La cuña fiscal: del coste laboral al salario neto',
    subtitle: 'Cuánto cuesta un puesto de trabajo, cuánto llega al trabajador y qué se queda por el camino entre cotizaciones sociales e IRPF. Cotizaciones y bases de 2025; el IRPF se liquida con la escala estatal y la autonómica correspondiente.',
    guia: {
      observa: [
        'El <strong>salario bruto no es el coste del trabajo</strong>: la empresa paga además un 32 % largo de cotizaciones. La cuña compara el coste laboral con el neto, no el bruto con el neto.',
        'En salarios medios, más de la mitad de la cuña son <strong>cotizaciones sociales</strong>, no IRPF. El debate público suele fijarse sólo en la parte pequeña.',
        'Sube el salario por encima de la <strong>base máxima de cotización</strong> (58.914 € en 2025): las cotizaciones se congelan, la cuña marginal cae y el crecimiento posterior de la cuña se debe sólo al IRPF.',
        'El <strong>tipo marginal efectivo sobre el coste laboral</strong> (lo que se queda el sector público de 100 € más de coste) es muy superior al tipo marginal del IRPF que aparece en la escala.',
        'Añade hijos: el mínimo familiar reduce el IRPF, pero no toca las cotizaciones. La cuña baja poco, porque su componente mayor no depende de las circunstancias personales.'
      ],
      pregunta: 'En una negociación colectiva se propone subir las cotizaciones empresariales «porque así el coste no recae sobre el trabajador, lo paga la empresa». ¿Es correcto?',
      respuesta: 'No, o sólo a corto plazo. La ley reparte la cotización entre empresa y trabajador, pero la incidencia económica la determinan las elasticidades (Tema 7): lo que la empresa mira es el coste laboral total, y si la oferta de trabajo es más rígida que la demanda, una subida de la cotización empresarial acaba trasladándose a salarios brutos más bajos o a menos empleo. En el simulador puede comprobarse la aritmética: manteniendo constante el coste laboral, subir el tipo empresarial obliga a bajar el bruto. La distinción entre incidencia legal e incidencia económica es justamente el punto del tema.'
    },
    presets: [
      { label: 'SMI (16.576 €)', title: 'Salario mínimo interprofesional 2025 en 14 pagas', values: Object.assign({}, base, { 'cuna-bruto': 16576, 'cuna-bruto-num': 16576 }) },
      { label: 'Salario medio (29.540 €)', title: 'Salario medio bruto anual, EAES 2024', values: Object.assign({}, base) },
      { label: 'Salario modal ≈ SMI con 2 hijos', title: 'El salario más frecuente está muy cerca del SMI', values: Object.assign({}, base, { 'cuna-bruto': 16576, 'cuna-bruto-num': 16576, 'cuna-hijos': 2 }) },
      { label: 'Directivo (90.000 €)', title: 'Muy por encima de la base máxima de cotización', values: Object.assign({}, base, { 'cuna-bruto': 90000, 'cuna-bruto-num': 90000, 'cuna-detalle': true }) },
      { label: 'Justo en la base máxima (58.914 €)', title: 'El punto en que las cotizaciones dejan de crecer', values: Object.assign({}, base, { 'cuna-bruto': 58914, 'cuna-bruto-num': 58914 }) }
    ],
    html, init, update
  });
})();
