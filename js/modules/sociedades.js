/* Módulo Impuesto sobre Sociedades (Tema 4 de HP II):
   liquidación completa (resultado contable → ajustes → BINs → tipo → deducciones → cuota diferencial)
   y doble imposición del dividendo (sociedad + socio persona física).
   Todas las cifras normativas se leen de TAX.P.sociedades y TAX.P.irpf. */
(function () {
  'use strict';
  const F = SIM.fmt, C = SIM.color;

  /* ---------- Constructores de filas con casilla + cuantía ---------- */
  const BASE = {}; // valores por defecto de todos los controles (para los escenarios)
  function reg(id, v) { BASE[id] = v; return id; }

  // Fila: casilla + concepto + regla + importe + resultado calculado (mismo patrón que el módulo de IRPF)
  function fila(id, nombre, regla, o) {
    o = o || {};
    reg(id + '-on', !!o.on);
    let control = '';
    if (o.tipo === 'eur') {
      reg(id, o.valor ?? 0);
      control = `<input type="number" id="${id}" min="0" step="1" value="${o.valor ?? 0}" data-state placeholder="€">`;
    }
    return `<div class="ded-row">
      <input type="checkbox" id="${id}-on" data-state${o.on ? ' checked' : ''}>
      <label for="${id}-on"><span class="nombre">${nombre}</span><span class="help">${regla}</span></label>
      <span class="ctrl">${control}</span>
      <span class="res" id="${id}-res"></span>
    </div>`;
  }
  const on = id => !!SIM.val(id + '-on');
  const imp = id => on(id) ? Math.max(0, SIM.val(id)) : 0;

  /* ---------- Normativa (siempre desde TAX.P) ---------- */
  const S = () => TAX.P.sociedades;
  const TIPOS = [
    ['general', 'General (25 %)'],
    ['micro', 'Microempresa: cifra de negocios < 1 M€ (21 % / 22 %)'],
    ['reducida', 'Entidad de reducida dimensión: < 10 M€ (24 %)'],
    ['nueva', 'Entidad de nueva creación (15 %)'],
    ['coop', 'Cooperativa fiscalmente protegida (20 %)'],
    ['enl', 'Entidad sin fines lucrativos, Ley 49/2002 (10 %)']
  ];
  // Devuelve la escala de gravamen del régimen elegido (un solo tramo salvo en microempresa)
  function tarifa(tipoId) {
    const T = S().tipos;
    if (tipoId === 'micro') {
      const m = T.microempresa;
      return { escala: [[0, m.hasta, m.tipo1], [m.hasta, Infinity, m.tipo2]], plano: null };
    }
    const t = tipoId === 'reducida' ? T.reducidaDimension
      : tipoId === 'nueva' ? T.nuevaCreacion
        : tipoId === 'coop' ? T.cooperativa
          : tipoId === 'enl' ? T.sinFinesLucro : T.general;
    return { escala: [[0, Infinity, t]], plano: t };
  }
  function pctBins(cifra) {
    const B = S().bins;
    if (cifra >= B.umbralMuyGrande) return B.limitePctMuyGrande;
    if (cifra >= B.umbralGrande) return B.limitePctGrande;
    return B.limitePct;
  }
  // Marginal máximo de la base general del IRPF (estatal + autonómica de Andalucía): referencia del 47 %
  function marginalMaxIRPF() {
    const e = TAX.P.irpf.escalas;
    return e.estatal[e.estatal.length - 1][2] + e.andalucia[e.andalucia.length - 1][2];
  }

  /* ---------- Núcleo de cálculo (función pura) ---------- */
  function liquida(d) {
    const P = S(), T = P.tipos, B = P.bins, DD = P.deducciones;

    // 1. Resultado contable antes de impuestos
    const rc = d.rc;

    // 2. Ajustes extracontables
    const ajPositivos = d.ajNoDeduc + d.ajAmort;
    const exencionDiv = d.divCobrados * P.dividendos.exencionInterna;
    const ajNegativos = exencionDiv + d.ajLibertad;
    const basePrevia = rc + ajPositivos - ajNegativos;

    // 3. Compensación de bases imponibles negativas
    const pct = pctBins(d.cifra);
    const limiteBins = Math.max(B.minimo, pct * Math.max(0, basePrevia));
    const binsCompensadas = Math.max(0, Math.min(d.binsDisp, Math.max(0, basePrevia), limiteBins));
    const binsPendientes = Math.max(0, d.binsDisp - binsCompensadas);
    const base = basePrevia - binsCompensadas;
    const baseNegativaNueva = Math.max(0, -base); // si la base sale negativa, se lleva a ejercicios siguientes

    // 4. Cuota íntegra
    const tar = tarifa(d.tipoId);
    const esc = TAX.aplicaEscala(Math.max(0, base), tar.escala);
    const cuotaIntegra = esc.cuota;
    const tipoNominal = base > 0 ? cuotaIntegra / base : (tar.plano != null ? tar.plano : T.microempresa.tipo2);

    // 5. Deducciones de la cuota
    //    a) doble imposición internacional: se resta antes y no entra en el límite conjunto
    const ddiGenerada = d.ddi;
    const ddiAplicada = Math.min(ddiGenerada, cuotaIntegra);
    const restoCuota = cuotaIntegra - ddiAplicada;
    //    b) incentivos: I+D (25 %, y 42 % sobre el exceso respecto de la media de los dos años anteriores)
    const idGen = d.idGasto <= 0 ? 0
      : (d.idGasto <= d.idMedia
        ? DD.idPct * d.idGasto
        : DD.idPct * d.idMedia + DD.idExcesoPct * (d.idGasto - d.idMedia));
    const itGen = DD.itPct * d.itGasto;
    const baseDonativos = Math.min(d.donativo, DD.donativosLimiteBase * Math.max(0, base));
    const donGen = (d.donRecurrente ? DD.donativosRecPct : DD.donativosPct) * baseDonativos;
    const incentivosGen = idGen + itGen + donGen;
    //    c) límite conjunto: 25 % de la cuota íntegra, 50 % si I+D+IT supera el 10 % de la cuota
    const limiteAmpliado = (idGen + itGen) > 0.10 * cuotaIntegra && cuotaIntegra > 0;
    const limitePctDed = limiteAmpliado ? DD.limiteConjuntoID : DD.limiteConjunto;
    const limiteDed = limitePctDed * cuotaIntegra;

    // 6. Tributación mínima del 15 % (solo cifra de negocios ≥ 20 M€): suelo de la cuota líquida
    const aplicaMinimo = d.cifra >= B.umbralGrande;
    const cuotaMinima = aplicaMinimo ? Math.max(0, Math.min(restoCuota, T.minimoGrandes * Math.max(0, base))) : 0;
    const techo = Math.max(0, restoCuota - cuotaMinima); // lo máximo que pueden absorber los incentivos
    const incentivosAplicados = Math.min(incentivosGen, limiteDed, techo);
    const perdidoPorLimite = Math.max(0, incentivosGen - limiteDed);
    const perdidoPorMinimo = Math.max(0, Math.min(incentivosGen, limiteDed) - incentivosAplicados);
    const dedPendientes = (incentivosGen - incentivosAplicados) + (ddiGenerada - ddiAplicada);
    const totalDeducciones = ddiAplicada + incentivosAplicados;
    const cuotaLiquida = Math.max(0, restoCuota - incentivosAplicados);

    // 7. Retenciones y pagos fraccionados
    const pagosFrac = d.pfAuto ? P.pagoFraccionadoPct * cuotaIntegra : d.pagosFrac;
    const cuotaDiferencial = cuotaLiquida - d.retenciones - pagosFrac;

    // 8. Tipos efectivos
    const efectivoContable = rc > 0 ? cuotaLiquida / rc : null;
    const efectivoBase = base > 0 ? cuotaLiquida / base : null;

    return {
      rc, ajPositivos, ajNegativos, exencionDiv, basePrevia,
      pctBins: pct, limiteBins, binsCompensadas, binsPendientes, base, baseNegativaNueva,
      tipoNominal, cuotaIntegra, escala: esc,
      idGen, itGen, donGen, baseDonativos, incentivosGen, limitePctDed, limiteDed, limiteAmpliado,
      ddiGenerada, ddiAplicada, incentivosAplicados, perdidoPorLimite, perdidoPorMinimo, dedPendientes, totalDeducciones,
      aplicaMinimo, cuotaMinima, cuotaLiquida, pagosFrac, retenciones: d.retenciones, cuotaDiferencial,
      efectivoContable, efectivoBase
    };
  }

  /* ---------- Parte B: doble imposición del dividendo ---------- */
  function dobleImposicion(beneficio, tipoId, sistema) {
    const esc = TAX.aplicaEscala(Math.max(0, beneficio), tarifa(tipoId).escala);
    const is = esc.cuota;
    const dividendo = Math.max(0, beneficio - is);
    const ahorro = TAX.P.irpf.escalas.ahorro;
    let irpfSocio, isSoportado = is;
    if (sistema === 'exencion') {
      irpfSocio = 0;
    } else if (sistema === 'integracion') {
      // El socio imputa el beneficio íntegro y deduce el IS ya pagado por la sociedad
      const cuotaSocio = TAX.aplicaEscala(Math.max(0, beneficio), ahorro).cuota;
      const total = cuotaSocio;                       // carga total = la del socio
      isSoportado = Math.min(is, total);              // el exceso de IS se devuelve al socio
      irpfSocio = Math.max(0, total - isSoportado);
    } else {
      irpfSocio = TAX.aplicaEscala(dividendo, ahorro).cuota;
    }
    const total = isSoportado + irpfSocio;
    const neta = beneficio - total;
    return { is, isSoportado, devolucionIS: is - isSoportado, dividendo, irpfSocio, total, neta, combinado: beneficio > 0 ? total / beneficio : 0 };
  }

  /* ---------- HTML ---------- */
  const html = `
  <div class="grid-2">
    <div class="card">
      <h3>Cuenta de resultados</h3>
      <div class="row">
        ${SIM.number(reg('soc-ing', 1200000), { label: 'Ingresos de explotación (€)', value: 1200000, step: 1000 })}
        ${SIM.number(reg('soc-gas', 800000), { label: 'Gastos de explotación (€)', value: 800000, step: 1000 })}
        ${SIM.number(reg('soc-amort', 60000), { label: 'Amortización contable (€)', value: 60000, step: 1000 })}
      </div>
      <div class="row">
        ${SIM.number(reg('soc-gfin', 20000), { label: 'Gastos financieros (€)', value: 20000, step: 500 })}
        ${SIM.number(reg('soc-ifin', 5000), { label: 'Ingresos financieros (€)', value: 5000, step: 500 })}
        ${SIM.number(reg('soc-cifra', 1200000), { label: 'Cifra de negocios del año (€)', value: 1200000, step: 10000 })}
      </div>
      <p class="inline-note">La cifra de negocios decide el régimen de tipo aplicable, el límite de compensación de bases negativas y si opera la tributación mínima del 15 %.</p>

      <h3>Ajustes extracontables</h3>
      <p class="inline-note">No son «trampas»: son las diferencias entre la norma contable y la fiscal. Las positivas suman a la base, las negativas restan.</p>
      ${fila('soc-aj-nodeduc', '(+) Gastos contabilizados no deducibles', 'multas y sanciones, donativos contabilizados como gasto, deterioros no deducibles', { tipo: 'eur', valor: 15000, on: true })}
      ${fila('soc-aj-amort', '(+) Exceso de amortización contable sobre la fiscal', 'diferencia temporaria: revierte en ejercicios siguientes', { tipo: 'eur', valor: 10000, on: true })}
      ${fila('soc-aj-div', '(−) Exención de dividendos de participadas ≥ 5 %', 'introduce el dividendo cobrado: el ajuste es el 95 % de ese importe', { tipo: 'eur', valor: 40000, on: true })}
      ${fila('soc-aj-lib', '(−) Libertad de amortización o amortización acelerada', 'incentivo que adelanta el gasto fiscal: diferencia temporaria negativa', { tipo: 'eur', valor: 20000, on: true })}

      <h3>Bases imponibles negativas de ejercicios anteriores</h3>
      ${fila('soc-bins', 'Bases negativas pendientes de compensar', 'límite del 70 % de la base previa (50 % con cifra > 20 M€, 25 % con cifra > 60 M€) y, en todo caso, hasta 1 M€ sin límite', { tipo: 'eur', valor: 300000 })}
      <p class="inline-note">Marca la casilla y observa el efecto del suelo de 1 M€: con bases pequeñas, el límite porcentual no llega a morder y la compensación se lleva toda la base.</p>

      <h3>Tipo de gravamen</h3>
      ${SIM.select(reg('soc-tipo', 'general'), { label: 'Régimen aplicable', value: 'general', options: TIPOS })}
      <div class="aviso" id="soc-aviso-tipo"></div>

      <h3>Deducciones de la cuota</h3>
      <p class="inline-note">Introduce el <strong>gasto</strong> de cada incentivo: el simulador aplica el porcentaje. El límite conjunto es el 25 % de la cuota íntegra, ampliado al 50 % cuando la deducción de I+D e innovación supera el 10 % de esa cuota.</p>
      ${fila('soc-ded-id', 'Investigación y desarrollo (I+D)', '25 % del gasto; 42 % sobre el exceso respecto de la media de los dos años anteriores', { tipo: 'eur', valor: 100000 })}
      <div class="ded-sub"><label>Media de gasto en I+D de los dos años anteriores (€)
        <input type="number" id="${reg('soc-ded-id-media', 60000)}" min="0" step="1000" value="60000" data-state></label></div>
      ${fila('soc-ded-it', 'Innovación tecnológica', '12 % del gasto del ejercicio', { tipo: 'eur', valor: 50000 })}
      ${fila('soc-ded-don', 'Donativos a entidades de la Ley 49/2002', '40 % de lo donado (50 % si es donante recurrente); base máxima: 15 % de la base imponible', { tipo: 'eur', valor: 20000 })}
      <div class="ded-sub"><label><input type="checkbox" id="${reg('soc-ded-don-rec', false)}" data-state> Donante recurrente (misma entidad los tres años anteriores)</label></div>
      ${fila('soc-ded-ddi', 'Doble imposición internacional', 'importe ya calculado del impuesto pagado en el extranjero; se resta antes del límite conjunto', { tipo: 'eur', valor: 8000 })}

      <h3>Retenciones y pagos a cuenta</h3>
      <div class="row">
        ${SIM.number(reg('soc-ret', 1500), { label: 'Retenciones soportadas (€)', value: 1500, step: 100 })}
        ${SIM.number(reg('soc-pf', 30000), { label: 'Pagos fraccionados (€)', value: 30000, step: 1000 })}
      </div>
      <div class="checkbox-group">${SIM.check(reg('soc-pf-auto', false), 'Estimar los pagos fraccionados como el 18 % de la cuota íntegra')}</div>
    </div>

    <div class="card">
      <h3>Resultado de la liquidación</h3>
      <div class="results-grid">
        ${SIM.result('soc-r-integra', 'Cuota íntegra', '€')}
        ${SIM.result('soc-r-liquida', 'Cuota líquida', '€', 'green')}
        ${SIM.result('soc-r-difer', 'Cuota diferencial', '€', 'red')}
      </div>
      <div class="results-grid">
        ${SIM.result('soc-r-nominal', 'Tipo nominal', 'cuota íntegra / base')}
        ${SIM.result('soc-r-efbase', 'Tipo efectivo sobre la base', 'cuota líquida / base', 'green')}
        ${SIM.result('soc-r-efcont', 'Tipo efectivo sobre el resultado contable', 'cuota líquida / resultado contable', 'orange')}
        ${SIM.result('soc-r-pend', 'Deducciones pendientes', 'para ejercicios siguientes', 'orange')}
      </div>
      <div class="liq-flow" id="soc-flow"></div>
      <div class="aviso" id="soc-aviso"></div>
      <h3>Conciliación contable-fiscal</h3>
      <table class="tabla" id="soc-tabla"></table>
      <h3>Deducciones, una a una</h3>
      <table class="tabla" id="soc-tabla-ded"></table>
    </div>
  </div>

  <div class="grid-2">
    <div class="card">
      <h3>Tipo nominal y tipo efectivo según el resultado contable</h3>
      ${SIM.chartBox('soc-chart-tipos', 320)}
      <p class="inline-note">Se mantienen fijos los ajustes, las bases negativas y las deducciones del escenario; solo cambia el resultado contable. La brecha entre las dos curvas es lo que explican los ajustes, las BINs y las deducciones.</p>
    </div>
    <div class="card">
      <h3>Del resultado contable a la cuota diferencial</h3>
      ${SIM.chartBox('soc-chart-cascada', 320)}
    </div>
  </div>

  <div class="grid-2">
    <div class="card">
      <h3>Doble imposición del dividendo</h3>
      <p class="inline-note">El beneficio paga primero el IS en la sociedad; lo que se reparte vuelve a tributar en el IRPF del socio, dentro de la base del ahorro.</p>
      ${SIM.slider(reg('soc-b-beneficio', 100000), { label: 'Beneficio antes de impuestos de la sociedad', min: 1000, max: 1000000, step: 1000, value: 100000 })}
      ${SIM.select(reg('soc-b-sistema', 'clasico'), {
        label: 'Sistema de integración IS-IRPF', value: 'clasico', options: [
          ['clasico', 'Clásico: el dividendo tributa otra vez (sistema español)'],
          ['exencion', 'Exención total del dividendo en el IRPF'],
          ['integracion', 'Integración plena: se imputa el beneficio y se deduce el IS']
        ]
      })}
      <div class="results-grid">
        ${SIM.result('socb-r-is', 'IS de la sociedad', '€')}
        ${SIM.result('socb-r-div', 'Dividendo bruto', '€')}
        ${SIM.result('socb-r-irpf', 'IRPF del socio', '€')}
      </div>
      <div class="results-grid">
        ${SIM.result('socb-r-neta', 'Renta final del socio', '€', 'green')}
        ${SIM.result('socb-r-total', 'Carga total', '€', 'red')}
        ${SIM.result('socb-r-comb', 'Tipo combinado', '1 − renta final / beneficio', 'red')}
      </div>
      <table class="tabla" id="socb-tabla"></table>
      <div class="aviso" id="socb-aviso"></div>
    </div>
    <div class="card">
      <h3>Reparto del beneficio según el sistema de integración</h3>
      ${SIM.chartBox('soc-chart-doble', 320)}
      <p class="inline-note">Cada barra reparte el mismo beneficio entre el IS de la sociedad, el IRPF del socio y la renta que le queda.</p>
    </div>
  </div>
  <div class="card interpretation" id="soc-interp"></div>`;

  /* ---------- Lectura de controles ---------- */
  function leer() {
    const rc = SIM.val('soc-ing') - SIM.val('soc-gas') - SIM.val('soc-amort') - SIM.val('soc-gfin') + SIM.val('soc-ifin');
    return {
      rc,
      ajNoDeduc: imp('soc-aj-nodeduc'), ajAmort: imp('soc-aj-amort'),
      divCobrados: imp('soc-aj-div'), ajLibertad: imp('soc-aj-lib'),
      binsDisp: imp('soc-bins'),
      tipoId: SIM.val('soc-tipo') || 'general',
      cifra: Math.max(0, SIM.val('soc-cifra')),
      idGasto: imp('soc-ded-id'), idMedia: Math.max(0, SIM.val('soc-ded-id-media')),
      itGasto: imp('soc-ded-it'),
      donativo: imp('soc-ded-don'), donRecurrente: !!SIM.val('soc-ded-don-rec'),
      ddi: imp('soc-ded-ddi'),
      retenciones: Math.max(0, SIM.val('soc-ret')),
      pagosFrac: Math.max(0, SIM.val('soc-pf')), pfAuto: !!SIM.val('soc-pf-auto')
    };
  }

  const NOMBRE_TIPO = { general: 'tipo general', micro: 'microempresa', reducida: 'reducida dimensión', nueva: 'nueva creación', coop: 'cooperativa', enl: 'entidad sin fines lucrativos' };
  const pctOrDash = (v, d) => v == null ? '—' : F.pct(v, d == null ? 1 : d);

  function update(root) {
    const d = leer();
    const P = S(), B = P.bins, DD = P.deducciones, T = P.tipos;

    // Controles dependientes
    root.querySelectorAll('.ded-row').forEach(r => {
      const cb = r.querySelector('input[type=checkbox]'); const ctrl = r.querySelector('.ctrl input, .ctrl select');
      if (ctrl) ctrl.disabled = !cb.checked;
      r.classList.toggle('activa', cb.checked);
    });
    SIM.show('soc-b-beneficio-val', F.eur0(SIM.val('soc-b-beneficio')));

    const L = liquida(d);

    const pfEl = document.getElementById('soc-pf');
    if (pfEl) { pfEl.disabled = !!d.pfAuto; if (d.pfAuto) pfEl.value = L.pagosFrac.toFixed(0); }

    // Aviso de coherencia entre el régimen elegido y la cifra de negocios
    let avisoTipo = '';
    if (d.tipoId === 'micro' && d.cifra >= 1000000) avisoTipo = `Has elegido <strong>microempresa</strong> con una cifra de negocios de ${F.eur0(d.cifra)}: el régimen exige menos de 1.000.000 €. El simulador lo calcula igualmente para que veas la diferencia, pero la entidad no podría aplicarlo.`;
    else if (d.tipoId === 'reducida' && d.cifra >= 10000000) avisoTipo = `Has elegido <strong>reducida dimensión</strong> con una cifra de negocios de ${F.eur0(d.cifra)}: el régimen exige menos de 10.000.000 €.`;
    else if (d.tipoId === 'nueva') avisoTipo = `El tipo del 15 % de las <strong>entidades de nueva creación</strong> solo se aplica en el primer periodo con base imponible positiva y en el siguiente, y no alcanza a las sociedades patrimoniales.`;
    else if (d.tipoId === 'enl') avisoTipo = `El 10 % corresponde a las entidades de la Ley 49/2002 y solo sobre las rentas <strong>no exentas</strong>: la mayor parte de su actividad propia está exenta.`;
    else avisoTipo = `Tipo ${NOMBRE_TIPO[d.tipoId]} aplicado sobre la base imponible. La cifra de negocios (${F.eur0(d.cifra)}) fija el límite de compensación de bases negativas en el ${F.pct(L.pctBins, 0)}${L.aplicaMinimo ? ' y activa la tributación mínima del ' + F.pct(T.minimoGrandes, 0) : ''}.`;
    SIM.html('soc-aviso-tipo', avisoTipo);

    // Resultados
    SIM.show('soc-r-integra', F.n0(L.cuotaIntegra));
    SIM.show('soc-r-liquida', F.n0(L.cuotaLiquida));
    const dif = document.getElementById('soc-r-difer');
    if (dif) {
      dif.textContent = (L.cuotaDiferencial >= 0 ? 'A ingresar ' : 'A devolver ') + F.n0(Math.abs(L.cuotaDiferencial));
      dif.parentElement.className = 'result-box ' + (L.cuotaDiferencial > 0 ? 'red' : 'green');
    }
    SIM.show('soc-r-nominal', pctOrDash(L.tipoNominal, 1));
    SIM.show('soc-r-efbase', pctOrDash(L.efectivoBase, 1));
    SIM.show('soc-r-efcont', pctOrDash(L.efectivoContable, 1));
    SIM.show('soc-r-pend', F.n0(L.dedPendientes));

    // Resultado junto a cada fila
    const resFila = (id, txt, activo) => SIM.show(id + '-res', activo ? txt : '');
    resFila('soc-aj-nodeduc', '+ ' + F.eur0(d.ajNoDeduc), on('soc-aj-nodeduc'));
    resFila('soc-aj-amort', '+ ' + F.eur0(d.ajAmort), on('soc-aj-amort'));
    resFila('soc-aj-div', '− ' + F.eur0(L.exencionDiv), on('soc-aj-div'));
    resFila('soc-aj-lib', '− ' + F.eur0(d.ajLibertad), on('soc-aj-lib'));
    resFila('soc-bins', '− ' + F.eur0(L.binsCompensadas), on('soc-bins'));
    resFila('soc-ded-id', F.eur0(L.idGen), on('soc-ded-id'));
    resFila('soc-ded-it', F.eur0(L.itGen), on('soc-ded-it'));
    resFila('soc-ded-don', F.eur0(L.donGen), on('soc-ded-don'));
    resFila('soc-ded-ddi', F.eur0(L.ddiAplicada), on('soc-ded-ddi'));

    // Cascada de la liquidación
    const pasos = [
      ['Resultado contable', L.rc, ''],
      ['+ Ajustes positivos', L.ajPositivos, 'negative'],
      ['− Ajustes negativos', -L.ajNegativos, 'positive'],
      ['Base previa', L.basePrevia, 'hito'],
      ['− BINs', -L.binsCompensadas, 'positive'],
      ['Base imponible', L.base, 'hito'],
      ['Cuota íntegra', L.cuotaIntegra, 'hito'],
      ['− Deducciones', -L.totalDeducciones, 'positive'],
      ['Cuota líquida', L.cuotaLiquida, 'hito'],
      ['− Retenciones y pagos', -(L.retenciones + L.pagosFrac), 'positive'],
      [L.cuotaDiferencial >= 0 ? 'A ingresar' : 'A devolver', L.cuotaDiferencial, L.cuotaDiferencial >= 0 ? 'negative' : 'positive']
    ];
    SIM.html('soc-flow', pasos.map(([l, v, c], i) => `${i ? '<span class="liq-arrow">→</span>' : ''}<div class="liq-step ${c}"><div class="liq-label">${l}</div><div class="liq-value">${F.eur0(v)}</div></div>`).join(''));

    // Aviso de la liquidación
    let aviso = `<strong>Compensación de bases negativas.</strong> `;
    if (d.binsDisp > 0) {
      aviso += `De ${F.eur0(d.binsDisp)} pendientes se compensan ${F.eur0(L.binsCompensadas)} `
        + `(límite: el ${F.pct(L.pctBins, 0)} de la base previa, ${F.eur0(L.pctBins * Math.max(0, L.basePrevia))}, pero siempre hasta ${F.eur0(B.minimo)} sin límite → tope efectivo ${F.eur0(L.limiteBins)}). `
        + (L.binsPendientes > 0 ? `<span class="perdida">Quedan ${F.eur0(L.binsPendientes)} pendientes</span> para ejercicios siguientes (sin caducidad, pero sin intereses: la inflación se los come). ` : `No queda nada pendiente. `);
    } else aviso += `No hay bases negativas anteriores en este escenario. `;
    if (L.baseNegativaNueva > 0) aviso += `<span class="perdida">La base imponible del ejercicio es negativa (${F.eur0(-L.base)})</span>: no hay cuota y esa cantidad se suma a las BINs a compensar en el futuro. `;
    aviso += `<br><strong>Deducciones.</strong> Se generan ${F.eur0(L.incentivosGen + L.ddiGenerada)} `
      + `(doble imposición internacional ${F.eur0(L.ddiGenerada)}, incentivos ${F.eur0(L.incentivosGen)}). `
      + `La deducción por doble imposición se aplica antes y no consume el límite conjunto; los incentivos topan en el ${F.pct(L.limitePctDed, 0)} de la cuota íntegra (${F.eur0(L.limiteDed)})`
      + (L.limiteAmpliado ? `, ampliado porque I+D e innovación superan el 10 % de la cuota` : ``) + `. `;
    if (L.perdidoPorLimite > 0) aviso += `<span class="perdida">${F.eur0(L.perdidoPorLimite)} no caben en el límite</span> y quedan pendientes. `;
    if (L.aplicaMinimo) {
      aviso += `<br><strong>Tributación mínima.</strong> Con una cifra de negocios de ${F.eur0(d.cifra)} (≥ ${F.eur0(B.umbralGrande)}) la cuota líquida no puede bajar de ${F.pct(T.minimoGrandes, 0)} de la base imponible: ${F.eur0(L.cuotaMinima)}. `
        + (L.perdidoPorMinimo > 0 ? `<span class="perdida">El suelo desplaza ${F.eur0(L.perdidoPorMinimo)} de deducciones</span> a ejercicios siguientes.` : `El suelo no llega a morder: las deducciones caben por debajo del límite conjunto.`);
    }
    SIM.html('soc-aviso', aviso);

    // Tabla de conciliación contable-fiscal
    const filasT = [
      ['Ingresos de explotación', SIM.val('soc-ing'), ''],
      ['− Gastos de explotación', -SIM.val('soc-gas'), ''],
      ['− Amortización contable', -SIM.val('soc-amort'), ''],
      ['− Gastos financieros', -SIM.val('soc-gfin'), ''],
      ['+ Ingresos financieros', SIM.val('soc-ifin'), ''],
      ['<strong>Resultado contable antes de impuestos</strong>', L.rc, 'total'],
      ['(+) Gastos no deducibles', d.ajNoDeduc, ''],
      ['(+) Exceso de amortización sobre la fiscal', d.ajAmort, ''],
      [`(−) Exención de dividendos (${F.pct(P.dividendos.exencionInterna, 0)} de ${F.eur0(d.divCobrados)})`, -L.exencionDiv, ''],
      ['(−) Libertad de amortización', -d.ajLibertad, ''],
      ['<strong>Base imponible previa</strong>', L.basePrevia, 'total'],
      ['(−) Compensación de bases negativas', -L.binsCompensadas, ''],
      ['<strong>Base imponible</strong>', L.base, 'total'],
      [`× Tipo de gravamen (${F.pct(L.tipoNominal, 1)})`, L.cuotaIntegra, 'total'],
      ['(−) Deducciones aplicadas', -L.totalDeducciones, ''],
      ['<strong>Cuota líquida</strong>', L.cuotaLiquida, 'total'],
      ['(−) Retenciones y pagos fraccionados', -(L.retenciones + L.pagosFrac), ''],
      [`<strong>Cuota diferencial (${L.cuotaDiferencial >= 0 ? 'a ingresar' : 'a devolver'})</strong>`, L.cuotaDiferencial, 'total']
    ];
    SIM.html('soc-tabla', `<thead><tr><th>Concepto</th><th>Importe (€)</th></tr></thead><tbody>`
      + filasT.map(([l, v, c]) => `<tr class="${c}"><td>${l}</td><td>${F.n0(v)}</td></tr>`).join('') + `</tbody>`);

    // Tabla de deducciones
    const filasD = [];
    if (on('soc-ded-id')) filasD.push([`I+D (gasto ${F.eur0(d.idGasto)}, media anterior ${F.eur0(d.idMedia)})`, `${F.pct(DD.idPct, 0)} + ${F.pct(DD.idExcesoPct, 0)} sobre el exceso`, L.idGen]);
    if (on('soc-ded-it')) filasD.push([`Innovación tecnológica (gasto ${F.eur0(d.itGasto)})`, F.pct(DD.itPct, 0), L.itGen]);
    if (on('soc-ded-don')) filasD.push([`Donativos (${F.eur0(d.donativo)}, base computable ${F.eur0(L.baseDonativos)})`, `${F.pct(d.donRecurrente ? DD.donativosRecPct : DD.donativosPct, 0)}, base máxima ${F.pct(DD.donativosLimiteBase, 0)} de la base imponible`, L.donGen]);
    if (on('soc-ded-ddi')) filasD.push(['Doble imposición internacional', 'importe directo, fuera del límite conjunto', L.ddiGenerada]);
    const totalGen = L.incentivosGen + L.ddiGenerada;
    SIM.html('soc-tabla-ded', filasD.length
      ? `<thead><tr><th>Deducción</th><th>Regla</th><th>Generada (€)</th></tr></thead><tbody>`
      + filasD.map(([a, b, v]) => `<tr><td>${a}</td><td style="text-align:left">${b}</td><td>${F.n0(v)}</td></tr>`).join('')
      + `<tr class="total"><td>Total generado / aplicado / pendiente</td><td style="text-align:left">límite conjunto ${F.pct(L.limitePctDed, 0)} de la cuota íntegra</td><td>${F.n0(totalGen)} / ${F.n0(L.totalDeducciones)} / ${F.n0(L.dedPendientes)}</td></tr></tbody>`
      : `<tbody><tr><td colspan="3" style="text-align:left;color:var(--gris)">Marca alguna deducción para verla aquí.</td></tr></tbody>`);

    /* Gráfico 1: tipo nominal frente a tipo efectivo según el resultado contable */
    const xs = [], efCont = [], efBase = [], nom = [];
    for (let r = 0; r <= 3000; r += 25) {
      const Lr = liquida(Object.assign({}, d, { rc: r * 1000 }));
      xs.push(r);
      efCont.push(Lr.efectivoContable == null ? 0 : Lr.efectivoContable * 100);
      efBase.push(Lr.efectivoBase == null ? 0 : Lr.efectivoBase * 100);
      nom.push(Lr.tipoNominal * 100);
    }
    SIM.chart('soc-chart-tipos', {
      type: 'line',
      data: {
        datasets: [
          { label: 'Tipo nominal (cuota íntegra / base imponible)', data: SIM.xy(xs, nom), borderColor: C.gris, borderDash: [5, 4], borderWidth: 1.8 },
          { label: 'Tipo efectivo sobre la base imponible', data: SIM.xy(xs, efBase), borderColor: C.naranja, borderWidth: 2 },
          { label: 'Tipo efectivo sobre el resultado contable', data: SIM.xy(xs, efCont), borderColor: C.azul, backgroundColor: SIM.alpha(C.azul, .08), fill: true, borderWidth: 2.4 }
        ]
      },
      options: {
        scales: {
          x: { type: 'linear', min: 0, max: 3000, title: { text: 'Resultado contable antes de impuestos (miles de €)' } },
          y: { min: 0, suggestedMax: 30, title: { text: 'Tipo (%)' } }
        },
        plugins: {
          refs: {
            points: (L.rc > 0 && L.rc <= 3000000 && L.efectivoContable != null)
              ? [{ x: L.rc / 1000, y: L.efectivoContable * 100, label: `${F.pct(L.efectivoContable, 1)} efectivo`, color: C.azul, dy: 16 },
                 { x: L.rc / 1000, y: L.tipoNominal * 100, label: `${F.pct(L.tipoNominal, 1)} nominal`, color: C.gris }]
              : [],
            x: (L.rc > 3000000) ? [{ value: 2985, label: `el escenario (${F.eur0(L.rc)}) se sale del eje →`, color: C.gris, align: 'right' }] : []
          },
          tooltip: { callbacks: { title: it => `Resultado contable ${F.eur0(it[0].parsed.x * 1000)}`, label: it => `${it.dataset.label}: ${F.n1(it.parsed.y)} %` } }
        }
      }
    });

    /* Gráfico 2: cascada horizontal */
    const etiq = ['Resultado contable', 'Ajustes positivos', 'Ajustes negativos', 'Base imponible previa', 'Bases negativas compensadas', 'Base imponible', 'Cuota íntegra', 'Deducciones', 'Cuota líquida', 'Retenciones y pagos', L.cuotaDiferencial >= 0 ? 'A ingresar' : 'A devolver'];
    const vals = [L.rc, L.ajPositivos, -L.ajNegativos, L.basePrevia, -L.binsCompensadas, L.base, L.cuotaIntegra, -L.totalDeducciones, L.cuotaLiquida, -(L.retenciones + L.pagosFrac), L.cuotaDiferencial];
    const cols = vals.map((v, i) => [3, 5, 6, 8].includes(i) ? C.azul : (i === 0 ? C.azulClaro : (i === 10 ? (v >= 0 ? C.rojo : C.verde) : C.naranja)));
    SIM.chart('soc-chart-cascada', {
      type: 'bar',
      data: { labels: etiq, datasets: [{ data: vals, backgroundColor: cols }] },
      options: {
        indexAxis: 'y',
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: it => F.eur0(it.parsed.x) } } },
        scales: { x: { title: { text: 'Euros' } }, y: { grid: { display: false }, title: { display: false } } }
      }
    });

    /* ---------- Parte B: doble imposición ---------- */
    const beneficio = Math.max(0, SIM.val('soc-b-beneficio'));
    const sistema = SIM.val('soc-b-sistema') || 'clasico';
    const DI = dobleImposicion(beneficio, d.tipoId, sistema);
    const SISTEMAS = [['clasico', 'Clásico (español)'], ['exencion', 'Exención del dividendo'], ['integracion', 'Integración plena']];
    const comp = SISTEMAS.map(([k, t]) => ({ k, t, r: dobleImposicion(beneficio, d.tipoId, k) }));

    SIM.show('socb-r-is', F.n0(DI.isSoportado));
    SIM.show('socb-r-div', F.n0(DI.dividendo));
    SIM.show('socb-r-irpf', F.n0(DI.irpfSocio));
    SIM.show('socb-r-neta', F.n0(DI.neta));
    SIM.show('socb-r-total', F.n0(DI.total));
    SIM.show('socb-r-comb', pctOrDash(DI.combinado, 1));

    // Comparación con el marginal máximo del IRPF y con el autónomo
    const margMax = marginalMaxIRPF();
    const aut = TAX.liquidaIRPF({ trabajoBruto: beneficio, cotizaciones: 0, otrosGastos: 0, retencionesTrabajo: 0 });
    const tipoAut = beneficio > 0 ? aut.cuotaLiquida / beneficio : 0;
    SIM.html('socb-tabla', `<thead><tr><th>Vía</th><th>Impuesto en la sociedad (€)</th><th>Impuesto en el socio (€)</th><th>Renta final (€)</th><th>Tipo combinado</th></tr></thead><tbody>`
      + comp.map(c => `<tr class="${c.k === sistema ? 'active-row' : ''}"><td>${c.t}</td><td>${F.n0(c.r.isSoportado)}</td><td>${F.n0(c.r.irpfSocio)}</td><td>${F.n0(c.r.neta)}</td><td>${F.pct(c.r.combinado, 1)}</td></tr>`).join('')
      + `<tr><td>Autónomo con la misma renta (aproximación)</td><td>—</td><td>${F.n0(aut.cuotaLiquida)}</td><td>${F.n0(beneficio - aut.cuotaLiquida)}</td><td>${F.pct(tipoAut, 1)}</td></tr>`
      + `<tr><td>Referencia: marginal máximo de la base general del IRPF</td><td>—</td><td>—</td><td>—</td><td>${F.pct(margMax, 1)}</td></tr></tbody>`);

    SIM.html('socb-aviso', `<strong>Supuestos de la comparación.</strong> El socio no tiene otras rentas y no se le aplica el mínimo personal sobre el dividendo; la escala del ahorro va del ${F.pct(TAX.P.irpf.escalas.ahorro[0][2], 0)} al ${F.pct(TAX.P.irpf.escalas.ahorro[TAX.P.irpf.escalas.ahorro.length - 1][2], 0)}. `
      + `La columna del autónomo es una <em>aproximación</em>: se calcula con la liquidación del IRPF tratando el beneficio como rendimiento del trabajo, sin cotizaciones ni otros gastos, así que sobreestima el neto de un autónomo real (que sí cotiza). `
      + (sistema === 'integracion' && DI.devolucionIS > 0.5 ? `En la integración plena, el IS pagado (${F.eur0(DI.is)}) supera la cuota del socio: los ${F.eur0(DI.devolucionIS)} de exceso se le devolverían.` : ''));

    /* Gráfico 3: reparto del beneficio en los tres sistemas */
    SIM.chart('soc-chart-doble', {
      type: 'bar',
      data: {
        labels: comp.map(c => c.t),
        datasets: [
          { label: 'IS de la sociedad', data: comp.map(c => c.r.isSoportado), backgroundColor: C.azul },
          { label: 'IRPF del socio', data: comp.map(c => c.r.irpfSocio), backgroundColor: C.rojo },
          { label: 'Renta neta del socio', data: comp.map(c => c.r.neta), backgroundColor: C.verde }
        ]
      },
      options: {
        plugins: { tooltip: { callbacks: { label: it => `${it.dataset.label}: ${F.eur0(it.parsed.y)}` } } },
        scales: { x: { stacked: true, grid: { display: false }, title: { text: 'Sistema de integración' } }, y: { stacked: true, title: { text: 'Euros' }, beginAtZero: true } }
      }
    });

    /* ---------- Lectura ---------- */
    let t = `<strong>Lectura.</strong> Con ${F.eur0(SIM.val('soc-ing'))} de ingresos y ${F.eur0(SIM.val('soc-gas') + SIM.val('soc-amort') + SIM.val('soc-gfin'))} de gastos (explotación, amortización y financieros) menos ${F.eur0(SIM.val('soc-ifin'))} de ingresos financieros, el resultado contable antes de impuestos es ${F.eur0(L.rc)}. `
      + `Los ajustes extracontables suman ${F.eur0(L.ajPositivos)} y restan ${F.eur0(L.ajNegativos)}, de modo que la base previa (${F.eur0(L.basePrevia)}) ${Math.abs(L.basePrevia - L.rc) < 1 ? 'coincide con el resultado contable' : (L.basePrevia > L.rc ? 'supera al resultado contable' : 'queda por debajo del resultado contable')}. `
      + (L.binsCompensadas > 0 ? `Se compensan ${F.eur0(L.binsCompensadas)} de bases negativas y la base imponible queda en ${F.eur0(L.base)}. ` : `La base imponible es ${F.eur0(L.base)}. `)
      + `Al tipo ${NOMBRE_TIPO[d.tipoId]} la cuota íntegra es ${F.eur0(L.cuotaIntegra)}; tras ${F.eur0(L.totalDeducciones)} de deducciones, la cuota líquida es ${F.eur0(L.cuotaLiquida)}. `
      + `Con ${F.eur0(L.retenciones + L.pagosFrac)} ya adelantados (retenciones y pagos fraccionados), el resultado es <strong>${L.cuotaDiferencial >= 0 ? 'a ingresar' : 'a devolver'} ${F.eur0(Math.abs(L.cuotaDiferencial))}</strong>.`;

    t += `<br><strong>Nominal frente a efectivo.</strong> El tipo nominal es ${pctOrDash(L.tipoNominal, 1)}, pero la sociedad paga ${pctOrDash(L.efectivoBase, 1)} sobre la base imponible y ${pctOrDash(L.efectivoContable, 1)} sobre el beneficio contable. `;
    if (L.efectivoContable != null && L.tipoNominal - L.efectivoContable > 0.005) {
      t += `La brecha de ${F.pp((L.tipoNominal - L.efectivoContable) * 100)} no es fraude: la abren la exención de dividendos (${F.eur0(L.exencionDiv)}), las bases negativas compensadas (${F.eur0(L.binsCompensadas)}) y las deducciones aplicadas (${F.eur0(L.totalDeducciones)}). Por eso el debate público sobre «lo que pagan las grandes empresas» depende por completo del denominador que se elija.`;
    } else if (L.efectivoContable != null && L.efectivoContable - L.tipoNominal > 0.005) {
      t += `Aquí el efectivo <em>supera</em> al nominal: los ajustes positivos (gastos no deducibles y exceso de amortización) elevan la base por encima del resultado contable.`;
    }

    t += `<br><strong>Doble imposición.</strong> De ${F.eur0(beneficio)} de beneficio, la sociedad paga ${F.eur0(DI.isSoportado)} y el socio ${F.eur0(DI.irpfSocio)} en el IRPF: le quedan ${F.eur0(DI.neta)}, un tipo combinado del ${F.pct(DI.combinado, 1)}. `
      + `Con exención total del dividendo el combinado sería ${F.pct(comp[1].r.combinado, 1)} y con integración plena ${F.pct(comp[2].r.combinado, 1)}. `
      + `El mismo beneficio obtenido como autónomo pagaría ${F.eur0(aut.cuotaLiquida)} (${F.pct(tipoAut, 1)}), frente al marginal máximo del ${F.pct(margMax, 1)} de la base general. `
      + `Ahí está la razón de que el ahorro tribute al ${F.pct(TAX.P.irpf.escalas.ahorro[0][2], 0)}-${F.pct(TAX.P.irpf.escalas.ahorro[TAX.P.irpf.escalas.ahorro.length - 1][2], 0)} y no a la tarifa general: si el dividendo pagara el ${F.pct(margMax, 1)} tras haber pagado ya el IS, el combinado se acercaría al 60 %.`;
    SIM.html('soc-interp', t);
  }

  /* ---------- Escenarios ---------- */
  const esc = cambios => Object.assign({}, BASE, cambios);
  SIM.register({
    id: 'sociedades', nav: 'Impuesto sobre sociedades', tema: 'Tema 4',
    title: 'Impuesto sobre Sociedades: de la cuenta de resultados a la cuota',
    subtitle: 'Liquidación completa del IS (Ley 27/2014 con la redacción vigente en 2025): resultado contable, ajustes extracontables, compensación de bases imponibles negativas con su límite, tipos por régimen, deducciones de la cuota con el límite conjunto y tributación mínima del 15 %. La segunda parte enlaza el IS con el IRPF del socio para medir la doble imposición del dividendo.',
    guia: {
      observa: [
        'El <strong>tipo nominal</strong> es el que figura en la ley; el <strong>tipo efectivo</strong> es lo que se paga sobre el beneficio contable. Mueve el resultado contable y mira cómo se separan las dos curvas.',
        'Los <strong>ajustes extracontables</strong> no son trampas: son diferencias entre la norma contable y la fiscal. Unos son <em>permanentes</em> (multas, exención de dividendos) y otros <em>temporarios</em> (amortizaciones), que solo cambian el año en que se paga.',
        'La <strong>compensación de bases negativas</strong> tiene un límite del 70 % de la base previa (50 % o 25 % para las grandes), pero con un suelo de 1 M€ siempre compensable: prueba con una base pequeña y verás que el límite no muerde.',
        'La <strong>tributación mínima del 15 %</strong> solo actúa cuando la cifra de negocios llega a 20 M€: pon 50 M€ con muchas deducciones y observa cómo parte de ellas queda pendiente para ejercicios siguientes.',
        'El beneficio societario paga <strong>dos veces</strong>: el IS en la sociedad y el IRPF del socio cuando se reparte. Por eso el ahorro tributa al 19-30 % y no a la tarifa general, que llega al 47 %.'
      ],
      pregunta: '«Si bajamos el tipo del Impuesto sobre Sociedades, las empresas invertirán más y al final se recaudará más.» ¿Qué tiene de cierto y qué de discutible este argumento tipo Laffer?',
      respuesta: 'Lo cierto: el IS grava una base muy móvil (el beneficio se puede deslocalizar), así que su elasticidad es alta y la curva de Laffer se dobla antes que en el IRPF; la evidencia sitúa el máximo recaudatorio bastante por encima de los tipos actuales de la UE, de modo que bajar del 25 % casi con seguridad recauda menos, no más. Lo discutible: la recaudación observada depende mucho más del tipo efectivo que del nominal. Como se ve en el simulador, las deducciones, la exención de dividendos y las bases negativas ya separan varios puntos el efectivo del nominal, así que bajar el tipo nominal actúa sobre una base ya erosionada. Si el objetivo es la inversión, ensanchar la base y sostener el tipo (o incentivos concretos como el de I+D) suele ser más eficaz que una rebaja general.'
    },
    presets: [
      {
        label: 'Pyme con beneficio de 300.000 €',
        values: esc({
          'soc-ing': 1175000, 'soc-gas': 800000, 'soc-amort': 60000, 'soc-gfin': 20000, 'soc-ifin': 5000,
          'soc-cifra': 1175000, 'soc-tipo': 'reducida',
          'soc-aj-nodeduc-on': true, 'soc-aj-nodeduc': 15000, 'soc-aj-amort-on': true, 'soc-aj-amort': 10000,
          'soc-aj-div-on': true, 'soc-aj-div': 40000, 'soc-aj-lib-on': true, 'soc-aj-lib': 20000,
          'soc-bins-on': true, 'soc-bins': 100000,
          'soc-ded-ddi-on': true, 'soc-ded-ddi': 8000,
          'soc-ret': 1500, 'soc-pf': 30000, 'soc-b-beneficio': 100000
        })
      },
      {
        label: 'Microempresa (cifra < 1 M€)',
        values: esc({
          'soc-ing': 450000, 'soc-gas': 330000, 'soc-amort': 20000, 'soc-gfin': 5000, 'soc-ifin': 0,
          'soc-cifra': 450000, 'soc-tipo': 'micro',
          'soc-aj-nodeduc-on': true, 'soc-aj-nodeduc': 3000,
          'soc-aj-amort-on': false, 'soc-aj-div-on': false, 'soc-aj-lib-on': false,
          'soc-bins-on': false, 'soc-bins': 0,
          'soc-ded-id-on': false, 'soc-ded-it-on': false, 'soc-ded-ddi-on': false,
          'soc-ded-don-on': true, 'soc-ded-don': 3000,
          'soc-ret': 300, 'soc-pf': 6000, 'soc-b-beneficio': 60000
        })
      },
      {
        label: 'Gran empresa con I+D y BINs',
        values: esc({
          'soc-ing': 52000000, 'soc-gas': 45000000, 'soc-amort': 1500000, 'soc-gfin': 600000, 'soc-ifin': 100000,
          'soc-cifra': 50000000, 'soc-tipo': 'general',
          'soc-aj-nodeduc-on': true, 'soc-aj-nodeduc': 120000, 'soc-aj-amort-on': true, 'soc-aj-amort': 200000,
          'soc-aj-div-on': true, 'soc-aj-div': 900000, 'soc-aj-lib-on': true, 'soc-aj-lib': 400000,
          'soc-bins-on': true, 'soc-bins': 3000000,
          'soc-ded-id-on': true, 'soc-ded-id': 800000, 'soc-ded-id-media': 500000,
          'soc-ded-it-on': true, 'soc-ded-it': 300000,
          'soc-ded-don-on': true, 'soc-ded-don': 150000, 'soc-ded-don-rec': true,
          'soc-ded-ddi-on': true, 'soc-ded-ddi': 90000,
          'soc-ret': 20000, 'soc-pf': 400000, 'soc-b-beneficio': 1000000
        })
      },
      {
        label: 'Empresa de nueva creación con pérdidas anteriores',
        values: esc({
          'soc-ing': 700000, 'soc-gas': 520000, 'soc-amort': 40000, 'soc-gfin': 15000, 'soc-ifin': 2000,
          'soc-cifra': 700000, 'soc-tipo': 'nueva',
          'soc-aj-nodeduc-on': true, 'soc-aj-nodeduc': 5000,
          'soc-aj-amort-on': false, 'soc-aj-div-on': false,
          'soc-aj-lib-on': true, 'soc-aj-lib': 60000,
          'soc-bins-on': true, 'soc-bins': 40000,
          'soc-ded-id-on': true, 'soc-ded-id': 90000, 'soc-ded-id-media': 30000,
          'soc-ded-it-on': false, 'soc-ded-don-on': false, 'soc-ded-ddi-on': false,
          'soc-ret': 200, 'soc-pf': 0, 'soc-pf-auto': true, 'soc-b-beneficio': 50000
        })
      },
      {
        label: 'Cooperativa',
        values: esc({
          'soc-ing': 2400000, 'soc-gas': 1900000, 'soc-amort': 150000, 'soc-gfin': 40000, 'soc-ifin': 10000,
          'soc-cifra': 2400000, 'soc-tipo': 'coop',
          'soc-aj-nodeduc-on': true, 'soc-aj-nodeduc': 8000,
          'soc-aj-amort-on': true, 'soc-aj-amort': 25000,
          'soc-aj-div-on': false, 'soc-aj-lib-on': true, 'soc-aj-lib': 50000,
          'soc-bins-on': false, 'soc-bins': 0,
          'soc-ded-id-on': false, 'soc-ded-it-on': true, 'soc-ded-it': 80000,
          'soc-ded-don-on': true, 'soc-ded-don': 10000, 'soc-ded-don-rec': false,
          'soc-ded-ddi-on': false,
          'soc-ret': 2500, 'soc-pf': 40000, 'soc-b-beneficio': 200000
        })
      }
    ],
    html, update
  });
})();
