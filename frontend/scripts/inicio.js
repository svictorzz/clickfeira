// --- VARIÁVEIS GLOBAIS ---
let alertas = [];
let paginaAtual = 0;
const itensPorPagina = 5;
let filtroAtual = 'todos'; // todos, estoque ou validade

// Variáveis de histórico
let historicoCompleto = [];
let paginaHistorico = 0;
const itensHistoricoPorPagina = 5;

// --- FUNÇÕES AUXILIARES ---

// Calcula dias que um item tem para vencer
function calcularDiasParaVencer(validadeStr) {
  const hoje = new Date();
  const validade = new Date(validadeStr);

  const hojeEmDias = Math.floor(hoje.getTime() / (1000 * 60 * 60 * 24));
  const validadeEmDias = Math.floor(validade.getTime() / (1000 * 60 * 60 * 24));

  return validadeEmDias - hojeEmDias;
}

// Exibe mensagem de alerta (sucesso ou erro)
function mostrarMensagem(texto, tipo) {
  const mensagem = document.createElement('div');
  mensagem.textContent = texto;
  mensagem.className = `mensagem-alerta ${tipo}`;
  document.body.appendChild(mensagem);

  setTimeout(() => mensagem.remove(), 3000);
}

// Gera um código único para o produto
function gerarCodigoProduto() {
  let novoCodigo;
  let existe;
  const produtos = JSON.parse(localStorage.getItem('produtos')) || [];

  do {
    const random = Math.floor(Math.random() * 90000) + 10000;
    novoCodigo = `PRD-${random}`;
    existe = produtos.some(produto => produto.codigo === novoCodigo);
  } while (existe);

  return novoCodigo;
}
// Atualiza visualmente a lista de alertas
function atualizarLista() {
  const lista = document.getElementById('lista-alertas');
  lista.innerHTML = '';

  const filtrados = alertas.filter(alerta => {
    if (filtroAtual === 'todos') return true;
    return alerta.tipo === filtroAtual;
  });

  const inicio = paginaAtual * itensPorPagina;
  const fim = inicio + itensPorPagina;
  const paginaItens = filtrados.slice(inicio, fim);

  if (paginaItens.length === 0) {
    lista.innerHTML = "<p>Nenhum alerta encontrado.</p>";
  } else {
    paginaItens.forEach(alerta => {
      const linha = document.createElement('div');
      linha.className = 'linha-alerta ' + (alerta.tipo === 'validade' ? 'alerta-validade' : 'alerta-estoque');
      const icone = alerta.tipo === 'validade' ? '⏳' : '📦';

      linha.innerHTML = `
        <span style="font-size: 20px;">${icone}</span> 
        <div>
          <b>${alerta.produto}</b> <br>
          ${alerta.tipo === 'validade' ? `Vence em ${alerta.diasParaVencer} dia(s).` : `Estoque atual está abaixo do mínimo, está: ${alerta.qtdAtual}.`}
        </div>
      `;
      lista.appendChild(linha);
    });
  }

  atualizarContador(filtrados.length);
  controlarPaginacao();
}

// Atualiza a contagem e exibição da paginação
function atualizarContador(totalItens) {
  const contador = document.getElementById('contador-paginas');
  const totalPaginas = Math.max(1, Math.ceil(totalItens / itensPorPagina));
  contador.innerText = `Página ${paginaAtual + 1} de ${totalPaginas}`;

  document.getElementById('btnAnterior').disabled = paginaAtual === 0;
  document.getElementById('btnProximo').disabled = paginaAtual >= totalPaginas - 1;
}

// Controla exibição dos botões de paginação
function controlarPaginacao() {
  const totalPaginas = Math.ceil(alertas.length / itensPorPagina);
  const paginacao = document.getElementById('paginacao');
  paginacao.style.display = totalPaginas <= 1 ? 'none' : 'flex';
}

// --- FILTROS DE ALERTAS ---
function aplicarFiltro(filtro) {
  filtroAtual = filtro;
  paginaAtual = 0;
  atualizarLista();
}

