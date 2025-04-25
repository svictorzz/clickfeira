// --- VARIÁVEIS GLOBAIS ---
const produtos = [];
let indiceParaExcluir = null;
let indiceParaEditar = null;

// --- FUNÇÕES UTILITÁRIAS ---
// Gera um código aleatório para novos produtos
function gerarCodigoProduto() {
  const random = Math.floor(Math.random() * 90000) + 10000;
  return `P${random}`;
}

// Exibe uma mensagem temporária na tela
function mostrarMensagem(texto, tipo) {
  const mensagem = document.createElement('div');
  mensagem.textContent = texto;
  mensagem.className = `mensagem-alerta ${tipo}`;
  document.body.appendChild(mensagem);

  setTimeout(() => mensagem.remove(), 3000);
}

// Adiciona um produto na tabela
function adicionarLinhaTabela(produto, index) {
  const tbody = document.getElementById('lista-produtos');
  const row = document.createElement('tr');
  row.setAttribute('data-index', index);

  row.innerHTML = `
    <td>${produto.codigo}</td>
    <td>${produto.nome}</td>
    <td>${produto.qtdAtual}</td>
    <td><i class="fa fa-search search-icon" style="cursor: pointer;"></i></td>
    <td><i class="fa fa-edit edit-icon" style="cursor: pointer;"></i></td>
    <td><i class="fa fa-trash delete-icon" style="cursor: pointer;"></i></td>
  `;

  tbody.appendChild(row);
}

// Atualiza toda a tabela de produtos
function atualizarTabela() {
  const tbody = document.getElementById('lista-produtos');
  tbody.innerHTML = '';
  produtos.forEach((produto, i) => adicionarLinhaTabela(produto, i));
}

// Aplica filtros e ordenação
function aplicarFiltros() {
  const termo = document.querySelector('.input-icon input').value.toLowerCase();
  const categoriaSelecionada = document.getElementById('filtrar-categoria').value;
  const ordem = document.getElementById('ordenar-nome').value;

  let filtrados = produtos.filter(prod => {
    const nome = prod.nome.toLowerCase();
    const categoria = prod.categoria.toLowerCase();
    const termoMatch = nome.includes(termo) || categoria.includes(termo);
    const categoriaMatch = categoriaSelecionada ? prod.categoria === categoriaSelecionada : true;
    return termoMatch && categoriaMatch;
  });

  if (ordem === 'az') filtrados.sort((a, b) => a.nome.localeCompare(b.nome));
  if (ordem === 'za') filtrados.sort((a, b) => b.nome.localeCompare(a.nome));

  const tbody = document.getElementById('lista-produtos');
  tbody.innerHTML = '';
  filtrados.forEach((prod, i) => adicionarLinhaTabela(prod, i));
}

// --- EVENTOS GERAIS ---

// Mostrar/Ocultar filtros
document.querySelector('.filter').addEventListener('click', () => {
  const filtros = document.getElementById('filtros-container');
  filtros.style.display = filtros.style.display === 'none' ? 'flex' : 'none';
});

// Sincronizar unidade mínima com unidade atual
document.getElementById('unidade-minima').addEventListener('change', function () {
  document.getElementById('unidade-atual').value = this.value;
});

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('unidade-atual').value = document.getElementById('unidade-minima').value;
});

// Abrir modal de novo produto
document.querySelector('.abrir-modal').addEventListener('click', () => {
  document.getElementById('form-produto').reset();
  document.getElementById('codigo').value = gerarCodigoProduto();
  document.getElementById('modal-produto').style.display = 'flex';
  document.querySelector('#form-produto .salvar').textContent = 'Salvar';
  document.querySelector('#form-produto h3')?.remove();
  document.querySelector('#form-produto').insertAdjacentHTML('afterbegin', '<center><h3>Adicionar Novo Produto</h3></center>');
  indiceParaEditar = null;
});

// Fechar modal de cadastro
document.querySelector('.cancelar').addEventListener('click', () => {
  document.getElementById('modal-produto').style.display = 'none';
  indiceParaEditar = null;
});

