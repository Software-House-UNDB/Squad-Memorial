/* Painel da administração: seleção em lote, recorte de imagem, foto ampliada e aviso de pendências novas.
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

  // ---- recorte da imagem ao escolher o arquivo, no formato do totem (data-recorte="16:9")
  // Sem JavaScript (ou sem DataTransfer), a imagem vai inteira e o totem a enquadra sozinho.
  var LADO_MAXIMO = 2560;  // o servidor reduz de novo para o tamanho de cada campo

  function criarRecorte() {
    var d = document.createElement('dialog');
    d.className = 'recorte';
    d.setAttribute('aria-labelledby', 'recorte-titulo');
    d.innerHTML =
      '<div class="recorte__cab"><h2 id="recorte-titulo">Recortar imagem</h2><span class="recorte__info" data-info></span></div>' +
      '<div class="recorte__area"><canvas tabindex="0" aria-label="Área do recorte. Arraste ou use as setas para posicionar; + e - aproximam."></canvas></div>' +
      '<label class="recorte__zoom"><span>Zoom</span><input type="range" min="1" max="5" step="0.01" value="1" data-zoom></label>' +
      '<p class="recorte__dica">Arraste a imagem para escolher o que aparece. Use o zoom (ou a roda do mouse) para aproximar.</p>' +
      '<div class="recorte__rodape">' +
      '<button type="button" class="botao" data-cancelar>Cancelar</button>' +
      '<button type="button" class="botao botao--forte" data-usar>Usar recorte</button></div>';
    document.body.appendChild(d);
    return d;
  }

  var recorte = null;  // { dialogo, canvas, zoom, ... } criado no primeiro uso

  function abrirRecorte(arquivo, proporcao, info) {
    return new Promise(function (resolver) {
      var url = URL.createObjectURL(arquivo);
      var img = new Image();
      img.onerror = function () { URL.revokeObjectURL(url); resolver({ erro: true }); };
      img.onload = function () {
        if (!recorte) {
          var dlg = criarRecorte();
          recorte = { dialogo: dlg, canvas: dlg.querySelector('canvas'), zoom: dlg.querySelector('[data-zoom]'), info: dlg.querySelector('[data-info]') };
        }
        var r = recorte, canvas = r.canvas, ctx = canvas.getContext('2d');
        r.info.textContent = info;
        r.dialogo.showModal();

        // A moldura é o próprio canvas: o que está dentro dele é o que vai para o totem.
        var area = canvas.parentNode;
        var cw = Math.min(area.clientWidth, 760), ch = cw * proporcao[1] / proporcao[0];
        var chMax = window.innerHeight * 0.58;
        if (ch > chMax) { ch = chMax; cw = ch * proporcao[0] / proporcao[1]; }
        var dpr = window.devicePixelRatio || 1;
        canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
        canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);

        var W = img.naturalWidth, H = img.naturalHeight;
        var base = Math.max(cw / W, ch / H);  // zoom 1 = a imagem cobre a moldura inteira
        var zoom = 1, x = (cw - W * base) / 2, y = (ch - H * base) / 2;
        r.zoom.value = 1;

        function escala() { return base * zoom; }
        function prender() {
          var s = escala();
          x = Math.min(0, Math.max(cw - W * s, x));
          y = Math.min(0, Math.max(ch - H * s, y));
        }
        function desenhar() {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cw, ch);
          ctx.drawImage(img, x, y, W * escala(), H * escala());
          ctx.strokeStyle = 'rgb(255 255 255 / .55)'; ctx.lineWidth = 1;  // terços, para enquadrar
          ctx.beginPath();
          for (var i = 1; i < 3; i++) {
            ctx.moveTo(cw * i / 3, 0); ctx.lineTo(cw * i / 3, ch);
            ctx.moveTo(0, ch * i / 3); ctx.lineTo(cw, ch * i / 3);
          }
          ctx.stroke();
        }
        function aplicarZoom(novo, cx, cy) {
          novo = Math.min(5, Math.max(1, novo));
          var antes = escala();
          zoom = novo;
          var depois = escala();
          // mantém parado o ponto sob o cursor (ou o centro)
          x = cx - (cx - x) * depois / antes;
          y = cy - (cy - y) * depois / antes;
          r.zoom.value = zoom;
          prender(); desenhar();
        }
        prender(); desenhar();

        var arrasto = null;
        function aoApertar(e) { arrasto = { px: e.clientX, py: e.clientY, x: x, y: y }; canvas.setPointerCapture(e.pointerId); }
        function aoMover(e) {
          if (!arrasto) return;
          x = arrasto.x + e.clientX - arrasto.px; y = arrasto.y + e.clientY - arrasto.py;
          prender(); desenhar();
        }
        function aoSoltar() { arrasto = null; }
        function aoRolar(e) {
          e.preventDefault();
          var ret = canvas.getBoundingClientRect();
          aplicarZoom(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08), e.clientX - ret.left, e.clientY - ret.top);
        }
        function aoTeclar(e) {
          var passo = e.shiftKey ? 40 : 10;
          var acoes = {
            ArrowLeft: function () { x += passo; }, ArrowRight: function () { x -= passo; },
            ArrowUp: function () { y += passo; }, ArrowDown: function () { y -= passo; },
          };
          if (acoes[e.key]) { e.preventDefault(); acoes[e.key](); prender(); desenhar(); }
          else if (e.key === '+' || e.key === '=') { e.preventDefault(); aplicarZoom(zoom * 1.1, cw / 2, ch / 2); }
          else if (e.key === '-') { e.preventDefault(); aplicarZoom(zoom / 1.1, cw / 2, ch / 2); }
        }
        function aoZoom() { aplicarZoom(Number(r.zoom.value), cw / 2, ch / 2); }

        var cancelar = r.dialogo.querySelector('[data-cancelar]'), usar = r.dialogo.querySelector('[data-usar]');
        function terminar(resultado) {
          canvas.removeEventListener('pointerdown', aoApertar);
          canvas.removeEventListener('pointermove', aoMover);
          canvas.removeEventListener('pointerup', aoSoltar);
          canvas.removeEventListener('pointercancel', aoSoltar);
          canvas.removeEventListener('wheel', aoRolar);
          canvas.removeEventListener('keydown', aoTeclar);
          r.zoom.removeEventListener('input', aoZoom);
          cancelar.removeEventListener('click', aoCancelar);
          usar.removeEventListener('click', aoUsar);
          r.dialogo.removeEventListener('cancel', aoEsc);
          r.dialogo.close();
          URL.revokeObjectURL(url);
          resolver(resultado);
        }
        function aoCancelar() { terminar({ cancelado: true }); }
        function aoEsc(e) { e.preventDefault(); aoCancelar(); }
        function aoUsar() {
          var s = escala();
          var sx = -x / s, sy = -y / s, sw = cw / s, sh = ch / s;
          var k = Math.min(1, LADO_MAXIMO / Math.max(sw, sh));
          var saida = document.createElement('canvas');
          saida.width = Math.max(1, Math.round(sw * k));
          saida.height = Math.max(1, Math.round(saida.width * proporcao[1] / proporcao[0]));
          var sctx = saida.getContext('2d');
          sctx.fillStyle = '#fff'; sctx.fillRect(0, 0, saida.width, saida.height);  // PNG transparente vira fundo branco
          sctx.imageSmoothingQuality = 'high';
          sctx.drawImage(img, sx, sy, sw, sh, 0, 0, saida.width, saida.height);
          usar.disabled = true;
          saida.toBlob(function (blob) {
            usar.disabled = false;
            if (!blob) { terminar({ erro: true }); return; }
            var nome = (arquivo.name.replace(/\.[^.]+$/, '') || 'imagem') + '.jpg';
            terminar({ arquivo: new File([blob], nome, { type: 'image/jpeg', lastModified: Date.now() }) });
          }, 'image/jpeg', 0.92);
        }

        canvas.addEventListener('pointerdown', aoApertar);
        canvas.addEventListener('pointermove', aoMover);
        canvas.addEventListener('pointerup', aoSoltar);
        canvas.addEventListener('pointercancel', aoSoltar);
        canvas.addEventListener('wheel', aoRolar, { passive: false });
        canvas.addEventListener('keydown', aoTeclar);
        r.zoom.addEventListener('input', aoZoom);
        cancelar.addEventListener('click', aoCancelar);
        usar.addEventListener('click', aoUsar);
        r.dialogo.addEventListener('cancel', aoEsc);
        canvas.focus();
      };
      img.src = url;
    });
  }

  function avisoDoCampo(input, texto) {
    var campo = input.closest('.campo-form') || input.parentNode;
    var aviso = campo.querySelector('[data-aviso-recorte]');
    if (!aviso) {
      aviso = document.createElement('p');
      aviso.className = 'ajuda';
      aviso.setAttribute('data-aviso-recorte', '');
      input.insertAdjacentElement('afterend', aviso);
    }
    aviso.textContent = texto;
    aviso.hidden = !texto;
  }

  function mostrarPrevia(input, arquivo) {
    var campo = input.closest('.campo-form') || input.parentNode;
    var previa = campo.querySelector('img.previa');
    if (!previa) {
      previa = document.createElement('img');
      previa.className = 'previa';
      input.insertAdjacentElement('beforebegin', previa);
    }
    if (previa.dataset.temporaria) URL.revokeObjectURL(previa.src);
    previa.src = URL.createObjectURL(arquivo);
    previa.dataset.temporaria = '1';
    previa.alt = 'Prévia do recorte';
  }

  if (window.DataTransfer && HTMLCanvasElement.prototype.toBlob) {
    document.addEventListener('change', function (e) {
      var input = e.target;
      if (!input.matches || !input.matches('input[type="file"][data-recorte]') || !input.files.length) return;
      var proporcao = input.dataset.recorte.split(':').map(Number);
      var arquivos = Array.from(input.files);
      var prontos = [], inteiros = [];
      avisoDoCampo(input, '');

      (function proximo(i) {
        if (i === arquivos.length) {
          var dt = new DataTransfer();
          prontos.forEach(function (f) { dt.items.add(f); });
          input.files = dt.files;  // trocar files não dispara outro change
          if (prontos.length === 1) mostrarPrevia(input, prontos[0]);
          var partes = [];
          if (prontos.length > 1) partes.push(prontos.length + ' imagens prontas para enviar.');
          if (inteiros.length) partes.push('Não deu para abrir ' + inteiros.join(', ') + ' no recorte: vai inteira e o totem enquadra sozinho.');
          avisoDoCampo(input, partes.join(' '));
          return;
        }
        var arquivo = arquivos[i];
        var info = arquivos.length > 1 ? 'Imagem ' + (i + 1) + ' de ' + arquivos.length + ' · ' + proporcao.join(':') : 'Formato ' + proporcao.join(':');
        abrirRecorte(arquivo, proporcao, info).then(function (res) {
          if (res.cancelado) {
            input.value = '';
            avisoDoCampo(input, 'Envio cancelado. Escolha a imagem de novo quando quiser.');
            return;
          }
          if (res.erro) { inteiros.push(arquivo.name); prontos.push(arquivo); }
          else prontos.push(res.arquivo);
          proximo(i + 1);
        });
      })(0);
    });
  }

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
