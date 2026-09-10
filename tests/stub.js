/* Stub mínimo de SIM para cargar un módulo fuera del navegador y validar sintaxis y registro.
   Uso: jsc js/tax.js tests/stub.js js/modules/<modulo>.js tests/check-module.js */
var window = globalThis; var document = { getElementById: function () { return null; } };
var SIM = window.SIM = {
  modules: [], byId: {}, charts: {},
  color: { azul: '#003D7C', azulOsc: '#00264F', azulClaro: '#8FB3DD', naranja: '#BE6E00', naranjaClaro: '#F4C36A', rojo: '#AA2323', rojoClaro: '#E8A0A0', verde: '#006432', verdeClaro: '#8FC9A4', gris: '#6C7076', grisClaro: '#C9CDD3', tinta: '#16191E' },
  alpha: function (h, a) { return h; }, serie: [],
  fmt: { n0: String, n1: String, n2: String, eur: String, eur0: String, pct: String, pp: String, signo: String },
  slider: function () { return ''; }, number: function () { return ''; }, select: function () { return ''; }, check: function () { return ''; },
  result: function () { return ''; }, chartBox: function () { return ''; },
  val: function () { return 0; }, setVal: function () {}, show: function () {}, html: function () {},
  chart: function () { return null; }, xy: function (xs, ys) { return xs.map(function (x, i) { return { x: x, y: ys[i] }; }); },
  register: function (m) { this.modules.push(m); this.byId[m.id] = m; }
};
