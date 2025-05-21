// --- VARIÁVEIS GLOBAIS ---
const produtos = [];
let indiceParaExcluir = null;
let indiceParaEditar = null;
let paginaAtual = 1;
const itensPorPagina = 10;

// --- LOCAL STORAGE ---
function salvarProdutosNoLocalStorage() {
  localStorage.setItem('produtos', JSON.stringify(produtos));
}

function carregarProdutosDoLocalStorage() {
  const dados = localStorage.getItem('produtos');
  if (dados) {
    const produtosCarregados = JSON.parse(dados);
    produtosCarregados.forEach(produto => produtos.push(produto));
    atualizarTabela();
  }
}

// --- FUNÇÕES AUXILIARES ---

// -- FORMATAR DATA --
function formatarData(dataString) {
  const data = parseDateYMD(dataString);
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const ano = data.getFullYear();
  return `${dia}-${mes}-${ano}`;
}

function parseDateYMD(ymd) {
  // ymd ex: "2025-05-04"
  const [year, month, day] = ymd.split('-').map(n => parseInt(n, 10));
  return new Date(year, month - 1, day);
}

//calcular valor do estoque para modal de visualizar
function calcularValorTotalEstoque(produto) {
  const preco = Number(produto.preco);
  const qtd = Number(produto.qtdAtual.split(' ')[0]);
  const unidade = produto.precoPor;

  let fator = 1;

  switch (unidade) {
    case '100g':
      fator = qtd / 100;
      break;
    case 'kg':
    case 'litro':
      fator = qtd / 1000;
      break;
    case 'unidade':
    case 'pacote':
    default:
      fator = qtd;
  }

  const total = preco * fator;
  return `R$ ${total.toFixed(2)}`;
}


// -- GERAR CÓDIGO ALEATÓRIO --
function gerarCodigoProduto() {
  let novoCodigo;
  let existe;

  do {
    const random = Math.floor(Math.random() * 90000) + 10000; // Gera número entre 10000 e 99999
    novoCodigo = `PRD-${random}`;

    // Verifica se já existe um produto com esse código
    existe = produtos.some(produto => produto.codigo === novoCodigo);

  } while (existe); // Se já existir, gera outro

  return novoCodigo;
}

//Para saber de itens vencidos
function calcularDiasParaVencer(validadeStr) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);          // zera as horas
  const validade = parseDateYMD(validadeStr);
  const diff = validade.getTime() - hoje.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}


function mostrarMensagem(texto, tipo) {
  const mensagem = document.createElement('div');
  mensagem.textContent = texto;
  mensagem.className = `mensagem-alerta ${tipo}`;
  document.body.appendChild(mensagem);

  setTimeout(() => mensagem.remove(), 3000);
}

function converterImagemParaBase64(file, callback) {
  const reader = new FileReader();
  reader.onload = function (e) {
    callback(e.target.result);
  };
  reader.readAsDataURL(file);
}

// --- TABELA ---
function adicionarLinhaTabela(produto) {
  const tbody = document.getElementById('lista-produtos');
  const row = document.createElement('tr');
  row.setAttribute('data-codigo', produto.codigo);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const validadeProduto = parseDateYMD(produto.validade);
  const diasParaVencer = Math.floor((validadeProduto - hoje) / (1000 * 60 * 60 * 24));

  const estoqueAtual = parseFloat(produto.qtdAtual.split(' ')[0]);
  const estoqueMinimo = parseFloat(produto.qtdMinima.split(' ')[0]);

  let alerta = '';

  // Verificar se o produto está VENCIDO
  if (diasParaVencer <= 0) {
    row.classList.add('alerta-vencido');
    alerta = ' ⚠️';
  }
  // Próximo da validade (7 dias)
  else {
    if (diasParaVencer <= 7) {
      row.classList.add('alerta-validade');
      alerta = ' ⚠️';
    }   // Estoque abaixo
    if (estoqueAtual < estoqueMinimo) {
      row.classList.add('alerta-estoque');
      alerta = ' ⚠️';
    }
  }

  row.innerHTML = `
    <td><input type="checkbox" class="selecionar-produto"></td>
    <td data-label="Código">${produto.codigo}</td>
    <td data-label="Produto">${produto.nome}${alerta}</td>
    <td data-label="Estoque">${produto.qtdAtual}</td>
    <td data-label="Validade">${formatarData(produto.validade)}</td>
    <td data-label="Consultar"><i class="fa fa-search search-icon" style="cursor: pointer;"></i></td>
    <td data-label="Editar"><i class="fa fa-edit edit-icon" style="cursor: pointer;"></i></td>
    <td data-label="Excluir"><i class="fa fa-trash delete-icon" style="cursor: pointer;"></i></td>
  `;

  tbody.appendChild(row);
}

