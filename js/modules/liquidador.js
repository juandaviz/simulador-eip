/* Módulo: liquidar un impuesto (Tema 1)
   Recorre los ocho pasos de la liquidación —del hecho imponible a la deuda tributaria—
   con una tarifa por tramos editable y tres modos: progresivo por tramos, tipo fijo
   (proporcional) e impuesto de suma fija. Las cifras van en «u.m.» (unidades monetarias)
   para que el ejemplo del manual (base 220 → cuota 19) se reconozca sin ruido de euros. */
(function () {
  'use strict';
  const F = SIM.fmt, C = SIM.color;

  // Formato corto en unidades monetarias
  const um = (v, d) => (d === 0 ? F.n0(v) : F.n2(v)) + ' u.m.';

  // Objeto y hecho imponible: solo cambia el relato, no el cálculo
  const HECHOS = {
    renta: {
      nombre: 'Renta de una persona física',
      objeto: 'la renta obtenida por una persona física durante el año',
      hecho: 'obtener rendimientos del trabajo, del capital o ganancias patrimoniales',
      base: 'la renta neta del período', ejemplo: 'IRPF'
    },
    consumo: {
      nombre: 'Consumo de bienes y servicios',
      objeto: 'la capacidad económica que se manifiesta al gastar',
      hecho: 'la entrega de bienes o la prestación de servicios por un empresario',
      base: 'el importe de la contraprestación', ejemplo: 'IVA'
    },
    patrimonio: {
      nombre: 'Titularidad de un patrimonio',
      objeto: 'la riqueza acumulada, no la renta del año',
      hecho: 'ser titular de un patrimonio neto a 31 de diciembre',
      base: 'el valor de los bienes y derechos menos las deudas', ejemplo: 'Impuesto sobre el Patrimonio'
    },
    sucesiones: {
      nombre: 'Herencia o donación recibida',
      objeto: 'el enriquecimiento gratuito de quien recibe',
      hecho: 'la adquisición de bienes por herencia, legado o donación',
      base: 'el valor neto de lo adquirido', ejemplo: 'Impuesto sobre Sucesiones y Donaciones'
    }
  };

  /* ---------------- HTML ---------------- */
  const filaTarifa = (i, desde, hasta, tipo, editableHasta) => `
    <tr id="liq-fila${i}">
      <td>${i}.º</td>
      <td id="liq-d${i}">${desde}</td>
      <td>${editableHasta
        ? `<input type="number" id="liq-h${i}" value="${hasta}" step="10" min="0" max="10000" data-state>`
        : 'en adelante'}</td>
      <td><input type="number" id="liq-t${i}" value="${tipo}" step="1" min="0" max="100" data-state></td>
    </tr>`;

  const html = `
  <div class="grid-2">
    <div class="card">
      <h3>1. Objeto y hecho imponible</h3>
      ${SIM.select('liq-hecho', {
        label: '¿Qué manifestación de capacidad económica se grava?',
        value: 'renta',
        options: Object.entries(HECHOS).map(([k, v]) => [k, v.nombre])
      })}
      <p class="inline-note" id="liq-hecho-txt"></p>

      <h3>2. De la base imponible a la base liquidable</h3>
      ${SIM.slider('liq-base', { label: 'Base imponible', help: 'la medida del hecho imponible', min: 0, max: 1000, step: 5, value: 220 })}
      <div class="row">
        ${SIM.number('liq-red', { label: 'Reducciones de la base (u.m.)', value: 0, step: 5, max: 1000 })}
      </div>

      <h3>3. La tarifa</h3>
      ${SIM.select('liq-modo', {
        label: 'Tipo de tarifa',
        value: 'tramos',
        options: [['tramos', 'Progresiva por tramos'], ['fijo', 'Tipo fijo (proporcional)'], ['sumafija', 'Suma fija (cuota constante)']]
      })}
      <div id="liq-box-tramos">
        <table class="tabla">
          <thead><tr><th>Tramo</th><th>Desde (u.m.)</th><th>Hasta (u.m.)</th><th>Tipo (%)</th></tr></thead>
          <tbody>
            ${filaTarifa(1, 0, 100, 5, true)}
            ${filaTarifa(2, 100, 200, 10, true)}
            ${filaTarifa(3, 200, 300, 20, true)}
            ${filaTarifa(4, 300, 500, 30, true)}
            ${filaTarifa(5, 500, null, 40, false)}
          </tbody>
        </table>
        <p class="inline-note">Cambia los límites y los tipos: la tarifa por defecto es la del manual (5, 10, 20, 30 y 40 %).</p>
      </div>
      <div id="liq-box-fijo" class="row">
        ${SIM.number('liq-tfijo', { label: 'Tipo fijo (%)', value: 10, step: 0.5, max: 100 })}
      </div>
      <div id="liq-box-fija" class="row">
        ${SIM.number('liq-fija', { label: 'Cuota de suma fija (u.m.)', value: 10, step: 1, max: 1000 })}
      </div>

      <h3>4. De la cuota íntegra a la deuda</h3>
      <div class="row">
        ${SIM.number('liq-ded', { label: 'Deducciones en cuota (u.m.)', value: 0, step: 1, max: 1000 })}
        ${SIM.number('liq-pagos', { label: 'Pagos a cuenta (u.m.)', value: 0, step: 1, max: 1000 })}
        ${SIM.number('liq-rec', { label: 'Recargos e intereses (u.m.)', value: 0, step: 1, max: 1000 })}
      </div>
      <p class="inline-note">Las reducciones actúan sobre la <em>base</em>; las deducciones, sobre la <em>cuota</em>. No valen lo mismo.</p>
    </div>

    <div class="card">
      <h3>Resultado de la liquidación</h3>
      <div class="results-grid">
        ${SIM.result('liq-r-integra', 'Cuota íntegra', 'u.m.')}
        ${SIM.result('liq-r-deuda', 'Deuda tributaria', 'u.m.', 'red')}
        ${SIM.result('liq-r-medio', 'Tipo medio', 'cuota íntegra / base liquidable', 'green')}
        ${SIM.result('liq-r-marg', 'Tipo marginal', 'de la última u.m.')}
      </div>
      <div class="results-grid">
        ${SIM.result('liq-r-liquida', 'Cuota líquida', 'u.m.')}
        ${SIM.result('liq-r-difer', 'Cuota diferencial', 'u.m.')}
        ${SIM.result('liq-r-efectivo', 'Tipo efectivo', 'cuota líquida / base imponible', 'orange')}
      </div>
      <div class="liq-flow" id="liq-flow"></div>
      <div class="aviso" id="liq-aviso"></div>

      <h3>Tarifa en formato oficial</h3>
      <table class="tabla" id="liq-tabla-oficial"></table>
      <p class="inline-note">Así se publican las tarifas en la ley: cuota acumulada hasta el límite inferior del tramo y tipo aplicable al resto.</p>

      <h3>Desglose de la cuota tramo a tramo</h3>
      <table class="tabla" id="liq-tabla-desglose"></table>
    </div>
  </div>

  <div class="grid-2">
    <div class="card">
      <h3>La cuota es el área bajo la escalera de tipos marginales</h3>
      ${SIM.chartBox('liq-chart-escalera', 320)}
      <p class="inline-note" id="liq-nota-area"></p>
    </div>
    <div class="card">
      <h3>Tipo medio y tipo marginal según la base</h3>
      ${SIM.chartBox('liq-chart-tipos', 320)}
      <p class="inline-note">El tipo medio es una media de los tipos de todos los tramos recorridos: por eso va siempre por debajo del marginal y se le acerca solo asintóticamente.</p>
    </div>
  </div>
  <div class="card interpretation" id="liq-interp"></div>`;

  /* ---------------- Cálculo ---------------- */
  // Lee la tarifa de la tabla y garantiza que los límites crecen
  function leerTramos() {
    const h = [1, 2, 3, 4].map(i => Math.max(0, SIM.val('liq-h' + i)));
    for (let i = 1; i < 4; i++) if (h[i] < h[i - 1]) h[i] = h[i - 1];
    const t = [1, 2, 3, 4, 5].map(i => Math.max(0, SIM.val('liq-t' + i)) / 100);
    return [
      [0, h[0], t[0]], [h[0], h[1], t[1]], [h[1], h[2], t[2]],
      [h[2], h[3], t[3]], [h[3], Infinity, t[4]]
    ];
  }

  // Devuelve la tarifa efectiva según el modo (la suma fija no es una escala)
  function tarifa(modo) {
    if (modo === 'fijo') return [[0, Infinity, Math.max(0, SIM.val('liq-tfijo')) / 100]];
    if (modo === 'sumafija') return null;
    return leerTramos();
  }

  // Cuota íntegra, marginal, medio y desglose para una base liquidable
  function cuotaDe(bl, modo, tr, fija) {
    if (modo === 'sumafija') {
      return { cuota: fija, marginal: 0, medio: bl > 0 ? fija / bl : 0, desglose: [] };
    }
    return TAX.aplicaEscala(bl, tr);
  }

  // Tipo aplicable a la siguiente unidad monetaria en el punto x (para dibujar la escalera)
  function marginalEn(x, modo, tr) {
    if (modo === 'sumafija') return 0;
    if (!(x > 0)) x = 0;
    for (const [desde, hasta, tipo] of tr) if (x >= desde && x < hasta) return tipo;
    return tr[tr.length - 1][2];
  }

  function init(root) {
    // Sin eventos propios: el núcleo ya recalcula ante cualquier cambio de control.
    // Se deja el gancho para dejar claro dónde irían.
    void root;
  }

  /* ---------------- Actualización ---------------- */
  function update() {
    const modo = SIM.val('liq-modo');
    const hecho = HECHOS[SIM.val('liq-hecho')] || HECHOS.renta;
    const bi = SIM.val('liq-base');
    const red = Math.min(Math.max(0, SIM.val('liq-red')), bi);
    const bl = Math.max(0, bi - red);
    const ded = Math.max(0, SIM.val('liq-ded'));
    const pagos = Math.max(0, SIM.val('liq-pagos'));
    const rec = Math.max(0, SIM.val('liq-rec'));
    const fija = Math.max(0, SIM.val('liq-fija'));
    const tr = tarifa(modo);

    SIM.show('liq-base-val', um(bi, 0));
    SIM.show('liq-hecho-txt', `Objeto imponible: ${hecho.objeto}. Hecho imponible: ${hecho.hecho}. `
      + `La base imponible mide ${hecho.base} (referencia real: ${hecho.ejemplo}).`);

    // Mostrar solo los controles del modo elegido
    const cajas = { tramos: 'liq-box-tramos', fijo: 'liq-box-fijo', sumafija: 'liq-box-fija' };
    Object.entries(cajas).forEach(([k, id]) => {
      const el = document.getElementById(id);
      if (el) el.style.display = (k === modo) ? '' : 'none';
    });
    // Límites inferiores de cada tramo (columna «desde»)
    if (modo === 'tramos') {
      tr.forEach((t, i) => SIM.show('liq-d' + (i + 1), F.n0(t[0])));
    }

    // Liquidación
    const L = cuotaDe(bl, modo, tr, fija);
    const cuotaIntegra = L.cuota;
    const cuotaLiquida = Math.max(0, cuotaIntegra - ded);
    const dedPerdidas = Math.max(0, ded - cuotaIntegra);
    const cuotaDiferencial = cuotaLiquida - pagos;
    const deuda = cuotaDiferencial + rec;
    const medio = bl > 0 ? cuotaIntegra / bl : 0;
    const efectivo = bi > 0 ? cuotaLiquida / bi : 0;
    const marg = modo === 'sumafija' ? 0 : L.marginal;

    SIM.show('liq-r-integra', F.n2(cuotaIntegra));
    SIM.show('liq-r-liquida', F.n2(cuotaLiquida));
    SIM.show('liq-r-difer', F.n2(cuotaDiferencial));
    SIM.show('liq-r-deuda', F.n2(deuda));
    SIM.show('liq-r-medio', F.pct(medio, 1));
    SIM.show('liq-r-marg', F.pct(marg, 1));
    SIM.show('liq-r-efectivo', F.pct(efectivo, 1));

    // Cascada de los ocho pasos
    const pasos = [
      ['Base imponible', bi, 'hito'],
      ['− Reducciones', -red, 'negative'],
      ['Base liquidable', bl, 'hito'],
      ['Cuota íntegra', cuotaIntegra, 'hito'],
      ['− Deducciones', -ded, 'negative'],
      ['Cuota líquida', cuotaLiquida, 'hito'],
      ['− Pagos a cuenta', -pagos, 'negative'],
      ['Cuota diferencial', cuotaDiferencial, cuotaDiferencial >= 0 ? '' : 'positive'],
      ['+ Recargos', rec, 'negative'],
      ['Deuda tributaria', deuda, 'hito']
    ];
    SIM.html('liq-flow', pasos.map(([l, v, c], i) =>
      `${i ? '<span class="liq-arrow">→</span>' : ''}<div class="liq-step ${c}"><div class="liq-label">${l}</div><div class="liq-value">${F.n2(v)}</div></div>`
    ).join(''));

    // Aviso
    let aviso = '';
    if (modo === 'sumafija') {
      aviso = `<strong>Impuesto de suma fija.</strong> La cuota es ${um(fija)} sea cual sea la base: el tipo marginal es cero `
        + `y el tipo medio cae según sube la base. Es el impuesto que no distorsiona las decisiones... y el más regresivo.`;
    } else if (modo === 'fijo') {
      aviso = `<strong>Impuesto proporcional.</strong> Con un único tipo del ${F.pct(SIM.val('liq-tfijo') / 100, 1)}, el tipo medio y el marginal coinciden en toda la escala.`;
    } else {
      const activo = L.desglose.find(d => d.activo) || L.desglose[0];
      aviso = `<strong>Tramo activo.</strong> La base liquidable (${um(bl, 0)}) cae en el tramo `
        + `${F.n0(activo.desde)} – ${activo.hasta === Infinity ? '∞' : F.n0(activo.hasta)} u.m., gravado al ${F.pct(activo.tipo, 1)}. `
        + `Ese tipo solo se aplica a las ${um(Math.max(0, bl - activo.desde), 0)} que exceden del límite inferior.`;
    }
    if (dedPerdidas > 0.005) {
      aviso += ` <span class="perdida">Se pierden ${um(dedPerdidas)} de deducciones</span>: no hay cuota íntegra suficiente y las deducciones no se devuelven.`;
    }
    if (red > 0) aviso += ` Las reducciones (${um(red, 0)}) ahorran ${um(red * marg)} —el tipo marginal—, no ${um(red * medio)}.`;
    SIM.html('liq-aviso', aviso);

    // Tabla en formato oficial
    if (modo === 'sumafija') {
      SIM.html('liq-tabla-oficial',
        `<thead><tr><th>Base liquidable</th><th>Cuota íntegra</th><th>Tipo marginal</th></tr></thead>`
        + `<tbody><tr class="active-row"><td>Cualquiera</td><td>${F.n2(fija)}</td><td>0,0 %</td></tr></tbody>`);
    } else {
      const of = TAX.tablaOficial(tr);
      const filas = of.map((f, i) => {
        const hastaTramo = tr[i][1];
        const activo = bl > f.hasta && bl <= hastaTramo || (i === 0 && bl <= hastaTramo);
        return `<tr class="${activo ? 'active-row' : ''}"><td>${F.n0(f.hasta)}</td><td>${F.n2(f.cuota)}</td>`
          + `<td>${f.resto === Infinity ? 'En adelante' : F.n0(f.resto)}</td><td>${F.pct(f.tipo, 1)}</td></tr>`;
      });
      SIM.html('liq-tabla-oficial',
        `<thead><tr><th>Base liquidable hasta (u.m.)</th><th>Cuota íntegra (u.m.)</th><th>Resto base hasta (u.m.)</th><th>Tipo aplicable</th></tr></thead>`
        + `<tbody>${filas.join('')}</tbody>`);
    }

    // Desglose tramo a tramo
    if (modo === 'sumafija') {
      SIM.html('liq-tabla-desglose',
        `<thead><tr><th>Concepto</th><th>Importe</th></tr></thead>`
        + `<tbody><tr class="total"><td>Cuota fija, independiente de la base</td><td>${F.n2(fija)}</td></tr></tbody>`);
    } else {
      const filas = L.desglose.map(d =>
        `<tr class="${d.activo ? 'active-row' : ''}"><td>${F.n0(d.desde)} – ${d.hasta === Infinity ? '∞' : F.n0(d.hasta)}</td>`
        + `<td>${F.pct(d.tipo, 1)}</td><td>${F.n2(d.baseTramo)}</td><td>${F.n2(d.cuotaTramo)}</td><td>${F.n2(d.cuotaAcum)}</td></tr>`);
      filas.push(`<tr class="total"><td>Total</td><td>—</td><td>${F.n2(bl)}</td><td>${F.n2(cuotaIntegra)}</td><td>${F.n2(cuotaIntegra)}</td></tr>`);
      SIM.html('liq-tabla-desglose',
        `<thead><tr><th>Tramo de base liquidable (u.m.)</th><th>Tipo</th><th>Base en el tramo</th><th>Cuota del tramo</th><th>Acumulada</th></tr></thead>`
        + `<tbody>${filas.join('')}</tbody>`);
    }

    /* ---- Gráfico 1: escalera del marginal con el área sombreada = cuota ---- */
    const XMAX = 1000;
    const tipoMax = modo === 'sumafija' ? 0.1 : Math.max.apply(null, tr.map(t => t[2]));
    const yMax = Math.min(100, Math.max(20, Math.ceil((tipoMax * 100 + 8) / 10) * 10));

    // Escalera completa: un punto en el límite inferior de cada tramo (stepped 'after')
    let esc;
    if (modo === 'sumafija') {
      esc = SIM.xy([0, XMAX], [0, 0]);
    } else {
      const xs = [], ys = [];
      tr.forEach(([desde, , tipo]) => { if (desde <= XMAX) { xs.push(desde); ys.push(tipo * 100); } });
      xs.push(XMAX); ys.push(marginalEn(XMAX, modo, tr) * 100);
      esc = SIM.xy(xs, ys);
    }
    // Área bajo la escalera hasta la base liquidable: puntos densos para que el relleno la siga
    const rell = [];
    if (bl > 0 && modo !== 'sumafija') {
      const n = 240;
      for (let i = 0; i <= n; i++) {
        const x = bl * i / n;
        rell.push({ x, y: marginalEn(Math.min(x, bl - 1e-9), modo, tr) * 100 });
      }
    }
    const puntosEsc = [];
    if (modo === 'sumafija') {
      puntosEsc.push({ x: bl, y: 0, label: `cuota fija ${um(fija, 0)}, marginal 0 %`, color: C.naranja, dy: -10 });
    } else {
      puntosEsc.push({ x: bl, y: marg * 100, label: `marginal ${F.pct(marg, 0)}`, color: C.rojo, align: bl > XMAX * 0.7 ? 'right' : 'left' });
    }
    SIM.chart('liq-chart-escalera', {
      type: 'line',
      data: {
        datasets: [
          { label: 'Cuota íntegra (área)', data: rell, stepped: 'after', fill: 'origin', backgroundColor: SIM.alpha(C.azul, .25), borderColor: SIM.alpha(C.azul, .01), borderWidth: 0, pointRadius: 0 },
          { label: 'Tipo marginal', data: esc, stepped: 'after', borderColor: C.rojo, borderWidth: 2.4, fill: false, pointRadius: 0 }
        ]
      },
      options: {
        scales: {
          x: { type: 'linear', min: 0, max: XMAX, title: { text: 'Base liquidable (u.m.)' } },
          y: { min: 0, max: yMax, title: { text: 'Tipo marginal (%)' } }
        },
        plugins: {
          refs: { x: [{ value: bl, label: 'Base liquidable', color: C.azul }], points: puntosEsc },
          tooltip: { callbacks: { title: it => `Base ${F.n0(it[0].parsed.x)} u.m.`, label: it => `${it.dataset.label}: ${F.n1(it.parsed.y)} %` } }
        }
      }
    });
    SIM.show('liq-nota-area', modo === 'sumafija'
      ? 'Con un impuesto de suma fija no hay escalera: el marginal es cero en todo el recorrido y la cuota no depende de la base.'
      : `El área azul mide ${um(cuotaIntegra)}: es exactamente la cuota íntegra, porque sumar el tipo de cada tramo por la base que cae en él es integrar la escalera.`);

    /* ---- Gráfico 2: tipo medio y tipo marginal según la base ---- */
    const xs2 = [], med = [], mar = [];
    for (let x = 0; x <= XMAX; x += 5) {
      const Lx = cuotaDe(x, modo, tr, fija);
      xs2.push(x);
      med.push(Math.min(100, (x > 0 ? Lx.cuota / x : 0) * 100));
      mar.push(marginalEn(x, modo, tr) * 100);
    }
    SIM.chart('liq-chart-tipos', {
      type: 'line',
      data: {
        datasets: [
          { label: 'Tipo marginal', data: SIM.xy(xs2, mar), borderColor: C.rojo, stepped: 'after', borderWidth: 2, pointRadius: 0 },
          { label: 'Tipo medio', data: SIM.xy(xs2, med), borderColor: C.azul, backgroundColor: SIM.alpha(C.azul, .08), fill: true, borderWidth: 2.4, pointRadius: 0 }
        ]
      },
      options: {
        scales: {
          x: { type: 'linear', min: 0, max: XMAX, title: { text: 'Base liquidable (u.m.)' } },
          y: { min: 0, max: modo === 'sumafija' ? 100 : yMax, title: { text: 'Tipo (%)' } }
        },
        plugins: {
          refs: {
            x: [{ value: bl, label: 'Base actual', color: C.gris }],
            points: [
              { x: bl, y: Math.min(100, medio * 100), label: `medio ${F.pct(medio, 1)}`, color: C.azul, dy: 16, align: bl > XMAX * 0.7 ? 'right' : 'left' },
              { x: bl, y: marg * 100, label: `marginal ${F.pct(marg, 1)}`, color: C.rojo, align: bl > XMAX * 0.7 ? 'right' : 'left' }
            ]
          },
          tooltip: { callbacks: { title: it => `Base ${F.n0(it[0].parsed.x)} u.m.`, label: it => `${it.dataset.label}: ${F.n1(it.parsed.y)} %` } }
        }
      }
    });

    /* ---- Lectura ---- */
    let t = `<strong>Lectura.</strong> Se grava ${hecho.objeto}. Con una base imponible de ${um(bi, 0)} `
      + (red > 0 ? `y ${um(red, 0)} de reducciones, la base liquidable es ${um(bl, 0)}. ` : `y sin reducciones, la base liquidable coincide con ella (${um(bl, 0)}). `);

    if (modo === 'tramos') {
      const trozos = L.desglose.filter(d => d.baseTramo > 0)
        .map(d => `${F.n2(d.baseTramo)} al ${F.pct(d.tipo, 0)} = ${F.n2(d.cuotaTramo)}`);
      t += `La cuota íntegra es <strong>${um(cuotaIntegra)}</strong>, que sale de sumar tramo a tramo: ${trozos.join('; ')}. `
        + `El tipo medio (${F.pct(medio, 1)}) queda por debajo del marginal (${F.pct(marg, 1)}) porque <strong>solo el exceso sobre el límite del tramo anterior tributa al tipo superior</strong>. `;
      const err = bl * marg;
      const dif = err - cuotaIntegra;
      if (dif > 0.005) {
        t += `<br><strong>El error típico.</strong> Quien aplica el tipo del último tramo (${F.pct(marg, 0)}) a toda la base pagaría ${um(err)}, `
          + `es decir ${um(dif)} de más: un ${F.pct(dif / cuotaIntegra, 0)} por encima de la cuota real. Subir de tramo nunca hace que el contribuyente cobre menos neto. `;
      }
    } else if (modo === 'fijo') {
      t += `Con un tipo fijo del ${F.pct(marg, 1)}, la cuota íntegra es ${um(cuotaIntegra)} y <strong>el tipo medio coincide con el marginal en cualquier nivel de base</strong>: `
        + `el impuesto es proporcional, no progresivo. En el gráfico de la derecha las dos líneas se superponen. `;
    } else {
      const medioBajo = bl > 0 ? fija / bl : 0;
      const medioAlto = fija / XMAX;
      t += `La cuota es fija (${um(fija)}) y no depende de la base. El tipo medio pasa del ${F.pct(medioBajo, 1)} con base ${um(bl, 0)} `
        + `al ${F.pct(medioAlto, 1)} con base ${um(XMAX, 0)}: <strong>un impuesto de suma fija es regresivo</strong>, aunque su marginal cero lo haga eficiente. `;
    }

    t += `<br><strong>De la cuota a la deuda.</strong> `
      + (ded > 0 ? `Tras ${um(ded, 0)} de deducciones la cuota líquida baja a ${um(cuotaLiquida)}; ` : `Sin deducciones en cuota, la cuota líquida coincide con la íntegra (${um(cuotaLiquida)}); `)
      + (pagos > 0 ? `restando ${um(pagos, 0)} ya adelantados como pagos a cuenta, ` : `como no hay pagos a cuenta, `)
      + `queda una cuota diferencial ${cuotaDiferencial >= 0 ? `a ingresar de ${um(cuotaDiferencial)}` : `a devolver de ${um(-cuotaDiferencial)}`}`
      + (rec > 0 ? `, y con ${um(rec, 0)} de recargos la deuda tributaria asciende a ${um(deuda)}. ` : `, que es también la deuda tributaria. `)
      + `El tipo efectivo sobre la base imponible (${F.pct(efectivo, 1)}) resume todo el recorrido: es lo que de verdad se paga por cada unidad de base declarada.`;
    SIM.html('liq-interp', t);
  }

  /* ---------------- Registro ---------------- */
  const base = {
    'liq-hecho': 'renta', 'liq-base': 220, 'liq-red': 0, 'liq-modo': 'tramos',
    'liq-h1': 100, 'liq-h2': 200, 'liq-h3': 300, 'liq-h4': 500,
    'liq-t1': 5, 'liq-t2': 10, 'liq-t3': 20, 'liq-t4': 30, 'liq-t5': 40,
    'liq-tfijo': 10, 'liq-fija': 10,
    'liq-ded': 0, 'liq-pagos': 0, 'liq-rec': 0
  };
  const con = extra => Object.assign({}, base, extra);

  SIM.register({
    id: 'liquidador', nav: 'Liquidar un impuesto', tema: 'Tema 1',
    title: 'Liquidación de un impuesto, paso a paso',
    subtitle: 'Del hecho imponible a la deuda tributaria con la tarifa del manual: base imponible, reducciones, base liquidable, tarifa, cuota íntegra, deducciones, cuota líquida, pagos a cuenta, cuota diferencial y recargos. La tarifa es editable y admite tres formas: progresiva por tramos, tipo fijo y suma fija.',
    guia: {
      observa: [
        'Con la tarifa del manual y una base de 220 u.m. la cuota es <strong>19</strong>: 5 del primer tramo, 10 del segundo y 4 de las 20 unidades que caen en el tercero. <strong>Solo el exceso</strong> tributa al 20 %.',
        'El <strong>área azul</strong> del primer gráfico es la cuota íntegra. Cambia la base y verás cómo la cuota crece «por escalones» de anchura variable.',
        'El tipo medio va siempre <strong>por debajo</strong> del marginal y solo se le acerca cuando la base es muy grande: nunca llega a igualarlo.',
        'Cambia a <strong>tipo fijo</strong>: las dos curvas se superponen (impuesto proporcional). Cambia a <strong>suma fija</strong>: el marginal es cero y el tipo medio decrece, es decir, el impuesto es regresivo.',
        'Las <strong>reducciones</strong> ahorran el tipo marginal (salen de la base); las <strong>deducciones</strong> ahorran su importe íntegro (salen de la cuota), pero se pierden si no hay cuota suficiente.'
      ],
      pregunta: 'Un contribuyente con base liquidable de 290 u.m. se niega a cobrar 20 u.m. más «porque entraría en el tramo del 30 % y perdería dinero». ¿Tiene razón?',
      respuesta: 'No. Con la tarifa por defecto, el tramo del 30 % empieza en 300: de esas 20 u.m., 10 tributarían al 20 % y solo las otras 10 al 30 %. La cuota sube 5 u.m. y el neto crece en 15. El tipo marginal se aplica al exceso, nunca a toda la base, así que ganar más nunca reduce la renta disponible.'
    },
    presets: [
      { label: 'Base 220 (ejemplo del manual)', title: 'Cuota íntegra = 19 u.m.', values: base },
      { label: 'Base 350', title: 'Cuota íntegra = 50 u.m.', values: con({ 'liq-base': 350 }) },
      { label: 'Base 150', title: 'Cuota íntegra = 10 u.m.', values: con({ 'liq-base': 150 }) },
      { label: 'Tipo fijo del 10 %', title: 'Impuesto proporcional: medio = marginal', values: con({ 'liq-modo': 'fijo' }) },
      { label: 'Suma fija de 10 u.m.', title: 'Impuesto de cuantía fija: marginal cero y tipo medio decreciente', values: con({ 'liq-modo': 'sumafija' }) }
    ],
    html, init, update
  });
})();