document.querySelectorAll('.botao-filtro').forEach(button => {
  button.addEventListener('click', (e) => {
    aplicarFiltro(e.target.getAttribute('data-filtro'));
  });
});

// Gera alertas para produtos
function gerarAlertas(produto) {
  const alertasGerados = [];

  const diasParaVencer = calcularDiasParaVencer(produto.validade);
  const estoqueAtual = parseFloat(produto.qtdAtual.split(' ')[0]);
  const estoqueMinimo = parseFloat(produto.qtdMinima.split(' ')[0]);

  if (diasParaVencer <= 7) {
    const alertaValidade = {
      tipo: 'validade',
      produto: produto.nome,
      diasParaVencer: diasParaVencer
    };
    alertasGerados.push(alertaValidade);
  }

  if (estoqueAtual < estoqueMinimo) {
    const alertaEstoque = {
      tipo: 'estoque',
      produto: produto.nome,
      qtdAtual: produto.qtdAtual
    };
    alertasGerados.push(alertaEstoque);
  }

  return alertasGerados;
}

// Carrega alertas a partir do localStorage
function carregarAlertas() {
  const lista = document.getElementById('lista-alertas');
  alertas = [];

  const dadosProdutos = localStorage.getItem('produtos');
  if (dadosProdutos) {
    const produtos = JSON.parse(dadosProdutos);
    produtos.forEach(produto => {
      const novosAlertas = gerarAlertas(produto);
      alertas = alertas.concat(novosAlertas);
    });
  }

  if (alertas.length === 0) {
    lista.innerHTML = "<p>Nenhum alerta no momento.</p>";
    document.getElementById('paginacao').style.display = 'none';
  } else {
    atualizarLista();
    controlarPaginacao();
  }
}

// Função de Cadastro de Produto
function salvarProduto(imagemBase64 = '') {
  const nome = document.getElementById('nome').value.trim();
  const categoria = document.getElementById('categoria').value.trim();
  const preco = parseFloat(document.getElementById('preco').value);
  const validade = new Date(document.getElementById('validade').value);
  const unidadeMinima = document.getElementById('unidade-minima').value;
  const unidadeAtual = document.getElementById('unidade-atual').value;

  document.getElementById('unidade-minima').addEventListener('change', function () {
    const novaUnidade = this.value;
    document.getElementById('unidade-atual').value = novaUnidade;
  });

  if (!nome || !categoria || isNaN(preco)) {
    mostrarMensagem('Preencha todos os campos obrigatórios!', 'error');
    return;
  }

  if (preco < 0) {
    mostrarMensagem('O preço não pode ser negativo!', 'error');
    return;
  }

  if (isNaN(validade.getTime())) {
    mostrarMensagem('Preencha a data de validade!', 'error');
    return;
  }

  // Validando a unidade da quantidade mínima
  if (!['unidade', 'g', 'kg', 'ml', 'l'].includes(unidadeMinima)) {
    mostrarMensagem('A unidade da quantidade mínima deve ser Unidade, g, kg, ml ou l!', 'error');
    return;
  }

  // Garantindo que a unidade atual seja refletida com base na unidade mínima
  if (!unidadeAtual) {
    document.getElementById('unidade-atual').value = unidadeMinima; // Definindo a unidade atual como a mínima
  }

  const produtos = JSON.parse(localStorage.getItem('produtos')) || [];

  const produto = {
    codigo: gerarCodigoProduto(),
    nome: nome,
    categoria: categoria,
    preco: preco.toFixed(2),
    validade: validade.toISOString(),
    qtdMinima: document.getElementById('qtd-minima').value + ' ' + unidadeMinima,
    qtdAtual: document.getElementById('qtd-atual').value + ' ' + unidadeAtual,
    imagem: imagemBase64
  };

  produtos.push(produto);
  localStorage.setItem('produtos', JSON.stringify(produtos));

  document.getElementById('modal-produto').style.display = 'none';
  document.getElementById('form-produto').reset();

  mostrarMensagem('Produto cadastrado com sucesso!', 'success');

  // Registra o histórico de ação
  registrarHistorico('Cadastro de Produto', `Produto "${nome}" cadastrado com sucesso.`);

  carregarAlertas(); // Atualiza a lista de alertas
  controlarPaginacao();
}

