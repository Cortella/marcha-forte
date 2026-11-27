/* Marcha Forte — campos de endereço compartilhados entre o checkout e "Meus endereços". */
(function () {
  'use strict';
  var FIELDS = ['cep', 'street', 'number', 'comp', 'district', 'city', 'uf', 'label'];
  var field = function (box, name) { return box.querySelector('[name="' + name + '"]'); };
  var maskCep = function (s) { var d = String(s || '').replace(/\D/g, '').slice(0, 8); return d.length > 5 ? d.slice(0, 5) + '-' + d.slice(5) : d; };

  // Preenche rua, bairro, cidade e UF a partir do CEP (ViaCEP). Se o serviço falhar,
  // a pessoa digita à mão — a consulta é só uma ajuda.
  function lookup(box) {
    var cep = field(box, 'cep').value.replace(/\D/g, '');
    var status = box.querySelector('[data-cep-status]');
    if (cep.length !== 8) return;
    status.textContent = 'Buscando endereço…';
    fetch('https://viacep.com.br/ws/' + cep + '/json/').then(function (r) { return r.json(); }).then(function (d) {
      if (!d || d.erro) { status.textContent = 'CEP não encontrado. Preencha o endereço abaixo.'; return; }
      if (field(box, 'cep').value.replace(/\D/g, '') !== cep) return; // a pessoa já mudou o CEP
      if (d.logradouro) field(box, 'street').value = d.logradouro;
      if (d.bairro) field(box, 'district').value = d.bairro;
      if (d.localidade) field(box, 'city').value = d.localidade;
      if (d.uf) field(box, 'uf').value = d.uf;
      status.textContent = '';
      field(box, d.logradouro ? 'number' : 'street').focus();
    }).catch(function () { status.textContent = 'Não foi possível buscar o CEP. Preencha o endereço abaixo.'; });
  }

  window.MF_ADDR = {
    bind: function (box) {
      var cep = field(box, 'cep');
      cep.addEventListener('input', function () { cep.value = maskCep(cep.value); if (cep.value.length === 9) lookup(box); });
      field(box, 'uf').addEventListener('input', function () { this.value = this.value.replace(/[^a-zA-Z]/g, '').toUpperCase(); });
    },
    fill: function (box, a) {
      a = a || {};
      FIELDS.forEach(function (k) { field(box, k).value = a[k] || ''; });
      box.querySelector('[data-cep-status]').textContent = '';
    },
    // Devolve { value } com o endereço limpo ou { error, field } com o primeiro problema.
    read: function (box) {
      var a = {};
      FIELDS.forEach(function (k) { a[k] = field(box, k).value.trim().replace(/\s+/g, ' '); });
      a.cep = maskCep(a.cep);
      a.uf = a.uf.toUpperCase();
      var problem = a.cep.length !== 9 ? ['cep', 'Informe o CEP com 8 dígitos.']
        : a.street.length < 3 ? ['street', 'Informe a rua ou avenida.']
        : !a.number ? ['number', 'Informe o número (ou "s/n").']
        : a.city.length < 2 ? ['city', 'Informe a cidade.']
        : !/^[A-Z]{2}$/.test(a.uf) ? ['uf', 'Informe a UF com 2 letras (ex.: SP).'] : null;
      if (problem) return { error: problem[1], field: field(box, problem[0]) };
      return { value: a };
    },
    format: function (a) {
      if (!a) return '';
      return a.street + ', ' + a.number + (a.comp ? ' — ' + a.comp : '') + (a.district ? ', ' + a.district : '') + ' · ' + a.city + ' / ' + a.uf + ' · CEP ' + a.cep;
    },
    same: function (a, b) {
      var key = function (x) { return [x.cep, x.street, x.number, x.comp].join('|').toLowerCase(); };
      return Boolean(a && b) && key(a) === key(b);
    },
    newId: function () { return 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); },
  };
})();
