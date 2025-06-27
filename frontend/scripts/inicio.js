// --- VARIÁVEIS GLOBAIS ---
let alertas = [];
let paginaAtual = 0;
let filtroAtual = 'todos';
const itensPorPagina = 5;
const produtos = [];
let indiceParaEditar = null;

//Inicialização do banco -->
const firebaseConfig = {
  apiKey: "AIzaSyD_8Rr7Ya6MzqJ6Hn6vJwQZ7yj6Qt8sE7A",
  authDomain: "click-feira.firebaseapp.com",
  databaseURL: "https://click-feira-default-rtdb.firebaseio.com",
  projectId: "click-feira",
  storageBucket: "click-feira.appspot.com",
  messagingSenderId: "108583577904",
  appId: "1:108583577904:web:7d9b3d0c8d9b0d8d8e6e7f"
};
firebase.initializeApp(firebaseConfig);


// --- CARREGAR DADOS DO FIREBASE ---
document.addEventListener('DOMContentLoaded', () => {
  carregarAlertasDoFirebase();
  exibirHistorico();

  // Filtros
  document.querySelectorAll('.botao-filtro').forEach(botao => {
    botao.addEventListener('click', () => {
      filtroAtual = botao.getAttribute('data-filtro');
      paginaAtual = 0;
      atualizarListaAlertas();
      atualizarBotoesFiltro();
    });
  });

  // Paginação
  document.getElementById('btnAnterior').addEventListener('click', () => {
    if (paginaAtual > 0) {
      paginaAtual--;
      atualizarListaAlertas();
    }
  });

  document.getElementById('btnProximo').addEventListener('click', () => {
    const totalPaginas = Math.ceil(filtrarAlertas(alertas, filtroAtual).length / itensPorPagina);
    if (paginaAtual < totalPaginas - 1) {
      paginaAtual++;
      atualizarListaAlertas();
    }
  });

  // Cancelar cadastro
  document.querySelector('#modal-produto .cancelar').addEventListener('click', () => {
    document.getElementById('modal-produto').style.display = 'none';
  });


  // Atualiza unidade atual ao mudar unidade mínima
  document.getElementById('unidade-minima').addEventListener('change', e => {
    document.getElementById('unidade-atual').value = e.target.value;
  });

  // Sincroniza unidade de medida com tipo de preço e avisa o usuário
  document.getElementById('preco-por').addEventListener('change', e => {
    const precoPor = e.target.value;
    const unidade = document.getElementById('unidade-minima').value;

    const combinacoesValidas = {
      unidade: ['unidade', 'pacote'],
      pacote: ['unidade', 'pacote'],
      litro: ['litro', 'ml'],
      ml: ['litro', 'ml'],
      kg: ['kg', 'g', '100g'],
      g: ['kg', 'g', '100g'],
      '100g': ['kg', 'g', '100g']
    };

    if (!combinacoesValidas[precoPor]?.includes(unidade)) {
      mostrarMensagem(`⚠️ A unidade "${unidade}" não é ideal para o tipo de preço "${precoPor}". Considere ajustar para compatibilidade.`, 'warning');
    }
  });

  document.getElementById('btn-confirmar-validade').addEventListener('click', () => {
    window.continuarMesmoComValidadeVencida = true;
    document.getElementById('modal-validade-vencida').style.display = 'none';
    if (window.submissaoPendente) {
      handleFormSubmit(window.submissaoPendente);
      window.submissaoPendente = null;
    }
  });

  document.getElementById('btn-cancelar-validade').addEventListener('click', () => {
    document.getElementById('modal-validade-vencida').style.display = 'none';
    window.submissaoPendente = null;
  });

});

//Dobrar Nossa Historia ao clicar (seção)
document.getElementById('toggle-historia').addEventListener('click', () => {
  const conteudo = document.getElementById('conteudo-historia');
  const icone = document.getElementById('toggle-historia');

  const escondido = conteudo.classList.toggle('hidden');
  icone.classList.toggle('rotacionado');

  // Acessibilidade
  icone.setAttribute('aria-expanded', !escondido);
});

