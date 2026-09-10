/* Comprueba que el módulo cargado se ha registrado con los campos obligatorios. */
(function () {
  var faltan = [];
  SIM.modules.forEach(function (m) {
    ['id', 'nav', 'tema', 'title', 'subtitle', 'html', 'update', 'guia'].forEach(function (k) { if (m[k] == null) faltan.push(m.id + '.' + k); });
    if (m.guia && (!m.guia.observa || !m.guia.observa.length || !m.guia.pregunta)) faltan.push(m.id + '.guia incompleta');
    if (!m.presets || !m.presets.length) faltan.push(m.id + '.presets vacío');
  });
  if (!SIM.modules.length) { print('FALLO: ningún módulo registrado'); quit(1); }
  if (faltan.length) { print('FALLO: faltan ' + faltan.join(', ')); quit(1); }
  print('OK: ' + SIM.modules.map(function (m) { return m.id; }).join(', '));
})();