// Função para registrar uma ação no histórico
function registrarHistorico(tipo, descricao) {
  const historicoAcoes = JSON.parse(localStorage.getItem('historicoAcoes')) || [];
  const acao = {
    tipo: tipo,
    descricao: descricao,
    data: new Date().toISOString()
  };
  historicoAcoes.push(acao);
  localStorage.setItem('historicoAcoes', JSON.stringify(historicoAcoes));

  exibirHistorico(); // Atualiza o histórico na interface
}

// Exibe o histórico no painel com paginação
// Função para exibir o histórico
function exibirHistorico() {
  const container = document.getElementById('historico-acoes');
  const containerBotao = document.getElementById('container-botao-historico');
  const historico = JSON.parse(localStorage.getItem('historicoAcoes')) || [];

  historicoCompleto = historico.reverse(); // Deixa os mais recentes primeiro

  if (historicoCompleto.length === 0) {
    container.innerHTML = "<p>Nenhuma ação registrada ainda.</p>";
    containerBotao.style.display = 'none';
    return;
  }

  const inicio = paginaHistorico * itensHistoricoPorPagina;
  const fim = inicio + itensHistoricoPorPagina;
  const historicoPagina = historicoCompleto.slice(inicio, fim);

  const lista = document.createElement('ul');
  lista.style.listStyle = "none";
  lista.style.padding = "0";

  historicoPagina.forEach(acao => {
    const item = document.createElement('li');
    const dataFormatada = new Date(acao.data).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    item.innerHTML = `<b>${acao.tipo}</b> - ${acao.descricao} <br><small>${dataFormatada}</small>`;
    item.style.marginBottom = "10px";
    lista.appendChild(item);
  });

  container.innerHTML = '';
  container.appendChild(lista);

  // Mostrar botões de página
  atualizarContadorHistorico();
  containerBotao.style.display = 'block';
}

// Atualiza a contagem e exibição da paginação do histórico
function atualizarContadorHistorico() {
  const totalPaginas = Math.ceil(historicoCompleto.length / itensHistoricoPorPagina);
  const contador = document.getElementById('contador-paginas-historico');

  if (!contador) return;

  contador.innerText = `Página ${paginaHistorico + 1} de ${totalPaginas}`;

  // Habilitar/desabilitar os botões de navegação conforme necessário
  document.getElementById('btnAnteriorHistorico').disabled = paginaHistorico === 0;
  document.getElementById('btnProximoHistorico').disabled = paginaHistorico >= totalPaginas - 1;
}

// Botões de navegação do histórico
document.getElementById('btnAnteriorHistorico').addEventListener('click', () => {
  if (paginaHistorico > 0) {
    paginaHistorico--;
    exibirHistorico(); // Atualiza o histórico ao clicar "Anterior"
  }
});

document.getElementById('btnProximoHistorico').addEventListener('click', () => {
  const totalPaginas = Math.ceil(historicoCompleto.length / itensHistoricoPorPagina);
  if (paginaHistorico < totalPaginas - 1) {
    paginaHistorico++;
    exibirHistorico(); // Atualiza o histórico ao clicar "Próximo"
  }
});