// --- BUSCAR PRODUTOS COM ALERTAS ---
function carregarAlertasDoFirebase() {
  const idComerciante = sessionStorage.getItem("idComerciante") || localStorage.getItem("idComerciante");

  firebase.database().ref('produto').once('value').then(snapshot => {
    alertas = [];

    // Zera horário de hoje (00:00 local)
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Helper: parse "YYYY-MM-DD" como data local (00:00)
    function parseLocalDate(str) {
      const [ano, mes, dia] = str.split("-");
      return new Date(Number(ano), Number(mes) - 1, Number(dia));
    }

    snapshot.forEach(childSnapshot => {
      const produto = childSnapshot.val();
      produto.firebaseKey = childSnapshot.key;

      // 1) Só do comerciante logado
      if (produto.idComerciante !== idComerciante) return;

      let temVencido = false;
      let temProxValid = false;
      let diasParaVencer = null;

      // 2) Se há lotes, calcula dias para cada validade
      if (produto.lotes) {
        const diffs = Object.values(produto.lotes).map(lote => {
          const dataVal = parseLocalDate(lote.validade);
          // já nasce em 00:00 local, mas reforça:
          dataVal.setHours(0, 0, 0, 0);
          // Math.round corrige pequenos offsets de timezone
          return Math.round((dataVal - hoje) / (1000 * 60 * 60 * 24));
        });

        // marca vencidos (hoje incluído)
        if (diffs.some(d => d <= 0)) {
          temVencido = true;
        }
        // marca próximos (1 a 7 dias) e captura o menor
        const proximos = diffs.filter(d => d > 0 && d <= 7);
        if (proximos.length) {
          temProxValid = true;
          diasParaVencer = Math.min(...proximos);
        }

        // 3) Se não há lotes mas há validade no produto raiz
      } else if (produto.validade) {
        const dataVal = parseLocalDate(produto.validade);
        dataVal.setHours(0, 0, 0, 0);
        const diff = Math.round((dataVal - hoje) / (1000 * 60 * 60 * 24));
        if (diff <= 0) {
          temVencido = true;
        } else if (diff <= 7) {
          temProxValid = true;
          diasParaVencer = diff;
        }
      }

      // 4) Estoque baixo (<= mínimo)
      const qtde = parseFloat(produto.quantidadeEstoque || 0);
      const qtdeMin = parseFloat(produto.quantidadeMinima || 0);
      const temEstoqueBaixo = qtde <= qtdeMin;

      // 5) Se não há nenhum alerta, pula
      if (!temVencido && !temProxValid && !temEstoqueBaixo) return;

      // 6) Monta objeto de alerta
      const alerta = {
        nome: produto.nome,
        diasParaVencer,
        quantidadeEstoque: qtde,
        quantidadeMinima: qtdeMin,
        unidade: produto.unidadeMedida,
        tipos: []
      };

      // 7) Categoriza
      if (temVencido) alerta.tipos.push('vencido');
      else if (temProxValid) alerta.tipos.push('validade');
      if (temEstoqueBaixo) alerta.tipos.push('estoque');

      alertas.push(alerta);
    });

    // 8) Atualiza UI e garante “Todos” ativo
    atualizarListaAlertas();
    atualizarBadge();
    atualizarBotoesFiltro();
  });
}

// -- MOSTRAR MENSAGEM --
function mostrarMensagem(texto, tipo = 'success') {
  const msg = document.createElement('div');
  msg.textContent = texto;
  msg.className = `mensagem-alerta ${tipo}`;
  document.body.appendChild(msg);
  setTimeout(() => msg.remove(), 4000);
}

// --- APLICAR FILTROS ---
function filtrarAlertas(lista, filtro) {
  if (filtro === 'todos') return lista;
  return lista.filter(a => a.tipos.includes(filtro));
}

