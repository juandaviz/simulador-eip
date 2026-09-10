/* Módulo: progresividad en frío (Tema 10)
   Qué pasa cuando los salarios suben con la inflación pero la tarifa del IRPF,
   el mínimo personal y la reducción del art. 20 siguen escritos en euros nominales.
   Escenario A: tarifa congelada (lo que ocurre si nadie deflacta).
   Escenario B: tarifa, mínimo y reducción indexados con la inflación. Se calcula
   liquidando el salario expresado en euros del año 0 y reexpresando la cuota en
   euros corrientes: multiplicar todos los umbrales por (1+π)^t equivale a dividir
   la renta por (1+π)^t. */
(function () {
  'use strict';
  const F = SIM.fmt, C = SIM.color;

  const html = `
  <div class="grid-2">
    <div class="card">
      <h3>Salario, precios y horizonte</h3>
      ${SIM.slider('frio-sal', { label: 'Salario bruto inicial (año 0)', min: 12000, max: 120000, step: 1, value: 25000 })}
      ${SIM.slider('frio-inf', { label: 'Inflación anual', help: 'π', min: 0, max: 10, step: 0.1, value: 3 })}
      ${SIM.slider('frio-sub', { label: 'Subida salarial nominal anual', help: 'g; si g = π el salario real no cambia', min: 0, max: 10, step: 0.1, value: 3 })}
      ${SIM.slider('frio-anos', { label: 'Horizonte', help: 'años transcurridos', min: 1, max: 10, step: 1, value: 5 })}

      <h3>Circunstancias personales</h3>
      <div class="row">
        ${SIM.select('frio-ccaa', { label: 'Comunidad autónoma (escala 2025)', value: 'and', options: [['and', 'Andalucía'], ['mad', 'Comunidad de Madrid'], ['est', 'Escala estatal ×2 (referencia)']] })}
        ${SIM.number('frio-hijos', { label: 'Hijos a cargo', value: 0, max: 3 })}
      </div>
      <div class="checkbox-group">${SIM.check('frio-defl', 'Deflactar la tarifa, el mínimo y la reducción del art. 20 con la inflación', false)}</div>
      <p class="inline-note">La casilla no cambia los dos escenarios que se dibujan: elige cuál está «en vigor» para calcular la renta real que se pierde.</p>
      <div class="aviso" id="frio-aviso"></div>
    </div>

    <div class="card">
      <h3>Qué pasa al cabo de los años</h3>
      <div class="results-grid">
        ${SIM.result('frio-r-medio0', 'Tipo medio inicial', 'año 0')}
        ${SIM.result('frio-r-medioT', 'Tipo medio final', 'sin deflactar', 'red')}
        ${SIM.result('frio-r-subida', 'Subida del tipo medio', 'puntos porcentuales', 'red')}
        ${SIM.result('frio-r-salreal', 'Salario real final', 'euros del año 0')}
      </div>
      <div class="results-grid">
        ${SIM.result('frio-r-exceso', 'Exceso acumulado', 'euros corrientes', 'orange')}
        ${SIM.result('frio-r-ultimo', 'Exceso del último año', 'euros corrientes', 'orange')}
        ${SIM.result('frio-r-perdida', 'Renta real perdida', 'neto real final vs. inicial', 'red')}
      </div>
      <h3>Año a año</h3>
      <table class="tabla" id="frio-tabla"></table>
      <p class="inline-note">«Cuota deflactada» es lo que se pagaría si cada año se actualizaran con la inflación los tramos de la tarifa, el mínimo personal y familiar y la reducción por rendimientos del trabajo.</p>
    </div>
  </div>

  <div class="grid-2">
    <div class="card">
      <h3>El tipo medio sube sin que suba el salario real</h3>
      ${SIM.chartBox('frio-chart-tipos', 320)}
      <p class="inline-note">El eje vertical no arranca en cero: se acerca la lupa a la subida del tipo medio.</p>
    </div>
    <div class="card">
      <h3>Recaudación extra por no deflactar</h3>
      ${SIM.chartBox('frio-chart-exceso', 320)}
      <p class="inline-note">Diferencia anual entre la cuota con la tarifa congelada y la cuota con la tarifa indexada.</p>
    </div>
  </div>
  <div class="card interpretation" id="frio-interp"></div>`;

  /* ---------------- Cálculo ---------------- */
  // Serie año a año de los dos escenarios
  function simular() {
    const S0 = SIM.val('frio-sal');
    const pi = SIM.val('frio-inf') / 100;
    const g = SIM.val('frio-sub') / 100;
    const T = Math.round(SIM.val('frio-anos'));
    const comunes = {
      ccaa: SIM.val('frio-ccaa'), hijos: Math.round(SIM.val('frio-hijos')),
      retencionesTrabajo: 0, dedAutonomicas: 0
    };
    const filas = [];
    for (let t = 0; t <= T; t++) {
      const infl = Math.pow(1 + pi, t);
      const salNom = S0 * Math.pow(1 + g, t);
      const salReal = salNom / infl;
      // A: tarifa congelada en euros nominales
      const LA = TAX.liquidaIRPF(Object.assign({ trabajoBruto: salNom }, comunes));
      // B: tarifa, mínimo y reducción indexados → se liquida el salario en euros del año 0
      const LB = TAX.liquidaIRPF(Object.assign({ trabajoBruto: salReal }, comunes));
      const cuotaA = LA.cuotaLiquida;
      const cuotaB = LB.cuotaLiquida * infl;
      const cotiz = TAX.cotizacionTrabajador(salNom);
      filas.push({
        t, infl, salNom, salReal, cuotaA, cuotaB,
        medioA: salNom > 0 ? cuotaA / salNom : 0,
        medioB: salNom > 0 ? cuotaB / salNom : 0,
        marginalA: LA.marginalGeneral, marginalB: LB.marginalGeneral,
        exceso: cuotaA - cuotaB, excesoHoy: (cuotaA - cuotaB) / infl,
        netoRealA: (salNom - cotiz - cuotaA) / infl,
        netoRealB: (salNom - cotiz - cuotaB) / infl
      });
    }
    return { S0, pi, g, T, filas, ccaa: comunes.ccaa, hijos: comunes.hijos };
  }

  function init(root) { void root; }

  /* ---------------- Actualización ---------------- */
  function update() {
    const S = simular();
    const deflactar = SIM.val('frio-defl');
    const f0 = S.filas[0], fT = S.filas[S.filas.length - 1];
    const ccaaNombre = TAX.CCAA[S.ccaa].nombre;

    SIM.show('frio-sal-val', F.eur0(S.S0));
    SIM.show('frio-inf-val', F.n1(S.pi * 100) + ' %');
    SIM.show('frio-sub-val', F.n1(S.g * 100) + ' %');
    SIM.show('frio-anos-val', S.T + (S.T === 1 ? ' año' : ' años'));

    const excesoAcum = S.filas.reduce((a, r) => a + r.exceso, 0);
    const excesoAcumHoy = S.filas.reduce((a, r) => a + r.excesoHoy, 0);
    const subidaPP = (fT.medioA - f0.medioA) * 100;
    const netoReal0 = deflactar ? f0.netoRealB : f0.netoRealA;
    const netoRealT = deflactar ? fT.netoRealB : fT.netoRealA;
    const perdida = netoReal0 - netoRealT;

    SIM.show('frio-r-medio0', F.pct(f0.medioA, 2));
    SIM.show('frio-r-medioT', F.pct(fT.medioA, 2));
    SIM.show('frio-r-subida', F.pp(subidaPP));
    SIM.show('frio-r-salreal', F.n0(fT.salReal));
    SIM.show('frio-r-exceso', F.n0(excesoAcum));
    SIM.show('frio-r-ultimo', F.n0(fT.exceso));
    const perdBox = document.getElementById('frio-r-perdida');
    if (perdBox) {
      perdBox.textContent = (perdida >= 0 ? '−' : '+') + F.n0(Math.abs(perdida));
      perdBox.parentElement.className = 'result-box ' + (perdida > 0.5 ? 'red' : 'green');
    }

    // Tabla año a año
    const filas = S.filas.map(r => `<tr class="${r.t === S.T ? 'total' : ''}">
      <td>${r.t}</td><td>${F.n0(r.salNom)}</td><td>${F.n0(r.salReal)}</td>
      <td>${F.n0(r.cuotaA)}</td><td>${F.n0(r.cuotaB)}</td>
      <td>${F.pct(r.medioA, 2)}</td><td>${F.pct(r.medioB, 2)}</td>
      <td>${F.n0(r.exceso)}</td><td>${F.n0(r.excesoHoy)}</td></tr>`);
    SIM.html('frio-tabla', `<thead><tr>
      <th>Año</th><th>Salario nominal</th><th>Salario real</th>
      <th>Cuota sin deflactar</th><th>Cuota deflactada</th>
      <th>Tipo medio A</th><th>Tipo medio B</th>
      <th>Exceso (€ corrientes)</th><th>Exceso (€ de hoy)</th></tr></thead><tbody>${filas.join('')}</tbody>`);

    // Aviso
    let aviso = `<strong>Escenario en vigor:</strong> ${deflactar ? 'tarifa deflactada cada año con la inflación' : 'tarifa congelada en euros nominales'}. `;
    if (Math.abs(S.g - S.pi) < 1e-9) {
      aviso += `Como la subida salarial iguala a la inflación (${F.n1(S.pi * 100)} %), el salario real no se mueve: todo lo que suba el tipo medio es progresividad en frío pura.`;
    } else if (S.g > S.pi) {
      aviso += `El salario sube más que los precios (${F.n1(S.g * 100)} % frente a ${F.n1(S.pi * 100)} %): parte de la subida del tipo medio es progresividad legítima —el contribuyente es realmente más rico— y parte es progresividad en frío.`;
    } else {
      aviso += `El salario sube menos que los precios (${F.n1(S.g * 100)} % frente a ${F.n1(S.pi * 100)} %): el trabajador se empobrece en términos reales, pero la tarifa congelada le sigue cobrando como si no hubiera pasado nada. Aquí el tipo medio nominal apenas se mueve; lo que delata el efecto es compararlo con el de la tarifa deflactada.`;
    }
    SIM.html('frio-aviso', aviso);

    /* ---- Gráfico 1: tipo medio en el tiempo ---- */
    const xs = S.filas.map(r => r.t);
    const yA = S.filas.map(r => r.medioA * 100);
    const yB = S.filas.map(r => r.medioB * 100);
    const todos = yA.concat(yB);
    const yMin = Math.max(0, Math.floor(Math.min.apply(null, todos) - 1));
    const yMax = Math.ceil(Math.max.apply(null, todos) + 1);
    SIM.chart('frio-chart-tipos', {
      type: 'line',
      data: {
        datasets: [
          { label: 'Tarifa congelada (A)', data: SIM.xy(xs, yA), borderColor: C.rojo, backgroundColor: SIM.alpha(C.rojo, .10), fill: '+1', borderWidth: 2.6, pointRadius: 3 },
          { label: 'Tarifa deflactada (B)', data: SIM.xy(xs, yB), borderColor: C.azul, borderWidth: 2.2, borderDash: [5, 4], pointRadius: 3 }
        ]
      },
      options: {
        scales: {
          x: { type: 'linear', min: 0, max: S.T, ticks: { stepSize: 1 }, title: { text: 'Años transcurridos' } },
          y: { min: yMin, max: yMax, title: { text: 'Tipo medio sobre el salario bruto (%)' } }
        },
        plugins: {
          refs: {
            points: [
              { x: S.T, y: fT.medioA * 100, label: F.pct(fT.medioA, 2), color: C.rojo, align: 'right' },
              { x: S.T, y: fT.medioB * 100, label: F.pct(fT.medioB, 2), color: C.azul, align: 'right', dy: 16 }
            ]
          },
          tooltip: { callbacks: { title: it => `Año ${it[0].parsed.x}`, label: it => `${it.dataset.label}: ${F.n2(it.parsed.y)} %` } }
        }
      }
    });

    /* ---- Gráfico 2: exceso anual ---- */
    SIM.chart('frio-chart-exceso', {
      type: 'bar',
      data: {
        labels: S.filas.map(r => 'Año ' + r.t),
        datasets: [
          { label: 'Exceso pagado (€ corrientes)', data: S.filas.map(r => r.exceso), backgroundColor: SIM.alpha(C.rojo, .85) },
          { label: 'Exceso en euros de hoy', data: S.filas.map(r => r.excesoHoy), backgroundColor: SIM.alpha(C.naranja, .55) }
        ]
      },
      options: {
        scales: { x: { grid: { display: false }, title: { display: false } }, y: { title: { text: 'Euros al año' } } },
        plugins: { tooltip: { callbacks: { label: it => `${it.dataset.label}: ${F.eur0(it.parsed.y)}` } } }
      }
    });

    /* ---- Lectura ---- */
    const cruzaTramo = Math.abs(fT.marginalA - f0.marginalA) > 1e-9;
    let t = `<strong>Lectura.</strong> Un salario de ${F.eur0(S.S0)} en ${ccaaNombre}`
      + (S.hijos ? ` con ${S.hijos} ${S.hijos === 1 ? 'hijo' : 'hijos'} a cargo` : '')
      + ` que sube un ${F.n1(S.g * 100)} % al año llega a ${F.eur0(fT.salNom)} en ${S.T} ${S.T === 1 ? 'año' : 'años'}; `
      + `descontando una inflación del ${F.n1(S.pi * 100)} %, eso son ${F.eur0(fT.salReal)} de hoy, `
      + (Math.abs(S.g - S.pi) < 1e-9 ? 'es decir, exactamente el mismo poder adquisitivo que al principio. '
        : (S.g > S.pi ? 'algo más de poder adquisitivo que al principio. ' : 'menos poder adquisitivo que al principio. '))
      + (subidaPP >= 0.01
        ? `Y sin embargo el tipo medio pasa del ${F.pct(f0.medioA, 2)} al ${F.pct(fT.medioA, 2)}: <strong>${F.pp(subidaPP)}</strong> sin que ninguna ley haya subido el impuesto, frente al ${F.pct(fT.medioB, 2)} que resultaría con la tarifa deflactada. `
        : `El tipo medio se queda en el ${F.pct(fT.medioA, 2)}, y ese «no moverse» ya es una subida encubierta: con la tarifa deflactada habría bajado al ${F.pct(fT.medioB, 2)}, porque el contribuyente es más pobre que al principio. `)
      + `Eso es la <strong>progresividad en frío</strong> (o <em>bracket creep</em>): la tarifa está escrita en euros nominales, así que cuando todos los precios suben —el salario incluido— el contribuyente se desplaza hacia arriba en una escala que no se ha movido. `;

    t += `<br><strong>Cuánto cuesta.</strong> Frente a una tarifa deflactada cada año, se pagan ${F.eur0(fT.exceso)} de más solo en el último ejercicio y ${F.eur0(excesoAcum)} acumulados en los ${S.T} ${S.T === 1 ? 'año' : 'años'} `
      + `(${F.eur0(excesoAcumHoy)} en euros de hoy). Para la Hacienda pública es una subida de impuestos que no necesita aprobarse en el Parlamento: recauda más en términos reales sin cambiar una coma de la ley. `
      + (deflactar ? `Con la casilla de deflactar activada ese exceso no llega a pagarse: la cifra mide justo lo que se evita al indexar. ` : '');

    t += `<br><strong>Dos canales distintos.</strong> `;
    if (cruzaTramo) {
      t += `Aquí se <strong>cruza un tramo</strong>: el tipo marginal pasa del ${F.pct(f0.marginalA, 1)} al ${F.pct(fT.marginalA, 1)}, y los euros nuevos tributan a un tipo superior. `
        + `A eso se suma el segundo canal, más silencioso: el mínimo personal y familiar (${F.eur0(TAX.minimo({ hijos: S.hijos }).total)}) y la reducción por rendimientos del trabajo están fijados en euros nominales, así que cada año cubren una fracción menor del salario. `;
    } else {
      t += `Aquí <strong>no se cruza ningún tramo</strong> —el marginal sigue en el ${F.pct(fT.marginalA, 1)}—, y aun así ${subidaPP >= 0.01 ? 'el tipo medio sube' : 'el impuesto se encarece en términos reales'}: el mínimo personal y familiar (${F.eur0(TAX.minimo({ hijos: S.hijos }).total)}) y la reducción por rendimientos del trabajo son cantidades fijas en euros nominales, de modo que cada año protegen una fracción menor del salario. `
        + `El efecto no necesita saltos de tramo para existir. `;
    }
    t += `Por eso deflactar «la tarifa» a secas se queda corto: para neutralizar el efecto hay que indexar también mínimos, reducciones y los límites de las deducciones. `;

    t += `<br><strong>Renta real.</strong> Con el escenario ${deflactar ? 'deflactado' : 'congelado'}, el salario neto real pasa de ${F.eur0(netoReal0)} a ${F.eur0(netoRealT)}, `
      + (perdida > 0.5 ? `es decir, <strong>${F.eur0(perdida)}</strong> menos de poder adquisitivo. `
        : (perdida < -0.5 ? `es decir, ${F.eur0(-perdida)} más de poder adquisitivo. ` : `de modo que el poder adquisitivo se mantiene. `))
      + (deflactar
        ? `Como la tarifa está indexada, lo que quede de variación viene del salario, no del impuesto: eso es justo lo que persigue deflactar.`
        : `De esa variación, ${F.eur0(fT.excesoHoy)} son atribuibles a la tarifa congelada —lo que se ahorraría el contribuyente si se deflactase—; el resto depende de cómo se haya movido su salario frente a los precios.`);
    SIM.html('frio-interp', t);
  }

  /* ---------------- Registro ---------------- */
  const base = { 'frio-sal': 25000, 'frio-inf': 3, 'frio-sub': 3, 'frio-anos': 5, 'frio-ccaa': 'and', 'frio-hijos': 0, 'frio-defl': false };
  const con = extra => Object.assign({}, base, extra);

  SIM.register({
    id: 'frio', nav: 'Progresividad en frío', tema: 'Tema 10',
    title: 'Progresividad en frío: la subida de impuestos que nadie aprueba',
    subtitle: 'Si los salarios suben con la inflación pero la tarifa del IRPF, el mínimo personal y la reducción del art. 20 siguen escritos en euros nominales, el tipo medio sube aunque el poder adquisitivo no cambie. El simulador compara la tarifa congelada con una tarifa deflactada año a año y cuantifica la recaudación extra.',
    guia: {
      observa: [
        'Pon la subida salarial <strong>igual a la inflación</strong>: el salario real se queda clavado y, aun así, el tipo medio sube año tras año. Esa diferencia es progresividad en frío en estado puro.',
        'Mira la columna «Exceso»: es lo que se recauda de más <strong>sin cambiar la ley</strong>. Un aumento de impuestos que no pasa por el Parlamento.',
        'El efecto no necesita cruzar tramos. Con salarios bajos actúa sobre todo por la erosión del <strong>mínimo personal</strong> y de la <strong>reducción del art. 20</strong>, que son cantidades fijas en euros.',
        'Compara un salario de 25.000 € con uno de 60.000 €: el exceso en euros es mayor arriba, pero como fracción del salario suele pesar más donde la tarifa es más empinada.',
        'Activa la casilla de deflactar y comprueba que el tipo medio se queda plano: deflactar no es una rebaja fiscal, es <strong>no subir</strong> el impuesto en términos reales.'
      ],
      pregunta: 'En 2022 la inflación fue del 8,4 %. Andalucía deflactó su tarifa autonómica y Cataluña no. ¿Quién subió los impuestos y quién los bajó?',
      respuesta: 'En términos reales, quien no deflactó subió el impuesto: con la tarifa congelada, un salario que se limita a seguir a los precios paga un tipo medio mayor sin ser más rico. Deflactar no es una rebaja, sino mantener constante la presión fiscal real; por eso el debate público —«Andalucía baja el IRPF», «Cataluña no lo toca»— confunde el nivel con la variación. La comparación limpia exige mirar el tipo medio real, no el nominal, y recordar que la tarifa autonómica es solo la mitad de la cuota: la escala estatal, común a todos, no se deflactó.'
    },
    presets: [
      { label: 'Salario medio, 3 % de inflación, 5 años', title: 'Salario medio español (~28.050 €) con subidas iguales a la inflación', values: con({ 'frio-sal': 28050 }) },
      { label: 'SMI con subidas iguales a la inflación', title: 'SMI de 2025 (16.576 €, 14 pagas)', values: con({ 'frio-sal': 16576 }) },
      { label: 'Inflación de 2022 (8,4 %) sin subida salarial', title: 'Salario congelado y precios disparados', values: con({ 'frio-inf': 8.4, 'frio-sub': 0, 'frio-anos': 3 }) },
      { label: 'Salario alto (60.000 €)', title: 'Tramo alto de la tarifa', values: con({ 'frio-sal': 60000 }) },
      { label: 'Deflactando la tarifa', title: 'El mismo caso con la tarifa, el mínimo y la reducción indexados', values: con({ 'frio-sal': 28050, 'frio-defl': true }) }
    ],
    html, init, update
  });
})();