// Exibe o histórico no painel com paginação
function exibirHistorico() {
  const container = document.getElementById('historico-acoes');
  const containerBotao = document.getElementById('container-botao-historico');
  const historico = JSON.parse(localStorage.getItem('historicoAcoes')) || [];

  historicoCompleto = historico.reverse(); // Deixa os mais recentes primeiro

  if (historicoCompleto.length === 0) {
    container.innerHTML = "<p>Nenhuma ação registrada ainda.</p>";
    containerBotao.style.display = 'none';
    return;
  }

  const inicio = paginaHistorico * itensHistoricoPorPagina;
  const fim = inicio + itensHistoricoPorPagina;
  const historicoPagina = historicoCompleto.slice(inicio, fim);

  const lista = document.createElement('ul');
  lista.style.listStyle = "none";
  lista.style.padding = "0";

  historicoPagina.forEach(acao => {
    const item = document.createElement('li');
    const dataFormatada = new Date(acao.data).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    item.innerHTML = `<b>${acao.tipo}</b> - ${acao.descricao} <br><small>${dataFormatada}</small>`;
    item.style.marginBottom = "10px";
    lista.appendChild(item);
  });

  container.innerHTML = '';
  container.appendChild(lista);

  // Mostrar botões de página
  atualizarContadorHistorico();
  containerBotao.style.display = 'block';
}

// Atualiza a paginação do histórico
function atualizarContadorHistorico() {
  const totalPaginas = Math.ceil(historicoCompleto.length / itensHistoricoPorPagina);
  const contador = document.getElementById('contador-paginas-historico');

  if (!contador) return;

  contador.innerText = `Página ${paginaHistorico + 1} de ${totalPaginas}`;
  document.getElementById('btnAnteriorHistorico').disabled = paginaHistorico === 0;
  document.getElementById('btnProximoHistorico').disabled = paginaHistorico >= totalPaginas - 1;
}

// Eventos principais
document.addEventListener('DOMContentLoaded', () => {
  carregarAlertas();
  exibirHistorico();

  //Encolher ou expandir Nossa Historia título
  document.getElementById('toggle-historia').addEventListener('click', function () {
    const conteudoHistoria = document.getElementById('conteudo-historia');
    const isHidden = conteudoHistoria.classList.contains('hidden');

    if (isHidden) {
      conteudoHistoria.classList.remove('hidden');
      this.innerHTML = '&#x21d5;'; // Ícone de seta para baixo (expandido)
    } else {
      conteudoHistoria.classList.add('hidden');
      this.innerHTML = '&#x21d4;'; // Ícone de seta para cima (recolhido)
    }
  });


  // Refletir unidade de medida de qtd minima em qtd atual
  document.getElementById('unidade-minima').addEventListener('change', function () {
    const novaUnidade = this.value;
    document.getElementById('unidade-atual').value = novaUnidade;
  });

  // Cadastro de novo produto
  document.getElementById('botao-flutuante').addEventListener('click', () => {
    document.getElementById('form-produto').reset();
    document.getElementById('codigo').value = gerarCodigoProduto();
    document.getElementById('modal-produto').style.display = 'flex';
  });

  document.querySelector('.cancelar').addEventListener('click', () => {
    document.getElementById('modal-produto').style.display = 'none';
  });

  document.getElementById('form-produto').addEventListener('submit', (e) => {
    e.preventDefault();
    const imagemInput = document.getElementById('imagem');
    const file = imagemInput.files[0];

    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        salvarProduto(e.target.result);
      };
      reader.readAsDataURL(file);
    } else {
      salvarProduto('');
    }
  });

  // Filtros de alerta
  document.querySelectorAll('.botao-filtro').forEach(button => {
    button.addEventListener('click', (e) => {
      aplicarFiltro(e.target.getAttribute('data-filtro'));
    });
  });
});

// Limpar histórico
document.getElementById('limpar-historico').addEventListener('click', () => {
  if (confirm('Tem certeza que deseja apagar todo o histórico?')) {
    localStorage.removeItem('historicoAcoes');
    exibirHistorico();
    mostrarMensagem('Histórico apagado com sucesso.', 'success');
  }
});

// Funções de paginação para histórico
document.getElementById('btnAnterior').addEventListener('click', () => {
  if (paginaAtual > 0) {
    paginaAtual--;
    atualizarLista();
  }
});

document.getElementById('btnProximo').addEventListener('click', () => {
  const totalPaginas = Math.ceil(alertas.length / itensPorPagina);
  if (paginaAtual < totalPaginas - 1) {
    paginaAtual++;
    atualizarLista();
  }
});