// --- EXIBIR LISTA DE ALERTAS ---
function atualizarListaAlertas() {
  const container = document.getElementById('lista-alertas');
  container.innerHTML = '';

  const filtrados = filtrarAlertas(alertas, filtroAtual);
  const inicio = paginaAtual * itensPorPagina;
  const fim = inicio + itensPorPagina;
  const pagina = filtrados.slice(inicio, fim);

  if (pagina.length === 0) {
    container.innerHTML = `<p style="color:gray;">Nenhum alerta encontrado.</p>`;
  } else {
    pagina.forEach(produto => {
      const div = document.createElement('div');
      let mensagem = '';
      let tipoClasse = '';
      let iconeClasse = 'fa-info-circle';

      const temEstoque = produto.tipos.includes('estoque');
      const temValidade = produto.tipos.includes('validade');
      const estaVencido = produto.tipos.includes('vencido');

      if (temEstoque && estaVencido) {
        mensagem = 'Produto com estoque baixo e vencido';
        tipoClasse = 'vencido';
        iconeClasse = 'fa-skull-crossbones';
      } else if (temEstoque && temValidade) {
        mensagem = `Produto com estoque baixo e vence em ${produto.diasParaVencer} dia(s)`;
        tipoClasse = 'validade';
        iconeClasse = 'fa-exclamation-triangle';
      } else if (temEstoque) {
        mensagem = 'Produto com estoque baixo';
        tipoClasse = 'estoque';
        iconeClasse = 'fa-box-open';
      } else if (estaVencido) {
        mensagem = 'Produto vencido';
        tipoClasse = 'vencido';
        iconeClasse = 'fa-skull-crossbones';
      } else if (temValidade) {
        mensagem = `Produto vence em ${produto.diasParaVencer} dia(s)`;
        tipoClasse = 'validade';
        iconeClasse = 'fa-exclamation-triangle';
      }

      div.className = `linha-alerta alerta-${tipoClasse}`;
      div.innerHTML = `
        <i class="fa ${iconeClasse}" style="min-width: 22px;"></i>
        <b>${produto.nome}</b> – ${mensagem}
      `;

      container.appendChild(div);
    });
  }

  atualizarContadorPaginas(filtrados.length);
}

// --- ATUALIZAR BADGE ---
function atualizarBadge() {
  document.getElementById('badge-alertas').textContent = alertas.length;
}

// --- ATUALIZAR BOTÕES DE PÁGINA ---
function atualizarContadorPaginas(total) {
  const totalPaginas = Math.ceil(total / itensPorPagina);
  document.getElementById('contador-paginas').textContent = `Página ${paginaAtual + 1} de ${totalPaginas}`;
}

// --- ATUALIZAR VISUAL DO BOTÃO DE FILTRO ---
function atualizarBotoesFiltro() {
  document.querySelectorAll('.botao-filtro').forEach(btn => {
    btn.classList.toggle('ativo', btn.getAttribute('data-filtro') === filtroAtual);
  });
}

// --- HISTÓRICO DE AÇÕES ---
let historicoCompleto = [];
let paginaHistorico = 0;
const itensHistoricoPorPagina = 5;
let termoBusca = '';

// Carrega histórico ao iniciar
function exibirHistorico() {
  firebase.database().ref('historicoAcoes').once('value').then(snapshot => {
    historicoCompleto = [];

    snapshot.forEach(childSnapshot => {
      const item = childSnapshot.val();
      item.firebaseKey = childSnapshot.key;
      historicoCompleto.unshift(item); // ordem mais recente primeiro
    });

    atualizarBadgeHistorico();
    renderizarHistorico();
  });
}

// Registra histórico
function registrarHistorico(tipo, descricao) {
  firebase.database().ref('historicoAcoes').push({
    tipo,
    descricao,
    data: new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  });
}