document.addEventListener('change', () => {
  const selecionados = document.querySelectorAll('.selecionar-produto:checked');
  const botaoExcluir = document.getElementById('btn-excluir-selecionados');

  if (selecionados.length > 0) {
    botaoExcluir.style.display = 'inline-block';
  } else {
    botaoExcluir.style.display = 'none';
  }
});

// -- ATUALIZAR TABELA --
function atualizarTabela() {
  const tbody = document.getElementById('lista-produtos');
  tbody.innerHTML = '';

  const inicio = (paginaAtual - 1) * itensPorPagina;
  const fim = inicio + itensPorPagina;
  const produtosFiltrados = aplicarFiltrosInterno(produtos);
  const produtosPaginados = produtosFiltrados.slice(inicio, fim);

  produtosPaginados.forEach(produto => adicionarLinhaTabela(produto));

  atualizarControlesPaginacao(produtosFiltrados.length);

  if (produtosPaginados.length === 0) {
    const tbody = document.getElementById('lista-produtos');
    tbody.innerHTML = `
      <tr><td colspan="8" style="text-align: center; padding: 20px;">Nenhum produto encontrado.</td></tr>
    `;
    atualizarControlesPaginacao(0);
    return;
  }

}

function atualizarControlesPaginacao(totalItens) {
  const controles = document.getElementById('controles-paginacao');
  if (!controles) return;

  const totalPaginas = Math.ceil(totalItens / itensPorPagina);

  controles.innerHTML = `
    <button id="btn-anterior" ${paginaAtual === 1 ? 'disabled' : ''}>Anterior</button>
    <span>Página ${paginaAtual} de ${totalPaginas}</span>
    <button id="btn-proximo" ${paginaAtual === totalPaginas ? 'disabled' : ''}>Próximo</button>
  `;

  document.getElementById('btn-anterior').addEventListener('click', () => {
    if (paginaAtual > 1) {
      paginaAtual--;
      atualizarTabela();
    }
  });

  document.getElementById('btn-proximo').addEventListener('click', () => {
    if (paginaAtual < totalPaginas) {
      paginaAtual++;
      atualizarTabela();
    }
  });
}

// -- ALERTAS DE VALIDADE E ESTOQUE BAIXO --
function verificarAlertasProdutos() {
  let encontrouValidade = false;
  let encontrouEstoque = false;

  const hoje = new Date();

  produtos.forEach(produto => {
    const validadeProduto = new Date(produto.validade);
    const diasParaVencer = Math.floor((validadeProduto - hoje) / (1000 * 60 * 60 * 24));

    const estoqueAtual = parseFloat(produto.qtdAtual.split(' ')[0]);
    const estoqueMinimo = parseFloat(produto.qtdMinima.split(' ')[0]);

    if (diasParaVencer <= 7) {
      encontrouValidade = true;
    }

    if (estoqueAtual < estoqueMinimo) {
      encontrouEstoque = true;
    }
  });

  if (encontrouValidade && encontrouEstoque) {
    // Se existem os dois alertas
    mostrarMensagem('⚠️ Existem produtos com validade próxima!', 'warning');
    setTimeout(() => {
      mostrarMensagem('⚠️ Existem produtos com estoque abaixo do mínimo!', 'warning');
    }, 4000); // espera 4 segundos antes de mostrar o segundo alerta
  } else if (encontrouValidade) {
    // Só validade
    mostrarMensagem('⚠️ Existem produtos com validade próxima!', 'warning');
  } else if (encontrouEstoque) {
    // Só estoque
    mostrarMensagem('⚠️ Existem produtos com estoque abaixo do mínimo!', 'warning');
  }
}

