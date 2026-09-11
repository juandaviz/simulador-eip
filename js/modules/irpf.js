/* Módulo IRPF 2025 (Tema 3 de HP II): liquidación completa con casillas para cada reducción y deducción */
(function () {
  'use strict';
  const F = SIM.fmt, C = SIM.color;

  /* ---------- Constructores de filas con casilla + cuantía ---------- */
  const BASE = {}; // valores por defecto de todos los controles (para los escenarios)
  function reg(id, v) { BASE[id] = v; return id; }

  // Fila: casilla + concepto + regla + importe (o número, o nada) + resultado calculado
  function fila(id, nombre, regla, o) {
    o = o || {};
    reg(id + '-on', !!o.on);
    let control = '';
    if (o.tipo === 'eur' || o.tipo === 'n') {
      reg(id, o.valor ?? 0);
      control = `<input type="number" id="${id}" min="0" step="${o.tipo === 'n' ? 1 : 1}" value="${o.valor ?? 0}" data-state placeholder="${o.tipo === 'n' ? 'n.º' : '€'}">`;
    } else if (o.tipo === 'sel') {
      reg(id, o.valor);
      control = `<select id="${id}" data-state>${o.opciones.map(([v, t]) => `<option value="${v}"${v == o.valor ? ' selected' : ''}>${t}</option>`).join('')}</select>`;
    }
    return `<div class="ded-row">
      <input type="checkbox" id="${id}-on" data-state${o.on ? ' checked' : ''}>
      <label for="${id}-on"><span class="nombre">${nombre}</span><span class="help">${regla}</span></label>
      <span class="ctrl">${control}</span>
      <span class="res" id="${id}-res"></span>
    </div>`;
  }
  const on = id => !!SIM.val(id + '-on');
  const imp = id => on(id) ? SIM.val(id) : 0;

  /* ---------- HTML ---------- */
  const filasAndalucia = TAX.ANDALUCIA.map(d => {
    const o = { tipo: d.tipo === 'si' ? null : (d.tipo === 'sel' ? 'sel' : (d.tipo === 'n' ? 'n' : 'eur')), valor: d.tipo === 'sel' ? d.opciones[0][0] : (d.tipo === 'n' ? 1 : 0), opciones: d.opciones };
    const lim = d.limite ? ` · renta ≤ ${F.n0(d.limite[0])} € (${F.n0(d.limite[1])} € en conjunta)` : '';
    return fila('and-' + d.clave, d.nombre, d.regla + lim, o);
  }).join('');

  const html = `
  <div class="grid-2">
    <div class="card">
      <h3>Rendimientos del trabajo</h3>
      ${SIM.slider(reg('irpf-bruto', 30000), { label: 'Salario bruto anual', min: 0, max: 150000, step: 500, value: 30000 })}
      <div class="row">
        ${SIM.number(reg('irpf-bruto-num', 30000), { label: 'Importe exacto (€)', value: 30000, step: 1 })}
        ${SIM.number(reg('irpf-cotiz', 1944), { label: 'Cotizaciones del trabajador (€)', value: 1944, step: 0.01 })}
        ${SIM.number(reg('irpf-ret', 4500), { label: 'Retenciones practicadas (€)', value: 4500, step: 1 })}
      </div>
      <div class="checkbox-group">${SIM.check(reg('irpf-cotiz-auto', true), 'Calcular las cotizaciones automáticamente (6,48 % hasta la base máxima)', true)}</div>

      <h3>Otras rentas</h3>
      <div class="row">
        ${SIM.number(reg('irpf-cap', 0), { label: 'Intereses y dividendos (€)', value: 0, step: 1 })}
        ${SIM.number(reg('irpf-gan', 0), { label: 'Ganancias netas de patrimonio (€)', value: 0, step: 1, min: -100000 })}
        ${SIM.number(reg('irpf-inmo', 0), { label: 'Alquileres: rendimiento neto reducido (€)', value: 0, step: 0.01, min: -100000 })}
        ${SIM.number(reg('irpf-imput', 0), { label: 'Imputación de rentas inmobiliarias (€)', value: 0, step: 1 })}
      </div>
      <p class="inline-note">Intereses, dividendos y ganancias forman la base del ahorro; alquileres e imputaciones van a la base general.</p>

      <h3>Situación personal y comunidad</h3>
      <div class="row">
        ${SIM.select(reg('irpf-ccaa', 'and'), { label: 'Comunidad autónoma (escala 2025)', value: 'and', options: [['and', 'Andalucía'], ['mad', 'Comunidad de Madrid'], ['est', 'Escala estatal ×2 (referencia)']] })}
        ${SIM.number(reg('irpf-hijos', 0), { label: 'Descendientes', value: 0, max: 8 })}
        ${SIM.number(reg('irpf-hijos3', 0), { label: 'De ellos, menores de 3 años', value: 0, max: 8 })}
        ${SIM.select(reg('irpf-disc', 'no'), { label: 'Discapacidad', value: 'no', options: [['no', 'No'], ['33', '≥ 33 %'], ['65', '≥ 65 %']] })}
      </div>
      <div class="checkbox-group">${SIM.check(reg('irpf-m65', false), 'Mayor de 65 años')} ${SIM.check(reg('irpf-m75', false), 'Mayor de 75 años')}</div>

      <h3>Reducciones de la base imponible</h3>
      <p class="inline-note">Restan de la base general (el remanente, de la del ahorro). Cada euro reducido ahorra el tipo <strong>marginal</strong>.</p>
      ${fila('red-plan', 'Aportación propia a planes de pensiones', 'límite 1.500 € y 30 % de los rendimientos del trabajo', { tipo: 'eur', valor: 1500 })}
      ${fila('red-planemp', 'Contribuciones de la empresa a planes de empleo', 'hasta 8.500 € adicionales, dentro del mismo 30 %', { tipo: 'eur', valor: 2000 })}
      ${fila('red-conyuge', 'Aportación al plan del cónyuge', 'cónyuge con rentas inferiores a 8.000 €; límite 1.000 €', { tipo: 'eur', valor: 1000 })}
      ${fila('red-pension', 'Pensión compensatoria al cónyuge (por sentencia)', 'sin límite', { tipo: 'eur', valor: 3000 })}
      ${fila('red-discap', 'Aportación a sistemas de previsión de una persona con discapacidad', 'límite 10.000 € por aportante', { tipo: 'eur', valor: 2000 })}
      ${fila('red-patrim', 'Aportación a un patrimonio protegido', 'límite 10.000 € por aportante', { tipo: 'eur', valor: 2000 })}
      ${fila('red-conjunta', 'Tributación conjunta', '3.400 € (unidad biparental) o 2.150 € (monoparental)', { tipo: 'sel', valor: 'bi', opciones: [['bi', 'Biparental, 3.400 €'], ['mono', 'Monoparental, 2.150 €']] })}

      <h3>Deducciones estatales de la cuota</h3>
      <p class="inline-note">Restan de la cuota íntegra: un euro de deducción vale un euro, sea cual sea el tipo marginal. No son reembolsables.</p>
      ${fila('ded-viv', 'Inversión en vivienda habitual', 'adquirida antes de 2013: 15 % de lo pagado, base máxima 9.040 €', { tipo: 'eur', valor: 6000 })}
      ${fila('ded-alq', 'Alquiler de la vivienda habitual', 'contrato anterior a 2015: 10,05 % de lo pagado, base máxima 9.040 €, solo con base imponible inferior a 24.107,20 €', { tipo: 'eur', valor: 6000 })}
      ${fila('ded-don', 'Donativos', '80 % de los primeros 250 € y 40 % del resto (45 % si es donante recurrente); partidos políticos 20 % hasta 600 €; otras entidades 10 %', { tipo: 'eur', valor: 300 })}
      <div class="ded-sub"><label>Destino ${(() => { reg('ded-don-tipo', '49'); return `<select id="ded-don-tipo" data-state><option value="49">Entidad de la Ley 49/2002 (ONG, fundaciones)</option><option value="prioritarias">Actividades prioritarias de mecenazgo (85 % / 45 %)</option><option value="partidos">Partidos políticos y sindicatos</option><option value="otras">Otras entidades</option></select>`; })()}</label>
        <label><input type="checkbox" id="${reg('ded-don-rec', false)}" data-state> Donante recurrente</label></div>
      ${fila('ded-emp', 'Inversión en empresas de nueva o reciente creación', '50 % de lo invertido, base máxima 100.000 €', { tipo: 'eur', valor: 10000 })}
      ${fila('ded-veh', 'Compra de un vehículo eléctrico', '15 % del valor de adquisición, base máxima 20.000 €', { tipo: 'eur', valor: 25000 })}
      ${fila('ded-rec', 'Instalación de un punto de recarga', '15 %, base máxima 4.000 €', { tipo: 'eur', valor: 1500 })}
      ${fila('ded-ef', 'Obras de eficiencia energética en la vivienda', '20 % (base máxima 5.000 €), 40 % (7.500 €) o 60 % (5.000 €) según la mejora acreditada', { tipo: 'eur', valor: 8000 })}
      <div class="ded-sub"><label>Porcentaje ${(() => { reg('ded-ef-pct', '20'); return `<select id="ded-ef-pct" data-state><option value="20">20 %: reduce un 7 % la demanda de calefacción y refrigeración</option><option value="40">40 %: reduce un 30 % la energía primaria no renovable o alcanza clase A o B</option><option value="60">60 %: rehabilitación energética del edificio</option></select>`; })()}</label></div>
      ${fila('ded-ley5', 'Deducción para rendimientos del trabajo bajos (Ley 5/2025)', 'hasta 340 € si los rendimientos íntegros no superan 16.576 €; decrece hasta 18.276 €. Se calcula sola', { on: true })}

      <h3>Deducciones reembolsables</h3>
      <p class="inline-note">Se descuentan del resultado aunque no haya cuota: Hacienda las paga si la cuota no las absorbe.</p>
      ${fila('ded-mat', 'Maternidad', '1.200 € por cada hijo menor de 3 años (madre que trabaja)', {})}
      ${fila('ded-fn', 'Familia numerosa', '1.200 € (general) o 2.400 € (especial)', { tipo: 'sel', valor: 'general', opciones: [['general', 'General, 1.200 €'], ['especial', 'Especial, 2.400 €']] })}
      ${fila('ded-dd', 'Descendientes o ascendientes con discapacidad a cargo', '1.200 € por cada uno', { tipo: 'n', valor: 1 })}

      <div id="irpf-bloque-and">
        <h3>Deducciones autonómicas de Andalucía</h3>
        <p class="inline-note">Solo minoran la cuota autonómica. Casi todas exigen no superar un límite de renta (base imponible general más ahorro).</p>
        ${filasAndalucia}
      </div>
      <h3 id="irpf-h-otras">Otras deducciones autonómicas</h3>
      ${fila('ded-aut', 'Importe directo de otras deducciones autonómicas', 'para cualquier comunidad: introduce la cuantía ya calculada', { tipo: 'eur', valor: 0 })}
    </div>

    <div class="card">
      <h3>Resultado de la liquidación</h3>
      <div class="results-grid">
        ${SIM.result('irpf-r-integra', 'Cuota íntegra', '€')}
        ${SIM.result('irpf-r-liquida', 'Cuota líquida', '€', 'green')}
        ${SIM.result('irpf-r-pagos', 'Pagos a cuenta y reembolsables', '€')}
        ${SIM.result('irpf-r-result', 'Resultado', '€', 'red')}
      </div>
      <div class="results-grid">
        ${SIM.result('irpf-r-marg', 'Tipo marginal', 'estatal + autonómico')}
        ${SIM.result('irpf-r-medio', 'Tipo medio', 'cuota líquida / renta bruta', 'green')}
        ${SIM.result('irpf-r-red', 'Reducciones aplicadas', '€')}
        ${SIM.result('irpf-r-ded', 'Deducciones aplicadas', '€')}
        ${SIM.result('irpf-r-perdidas', 'Deducciones perdidas', 'por falta de cuota', 'orange')}
      </div>
      <div class="liq-flow" id="irpf-flow"></div>
      <div class="aviso" id="irpf-aviso"></div>
      <h3>Tarifa general aplicada a la base liquidable</h3>
      <table class="tabla" id="irpf-tabla"></table>
      <h3>Reducciones y deducciones, una a una</h3>
      <table class="tabla" id="irpf-tabla-ded"></table>
    </div>
  </div>

  <div class="grid-2">
    <div class="card">
      <h3>Tipo marginal y tipo medio según el salario</h3>
      ${SIM.chartBox('irpf-chart-tipos', 320)}
      <p class="inline-note">La curva del tipo medio se calcula manteniendo el resto de rentas y circunstancias del escenario. El punto marca tu salario.</p>
    </div>
    <div class="card">
      <h3>De la renta bruta al resultado</h3>
      ${SIM.chartBox('irpf-chart-cascada', 320)}
    </div>
  </div>
  <div class="card interpretation" id="irpf-interp"></div>`;

  /* ---------- Lectura de controles ---------- */
  function leer() {
    const bruto = SIM.val('irpf-bruto-num');
    const auto = SIM.val('irpf-cotiz-auto');
    const andalucia = {};
    TAX.ANDALUCIA.forEach(d => {
      const id = 'and-' + d.clave;
      if (!on(id)) return;
      andalucia[d.clave] = d.tipo === 'si' ? true : SIM.val(id);
    });
    return {
      trabajoBruto: bruto,
      cotizaciones: auto ? null : SIM.val('irpf-cotiz'),
      retencionesTrabajo: SIM.val('irpf-ret'),
      capitalMobiliario: SIM.val('irpf-cap'), gananciasNetas: SIM.val('irpf-gan'),
      inmobiliarioNeto: SIM.val('irpf-inmo'), imputacion: SIM.val('irpf-imput'),
      ccaa: SIM.val('irpf-ccaa'), hijos: SIM.val('irpf-hijos'), hijosMenores3: SIM.val('irpf-hijos3'),
      discapacidad: SIM.val('irpf-disc'), mayor65: SIM.val('irpf-m65'), mayor75: SIM.val('irpf-m75'),
      planPensiones: imp('red-plan'), planEmpresa: imp('red-planemp'), planConyuge: imp('red-conyuge'),
      pensionCompensatoria: imp('red-pension'), previsionDiscapacidad: imp('red-discap'), patrimonioProtegido: imp('red-patrim'),
      conjunta: on('red-conjunta') ? SIM.val('red-conjunta') : 'no',
      viviendaBase: imp('ded-viv'), alquilerPagado: imp('ded-alq'),
      donativos: imp('ded-don'), donativosTipo: SIM.val('ded-don-tipo'), donativosRecurrente: SIM.val('ded-don-rec'),
      empresaNueva: imp('ded-emp'), vehiculoElectrico: imp('ded-veh'), puntoRecarga: imp('ded-rec'),
      eficienciaImporte: imp('ded-ef'), eficienciaPct: on('ded-ef') ? +SIM.val('ded-ef-pct') : 0,
      aplicarLey52025: on('ded-ley5'),
      maternidad: on('ded-mat'), familiaNumerosa: on('ded-fn') ? SIM.val('ded-fn') : 'no', descendientesDiscapacidad: imp('ded-dd'),
      dedAutonomicas: imp('ded-aut'), andalucia
    };
  }

  function init(root) {
    const sl = root.querySelector('#irpf-bruto'), num = root.querySelector('#irpf-bruto-num');
    sl.addEventListener('input', () => { num.value = sl.value; });
    num.addEventListener('input', () => { sl.value = Math.min(Math.max(num.value, sl.min), sl.max); });
  }

  const NOMBRES = {
    prevision: 'Planes de pensiones y de empleo', conyuge: 'Plan del cónyuge', pensionCompensatoria: 'Pensión compensatoria', previsionDiscapacidad: 'Previsión de persona con discapacidad', patrimonioProtegido: 'Patrimonio protegido', conjunta: 'Tributación conjunta',
    vivienda: 'Inversión en vivienda habitual', alquiler: 'Alquiler de vivienda habitual', donativos: 'Donativos', empresaNueva: 'Empresas de nueva creación', vehiculo: 'Vehículo eléctrico y punto de recarga', eficiencia: 'Eficiencia energética', ley52025: 'Ley 5/2025 (rendimientos bajos)', autonomicas: 'Autonómicas',
    maternidad: 'Maternidad', familiaNumerosa: 'Familia numerosa', descendientesDiscapacidad: 'Discapacidad a cargo'
  };

  function update(root) {
    const p = leer();
    // controles dependientes
    const cotizEl = document.getElementById('irpf-cotiz');
    cotizEl.disabled = !!SIM.val('irpf-cotiz-auto');
    if (cotizEl.disabled) cotizEl.value = TAX.cotizacionTrabajador(p.trabajoBruto).toFixed(2);
    root.querySelectorAll('.ded-row').forEach(r => {
      const cb = r.querySelector('input[type=checkbox]'); const ctrl = r.querySelector('.ctrl input, .ctrl select');
      if (ctrl) ctrl.disabled = !cb.checked;
      r.classList.toggle('activa', cb.checked);
    });
    document.getElementById('irpf-bloque-and').hidden = p.ccaa !== 'and';
    SIM.show('irpf-bruto-val', F.eur0(p.trabajoBruto));

    const L = TAX.liquidaIRPF(p);
    const ccaaNombre = TAX.CCAA[p.ccaa].nombre;

    // Resultados
    SIM.show('irpf-r-integra', F.n2(L.cuotaIntegra));
    SIM.show('irpf-r-liquida', F.n2(L.cuotaLiquida));
    SIM.show('irpf-r-pagos', F.n2(L.pagosACuenta + L.totalReembolsables));
    const rb = document.getElementById('irpf-r-result');
    rb.textContent = (L.resultado >= 0 ? 'A ingresar ' : 'A devolver ') + F.n2(Math.abs(L.resultado));
    rb.parentElement.className = 'result-box ' + (L.resultado > 0 ? 'red' : 'green');
    SIM.show('irpf-r-marg', F.pct(L.marginalGeneral, 1));
    SIM.show('irpf-r-medio', F.pct(L.tipoMedio, 1));
    SIM.show('irpf-r-red', F.n2(L.reduccionesGeneral + L.reduccionesAhorro));
    SIM.show('irpf-r-ded', F.n2(L.totalDeducciones));
    SIM.show('irpf-r-perdidas', F.n2(L.totalPerdidas));

    // Resultado calculado junto a cada fila
    const R = L.reducciones, D = L.deducciones, A = L.deduccionesAplicadas;
    const resFila = (id, v, activo) => SIM.show(id + '-res', activo ? (v > 0 ? F.eur(v, 2) : '0,00 €') : '');
    resFila('red-plan', Math.min(Math.max(0, p.planPensiones), 1500), on('red-plan'));
    resFila('red-planemp', Math.min(Math.max(0, p.planEmpresa), 8500), on('red-planemp'));
    resFila('red-conyuge', R.conyuge, on('red-conyuge')); resFila('red-pension', R.pensionCompensatoria, on('red-pension'));
    resFila('red-discap', R.previsionDiscapacidad, on('red-discap')); resFila('red-patrim', R.patrimonioProtegido, on('red-patrim'));
    resFila('red-conjunta', R.conjunta, on('red-conjunta'));
    resFila('ded-viv', D.vivienda, on('ded-viv')); resFila('ded-alq', D.alquiler, on('ded-alq')); resFila('ded-don', D.donativos, on('ded-don'));
    resFila('ded-emp', D.empresaNueva, on('ded-emp')); resFila('ded-veh', 0.15 * Math.min(p.vehiculoElectrico, 20000), on('ded-veh')); resFila('ded-rec', 0.15 * Math.min(p.puntoRecarga, 4000), on('ded-rec'));
    resFila('ded-ef', D.eficiencia, on('ded-ef')); resFila('ded-ley5', D.ley52025, on('ded-ley5'));
    resFila('ded-mat', L.reembolsables.maternidad, on('ded-mat')); resFila('ded-fn', L.reembolsables.familiaNumerosa, on('ded-fn')); resFila('ded-dd', L.reembolsables.descendientesDiscapacidad, on('ded-dd'));
    resFila('ded-aut', p.dedAutonomicas, on('ded-aut'));
    TAX.ANDALUCIA.forEach(d => {
      const id = 'and-' + d.clave; const it = L.andalucia.items.find(x => x.clave === d.clave);
      const el = document.getElementById(id + '-res');
      if (!on(id) || !it) { el.textContent = ''; el.className = 'res'; return; }
      el.textContent = it.excede ? `no aplicable: renta > ${F.n0(it.limite)} €` : F.eur(it.importe, 2);
      el.className = 'res' + (it.excede ? ' no' : '');
    });

    // Cascada
    const pasos = [
      ['Bruto trabajo', L.params.trabajoBruto, ''],
      ['− Cotizaciones y gastos', -(L.cotizaciones + L.otrosGastos), 'negative'],
      ['− Reducción art. 20', -L.redTrabajo, 'negative'],
      ['Base general', L.baseGeneral, 'hito'],
      ['Base ahorro', L.baseAhorro, 'hito'],
      ['− Reducciones', -(L.reduccionesGeneral + L.reduccionesAhorro), 'negative'],
      ['Cuota íntegra', L.cuotaIntegra, 'hito'],
      ['− Deducciones', -L.totalDeducciones, 'negative'],
      ['Cuota líquida', L.cuotaLiquida, 'hito'],
      ['− Pagos a cuenta', -L.pagosACuenta, 'negative'],
      ['− Reembolsables', -L.totalReembolsables, 'negative'],
      [L.resultado >= 0 ? 'A ingresar' : 'A devolver', L.resultado, L.resultado >= 0 ? 'negative' : 'positive']
    ];
    SIM.html('irpf-flow', pasos.map(([l, v, c], i) => `${i ? '<span class="liq-arrow">→</span>' : ''}<div class="liq-step ${c}"><div class="liq-label">${l}</div><div class="liq-value">${F.eur(v, 2)}</div></div>`).join(''));

    // Aviso
    let aviso = `<strong>Mínimo personal y familiar:</strong> ${F.eur0(L.minimo.total)}, aplicado como tramo a tipo cero `
      + `(descuenta ${F.eur(L.escalas.estatalMin.cuota + L.escalas.autonomicaMin.cuota, 2)} de la cuota general`
      + (L.minAhorro > 0 ? ` y el remanente de ${F.eur0(L.minAhorro)} pasa a la base del ahorro` : '') + `). `;
    if (L.totalPerdidas > 0.005) {
      const det = Object.entries(L.deduccionesPerdidas).filter(([, v]) => v > 0.005).map(([k, v]) => `${NOMBRES[k]} ${F.eur(v, 2)}`).join(', ');
      aviso += `<span class="perdida">Se pierden ${F.eur(L.totalPerdidas, 2)} de deducciones</span> (${det}): las deducciones en cuota no son reembolsables y las autonómicas solo pueden absorber la cuota autonómica.`;
    } else if (L.totalDeducciones > 0) {
      aviso += `Todas las deducciones se han podido aplicar.`;
    }
    if (L.totalReducciones > L.reduccionesGeneral + L.reduccionesAhorro + 0.005) aviso += ` <span class="perdida">${F.eur(L.totalReducciones - L.reduccionesGeneral - L.reduccionesAhorro, 2)} de reducciones no caben en la base</span> (el exceso se trasladaría a ejercicios siguientes).`;
    SIM.html('irpf-aviso', aviso);

    // Tabla de tramos
    const est = L.escalas.estatal.desglose, aut = L.escalas.autonomica.desglose;
    const filas = [];
    const cortes = [...new Set([...est.map(t => t.desde), ...aut.map(t => t.desde)])].sort((a, b) => a - b);
    let acum = 0;
    cortes.forEach((desde, i) => {
      const hasta = cortes[i + 1] ?? Infinity;
      const tE = est.find(t => desde >= t.desde && desde < t.hasta), tA = aut.find(t => desde >= t.desde && desde < t.hasta);
      const tipo = tE.tipo + tA.tipo;
      const baseTramo = Math.max(0, Math.min(L.baseLiqGeneral, hasta) - desde);
      const cuota = baseTramo * tipo; acum += cuota;
      const activo = L.baseLiqGeneral > desde && L.baseLiqGeneral <= hasta;
      if (baseTramo === 0 && desde > L.baseLiqGeneral && i > 0 && !activo) return;
      filas.push(`<tr class="${activo ? 'active-row' : ''}"><td>${F.n0(desde)} – ${hasta === Infinity ? '∞' : F.n0(hasta)} €</td><td>${F.pct(tE.tipo, 1)}</td><td>${F.pct(tA.tipo, 1)}</td><td><strong>${F.pct(tipo, 1)}</strong></td><td>${F.n2(baseTramo)}</td><td>${F.n2(cuota)}</td><td>${F.n2(acum)}</td></tr>`);
    });
    SIM.html('irpf-tabla', `<thead><tr><th>Tramo de base liquidable</th><th>Estatal</th><th>${p.ccaa === 'est' ? 'Autonómica' : ccaaNombre}</th><th>Marginal</th><th>Base en el tramo</th><th>Cuota del tramo</th><th>Acumulada</th></tr></thead><tbody>${filas.join('')}</tbody>`);

    // Tabla de reducciones y deducciones aplicadas
    const filasD = [];
    Object.entries(R).forEach(([k, v]) => { if (v > 0) filasD.push(`<tr><td>Reducción · ${NOMBRES[k]}</td><td>${F.n2(v)}</td><td>${F.n2(v * L.marginalGeneral)}</td><td>ahorra el marginal (${F.pct(L.marginalGeneral, 0)})</td></tr>`); });
    ['vivienda', 'alquiler', 'donativos', 'empresaNueva', 'vehiculo', 'eficiencia', 'ley52025', 'autonomicas'].forEach(k => {
      if (D[k] > 0) filasD.push(`<tr><td>Deducción · ${NOMBRES[k]}</td><td>${F.n2(D[k])}</td><td>${F.n2(A[k])}</td><td>${L.deduccionesPerdidas[k] > 0.005 ? `<span class="perdida">se pierden ${F.n2(L.deduccionesPerdidas[k])}</span>` : 'aplicada íntegra'}</td></tr>`);
    });
    Object.entries(L.reembolsables).forEach(([k, v]) => { if (v > 0) filasD.push(`<tr><td>Reembolsable · ${NOMBRES[k]}</td><td>${F.n2(v)}</td><td>${F.n2(v)}</td><td>se cobra aunque no haya cuota</td></tr>`); });
    SIM.html('irpf-tabla-ded', filasD.length
      ? `<thead><tr><th>Concepto</th><th>Cuantía (€)</th><th>Efecto en la cuota (€)</th><th></th></tr></thead><tbody>${filasD.join('')}</tbody>`
      : `<tbody><tr><td colspan="4" style="text-align:left;color:var(--gris)">Marca alguna casilla de reducción o deducción para verla aquí.</td></tr></tbody>`);

    // Gráfico 1: marginal y tipo medio según el salario bruto
    const xs = [], marg = [], medio = [], medioSinDed = [];
    for (let b = 0; b <= 150000; b += 1000) {
      const Lb = TAX.liquidaIRPF(Object.assign({}, p, { trabajoBruto: b, cotizaciones: p.cotizaciones == null ? null : TAX.cotizacionTrabajador(b), retencionesTrabajo: 0 }));
      xs.push(b / 1000); marg.push(Lb.marginalGeneral * 100); medio.push(Lb.tipoMedio * 100);
      medioSinDed.push(Lb.rentaBrutaTotal > 0 ? Lb.cuotaIntegra / Lb.rentaBrutaTotal * 100 : 0);
    }
    SIM.chart('irpf-chart-tipos', {
      type: 'line',
      data: { datasets: [
        { label: 'Tipo marginal', data: SIM.xy(xs, marg), borderColor: C.rojo, stepped: true, borderWidth: 2 },
        { label: 'Tipo medio antes de deducciones', data: SIM.xy(xs, medioSinDed), borderColor: C.gris, borderDash: [5, 4], borderWidth: 1.5 },
        { label: 'Tipo medio (cuota líquida / renta bruta)', data: SIM.xy(xs, medio), borderColor: C.azul, backgroundColor: SIM.alpha(C.azul, .08), fill: true, borderWidth: 2.4 }
      ] },
      options: {
        scales: { x: { type: 'linear', min: 0, max: 150, title: { text: 'Salario bruto (miles de €)' } }, y: { min: 0, max: 50, title: { text: 'Tipo (%)' } } },
        plugins: { refs: { points: [{ x: p.trabajoBruto / 1000, y: L.tipoMedio * 100, label: `${F.pct(L.tipoMedio, 1)} medio`, color: C.azul, dy: 16 }, { x: p.trabajoBruto / 1000, y: L.marginalGeneral * 100, label: `${F.pct(L.marginalGeneral, 1)} marginal`, color: C.rojo }] },
          tooltip: { callbacks: { title: it => `Salario ${F.n0(it[0].parsed.x * 1000)} €`, label: it => `${it.dataset.label}: ${F.n1(it.parsed.y)} %` } } }
      }
    });

    // Gráfico 2: cascada
    const etiquetas = ['Renta bruta total', 'Cotizaciones y gastos', 'Reducción art. 20', 'Reducciones', 'Bases liquidables', 'Cuota íntegra', 'Deducciones', 'Cuota líquida', 'Pagos a cuenta y reembolsables', L.resultado >= 0 ? 'A ingresar' : 'A devolver'];
    const valores = [L.rentaBrutaTotal, -(L.cotizaciones + L.otrosGastos), -L.redTrabajo, -(L.reduccionesGeneral + L.reduccionesAhorro), L.baseLiqGeneral + L.baseLiqAhorro, L.cuotaIntegra, -L.totalDeducciones, L.cuotaLiquida, -(L.pagosACuenta + L.totalReembolsables), L.resultado];
    const colores = valores.map((v, i) => [4, 5, 7].includes(i) ? C.azul : (i === 0 ? C.azulClaro : (i === 9 ? (v >= 0 ? C.rojo : C.verde) : C.naranja)));
    SIM.chart('irpf-chart-cascada', {
      type: 'bar',
      data: { labels: etiquetas, datasets: [{ data: valores, backgroundColor: colores }] },
      options: { indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { label: it => F.eur(it.parsed.x, 2) } } },
        scales: { x: { title: { text: 'Euros' } }, y: { grid: { display: false }, title: { display: false } } } }
    });

    // Lectura
    const otraCcaa = p.ccaa !== 'mad' ? 'mad' : 'and';
    const comp = TAX.liquidaIRPF(Object.assign({}, p, { ccaa: otraCcaa, dedAutonomicas: 0, andalucia: null }));
    const otra = otraCcaa === 'mad' ? 'Madrid' : 'Andalucía';
    const dif = L.cuotaLiquida - comp.cuotaLiquida;
    let t = `<strong>Lectura.</strong> Con ${F.eur0(p.trabajoBruto)} de salario bruto en ${ccaaNombre}, el rendimiento neto del trabajo queda en ${F.eur(L.rnTrabajo, 2)} `
      + `(tras ${F.eur(L.cotizaciones, 2)} de cotizaciones y ${F.eur0(L.otrosGastos)} de otros gastos)`
      + (L.redTrabajo > 0 ? ` y la reducción del art. 20 lo baja a ${F.eur(L.rnTrabajoReducido, 2)}` : '') + `. `
      + `La base imponible general es ${F.eur(L.baseGeneral, 2)}` + (L.baseAhorro > 0 ? ` y la del ahorro ${F.eur(L.baseAhorro, 2)}` : '')
      + (L.reduccionesGeneral + L.reduccionesAhorro > 0 ? `; las reducciones (${F.eur(L.reduccionesGeneral + L.reduccionesAhorro, 2)}) dejan la base liquidable general en ${F.eur(L.baseLiqGeneral, 2)}` : '') + `. `
      + `La cuota íntegra suma ${F.eur(L.cuotaIntegra, 2)} (estatal ${F.eur(L.cuotaIntegraEstatal, 2)}, autonómica ${F.eur(L.cuotaIntegraAutonomica, 2)}); `
      + `tras ${F.eur(L.totalDeducciones, 2)} de deducciones, la cuota líquida es ${F.eur(L.cuotaLiquida, 2)}: un tipo medio del ${F.pct(L.tipoMedio, 1)} frente a un marginal del ${F.pct(L.marginalGeneral, 1)}. `
      + `Con ${F.eur(L.pagosACuenta, 2)} ya adelantados` + (L.totalReembolsables ? ` y ${F.eur0(L.totalReembolsables)} de deducciones reembolsables` : '') + `, el resultado es <strong>${L.resultado >= 0 ? 'a ingresar' : 'a devolver'} ${F.eur(Math.abs(L.resultado), 2)}</strong>. `;
    if (L.reduccionesGeneral > 0) t += `<br><strong>Reducción frente a deducción.</strong> Los ${F.eur0(L.reduccionesGeneral)} de reducciones ahorran ${F.eur(L.reduccionesGeneral * L.marginalGeneral, 2)}, el tipo marginal: valen más para quien más gana. Una deducción del mismo importe ahorraría los ${F.eur0(L.reduccionesGeneral)} enteros a cualquiera con cuota suficiente.`;
    t += `<br><strong>Competencia fiscal (Tema 10).</strong> El mismo contribuyente en ${otra}, sin deducciones autonómicas, pagaría ${F.eur(comp.cuotaLiquida, 2)}: `
      + (Math.abs(dif) < 0.5 ? 'prácticamente lo mismo.' : `${F.eur(Math.abs(dif), 2)} ${dif > 0 ? 'menos' : 'más'}. `
        + (p.ccaa === 'and' && L.deducciones.autonomicas > 0 ? `Ojo: comparar solo las escalas exagera la diferencia, porque al mudarse se perderían los ${F.eur(L.deducciones.autonomicas, 2)} de deducciones andaluzas.` : ''));
    SIM.html('irpf-interp', t);
  }

  /* ---------- Escenarios ---------- */
  const esc = (cambios) => Object.assign({}, BASE, cambios);
  SIM.register({
    id: 'irpf', nav: 'IRPF 2025', tema: 'Tema 3', resetCero: false,
    title: 'Simulador del IRPF español (ejercicio 2025)',
    subtitle: 'Liquidación completa con escala estatal y autonómica (Andalucía, Madrid), base general y del ahorro, mínimo personal y familiar como tramo a tipo cero, y casillas con su cuantía para cada reducción de la base y cada deducción de la cuota: estatales, reembolsables y las diecisiete autonómicas de Andalucía. Cuantías y límites de la guía del Modelo 100 de 2025.',
    guia: {
      observa: [
        'El <strong>tipo medio</strong> (lo que pagas sobre lo que ganas) está siempre por debajo del <strong>marginal</strong> (lo que pagas del último euro). Mueve el salario y mira cuánto tardan en acercarse.',
        'Una <strong>reducción</strong> resta de la base y ahorra el tipo marginal: vale más para las rentas altas. Una <strong>deducción</strong> resta de la cuota y vale lo mismo para todos, mientras haya cuota.',
        'Las deducciones en cuota <strong>no son reembolsables</strong>: con salarios bajos se pierden (marca la Ley 5/2025 con el SMI). Las reembolsables (maternidad, familia numerosa) se cobran aunque la cuota sea cero.',
        'El mínimo personal no se resta de la base: se aplica como <em>tramo a tipo cero</em>. Por eso vale lo mismo para quien gana 20.000 € que para quien gana 200.000 €.',
        'Las deducciones autonómicas solo pueden absorber la cuota autonómica y casi todas tienen límite de renta: prueba a subir el salario por encima de 25.000 € con una deducción andaluza marcada.'
      ],
      pregunta: 'Un contribuyente andaluz con 30.000 € de salario dice que «Hacienda se lleva el 30 % de mi sueldo». ¿Qué confunde?',
      respuesta: 'Confunde el tipo marginal (30 % entre 21.100 y 35.200 € de base liquidable) con el tipo medio, que en este escenario ronda el 17-18 % de la renta bruta. El 30 % solo se aplica a los euros del último tramo.'
    },
    presets: [
      { label: 'Salario mínimo (16.576 €)', values: esc({ 'irpf-bruto': 16576, 'irpf-bruto-num': 16576, 'irpf-ret': 300, 'and-deporte-on': true, 'and-deporte': 400 }) },
      { label: 'Salario medio (29.540 €)', values: esc({ 'irpf-bruto': 29540, 'irpf-bruto-num': 29540, 'irpf-ret': 4300 }) },
      { label: 'Salario medio, dos hijos y alquiler', values: esc({ 'irpf-bruto': 29540, 'irpf-bruto-num': 29540, 'irpf-ret': 4300, 'irpf-hijos': 2, 'irpf-hijos3': 1, 'ded-mat-on': true, 'and-alquiler-on': true, 'and-alquiler': 7200, 'and-educacion-on': true, 'and-educacion': 800 }) },
      { label: 'Con plan de pensiones y donativos', values: esc({ 'irpf-bruto': 45000, 'irpf-bruto-num': 45000, 'irpf-ret': 8500, 'red-plan-on': true, 'red-plan': 1500, 'ded-don-on': true, 'ded-don': 300 }) },
      { label: 'Rentas altas con ahorro (120.000 €)', values: esc({ 'irpf-bruto': 120000, 'irpf-bruto-num': 120000, 'irpf-ret': 40000, 'irpf-cap': 5000, 'irpf-gan': 10000, 'red-plan-on': true, 'red-plan': 1500, 'red-planemp-on': true, 'red-planemp': 4000, 'ded-veh-on': true, 'ded-veh': 25000 }) }
    ],
    html, init, update
  });
})();
