// Inicializando as variáveis para armazenar os produtos e os índices de edição e exclusão
const produtos = [];
let indiceParaExcluir = null;
let indiceParaEditar = null;

// Mostrar/Ocultar filtros ao clicar no botão de filtro
document.querySelector('.filter').addEventListener('click', () => {
  const filtros = document.getElementById('filtros-container');
  filtros.style.display = filtros.style.display === 'none' ? 'flex' : 'none'; // Alterna entre mostrar ou ocultar os filtros
});

// Preenche o campo de unidade atual com o valor da unidade mínima selecionada
document.getElementById('unidade-minima').addEventListener('change', function () {
  document.getElementById('unidade-atual').value = this.value;
});

// Definir o valor de unidade atual para o valor da unidade mínima quando o documento for carregado!
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('unidade-atual').value = document.getElementById('unidade-minima').value;
});

// Abrir o modal de cadastro de novo produto
document.querySelector('.abrir-modal').addEventListener('click', () => {
  document.getElementById('form-produto').reset(); // Reseta o formulário
  document.getElementById('modal-produto').style.display = 'flex'; // Exibe o modal
  document.querySelector('#form-produto .salvar').textContent = 'Salvar'; // Altera o texto do botão de salvar
  document.querySelector('#form-produto h3')?.remove(); // Remove o título se já existir
  document.querySelector('#form-produto').insertAdjacentHTML('afterbegin', '<center><h3>Adicionar Novo Produto</h3></center>'); // Adiciona o título "Adicionar Novo Produto"
  indiceParaEditar = null; // Reseta o índice de edição
});

// Fechar o modal de cadastro
document.querySelector('.cancelar').addEventListener('click', () => {
  document.getElementById('modal-produto').style.display = 'none'; // Esconde o modal
  indiceParaEditar = null; // Reseta o índice de edição
});

// Submeter o formulário de cadastro ou edição
document.querySelector('#form-produto').addEventListener('submit', function (e) {
  e.preventDefault(); // Previne o comportamento padrão do formulário

  // Criação da URL da imagem, caso o usuário tenha selecionado uma
  const imagemInput = document.getElementById('imagem');
  let imagemURL = imagemInput.files[0] ? URL.createObjectURL(imagemInput.files[0]) : '';

  // Objeto produto com os dados do formulário
  const produto = {
    codigo: document.getElementById('codigo').value,
    nome: document.getElementById('nome').value,
    categoria: document.getElementById('categoria').value,
    validade: document.getElementById('validade').value,
    descricao: document.getElementById('descricao').value,
    qtdMinima: document.getElementById('qtd-minima').value + ' ' + document.getElementById('unidade-minima').value,
    qtdAtual: document.getElementById('qtd-atual').value + ' ' + document.getElementById('unidade-atual').value,
    preco: parseFloat(document.getElementById('preco').value).toFixed(2),
    imagem: imagemURL
  };

  // Se estiver editando um produto existente, atualiza o produto na lista
  if (indiceParaEditar !== null) {
    produtos[indiceParaEditar] = { ...produtos[indiceParaEditar], ...produto };
    atualizarTabela(); // Atualiza a tabela após a edição
  } else {
    // Se for um novo produto, adiciona à lista
    produtos.push(produto);
    adicionarLinhaTabela(produto, produtos.length - 1); // Adiciona o produto à tabela
  }

  this.reset(); // Reseta o formulário
  document.getElementById('modal-produto').style.display = 'none'; // Esconde o modal
  indiceParaEditar = null; // Reseta o índice de edição
});

// Função que adiciona um produto à tabela
function adicionarLinhaTabela(produto, index) {
  const tbody = document.getElementById('lista-produtos');
  const row = document.createElement('tr');
  row.setAttribute('data-index', index); // Adiciona um atributo para identificar o índice

  // Adiciona as células na linha da tabela
  row.innerHTML = `
    <td>${produto.codigo}</td>
    <td>${produto.nome}</td>
    <td>${produto.qtdAtual}</td>
    <td><i class="fa fa-search search-icon" style="cursor: pointer;"></i></td>
    <td><i class="fa fa-edit edit-icon" style="cursor: pointer;"></i></td>
    <td><i class="fa fa-trash delete-icon" style="cursor: pointer;"></i></td>
  `;

  tbody.appendChild(row); // Adiciona a linha à tabela
}