// Atualizar o botão de excluir selecionados
function atualizarBotaoExcluirSelecionados() {
  const selecionados = document.querySelectorAll('.selecionar-produto:checked');
  const botaoExcluir = document.getElementById('btn-excluir-selecionados');
  if (botaoExcluir) {
    botaoExcluir.style.display = selecionados.length > 0 ? 'inline-block' : 'none';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  carregarProdutosDoLocalStorage();
  document.getElementById('unidade-atual').value = document.getElementById('unidade-minima').value;
  verificarAlertasProdutos();

  const selecionarTodos = document.getElementById('selecionar-todos');

  if (selecionarTodos) {
    selecionarTodos.addEventListener('change', function () {
      const checkboxes = document.querySelectorAll('.selecionar-produto');
      checkboxes.forEach(cb => {
        cb.checked = selecionarTodos.checked;
      });
      atualizarBotaoExcluirSelecionados();
    });
  }

  document.getElementById('unidade-minima').addEventListener('change', function () {
    // Atualiza apenas a unidade
    document.getElementById('unidade-atual').value = this.value;
  });

  document.addEventListener('change', function (e) {
    if (e.target.classList.contains('selecionar-produto')) {
      const checkboxes = document.querySelectorAll('.selecionar-produto');
      const checkboxesMarcados = document.querySelectorAll('.selecionar-produto:checked');
      const selecionarTodos = document.getElementById('selecionar-todos');

      if (selecionarTodos) {
        selecionarTodos.checked = (checkboxes.length === checkboxesMarcados.length);
      }
      atualizarBotaoExcluirSelecionados();
    }
  });
});

// Evento para cada checkbox individual
document.addEventListener('change', function (e) {
  if (e.target.classList.contains('selecionar-produto')) {
    const selecionarTodos = document.getElementById('selecionar-todos');
    const checkboxes = document.querySelectorAll('.selecionar-produto');
    const checkboxesMarcados = document.querySelectorAll('.selecionar-produto:checked');

    selecionarTodos.checked = checkboxes.length === checkboxesMarcados.length;

    atualizarBotaoExcluirSelecionados();
  }
});

// --- FILTROS E ORDENAÇÃO ---
function aplicarFiltrosInterno(lista) {
  const termo = document.querySelector('.input-icon input')?.value?.toLowerCase() || '';
  const categoriaSelecionada = document.getElementById('filtrar-categoria')?.value || '';
  const ordem = document.getElementById('ordenar-nome')?.value || '';

  let filtrados = lista.filter(prod => {
    const nome = prod.nome.toLowerCase();
    const categoria = prod.categoria.toLowerCase();
    const termoMatch = nome.includes(termo) || categoria.includes(termo);
    const categoriaMatch = categoriaSelecionada ? prod.categoria === categoriaSelecionada : true;
    return termoMatch && categoriaMatch;
  });

  if (ordem === 'az') filtrados.sort((a, b) => a.nome.localeCompare(b.nome));
  if (ordem === 'za') filtrados.sort((a, b) => b.nome.localeCompare(a.nome));
  if (ordem === 'preco-asc') filtrados.sort((a, b) => parseFloat(a.preco) - parseFloat(b.preco));
  if (ordem === 'preco-desc') filtrados.sort((a, b) => parseFloat(b.preco) - parseFloat(a.preco));
  if (ordem === 'validade') filtrados.sort((a, b) => new Date(a.validade) - new Date(b.validade));

  return filtrados;
}

