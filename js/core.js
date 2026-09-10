/* =====================================================================
   core.js — núcleo del simulador
   - Registro de módulos (SIM.register) y navegación por #hash
   - Estado de cada módulo en la URL (enlaces compartibles)
   - Presets, caja «Qué observar», exportación de gráficos a PNG
   - Tema común de Chart.js + plugin de líneas/puntos de referencia
   Contrato de un módulo:
     SIM.register({
       id: 'irpf', nav: 'IRPF', tema: 'Tema 3', title: '...', subtitle: '...',
       guia: { observa: ['...', '...'], pregunta: '...', respuesta: '...' },
       presets: [{ label: 'Lucía (SMI)', values: { 'irpf-bruto': 16576, ... } }],
       html: '<div class="grid-2">...</div>',   // controles con id; los que llevan data-state se guardan en la URL
       init(root) {},                           // enlazar eventos (opcional)
       update(root) {}                          // recalcular y repintar
     });
   ===================================================================== */
(function () {
  'use strict';

  const SIM = window.SIM = window.SIM || {};
  SIM.modules = [];
  SIM.byId = {};
  SIM.charts = {};

  /* ---------- Tema visual ---------- */
  SIM.color = {
    azul: '#003D7C', azulOsc: '#00264F', azulClaro: '#8FB3DD',
    naranja: '#BE6E00', naranjaClaro: '#F4C36A',
    rojo: '#AA2323', rojoClaro: '#E8A0A0',
    verde: '#006432', verdeClaro: '#8FC9A4',
    gris: '#6C7076', grisClaro: '#C9CDD3', tinta: '#16191E'
  };
  SIM.alpha = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };
  SIM.serie = [SIM.color.azul, SIM.color.naranja, SIM.color.verde, SIM.color.rojo, SIM.color.gris, SIM.color.azulClaro];

  /* ---------- Formato ---------- */
  // Formato español con punto de miles SIEMPRE (Intl en es-ES no agrupa los números de cuatro cifras)
  function num(v, d) {
    if (v == null || isNaN(v)) return '—';
    if (Math.abs(v) < 0.5 * Math.pow(10, -d)) v = 0;  // evita «-0,00»
    const neg = v < 0; const s = Math.abs(v).toFixed(d);
    let [ent, dec] = s.split('.');
    ent = ent.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (neg ? '−' : '') + ent + (dec ? ',' + dec : '');
  }
  SIM.fmt = {
    num,
    n0: v => num(v, 0),
    n1: v => num(v, 1),
    n2: v => num(v, 2),
    eur: (v, d = 2) => num(v, d) + ' €',
    eur0: v => num(v, 0) + ' €',
    pct: (v, d = 1) => num(v * 100, d) + ' %',
    pp: v => (v >= 0 ? '+' : '') + num(v, 1) + ' pp',
    signo: v => (v > 0 ? '+' : '') + num(v, 2)
  };

  /* ---------- Helpers de HTML ---------- */
  // Slider estándar: etiqueta + valor + control. Los valores se muestran con `fmt` (función) al actualizar.
  SIM.slider = (id, o) => `
    <div class="slider-group">
      <div class="slider-label"><span>${o.label}${o.help ? ` <span class="help">${o.help}</span>` : ''}</span><span class="value" id="${id}-val">—</span></div>
      <input type="range" id="${id}" min="${o.min}" max="${o.max}" step="${o.step}" value="${o.value}" data-state${o.disabled ? ' disabled' : ''}>
    </div>`;
  SIM.number = (id, o) => `
    <div class="field"><label for="${id}">${o.label}</label>
      <input type="number" id="${id}" min="${o.min ?? 0}" ${o.max != null ? `max="${o.max}"` : ''} step="${o.step ?? 1}" value="${o.value}" data-state>
    </div>`;
  SIM.select = (id, o) => `
    <div class="field"><label for="${id}">${o.label}</label>
      <select id="${id}" data-state>${o.options.map(([v, t]) => `<option value="${v}"${v == o.value ? ' selected' : ''}>${t}</option>`).join('')}</select>
    </div>`;
  SIM.check = (id, label, checked) => `<label><input type="checkbox" id="${id}" data-state${checked ? ' checked' : ''}> ${label}</label>`;
  SIM.result = (id, label, unit, cls) => `<div class="result-box ${cls || ''}"><div class="label">${label}</div><div class="number" id="${id}">—</div>${unit ? `<div class="unit">${unit}</div>` : ''}</div>`;
  SIM.chartBox = (id, height) => `<div class="chart-container" style="height:${height || 300}px"><canvas id="${id}"></canvas></div>
    <div class="chart-tools"><button class="btn" type="button" data-export="${id}">Descargar PNG</button></div>`;

  // Lectura de controles
  SIM.val = id => {
    const el = document.getElementById(id);
    if (!el) return null;
    if (el.type === 'checkbox') return el.checked;
    if (el.tagName === 'SELECT') return el.value;
    const v = parseFloat(el.value);
    return isNaN(v) ? 0 : v;
  };
  SIM.setVal = (id, v) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === 'checkbox') el.checked = !!v; else el.value = v;
  };
  SIM.show = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  SIM.html = (id, h) => { const el = document.getElementById(id); if (el) el.innerHTML = h; };

  /* ---------- Chart.js: tema y plugin de referencias ---------- */
  // options.plugins.refs = { x: [{value, label, color, dash}], y: [{value, label, color, dash}], points: [{x, y, label, color}] }
  // Para ejes de categorías, `value` es el índice; para ejes lineales, el valor.
  const refsPlugin = {
    id: 'refs',
    afterDatasetsDraw(chart, args, opts) {
      if (!opts) return;
      const { ctx, chartArea: a, scales } = chart;
      const sx = scales.x, sy = scales.y;
      if (!sx || !sy) return;
      ctx.save();
      ctx.font = '11px -apple-system, Segoe UI, Roboto, sans-serif';
      (opts.x || []).forEach(r => {
        const px = sx.getPixelForValue(r.value);
        if (px < a.left || px > a.right) return;
        ctx.strokeStyle = r.color || SIM.color.gris; ctx.lineWidth = 1.2; ctx.setLineDash(r.dash || [5, 4]);
        ctx.beginPath(); ctx.moveTo(px, a.top); ctx.lineTo(px, a.bottom); ctx.stroke(); ctx.setLineDash([]);
        if (r.label) { ctx.fillStyle = r.color || SIM.color.gris; const der = r.align === 'right'; ctx.textAlign = der ? 'right' : 'left'; ctx.fillText(r.label, px + (der ? -4 : 4), a.top + 12 + (r.dy || 0)); }
      });
      (opts.y || []).forEach(r => {
        const py = sy.getPixelForValue(r.value);
        if (py < a.top || py > a.bottom) return;
        ctx.strokeStyle = r.color || SIM.color.gris; ctx.lineWidth = 1.2; ctx.setLineDash(r.dash || [5, 4]);
        ctx.beginPath(); ctx.moveTo(a.left, py); ctx.lineTo(a.right, py); ctx.stroke(); ctx.setLineDash([]);
        if (r.label) { ctx.fillStyle = r.color || SIM.color.gris; ctx.textAlign = 'right'; ctx.fillText(r.label, a.right - 4, py - 4); }
      });
      (opts.points || []).forEach(p => {
        const px = sx.getPixelForValue(p.x), py = sy.getPixelForValue(p.y);
        ctx.fillStyle = p.color || SIM.color.rojo; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        if (p.label) {
          ctx.fillStyle = p.color || SIM.color.rojo; ctx.textAlign = p.align || 'left';
          ctx.fillText(p.label, px + (p.align === 'right' ? -9 : 9), py + (p.dy ?? -8));
        }
      });
      ctx.restore();
    }
  };

  SIM.chartDefaults = () => {
    if (!window.Chart) return;
    Chart.register(refsPlugin);
    const d = Chart.defaults;
    d.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    d.font.size = 12;
    d.color = SIM.color.tinta;
    d.responsive = true;
    d.maintainAspectRatio = false;
    d.animation = { duration: 0 };   // respuesta inmediata a los controles y capturas fiables
    d.plugins.legend.position = 'top';
    d.plugins.legend.labels.boxWidth = 14;
    d.plugins.legend.labels.boxHeight = 3;
    d.plugins.legend.labels.usePointStyle = false;
    d.plugins.tooltip.backgroundColor = SIM.color.azulOsc;
    d.plugins.tooltip.cornerRadius = 4;
    d.elements.line.borderWidth = 2.2;
    d.elements.point.radius = 0;
    d.elements.point.hitRadius = 8;
    d.elements.bar.borderRadius = 3;
    d.scale.grid.color = 'rgba(0,0,0,.06)';
    d.scale.border.color = 'rgba(0,0,0,.25)';
    d.scale.title.display = true;
    d.scale.title.color = SIM.color.gris;
    d.scale.title.font = { size: 11 };
  };

  // Crea o reemplaza el gráfico de un canvas.
  SIM.chart = (canvasId, config) => {
    const el = document.getElementById(canvasId);
    if (!el) return null;
    if (SIM.charts[canvasId]) { SIM.charts[canvasId].destroy(); }
    const ch = new Chart(el, config);
    SIM.charts[canvasId] = ch;
    return ch;
  };
  // Serie x lineal: eje numérico en lugar de categorías
  SIM.xy = (xs, ys) => xs.map((x, i) => ({ x, y: ys[i] }));

  // Exportar PNG con fondo blanco
  SIM.exportPNG = (canvasId, name) => {
    const src = document.getElementById(canvasId);
    if (!src) return;
    const c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(src, 0, 0);
    const a = document.createElement('a');
    a.download = (name || canvasId) + '.png';
    a.href = c.toDataURL('image/png');
    a.click();
  };

  /* ---------- Registro y montaje ---------- */
  SIM.register = mod => { SIM.modules.push(mod); SIM.byId[mod.id] = mod; };

  function guiaHTML(m) {
    if (!m.guia) return '';
    const g = m.guia;
    return `<div class="card guia">
      <h4>Qué observar</h4>
      <ul>${(g.observa || []).map(t => `<li>${t}</li>`).join('')}</ul>
      ${g.pregunta ? `<div class="pregunta"><strong>Pregunta de repaso.</strong> ${g.pregunta}
        ${g.respuesta ? `<details><summary>Ver respuesta</summary><p>${g.respuesta}</p></details>` : ''}</div>` : ''}
    </div>`;
  }
  function presetsHTML(m) {
    if (!m.presets || !m.presets.length) return '';
    return `<div class="presets"><span class="label">Escenarios:</span>${m.presets.map((p, i) =>
      `<button class="btn small" type="button" data-preset="${i}" title="${p.title || ''}">${p.label}</button>`).join('')}
      <button class="btn small" type="button" data-reset>Restablecer</button></div>`;
  }

  function mount() {
    const nav = document.getElementById('nav');
    const content = document.getElementById('content');
    SIM.modules.forEach(m => {
      const a = document.createElement('a');
      a.href = '#' + m.id; a.id = 'nav-' + m.id;
      a.innerHTML = `${m.nav}<small>${m.tema || ''}</small>`;
      nav.appendChild(a);

      const panel = document.createElement('section');
      panel.className = 'panel'; panel.id = 'panel-' + m.id;
      panel.innerHTML = `
        <div class="card">
          <span class="tema-badge">${m.tema || ''}</span>
          <h2>${m.title}</h2>
          <p class="subtitle">${m.subtitle || ''}</p>
          ${presetsHTML(m)}
        </div>
        ${m.html}
        ${guiaHTML(m)}`;
      content.appendChild(panel);
      m.root = panel;
      m.defaults = readState(panel);
      if (m.init) m.init(panel);

      // Recalcular ante cualquier cambio de control
      panel.addEventListener('input', e => { if (e.target.matches('input, select')) { m.update(panel); pushState(m); } });
      panel.addEventListener('change', e => { if (e.target.matches('select, input[type=checkbox]')) { m.update(panel); pushState(m); } });
      panel.addEventListener('click', e => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.export !== undefined) { SIM.exportPNG(b.dataset.export, m.id + '-' + b.dataset.export); }
        if (b.dataset.preset !== undefined) { applyState(panel, m.presets[+b.dataset.preset].values); markPreset(panel, +b.dataset.preset); m.update(panel); pushState(m); }
        if (b.dataset.reset !== undefined) { applyState(panel, m.defaults); markPreset(panel, -1); m.update(panel); pushState(m); }
      });
    });
    window.addEventListener('hashchange', route);
    window.addEventListener('resize', () => { const m = current(); if (m) m.update(m.root); });
    route();
  }

  function markPreset(panel, idx) {
    panel.querySelectorAll('[data-preset]').forEach(b => b.classList.toggle('active', +b.dataset.preset === idx));
  }
  function readState(panel) {
    const s = {};
    panel.querySelectorAll('[data-state]').forEach(el => { s[el.id] = el.type === 'checkbox' ? el.checked : el.value; });
    return s;
  }
  function applyState(panel, values) {
    Object.entries(values || {}).forEach(([id, v]) => SIM.setVal(id, v));
  }
  // Estado en la URL: #irpf?bruto=30000&ccaa=and (solo lo que difiere del valor por defecto)
  let pushTimer = null;
  function pushState(m) {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      const s = readState(m.root);
      const q = Object.entries(s).filter(([k, v]) => String(m.defaults[k]) !== String(v))
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
      const h = '#' + m.id + (q ? '?' + q : '');
      if (location.hash !== h) history.replaceState(null, '', h);
    }, 300);
  }
  function current() {
    const id = location.hash.replace(/^#/, '').split('?')[0];
    return SIM.byId[id] || null;
  }
  function route() {
    const raw = location.hash.replace(/^#/, '');
    const [id, query] = raw.split('?');
    const m = SIM.byId[id] || SIM.modules[0];
    if (!m) return;
    SIM.modules.forEach(x => {
      x.root.classList.toggle('active', x === m);
      document.getElementById('nav-' + x.id).classList.toggle('active', x === m);
    });
    if (query) {
      const vals = {};
      query.split('&').forEach(kv => { const [k, v] = kv.split('='); vals[decodeURIComponent(k)] = decodeURIComponent(v || ''); });
      applyState(m.root, vals);
    }
    m.update(m.root);
    document.title = m.title + ' · Simulador de Hacienda Pública';
  }

  SIM.boot = () => { SIM.chartDefaults(); mount(); };
})();