// Renderiza o histórico com filtro de busca + paginação
function renderizarHistorico() {
  const lista = document.getElementById('historico-acoes');
  lista.innerHTML = '';
  const resultados = historicoCompleto.filter(h =>
    h.tipo.toLowerCase().includes(termoBusca.toLowerCase()) ||
    h.descricao.toLowerCase().includes(termoBusca.toLowerCase())
  );

  const inicio = paginaHistorico * itensHistoricoPorPagina;
  const fim = inicio + itensHistoricoPorPagina;
  const pagina = resultados.slice(inicio, fim);

  if (pagina.length === 0) {
    lista.innerHTML = `<p style="color:gray;">Nenhum histórico encontrado.</p>`;
  } else {
    const ul = document.createElement('ul');
    pagina.forEach(h => {
      const li = document.createElement('li');
      li.innerHTML = `<b>${h.tipo}</b><br><span>${h.descricao}</span><br><small style="color:gray;">${h.data}</small>`;
      ul.appendChild(li);
    });
    lista.appendChild(ul);
  }

  atualizarPaginacaoHistorico(resultados.length);
}

// Atualiza badge
function atualizarBadgeHistorico() {
  document.getElementById('badge-historico').textContent = historicoCompleto.length;
}

// Paginação
function atualizarPaginacaoHistorico(total) {
  const totalPaginas = Math.ceil(total / itensHistoricoPorPagina);
  const contador = document.getElementById('contador-paginas-historico');
  contador.textContent = `Página ${paginaHistorico + 1} de ${totalPaginas}`;

  document.getElementById('btnAnteriorHistorico').disabled = paginaHistorico === 0;
  document.getElementById('btnProximoHistorico').disabled = paginaHistorico >= totalPaginas - 1;
}

// Navegação dos botões
document.getElementById('btnAnteriorHistorico').addEventListener('click', () => {
  if (paginaHistorico > 0) {
    paginaHistorico--;
    renderizarHistorico();
  }
});
document.getElementById('btnProximoHistorico').addEventListener('click', () => {
  const totalPaginas = Math.ceil(
    historicoCompleto.filter(h =>
      h.tipo.toLowerCase().includes(termoBusca.toLowerCase()) ||
      h.descricao.toLowerCase().includes(termoBusca.toLowerCase())
    ).length / itensHistoricoPorPagina
  );
  if (paginaHistorico < totalPaginas - 1) {
    paginaHistorico++;
    renderizarHistorico();
  }
});

// Campo de busca
document.getElementById('search-historico').addEventListener('input', e => {
  termoBusca = e.target.value;
  paginaHistorico = 0;
  renderizarHistorico();
});

// Limpar histórico (com confirmação)
// Ao clicar no botão "Limpar Histórico"
document.getElementById('limpar-historico').addEventListener('click', () => {
  document.getElementById('modal-confirmar-limpar-historico').style.display = 'flex';
});

// Cancelar
document.getElementById('cancelar-limpar').addEventListener('click', () => {
  document.getElementById('modal-confirmar-limpar-historico').style.display = 'none';
});

// Confirmar limpeza
document.getElementById('confirmar-limpar').addEventListener('click', () => {
  firebase.database().ref('historicoAcoes').remove().then(() => {
    historicoCompleto = [];
    renderizarHistorico();
    atualizarBadgeHistorico();

    // Fecha o modal
    document.getElementById('modal-confirmar-limpar-historico').style.display = 'none';

    // Exibe mensagem de sucesso se a função existir
    if (typeof mostrarMensagem === 'function') {
      mostrarMensagem('🧹 Histórico limpo com sucesso!', 'success');
    } else {
      alert('Histórico limpo com sucesso!'); // fallback básico
    }
  }).catch(error => {
    console.error("Erro ao limpar histórico:", error);
    if (typeof mostrarMensagem === 'function') {
      mostrarMensagem('Erro ao limpar o histórico. Tente novamente.', 'error');
    } else {
      alert('Erro ao limpar o histórico.');
    }
  });
});