// Função que atualiza a tabela inteira após edição ou exclusão
function atualizarTabela() {
  const tbody = document.getElementById('lista-produtos');
  tbody.innerHTML = ''; // Limpa a tabela
  produtos.forEach((produto, i) => adicionarLinhaTabela(produto, i)); // Recarrega a tabela com os produtos atualizados
}

// Fechar o modal de visualização de produto
document.querySelector('.cancelar-visualizar').addEventListener('click', () => {
  document.getElementById('modal-visualizar').style.display = 'none'; // Esconde o modal de visualização
});

// Evento principal da tabela (visualizar, editar, excluir)
document.getElementById('lista-produtos').addEventListener('click', function (e) {
  const row = e.target.closest('tr'); // Encontra a linha da tabela clicada
  const index = parseInt(row.getAttribute('data-index')); // Obtém o índice do produto

  // Abrir modal de visualização do produto
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
    document.getElementById('modal-visualizar').style.display = 'flex'; // Exibe o modal de visualização
  }

  // Abrir modal de edição do produto
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

    document.querySelector('#form-produto .salvar').textContent = 'Atualizar'; // Altera o texto para "Atualizar"
    document.querySelector('#form-produto h3')?.remove(); // Remove o título anterior
    document.querySelector('#form-produto').insertAdjacentHTML('afterbegin', '<center><h3>Editar Produto</h3></center>'); // Adiciona o título "Editar Produto"
    document.getElementById('modal-produto').style.display = 'flex'; // Exibe o modal de edição
  }

  // Confirmar exclusão do produto
  if (e.target.classList.contains('delete-icon')) {
    indiceParaExcluir = index;
    document.getElementById('modal-confirmar-exclusao').style.display = 'flex'; // Exibe o modal de confirmação de exclusão
  }
});

// Confirmação de exclusão do produto
document.getElementById('btn-confirmar-excluir').addEventListener('click', () => {
  if (indiceParaExcluir !== null) {
    produtos.splice(indiceParaExcluir, 1); // Remove o produto da lista
    atualizarTabela(); // Atualiza a tabela
    indiceParaExcluir = null; // Reseta o índice de exclusão
    document.getElementById('modal-confirmar-exclusao').style.display = 'none'; // Esconde o modal de confirmação
  }
});

// Cancelar exclusão do produto
document.getElementById('btn-cancelar-excluir').addEventListener('click', () => {
  indiceParaExcluir = null; // Reseta o índice de exclusão
  document.getElementById('modal-confirmar-exclusao').style.display = 'none'; // Esconde o modal de confirmação
});

// Filtro de pesquisa
document.querySelector('.input-icon input').addEventListener('input', aplicarFiltros);

// Filtros por categoria e nome
document.getElementById('filtrar-categoria').addEventListener('change', aplicarFiltros);
document.getElementById('ordenar-nome').addEventListener('change', aplicarFiltros);

// Aplica filtros e ordenação
function aplicarFiltros() {
  const termo = document.querySelector('.input-icon input').value.toLowerCase(); // Obtém o valor da pesquisa
  const categoriaSelecionada = document.getElementById('filtrar-categoria').value; // Obtém a categoria selecionada
  const ordem = document.getElementById('ordenar-nome').value; // Obtém a ordem de ordenação

  let filtrados = produtos.filter(prod => {
    const nome = prod.nome.toLowerCase(); // Obtém o nome do produto
    const categoria = prod.categoria.toLowerCase(); // Obtém a categoria do produto
    const termoMatch = nome.includes(termo) || categoria.includes(termo); // Verifica se o nome ou categoria correspondem ao termo de pesquisa
    const categoriaMatch = categoriaSelecionada ? prod.categoria === categoriaSelecionada : true; // Verifica se a categoria corresponde
    return termoMatch && categoriaMatch;
  });

  // Ordena os produtos
  if (ordem === 'az') {
    filtrados.sort((a, b) => a.nome.localeCompare(b.nome)); // Ordena em ordem alfabética de A a Z
  } else if (ordem === 'za') {
    filtrados.sort((a, b) => b.nome.localeCompare(a.nome)); // Ordena em ordem alfabética de Z a A
  }

  // Atualiza a tabela com os produtos filtrados
  const tbody = document.getElementById('lista-produtos');
  tbody.innerHTML = ''; // Limpa a tabela
  filtrados.forEach((prod, i) => adicionarLinhaTabela(prod, i)); // Adiciona os produtos filtrados
}
