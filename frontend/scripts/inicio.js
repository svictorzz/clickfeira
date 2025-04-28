// --- VARIÁVEIS GLOBAIS ---
let alertas = [];
let paginaAtual = 0;
const itensPorPagina = 5;
let filtroAtual = 'todos'; // Filtro ativo: todos, estoque ou validade

// --- FUNÇÕES AUXILIARES ---

// Exibe uma mensagem de alerta (sucesso ou erro) no topo da tela
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

// Atualiza a lista de alertas de acordo com o filtro ativo
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

  paginaItens.forEach(alerta => {
    const linha = document.createElement('div');
    linha.className = 'linha-alerta ' + (alerta.tipo === 'validade' ? 'alerta-validade' : 'alerta-estoque');
    linha.innerHTML = alerta.mensagem;
    lista.appendChild(linha);
  });

  atualizarContador(filtrados.length);
}

// Atualiza o contador de páginas da paginação
function atualizarContador(totalItens) {
  const contador = document.getElementById('contador-paginas');
  const totalPaginas = Math.ceil(totalItens / itensPorPagina);
  contador.innerText = `Página ${paginaAtual + 1} de ${totalPaginas}`;
  document.getElementById('btnAnterior').disabled = paginaAtual === 0;
  document.getElementById('btnProximo').disabled = paginaAtual >= totalPaginas - 1;
}

// Controla a visibilidade da paginação
function controlarPaginacao() {
  const totalPaginas = Math.ceil(alertas.length / itensPorPagina);
  const paginacao = document.getElementById('paginacao');
  paginacao.style.display = totalPaginas <= 1 ? 'none' : 'flex';
}

// --- EVENTOS PRINCIPAIS ---

// Ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
  const lista = document.getElementById('lista-alertas');
  const dados = localStorage.getItem('produtos');

  if (!dados) {
    lista.innerHTML = "<p>Nenhum alerta no momento.</p>";
    document.getElementById('paginacao').style.display = 'none';
    return;
  }

  const produtos = JSON.parse(dados);
  const hoje = new Date();

  produtos.forEach(produto => {
    const validadeProduto = new Date(produto.validade);
    const diasParaVencer = Math.floor((validadeProduto - hoje) / (1000 * 60 * 60 * 24));
    const estoqueAtual = parseFloat(produto.qtdAtual.split(' ')[0]);
    const estoqueMinimo = parseFloat(produto.qtdMinima.split(' ')[0]);

    if (diasParaVencer <= 7 || estoqueAtual < estoqueMinimo) {
      const alerta = {
        tipo: diasParaVencer <= 7 ? 'validade' : 'estoque',
        mensagem: diasParaVencer <= 7
          ? `⚠️ <b>${produto.nome}</b> está <b>próximo da data de vencimento</b>.`
          : `⚠️ <b>${produto.nome}</b> está com o <b>estoque abaixo do ideal</b>.`
      };
      alertas.push(alerta);
    }
  });

  if (alertas.length === 0) {
    lista.innerHTML = "<p>Nenhum alerta no momento.</p>";
    document.getElementById('paginacao').style.display = 'none';
  } else {
    atualizarLista();
    controlarPaginacao();
  }
});

// Controle de filtros e botões de paginação
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('botao-filtro')) {
    filtroAtual = e.target.getAttribute('data-filtro');
    paginaAtual = 0;
    atualizarLista();
  }

  if (e.target.id === 'btnAnterior') {
    paginaAtual--;
    atualizarLista();
  }

  if (e.target.id === 'btnProximo') {
    paginaAtual++;
    atualizarLista();
  }
});

// --- MODAL DE CADASTRO DE PRODUTOS ---

// Abre o modal de cadastro ao clicar no botão "+"
document.getElementById('botao-flutuante').addEventListener('click', () => {
  document.getElementById('form-produto').reset();
  document.getElementById('codigo').value = gerarCodigoProduto();
  document.getElementById('modal-produto').style.display = 'flex';
});

// Fecha o modal ao clicar em "Cancelar"
document.querySelector('.cancelar').addEventListener('click', () => {
  document.getElementById('modal-produto').style.display = 'none';
});

// Atualiza automaticamente a unidade atual conforme a unidade mínima
document.getElementById('unidade-minima').addEventListener('change', function () {
  document.getElementById('unidade-atual').value = this.value;
});

// Cadastra o produto ao submeter o formulário
document.getElementById('form-produto').addEventListener('submit', function (e) {
  e.preventDefault();

  const nome = document.getElementById('nome').value.trim();
  const categoria = document.getElementById('categoria').value.trim();
  const preco = parseFloat(document.getElementById('preco').value);
  const validade = new Date(document.getElementById('validade').value);
  const unidadeMinima = document.getElementById('unidade-minima').value;
  const unidadeAtual = document.getElementById('unidade-atual').value;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const imagemInput = document.getElementById('imagem');
  const file = imagemInput.files[0];

  // --- Validações ---
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

  if (validade < hoje) {
    mostrarMensagem('Data de validade inválida! Escolha uma data futura.', 'error');
    return;
  }

  if (!['unidade', 'g', 'kg', 'ml', 'l'].includes(unidadeMinima) || !['unidade', 'g', 'kg', 'ml', 'l'].includes(unidadeAtual)) {
    mostrarMensagem('A unidade precisa ser Unidade, g, kg, ml ou l!', 'error');
    return;
  }

  const produtos = JSON.parse(localStorage.getItem('produtos')) || [];

  const salvarProduto = (imagemBase64) => {
    const produto = {
      codigo: document.getElementById('codigo').value,
      nome: nome,
      categoria: categoria,
      validade: document.getElementById('validade').value,
      descricao: document.getElementById('descricao').value,
      qtdMinima: document.getElementById('qtd-minima').value + ' ' + unidadeMinima,
      qtdAtual: document.getElementById('qtd-atual').value + ' ' + unidadeAtual,
      preco: preco.toFixed(2),
      imagem: imagemBase64
    };

    produtos.push(produto);
    localStorage.setItem('produtos', JSON.stringify(produtos));

    document.getElementById('modal-produto').style.display = 'none';
    document.getElementById('form-produto').reset();
    mostrarMensagem('Produto cadastrado com sucesso!', 'success');
    location.reload();
  };

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