// --- CADASTRO E EDIÇÃO ---
document.getElementById('form-produto').addEventListener('submit', function (e) {
  e.preventDefault();

  const nome = document.getElementById('nome').value.trim();
  const categoria = document.getElementById('categoria').value.trim();
  const preco = parseFloat(document.getElementById('preco').value);
  const validade = new Date(document.getElementById('validade').value);
  const hoje = new Date();
  const imagemInput = document.getElementById('imagem');
  const file = imagemInput.files[0];

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

  if (file) {
    converterImagemParaBase64(file, (imagemBase64) => salvarProduto(imagemBase64));
  } else {
    // Se for edição, mantém a imagem anterior
    if (indiceParaEditar !== null) {
      salvarProduto(produtos[indiceParaEditar].imagem);
    } else {
      salvarProduto('');
    }
  }
});


// -- SALVAR PRODUTO APOS CADASTRO --
function salvarProduto(imagemBase64) {
  const unidadeMinima = document.getElementById('unidade-minima').value;
  const unidadeAtual = document.getElementById('unidade-atual').value;

  if (!['unidade', 'g', 'kg', 'ml', 'l'].includes(unidadeMinima) || !['unidade', 'g', 'kg', 'ml', 'l'].includes(unidadeAtual)) {
    mostrarMensagem('A unidade precisa ser Unidade, g, kg, ml ou l!', 'error');
    return;
  }

  const produto = {
    codigo: document.getElementById('codigo').value,
    nome: document.getElementById('nome').value.trim(),
    categoria: document.getElementById('categoria').value.trim(),
    validade: document.getElementById('validade').value,
    descricao: document.getElementById('descricao').value,
    qtdMinima: document.getElementById('qtd-minima').value + ' ' + unidadeMinima,
    qtdAtual: document.getElementById('qtd-atual').value + ' ' + unidadeAtual,
    preco: parseFloat(document.getElementById('preco').value).toFixed(2),
    precoPor: document.getElementById('preco-por').value,
    imagem: imagemBase64
  };

  if (indiceParaEditar !== null) {
    produtos[indiceParaEditar] = { ...produtos[indiceParaEditar], ...produto };
    mostrarMensagem('Produto atualizado com sucesso!', 'success');

    // Registrar edição no histórico
    const historico = JSON.parse(localStorage.getItem('historicoAcoes')) || [];
    historico.push({
      tipo: 'Edição de produto',
      descricao: `Produto "${produto.nome}" atualizado.`,
      data: new Date().toISOString()
    });
    localStorage.setItem('historicoAcoes', JSON.stringify(historico));
  } else {
    produtos.push(produto);
    paginaAtual = Math.ceil(produtos.length / itensPorPagina);
    mostrarMensagem('Produto cadastrado com sucesso!', 'success');

    // Registrar criação no histórico
    const historico = JSON.parse(localStorage.getItem('historicoAcoes')) || [];
    historico.push({
      tipo: 'Cadastro de produto',
      descricao: `Produto "${produto.nome}" cadastrado.`,
      data: new Date().toISOString()
    });
    localStorage.setItem('historicoAcoes', JSON.stringify(historico));
  }

  salvarProdutosNoLocalStorage();
  atualizarTabela();
  verificarAlertasProdutos();

  document.getElementById('form-produto').reset();
  document.getElementById('modal-produto').style.display = 'none';
  indiceParaEditar = null;
}

// --- BOTÕES E AÇÕES DOS MODAIS ---
document.querySelector('.abrir-modal').addEventListener('click', () => {
  document.getElementById('form-produto').reset();
  document.getElementById('codigo').value = gerarCodigoProduto();
  document.getElementById('modal-produto').style.display = 'flex';
  indiceParaEditar = null;
});

document.querySelector('.cancelar').addEventListener('click', () => {
  document.getElementById('form-produto').reset();
  document.getElementById('modal-produto').style.display = 'none';
});

document.querySelector('.cancelar-visualizar').addEventListener('click', () => {
  document.getElementById('modal-visualizar').style.display = 'none';
});