// Submeter formulário de cadastro ou edição
document.querySelector('#form-produto').addEventListener('submit', function (e) {
  e.preventDefault();

  // --- Validações obrigatórias ---
  const nome = document.getElementById('nome').value.trim();
  const categoria = document.getElementById('categoria').value.trim();
  const preco = parseFloat(document.getElementById('preco').value);
  const validade = new Date(document.getElementById('validade').value);
  const hoje = new Date();

  if (!nome || !categoria || isNaN(preco)) {
    mostrarMensagem('Preencha todos os campos obrigatórios!', 'error');
    return;
  }

  if (preco < 0) {
    mostrarMensagem('O preço não pode ser negativo!', 'error');
    return;
  }

  if (validade < hoje) {
    mostrarMensagem('Data de validade inválida!', 'error');
    return;
  }

  // --- Se passar todas as validações, continua ---
  const imagemInput = document.getElementById('imagem');
  const imagemURL = imagemInput.files[0] ? URL.createObjectURL(imagemInput.files[0]) : '';

  const produto = {
    codigo: document.getElementById('codigo').value,
    nome: nome,
    categoria: categoria,
    validade: document.getElementById('validade').value,
    descricao: document.getElementById('descricao').value,
    qtdMinima: document.getElementById('qtd-minima').value + ' ' + document.getElementById('unidade-minima').value,
    qtdAtual: document.getElementById('qtd-atual').value + ' ' + document.getElementById('unidade-atual').value,
    preco: preco.toFixed(2),
    imagem: imagemURL
  };

  if (indiceParaEditar !== null) {
    produtos[indiceParaEditar] = { ...produtos[indiceParaEditar], ...produto };
    atualizarTabela();
  } else {
    produtos.push(produto);
    adicionarLinhaTabela(produto, produtos.length - 1);
  }

  // Perguntar se o usuário quer cadastrar outro
  if (confirm('Produto cadastrado! Deseja cadastrar outro?')) {
    this.reset();
    document.getElementById('codigo').value = gerarCodigoProduto();
  } else {
    this.reset();
    document.getElementById('modal-produto').style.display = 'none';
  }

  indiceParaEditar = null;
});

// Fechar modal de visualização
document.querySelector('.cancelar-visualizar').addEventListener('click', () => {
  document.getElementById('modal-visualizar').style.display = 'none';
});

// Evento principal da tabela (Visualizar, Editar, Excluir)
document.getElementById('lista-produtos').addEventListener('click', function (e) {
  const row = e.target.closest('tr');
  const index = parseInt(row.getAttribute('data-index'));

  if (e.target.classList.contains('search-icon')) {
    const produto = produtos[index];
    document.getElementById('ver-codigo').textContent = produto.codigo;
    document.getElementById('ver-nome').textContent = produto.nome;
    document.getElementById('ver-categoria').textContent = produto.categoria;
    document.getElementById('ver-validade').textContent = produto.validade;
    document.getElementById('ver-preco').textContent = produto.preco;
    document.getElementById('ver-descricao').textContent = produto.descricao;
    document.getElementById('ver-qtd-minima').textContent = produto.qtdMinima;
    document.getElementById('ver-qtd-atual').textContent = produto.qtdAtual;
    document.getElementById('ver-imagem').src = produto.imagem;
    document.getElementById('modal-visualizar').style.display = 'flex';
  }

  if (e.target.classList.contains('edit-icon')) {
    const produto = produtos[index];
    indiceParaEditar = index;

    document.getElementById('codigo').value = produto.codigo;
    document.getElementById('nome').value = produto.nome;
    document.getElementById('categoria').value = produto.categoria;
    document.getElementById('validade').value = produto.validade;
    document.getElementById('descricao').value = produto.descricao;
    document.getElementById('qtd-minima').value = produto.qtdMinima.split(' ')[0];
    document.getElementById('unidade-minima').value = produto.qtdMinima.split(' ')[1];
    document.getElementById('qtd-atual').value = produto.qtdAtual.split(' ')[0];
    document.getElementById('unidade-atual').value = produto.qtdAtual.split(' ')[1];
    document.getElementById('preco').value = produto.preco;

    document.querySelector('#form-produto .salvar').textContent = 'Atualizar';
    document.querySelector('#form-produto h3')?.remove();
    document.querySelector('#form-produto').insertAdjacentHTML('afterbegin', '<center><h3>Editar Produto</h3></center>');
    document.getElementById('modal-produto').style.display = 'flex';
  }

  if (e.target.classList.contains('delete-icon')) {
    indiceParaExcluir = index;
    document.getElementById('modal-confirmar-exclusao').style.display = 'flex';
  }
});

// Confirmar exclusão de produto
document.getElementById('btn-confirmar-excluir').addEventListener('click', () => {
  if (indiceParaExcluir !== null) {
    produtos.splice(indiceParaExcluir, 1);
    atualizarTabela();
    indiceParaExcluir = null;
    document.getElementById('modal-confirmar-exclusao').style.display = 'none';
  }
});

// Cancelar exclusão de produto
document.getElementById('btn-cancelar-excluir').addEventListener('click', () => {
  indiceParaExcluir = null;
  document.getElementById('modal-confirmar-exclusao').style.display = 'none';
});

// Eventos de filtro e ordenação
document.querySelector('.input-icon input').addEventListener('input', aplicarFiltros);
document.getElementById('filtrar-categoria').addEventListener('change', aplicarFiltros);
document.getElementById('ordenar-nome').addEventListener('change', aplicarFiltros);
