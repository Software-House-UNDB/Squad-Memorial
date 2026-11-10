/* Painel da administração: seleção em lote, foto ampliada e aviso de pendências novas.
   Sem este arquivo, aprovar e recusar continuam funcionando; o servidor confere a seleção. */
(function () {
  'use strict';

  // ---- seleção
  document.querySelectorAll('[data-selecao]').forEach(function (form) {
    var todas = form.querySelector('[data-todas]');
    var itens = Array.from(form.querySelectorAll('input[name="selecionados"]'));
    var qtd = form.querySelector('[data-qtd]');
    var botoes = form.querySelectorAll('[data-exige-selecao]');

    function atualizar() {
      var n = itens.filter(function (i) { return i.checked; }).length;
      qtd.textContent = n ? n + (n === 1 ? ' selecionado' : ' selecionados') : '';
      todas.checked = n === itens.length;
      todas.indeterminate = n > 0 && n < itens.length;
      botoes.forEach(function (b) { b.disabled = n === 0; });
    }

    todas.addEventListener('change', function () {
      itens.forEach(function (i) { i.checked = todas.checked; });
      atualizar();
    });
    itens.forEach(function (i) { i.addEventListener('change', atualizar); });
    atualizar();
  });

  // ---- adicionar mais um item (década, marco, vídeo...) sem sair do formulário
  document.querySelectorAll('[data-inline]').forEach(function (grupo) {
    var botao = grupo.querySelector('[data-adicionar]');
    if (!botao) return;
    var total = grupo.querySelector('input[name="' + grupo.dataset.inline + '-TOTAL_FORMS"]');
    var maximo = Number(grupo.dataset.maximo || 0);
    function conferirMaximo() { botao.hidden = maximo > 0 && Number(total.value) >= maximo; }
    conferirMaximo();
    botao.addEventListener('click', function () {
      var indice = Number(total.value);
      var modelo = document.createElement('div');
      modelo.innerHTML = grupo.querySelector('[data-modelo]').innerHTML.replace(/__prefix__/g, indice);
      grupo.querySelector('[data-itens]').appendChild(modelo.firstElementChild);
      total.value = indice + 1;
      conferirMaximo();
    });
  });

  // ---- foto ampliada
  var dialogo = document.getElementById('ampliada');
  if (dialogo) {
    var imagem = document.getElementById('ampliada-img');
    document.querySelectorAll('[data-ampliar]').forEach(function (b) {
      b.addEventListener('click', function () {
        imagem.src = b.dataset.ampliar;
        imagem.alt = 'Foto enviada por ' + b.dataset.legenda;
        document.getElementById('ampliada-legenda').textContent = b.dataset.legenda;
        dialogo.showModal();
      });
    });
    dialogo.querySelector('[data-fechar]').addEventListener('click', function () { dialogo.close(); });
    dialogo.addEventListener('click', function (e) { if (e.target === dialogo) dialogo.close(); });
  }

  // ---- pendências novas: avisa, sem recarregar a tela debaixo de uma seleção em andamento
  var corpo = document.body;
  var conhecidas = Number(corpo.dataset.pendentes);
  var tituloOriginal = document.title;
  var selo = document.getElementById('selo-pendentes');
  var aviso = document.getElementById('aviso-novo');

  function mostrarTotal(total) {
    document.title = total ? '(' + total + ') ' + tituloOriginal : tituloOriginal;
    if (selo) { selo.textContent = total; selo.hidden = !total; }
  }

  function consultar() {
    if (document.hidden) return;
    fetch(corpo.dataset.pendenciasUrl, { credentials: 'same-origin', redirect: 'error' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        mostrarTotal(d.total);
        if (d.total > conhecidas) {
          var novos = d.total - conhecidas;
          document.getElementById('aviso-novo-texto').textContent =
            novos === 1 ? 'Chegou 1 item novo para aprovar.' : 'Chegaram ' + novos + ' itens novos para aprovar.';
          aviso.hidden = false;
        }
      })
      .catch(function () { /* sem conexão ou sessão expirada: tenta na próxima */ });
  }

  mostrarTotal(conhecidas);
  setInterval(consultar, 30000);
  document.addEventListener('visibilitychange', consultar);
})();
