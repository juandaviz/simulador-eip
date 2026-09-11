/* Módulo Sucesiones (Tema 5 de HP II): liquidación del Impuesto sobre Sucesiones para UN heredero.
   Recorre el esquema del art. 20-22 de la Ley 29/1987 —porción hereditaria, reducciones,
   base liquidable, tarifa, coeficiente multiplicador y bonificación autonómica— y compara
   la misma herencia en tres comunidades. Todas las cifras se leen de TAX.P.sucesiones. */
(function () {
  'use strict';
  const F = SIM.fmt, C = SIM.color;
  const S = TAX.P.sucesiones;

  // Edad límite del grupo I: es un dato estructural del art. 20.2.a (la reducción crece
  // por cada año que falte «hasta los veintiuno»); las cuantías vienen de TAX.P.
  const EDAD_LIMITE = 21;

  const GRUPOS = ['I', 'II', 'III', 'IV'];
  const CCAAS = ['and', 'mad', 'est'];
  const nombreCcaa = c => (S.ccaa[c] || S.ccaa.est).nombre;

  /* ---------- Estado por defecto (para los escenarios) ---------- */
  const BASE = {};
  function reg(id, v) { BASE[id] = v; return id; }

  /* ---------- Fila del patrón .ded-row, pero calculada automáticamente ---------- */
  function filaRed(id, nombre, regla) {
    return `<div class="ded-row" id="${id}-row">
      <span class="marca" aria-hidden="true">·</span>
      <label><span class="nombre">${nombre}</span><span class="help">${regla}</span></label>
      <span class="ctrl"></span>
      <span class="res" id="${id}-res"></span>
    </div>`;
  }

  /* ---------- Cálculo ---------- */
  // Coeficiente multiplicador del art. 22, por grupo y tramo de patrimonio preexistente
  function coeficiente(grupo, patrimonio) {
    const K = S.coeficientes;
    const lista = (grupo === 'I' || grupo === 'II') ? K.I_II : (grupo === 'III' ? K.III : K.IV);
    let i = 0;
    while (i < K.tramos.length && patrimonio > K.tramos[i]) i++;
    return { coef: lista[i], indice: i, lista: lista, tramos: K.tramos };
  }

  // p = { porcion, vivienda (parte que corresponde al heredero), seguro, grupo, edad, disc, patrimonio, ccaa }
  function liquida(p) {
    const porcion = Math.max(0, p.porcion || 0);
    const seguro = Math.max(0, p.seguro || 0);
    const baseImponible = porcion + seguro;

    const G = S.grupos[p.grupo] || S.grupos.IV;
    const directo = (p.grupo === 'I' || p.grupo === 'II');   // descendientes, cónyuge y ascendientes

    // Cuantías teóricas de cada reducción
    const bruta = {};
    bruta.parentesco = p.grupo === 'I'
      ? Math.min(G.base + G.porAnio * Math.max(0, EDAD_LIMITE - Math.max(0, p.edad || 0)), G.max)
      : (G.base || 0);
    bruta.disc = p.disc === '65' ? S.discapacidad.g65 : (p.disc === '33' ? S.discapacidad.g33 : 0);
    const vivHeredero = Math.max(0, Math.min(p.vivienda || 0, porcion));
    bruta.viv = directo ? Math.min(S.viviendaHabitual.pct * vivHeredero, S.viviendaHabitual.limite) : 0;
    bruta.seg = directo ? Math.min(seguro, S.seguroVida) : 0;

    // Se aplican hasta agotar la base (una reducción no puede dejar base negativa)
    const ap = {};
    let resto = baseImponible;
    ['parentesco', 'disc', 'viv', 'seg'].forEach(k => { ap[k] = Math.min(bruta[k], resto); resto -= ap[k]; });
    const estatales = ap.parentesco + ap.disc + ap.viv + ap.seg;

    // Reducción propia autonómica, sobre lo que queda de base tras las estatales
    const cc = S.ccaa[p.ccaa] || S.ccaa.est;
    const propiaTope = (cc.reduccionPropia && cc.reduccionPropia[p.grupo]) || 0;
    const propia = Math.min(propiaTope, resto);
    ap.propia = propia; bruta.propia = propiaTope;

    const baseLiquidable = Math.max(0, baseImponible - estatales - propia);
    const esc = TAX.aplicaEscala(baseLiquidable, S.escala);
    const co = coeficiente(p.grupo, Math.max(0, p.patrimonio || 0));
    const cuotaTributaria = esc.cuota * co.coef;
    const pctBonif = (cc.bonificacion && cc.bonificacion[p.grupo]) || 0;
    const bonificacion = cuotaTributaria * pctBonif;
    const aIngresar = Math.max(0, cuotaTributaria - bonificacion);

    return {
      porcion, seguro, baseImponible, vivHeredero,
      bruta, aplicadas: ap, estatales, propia, propiaTope,
      baseLiquidable, escala: esc, cuotaIntegra: esc.cuota,
      coef: co.coef, coefInfo: co, cuotaTributaria, pctBonif, bonificacion, aIngresar,
      tipoEfectivo: porcion > 0 ? aIngresar / porcion : 0,
      tipoSobreBase: baseImponible > 0 ? aIngresar / baseImponible : 0
    };
  }

  /* ---------- HTML ---------- */
  const html = `
  <div class="grid-2">
    <div class="card">
      <h3>La herencia</h3>
      <div class="row">
        ${SIM.number(reg('suc-caudal', 600000), { label: 'Caudal hereditario neto total (€)', value: 600000, step: 1000 })}
        ${SIM.number(reg('suc-herederos', 2), { label: 'Herederos con la misma porción', value: 2, step: 1, min: 1, max: 12 })}
      </div>
      <div class="row">
        ${SIM.number(reg('suc-vivienda', 200000), { label: 'De ese caudal, vivienda habitual del causante (€)', value: 200000, step: 1000 })}
        ${SIM.number(reg('suc-seguro', 0), { label: 'Seguro de vida a favor del heredero (€)', value: 0, step: 1000 })}
      </div>
      <p class="inline-note">El caudal y la vivienda se reparten a partes iguales: cada heredero recibe su porción y la parte proporcional de la vivienda. El seguro de vida se suma solo a la base del heredero beneficiario.</p>

      <h3>El heredero</h3>
      <div class="row">
        ${SIM.select(reg('suc-grupo', 'II'), { label: 'Grupo de parentesco', value: 'II', options: GRUPOS.map(g => [g, S.grupos[g].nombre]) })}
        ${SIM.select(reg('suc-disc', 'no'), { label: 'Discapacidad del heredero', value: 'no', options: [['no', 'No'], ['33', '≥ 33 %'], ['65', '≥ 65 %']] })}
      </div>
      <div class="row">
        <div id="suc-edad-wrap">${SIM.number(reg('suc-edad', 18), { label: 'Edad del heredero (solo grupo I)', value: 18, step: 1, min: 0, max: 20 })}</div>
        ${SIM.number(reg('suc-patrim', 100000), { label: 'Patrimonio preexistente del heredero (€)', value: 100000, step: 10000 })}
        ${SIM.select(reg('suc-ccaa', 'and'), { label: 'Comunidad de residencia del causante', value: 'and', options: CCAAS.map(c => [c, S.ccaa[c].nombre]) })}
      </div>
      <p class="inline-note">El patrimonio previo del heredero no entra en la base: determina el <strong>coeficiente multiplicador</strong> que se aplica a la cuota íntegra.</p>

      <h3>Reducciones de la base imponible</h3>
      <p class="inline-note">No hay nada que marcar: las reducciones se calculan solas a partir del parentesco, la edad, la discapacidad y la composición de la herencia. A la derecha, la cuantía efectivamente aplicada.</p>
      ${filaRed('suc-red-parentesco', 'Reducción por parentesco', `grupo I: ${F.eur0(S.grupos.I.base)} más ${F.eur0(S.grupos.I.porAnio)} por cada año que falte hasta los ${EDAD_LIMITE}, con el máximo de ${F.eur0(S.grupos.I.max)}; grupo II ${F.eur0(S.grupos.II.base)}; grupo III ${F.eur0(S.grupos.III.base)}; grupo IV, ninguna`)}
      ${filaRed('suc-red-disc', 'Reducción por discapacidad del heredero', `${F.eur0(S.discapacidad.g33)} con grado ≥ 33 % y ${F.eur0(S.discapacidad.g65)} con grado ≥ 65 %, compatible con la de parentesco`)}
      ${filaRed('suc-red-viv', 'Reducción por vivienda habitual del causante', `${F.pct(S.viviendaHabitual.pct, 0)} de la parte de vivienda que corresponde al heredero, con el límite de ${F.eur0(S.viviendaHabitual.limite)} por heredero; solo cónyuge, ascendientes y descendientes (grupos I y II)`)}
      ${filaRed('suc-red-seg', 'Reducción por seguro de vida', `hasta ${F.eur0(S.seguroVida)}, solo para cónyuge, ascendientes y descendientes`)}
      ${filaRed('suc-red-propia', 'Reducción propia autonómica', `Andalucía: hasta ${F.eur0(S.ccaa.and.reduccionPropia.II)} para los grupos I y II, sobre lo que quede de base tras las estatales`)}
    </div>

    <div class="card">
      <h3>Resultado de la liquidación</h3>
      <div class="results-grid">
        ${SIM.result('suc-r-porcion', 'Porción hereditaria', '€')}
        ${SIM.result('suc-r-base', 'Base imponible', 'porción + seguro')}
        ${SIM.result('suc-r-bl', 'Base liquidable', '€', 'green')}
        ${SIM.result('suc-r-integra', 'Cuota íntegra', '€')}
      </div>
      <div class="results-grid">
        ${SIM.result('suc-r-coef', 'Coeficiente multiplicador', 'por grupo y patrimonio previo')}
        ${SIM.result('suc-r-trib', 'Cuota tributaria', '€')}
        ${SIM.result('suc-r-bonif', 'Bonificación autonómica', '€', 'green')}
        ${SIM.result('suc-r-ingresar', 'Cuota a ingresar', '€', 'red')}
        ${SIM.result('suc-r-tipo', 'Tipo efectivo', 'sobre la porción hereditaria', 'orange')}
      </div>
      <div class="liq-flow" id="suc-flow"></div>
      <div class="aviso" id="suc-aviso"></div>

      <h3>Tarifa estatal aplicada a la base liquidable</h3>
      <table class="tabla" id="suc-tabla"></table>

      <h3>La misma herencia en tres comunidades</h3>
      <table class="tabla" id="suc-tabla-ccaa"></table>
      <p class="inline-note">Mismo heredero, mismo parentesco y mismo patrimonio previo: solo cambia dónde residía el causante.</p>
    </div>
  </div>

  <div class="grid-2">
    <div class="card">
      <h3>Tipo efectivo según la porción heredada</h3>
      ${SIM.chartBox('suc-chart-porcion', 320)}
      <p class="inline-note">Se mantiene el grupo de parentesco, el patrimonio previo y la proporción de vivienda habitual del escenario; solo cambia lo que recibe el heredero.</p>
    </div>
    <div class="card">
      <h3>Tipo efectivo por grupo de parentesco</h3>
      ${SIM.chartBox('suc-chart-grupo', 320)}
      <p class="inline-note">Misma porción hereditaria y misma comunidad: lo único que cambia es el vínculo con el causante.</p>
    </div>
  </div>
  <div class="card interpretation" id="suc-interp"></div>`;

  /* ---------- Lectura de controles ---------- */
  function leer() {
    const herederos = Math.max(1, Math.round(SIM.val('suc-herederos') || 0));
    const caudal = Math.max(0, SIM.val('suc-caudal'));
    const viviendaTotal = Math.max(0, SIM.val('suc-vivienda'));
    return {
      caudal, herederos, viviendaTotal,
      porcion: caudal / herederos,
      vivienda: Math.min(viviendaTotal, caudal) / herederos,
      seguro: Math.max(0, SIM.val('suc-seguro')),
      grupo: SIM.val('suc-grupo') || 'I',
      edad: Math.max(0, SIM.val('suc-edad')),
      disc: SIM.val('suc-disc') || 'no',
      patrimonio: Math.max(0, SIM.val('suc-patrim')),
      ccaa: SIM.val('suc-ccaa') || 'and'
    };
  }

  /* ---------- Actualización ---------- */
  function update(root) {
    const p = leer();
    const L = liquida(p);

    // La edad solo pinta en el grupo I
    const wrap = document.getElementById('suc-edad-wrap');
    if (wrap) wrap.hidden = p.grupo !== 'I';

    // Resultados
    SIM.show('suc-r-porcion', F.n2(L.porcion));
    SIM.show('suc-r-base', F.n2(L.baseImponible));
    SIM.show('suc-r-bl', F.n2(L.baseLiquidable));
    SIM.show('suc-r-integra', F.n2(L.cuotaIntegra));
    SIM.show('suc-r-coef', F.n2(L.coef));
    SIM.show('suc-r-trib', F.n2(L.cuotaTributaria));
    SIM.show('suc-r-bonif', F.n2(L.bonificacion));
    SIM.show('suc-r-ingresar', F.n2(L.aIngresar));
    SIM.show('suc-r-tipo', F.pct(L.tipoEfectivo, 2));

    // Filas de reducciones
    const filas = [
      ['suc-red-parentesco', L.aplicadas.parentesco, L.bruta.parentesco],
      ['suc-red-disc', L.aplicadas.disc, L.bruta.disc],
      ['suc-red-viv', L.aplicadas.viv, L.bruta.viv],
      ['suc-red-seg', L.aplicadas.seg, L.bruta.seg],
      ['suc-red-propia', L.aplicadas.propia, L.bruta.propia]
    ];
    filas.forEach(([id, aplicada, teorica]) => {
      const el = document.getElementById(id + '-res');
      const row = document.getElementById(id + '-row');
      if (row) row.classList.toggle('activa', aplicada > 0.005);
      if (!el) return;
      if (teorica <= 0) { el.textContent = 'no aplicable'; el.className = 'res no'; return; }
      if (aplicada < teorica - 0.005) { el.textContent = F.eur(aplicada, 2) + ' (tope: la base se agota)'; el.className = 'res no'; return; }
      el.textContent = F.eur(aplicada, 2); el.className = 'res';
    });

    // Cascada
    const pasos = [
      ['Porción hereditaria', L.porcion, ''],
      ['+ Seguro de vida', L.seguro, ''],
      ['Base imponible', L.baseImponible, 'hito'],
      ['− Reducciones estatales', -L.estatales, 'negative'],
      ['− Reducción autonómica', -L.propia, 'negative'],
      ['Base liquidable', L.baseLiquidable, 'hito'],
      ['Cuota íntegra (tarifa)', L.cuotaIntegra, 'hito'],
      ['× Coeficiente ' + F.n2(L.coef), L.cuotaTributaria - L.cuotaIntegra, L.cuotaTributaria >= L.cuotaIntegra ? 'negative' : 'positive'],
      ['Cuota tributaria', L.cuotaTributaria, 'hito'],
      ['− Bonificación autonómica', -L.bonificacion, 'positive'],
      ['A ingresar', L.aIngresar, L.aIngresar > 0 ? 'negative' : 'positive']
    ];
    SIM.html('suc-flow', pasos.map(([l, v, c], i) =>
      `${i ? '<span class="liq-arrow">→</span>' : ''}<div class="liq-step ${c}"><div class="liq-label">${l}</div><div class="liq-value">${F.eur(v, 2)}</div></div>`).join(''));

    // Aviso
    const K = S.coeficientes;
    const tramoTxt = L.coefInfo.indice === 0
      ? `hasta ${F.eur0(K.tramos[0])}`
      : (L.coefInfo.indice < K.tramos.length ? `entre ${F.eur0(K.tramos[L.coefInfo.indice - 1])} y ${F.eur0(K.tramos[L.coefInfo.indice])}` : `más de ${F.eur0(K.tramos[K.tramos.length - 1])}`);
    let aviso = `<strong>Coeficiente multiplicador.</strong> Con un patrimonio preexistente de ${F.eur0(p.patrimonio)} (${tramoTxt}) y perteneciendo al ${S.grupos[p.grupo].nombre.toLowerCase()}, la cuota íntegra se multiplica por ${F.n2(L.coef)}. `;
    aviso += L.pctBonif > 0
      ? `Después, ${nombreCcaa(p.ccaa)} bonifica el ${F.pct(L.pctBonif, 0)} de la cuota tributaria. `
      : `${nombreCcaa(p.ccaa)} no bonifica la cuota para este grupo de parentesco. `;
    aviso += `<br><strong>Aviso docente.</strong> Los beneficios autonómicos están modelados de forma simplificada —una reducción propia y una bonificación de la cuota por grupo de parentesco—. La normativa real de cada comunidad tiene muchos más matices (requisitos de convivencia, de permanencia, límites de patrimonio preexistente, reducciones por empresa familiar, plazos de mantenimiento), de modo que las cifras sirven para entender el mecanismo, no para liquidar una herencia concreta.`;
    SIM.html('suc-aviso', aviso);

    // Tabla de la tarifa
    const dg = L.escala.desglose;
    let ultimo = -1;
    dg.forEach((t, i) => { if (t.baseTramo > 0) ultimo = i; });
    const hasta = Math.min(dg.length - 1, Math.max(2, ultimo + 1));
    const trs = dg.slice(0, hasta + 1).map(t => `<tr class="${t.activo ? 'active-row' : ''}">`
      + `<td>${F.n0(t.desde)} – ${t.hasta === Infinity ? '∞' : F.n0(t.hasta)} €</td>`
      + `<td>${F.pct(t.tipo, 2)}</td><td>${F.n2(t.baseTramo)}</td><td>${F.n2(t.cuotaTramo)}</td><td>${F.n2(t.cuotaAcum)}</td></tr>`).join('');
    SIM.html('suc-tabla', `<thead><tr><th>Tramo de base liquidable</th><th>Tipo</th><th>Base en el tramo</th><th>Cuota del tramo</th><th>Acumulada</th></tr></thead>`
      + `<tbody>${trs}</tbody>`
      + `<tfoot><tr class="total"><td>Cuota íntegra</td><td>${F.pct(L.escala.marginal, 2)} marginal</td><td>${F.n2(L.baseLiquidable)}</td><td></td><td>${F.n2(L.cuotaIntegra)}</td></tr></tfoot>`);

    // Tabla comparativa de comunidades
    const comp = CCAAS.map(c => ({ c, L: liquida(Object.assign({}, p, { ccaa: c })) }));
    SIM.html('suc-tabla-ccaa',
      `<thead><tr><th>Comunidad del causante</th><th>Base liquidable</th><th>Cuota tributaria</th><th>Bonificación</th><th>A ingresar</th><th>Tipo efectivo</th></tr></thead><tbody>`
      + comp.map(x => `<tr class="${x.c === p.ccaa ? 'active-row' : ''}"><td>${nombreCcaa(x.c)}</td><td>${F.n2(x.L.baseLiquidable)}</td><td>${F.n2(x.L.cuotaTributaria)}</td><td>${F.n2(x.L.bonificacion)}</td><td><strong>${F.n2(x.L.aIngresar)}</strong></td><td>${F.pct(x.L.tipoEfectivo, 2)}</td></tr>`).join('')
      + `</tbody>`);

    // Gráfico 1: tipo efectivo según la porción heredada, por comunidad
    const frac = p.porcion > 0 ? Math.min(p.vivienda, p.porcion) / p.porcion : 0;
    const xs = [];
    for (let x = 0; x <= 2000000; x += 25000) xs.push(x);
    const datasets = CCAAS.map((c, i) => ({
      label: nombreCcaa(c),
      data: SIM.xy(xs.map(x => x / 1000), xs.map(x => liquida(Object.assign({}, p, { ccaa: c, porcion: x, vivienda: frac * x })).tipoEfectivo * 100)),
      borderColor: [C.verde, C.naranja, C.azul][i],
      borderWidth: c === p.ccaa ? 3 : 1.8,
      borderDash: c === p.ccaa ? [] : [6, 4]
    }));
    SIM.chart('suc-chart-porcion', {
      type: 'line',
      data: { datasets },
      options: {
        scales: {
          x: { type: 'linear', min: 0, max: 2000, title: { text: 'Porción hereditaria (miles de €)' } },
          y: { min: 0, title: { text: 'Tipo efectivo sobre lo heredado (%)' } }
        },
        plugins: {
          refs: { points: [{ x: p.porcion / 1000, y: L.tipoEfectivo * 100, label: `${F.pct(L.tipoEfectivo, 2)} en ${nombreCcaa(p.ccaa)}`, color: C.rojo, dy: -10 }] },
          tooltip: { callbacks: { title: it => `Porción de ${F.n0(it[0].parsed.x * 1000)} €`, label: it => `${it.dataset.label}: ${F.n2(it.parsed.y)} %` } }
        }
      }
    });

    // Gráfico 2: tipo efectivo por grupo de parentesco en la comunidad elegida
    const porGrupo = GRUPOS.map(g => liquida(Object.assign({}, p, { grupo: g })));
    SIM.chart('suc-chart-grupo', {
      type: 'bar',
      data: {
        labels: GRUPOS.map(g => 'Grupo ' + g),
        datasets: [{ label: `Tipo efectivo en ${nombreCcaa(p.ccaa)}`, data: porGrupo.map(x => x.tipoEfectivo * 100), backgroundColor: GRUPOS.map(g => g === p.grupo ? C.rojo : SIM.alpha(C.azul, .75)) }]
      },
      options: {
        scales: {
          x: { grid: { display: false }, title: { text: `Grupo de parentesco · porción de ${F.eur0(L.porcion)}` } },
          y: { min: 0, title: { text: 'Tipo efectivo sobre lo heredado (%)' } }
        },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: it => `${F.n2(it.parsed.y)} % · a ingresar ${F.eur(porGrupo[it.dataIndex].aIngresar, 2)}` } }
        }
      }
    });

    // Lectura
    const est = comp.find(x => x.c === 'est').L;
    const and = comp.find(x => x.c === 'and').L;
    const dif = est.aIngresar - L.aIngresar;
    let t = `<strong>Lectura.</strong> Un caudal de ${F.eur0(p.caudal)} entre ${F.n0(p.herederos)} ${p.herederos === 1 ? 'heredero' : 'herederos'} deja una porción de ${F.eur(L.porcion, 2)}`
      + (L.seguro > 0 ? `, que con el seguro de vida de ${F.eur0(L.seguro)} da una base imponible de ${F.eur(L.baseImponible, 2)}` : '') + `. `
      + `Las reducciones suman ${F.eur(L.estatales + L.propia, 2)}`
      + (L.propia > 0 ? ` (${F.eur(L.estatales, 2)} estatales y ${F.eur(L.propia, 2)} de la reducción propia autonómica)` : '')
      + ` y dejan la base liquidable en <strong>${F.eur(L.baseLiquidable, 2)}</strong>. `;
    t += L.baseLiquidable <= 0
      ? `Al no quedar base, no hay cuota: el impuesto se paga, pero da cero. `
      : `La tarifa da una cuota íntegra de ${F.eur(L.cuotaIntegra, 2)}; el coeficiente ${F.n2(L.coef)} la lleva a ${F.eur(L.cuotaTributaria, 2)}`
        + (L.bonificacion > 0 ? ` y la bonificación autonómica de ${F.eur(L.bonificacion, 2)} la deja en <strong>${F.eur(L.aIngresar, 2)}</strong>` : `, que se ingresan íntegros`)
        + `: un tipo efectivo del ${F.pct(L.tipoEfectivo, 2)} sobre lo heredado. `;
    t += `<br><strong>Competencia fiscal (Tema 10).</strong> El mismo heredero, con la misma herencia y el mismo parentesco, pagaría ${F.eur(est.aIngresar, 2)} si el causante hubiera residido en una comunidad sin beneficios y ${F.eur(and.aIngresar, 2)} en Andalucía. `
      + (Math.abs(dif) < 0.5
        ? `Aquí la diferencia es nula: las reducciones estatales ya vacían la base, así que el debate autonómico no afecta a este contribuyente.`
        : `La diferencia, ${F.eur(Math.abs(dif), 2)}, no depende de la capacidad económica del heredero sino del domicilio del causante. Ese es el argumento de quienes ven en el impuesto una fuente de competencia fiscal a la baja entre comunidades, y también el de quienes defienden que la corresponsabilidad fiscal exige que cada comunidad decida.`);
    if (p.grupo === 'III' || p.grupo === 'IV') {
      t += ` <br><strong>Fíjate.</strong> Al no ser descendiente ni cónyuge, este heredero pierde la reducción por vivienda habitual y la del seguro de vida, tiene una reducción por parentesco pequeña o nula, soporta un coeficiente multiplicador superior a la unidad y apenas recibe bonificación: por eso el tipo efectivo se dispara respecto al de un hijo.`;
    }
    SIM.html('suc-interp', t);
  }

  /* ---------- Registro ---------- */
  const esc = cambios => Object.assign({}, BASE, cambios);
  SIM.register({
    id: 'sucesiones', nav: 'Sucesiones', tema: 'Tema 5',
    title: 'Impuesto sobre Sucesiones: liquidación de un heredero y competencia entre comunidades',
    subtitle: `Esquema completo de la Ley 29/1987 para un heredero: porción hereditaria, reducciones por parentesco, discapacidad, vivienda habitual y seguro de vida, tarifa estatal, coeficiente multiplicador por patrimonio preexistente y bonificación autonómica. Los beneficios autonómicos están modelados como una <em>aproximación docente</em> (una reducción propia y una bonificación de la cuota por grupo de parentesco): la normativa real de cada comunidad tiene bastantes más matices.`,
    guia: {
      observa: [
        `La <strong>reducción por parentesco</strong> hace que la base liquidable de un hijo empiece casi en cero: con el grupo II la base imponible se reduce en ${F.eur0(S.grupos.II.base)} antes de tocar la tarifa, y en Andalucía la reducción propia se lleva por delante hasta ${F.eur0(S.ccaa.and.reduccionPropia.II)} más.`,
        'El <strong>coeficiente multiplicador</strong> grava dos veces lo mismo: castiga a quien ya tiene patrimonio previo <em>y</em> a quien es pariente lejano. Sube el patrimonio preexistente sin tocar nada más y mira cómo crece la cuota tributaria sin que cambie la base.',
        `La <strong>bonificación autonómica</strong> del ${F.pct(S.ccaa.and.bonificacion.II, 0)} en Andalucía y Madrid vacía el impuesto para hijos y cónyuges (grupos I y II), pero deja intacta la cuota de hermanos y sobrinos (grupo III) y de extraños (grupo IV). Cambia el grupo de parentesco y observa el segundo gráfico.`,
        'La <strong>misma herencia paga cantidades muy distintas</strong> según dónde residía el causante: compara las tres filas de la tabla. Es el ejemplo de manual de competencia fiscal entre comunidades sobre un tributo cedido (Tema 5 y Tema 10).',
        'La vivienda habitual y el seguro de vida solo reducen para cónyuge, ascendientes y descendientes: dos herencias del mismo importe tributan distinto según <em>de qué</em> esté compuesta la herencia y <em>quién</em> la reciba.'
      ],
      pregunta: '¿Es cierto que «el impuesto de sucesiones se ha eliminado»?',
      respuesta: 'No. El impuesto sigue vigente y es estatal: lo que han hecho varias comunidades, en el ejercicio de su capacidad normativa sobre un tributo cedido, es bonificar casi toda la cuota para los grupos I y II. La obligación de declarar se mantiene, la cuota se sigue calculando y basta con salir de esos grupos —un hermano, un sobrino, un amigo— o cambiar de comunidad para que reaparezca una cuota considerable. Prueba con el escenario del hermano: la bonificación desaparece y el coeficiente multiplicador se aplica igual.'
    },
    presets: [
      { label: 'Hijo mayor de edad hereda 300.000 € en Andalucía', values: esc({ 'suc-caudal': 600000, 'suc-herederos': 2, 'suc-vivienda': 0, 'suc-seguro': 0, 'suc-grupo': 'II', 'suc-disc': 'no', 'suc-patrim': 100000, 'suc-ccaa': 'and' }) },
      { label: 'Mismo hijo en una comunidad sin beneficios', values: esc({ 'suc-caudal': 600000, 'suc-herederos': 2, 'suc-vivienda': 0, 'suc-seguro': 0, 'suc-grupo': 'II', 'suc-disc': 'no', 'suc-patrim': 100000, 'suc-ccaa': 'est' }) },
      { label: 'Hermano hereda 150.000 €', values: esc({ 'suc-caudal': 150000, 'suc-herederos': 1, 'suc-vivienda': 0, 'suc-seguro': 0, 'suc-grupo': 'III', 'suc-disc': 'no', 'suc-patrim': 100000, 'suc-ccaa': 'and' }) },
      { label: 'Sobrino hereda 500.000 € con patrimonio previo alto', values: esc({ 'suc-caudal': 500000, 'suc-herederos': 1, 'suc-vivienda': 0, 'suc-seguro': 0, 'suc-grupo': 'III', 'suc-disc': 'no', 'suc-patrim': 2500000, 'suc-ccaa': 'and' }) },
      { label: 'Menor de 21 con vivienda habitual y seguro de vida', values: esc({ 'suc-caudal': 400000, 'suc-herederos': 1, 'suc-vivienda': 250000, 'suc-seguro': 30000, 'suc-grupo': 'I', 'suc-edad': 15, 'suc-disc': 'no', 'suc-patrim': 0, 'suc-ccaa': 'est' }) }
    ],
    html, update
  });
})();