// --- CLIQUES NA TABELA (CONSULTAR / EDITAR / EXCLUIR) ---
document.getElementById('lista-produtos').addEventListener('click', function (e) {
  const row = e.target.closest('tr');
  const codigo = row.getAttribute('data-codigo');
  const index = produtos.findIndex(prod => prod.codigo === codigo);

  if (e.target.classList.contains('search-icon')) {
    const produto = produtos[index];
    document.getElementById('ver-codigo').textContent = produto.codigo;
    document.getElementById('ver-nome').textContent = produto.nome;
    document.getElementById('ver-categoria').textContent = produto.categoria;
    document.getElementById('ver-validade').textContent = formatarData(produto.validade);
    document.getElementById('ver-preco').textContent = `R$ ${Number(produto.preco).toFixed(2)} por ${produto.precoPor}`;
    document.getElementById('ver-descricao').textContent = produto.descricao;
    document.getElementById('ver-qtd-minima').textContent = produto.qtdMinima;
    document.getElementById('ver-qtd-atual').textContent = produto.qtdAtual;
    document.getElementById('ver-total-estimado').textContent = calcularValorTotalEstoque(produto);
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
    document.getElementById('modal-produto').style.display = 'flex';
  }

  if (e.target.classList.contains('delete-icon')) {
    indiceParaExcluir = index;
    document.getElementById('modal-confirmar-exclusao').style.display = 'flex';
  }
});

// --- EXCLUSÃO ---
document.getElementById('btn-confirmar-excluir').addEventListener('click', () => {
  if (indiceParaExcluir !== null) {
    const produtoNome = produtos[indiceParaExcluir].nome; // Captura o nome antes de excluir
    produtos.splice(indiceParaExcluir, 1);
    salvarProdutosNoLocalStorage();
    atualizarTabela();

    // Registrar exclusão no histórico
    const historico = JSON.parse(localStorage.getItem('historicoAcoes')) || [];
    historico.push({
      tipo: 'Exclusão de produto',
      descricao: `Produto "${produtoNome}" excluído.`,
      data: new Date().toISOString()
    });
    localStorage.setItem('historicoAcoes', JSON.stringify(historico));

    indiceParaExcluir = null;
    document.getElementById('modal-confirmar-exclusao').style.display = 'none';
  }
});

document.getElementById('btn-cancelar-excluir').addEventListener('click', () => {
  indiceParaExcluir = null;
  document.getElementById('modal-confirmar-exclusao').style.display = 'none';
});

// --- EXCLUIR PRODUTOS SELECIONADOS ---
document.getElementById('btn-excluir-selecionados').addEventListener('click', () => {
  const selecionados = Array.from(document.querySelectorAll('.selecionar-produto:checked'))
    .map(checkbox => checkbox.closest('tr').getAttribute('data-codigo'));

  if (selecionados.length === 0) {
    alert('Selecione pelo menos um produto para excluir!');
    return;
  }

  if (confirm(`Você deseja excluir ${selecionados.length} produto(s)?`)) {
    const historico = JSON.parse(localStorage.getItem('historicoAcoes')) || [];

    for (const codigo of selecionados) {
      const index = produtos.findIndex(prod => prod.codigo === codigo);
      if (index !== -1) {
        const produtoNome = produtos[index].nome;
        produtos.splice(index, 1);

        // Registrar cada exclusão
        historico.push({
          tipo: 'Exclusão de produto',
          descricao: `Produto "${produtoNome}" excluído.`,
          data: new Date().toISOString()
        });
      }
    }

    localStorage.setItem('historicoAcoes', JSON.stringify(historico));
    salvarProdutosNoLocalStorage();
    atualizarTabela();
    document.getElementById('btn-excluir-selecionados').style.display = 'none';
    alert('Produtos excluídos com sucesso!');
  }
});

// --- EVENTOS DE FILTRO E BUSCA ---
document.querySelector('.input-icon input').addEventListener('input', () => {
  paginaAtual = 1;
  atualizarTabela();
});
document.getElementById('filtrar-categoria').addEventListener('change', () => {
  paginaAtual = 1;
  atualizarTabela();
});
document.getElementById('ordenar-nome').addEventListener('change', () => {
  paginaAtual = 1;
  atualizarTabela();
});


document.querySelector('.filter').addEventListener('click', () => {
  const filtros = document.getElementById('filtros-container');
  filtros.style.display = filtros.style.display === 'none' ? 'flex' : 'none';
});
