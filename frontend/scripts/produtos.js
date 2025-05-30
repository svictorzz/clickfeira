// --- VARIÁVEIS GLOBAIS ---
const produtos = [];
let indiceParaEditar = null;
let firebaseKeyParaExcluir = null;
let paginaAtual = 1;
const itensPorPagina = 10;

// --- FIREBASE CONFIGURAÇÃO E CARGA INICIAL ---
document.addEventListener('DOMContentLoaded', () => {
  carregarProdutosDoFirebase();

  // Abrir modal de cadastro
  document.querySelector('.abrir-modal').addEventListener('click', () => {
    document.getElementById('form-produto').reset();
    document.getElementById('codigo').value = gerarCodigoProduto();
    document.getElementById('modal-produto').style.display = 'flex';
    document.getElementById('unidade-atual').value = document.getElementById('unidade-minima').value;
    indiceParaEditar = null;
  });

  // Cancelar cadastro
  document.querySelector('.cancelar').addEventListener('click', () => {
    document.getElementById('modal-produto').style.display = 'none';
  });

  // Fechar modal de visualização
  document.querySelector('.cancelar-visualizar').addEventListener('click', () => {
    document.getElementById('modal-visualizar').style.display = 'none';
  });

  // Atualiza unidade atual ao mudar unidade mínima
  document.getElementById('unidade-minima').addEventListener('change', e => {
    document.getElementById('unidade-atual').value = e.target.value;
  });

  // Sincroniza unidade de medida com tipo de preço e avisa o usuário
  document.getElementById('preco-por').addEventListener('change', e => {
    const precoPor = e.target.value;
    const unidadeMinima = document.getElementById('unidade-minima');
    const unidadeAtual = document.getElementById('unidade-atual');

    let novaUnidade = '';

    switch (precoPor) {
      case 'unidade':
      case 'pacote':
        novaUnidade = 'unidade';
        break;
      case 'kg':
      case '100g':
        novaUnidade = 'kg';
        break;
      case 'litro':
      case 'ml':
        novaUnidade = 'l';
        break;
    }

    if (unidadeMinima.value !== novaUnidade) {
      unidadeMinima.value = novaUnidade;
      unidadeAtual.value = novaUnidade;
      mostrarMensagem(`ℹ️ A unidade de medida foi ajustada para "${novaUnidade}" conforme o tipo de preço.`, 'warning');
    }
  });

  // Submissão do formulário
  document.getElementById('form-produto').addEventListener('submit', handleFormSubmit);

  // Exclusão múltipla
  document.getElementById('btn-excluir-selecionados').addEventListener('click', excluirSelecionados);

  // Selecionar todos
  document.getElementById('selecionar-todos').addEventListener('change', e => {
    const checkboxes = document.querySelectorAll('.selecionar-produto');
    checkboxes.forEach(cb => cb.checked = e.target.checked);
    atualizarBotaoExcluirSelecionados();
  });

  // Atualiza seleção individual
  document.addEventListener('change', e => {
    if (e.target.classList.contains('selecionar-produto')) {
      const todos = document.querySelectorAll('.selecionar-produto');
      const marcados = document.querySelectorAll('.selecionar-produto:checked');
      document.getElementById('selecionar-todos').checked = todos.length === marcados.length;
      atualizarBotaoExcluirSelecionados();
    }
  });

  // Filtros e ordenação
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

  document.querySelector('.filter')?.addEventListener('click', () => {
    const filtros = document.getElementById('filtros-container');
    filtros.style.display = filtros.style.display === 'none' ? 'flex' : 'none';
  });
});

function carregarProdutosDoFirebase() {
  firebase.database().ref('produto').once('value').then(snapshot => {
    produtos.length = 0;
    snapshot.forEach(childSnapshot => {
      const produto = childSnapshot.val();
      produto.firebaseKey = childSnapshot.key;
      produtos.push(produto);
    });
    atualizarTabela();
    verificarAlertasProdutos()
  });
}

function verificarAlertasProdutos() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  let alertaEstoque = false;
  let alertaValidade = false;

  produtos.forEach(produto => {
    const validade = new Date(produto.validade);
    const dias = Math.floor((validade - hoje) / (1000 * 60 * 60 * 24));
    const atual = parseFloat(produto.qtdAtual.split(' ')[0]);
    const minima = parseFloat(produto.qtdMinima.split(' ')[0]);

    if (dias <= 7 && dias >= 0) alertaValidade = true;
    if (atual < minima) alertaEstoque = true;
  });

  if (alertaValidade && alertaEstoque) {
    mostrarMensagem('⚠️ Produtos com validade próxima!', 'warning');
    setTimeout(() => {
      mostrarMensagem('⚠️ Produtos com estoque abaixo do mínimo!', 'warning');
    }, 3000);
  } else if (alertaValidade) {
    mostrarMensagem('⚠️ Produtos com validade próxima!', 'warning');
  } else if (alertaEstoque) {
    mostrarMensagem('⚠️ Produtos com estoque abaixo do mínimo!', 'warning');
  }
}

function registrarHistorico(tipo, descricao) {
  firebase.database().ref('historicoAcoes').push({
    tipo,
    descricao,
    data: obterDataLegivel()
  });
}

function obterDataLegivel() {
  const hoje = new Date();
  const dia = String(hoje.getDate()).padStart(2, '0');
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const ano = hoje.getFullYear();
  const hora = hoje.getHours().toString().padStart(2, '0');
  const min = hoje.getMinutes().toString().padStart(2, '0');
  return `${dia}/${mes}/${ano} às ${hora}:${min}`;
}

function gerarCodigoProduto() {
  let novoCodigo;
  do {
    novoCodigo = 'PRD-' + Math.floor(10000 + Math.random() * 90000);
  } while (produtos.some(p => p.codigo === novoCodigo));
  return novoCodigo;
}

function formatarData(dataStr) {
  const data = new Date(dataStr);
  return `${String(data.getDate()).padStart(2, '0')}/${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`;
}

function adicionarLinhaTabela(produto) {
  const tbody = document.getElementById('lista-produtos');
  const row = document.createElement('tr');
  row.setAttribute('data-key', produto.firebaseKey);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  // Validade
  const validade = produto.validade ? new Date(produto.validade) : null;
  const diasParaVencer = validade ? Math.floor((validade - hoje) / (1000 * 60 * 60 * 24)) : null;

  // Estoque e unidade
  const qtdAtual = parseFloat(produto.quantidadeEstoque) || 0;
  const qtdMinima = parseFloat(produto.quantidadeMinima) || 0;
  const unidade = produto.unidadeMedida || '';

  // Aplicar classes de alerta
  if (validade && diasParaVencer < 0) {
    row.classList.add('alerta-vencido');
  } else if (validade && diasParaVencer <= 7) {
    row.classList.add('alerta-validade');
  }

  if (qtdAtual < qtdMinima) {
    row.classList.add('alerta-estoque');
  }

  // Código fallback
  const codigo = produto.codigo || produto.firebaseKey.slice(-5).toUpperCase();

  row.innerHTML = `
    <td><input type="checkbox" class="selecionar-produto"></td>
    <td>${produto.codigo || '(sem código)'}</td>
    <td>${produto.nome || 'Sem nome'}</td>
    <td>${qtdAtual} ${unidade}</td>
    <td>${validade ? formatarData(produto.validade) : '—'}</td>
    <td><i class="fa fa-search search-icon" style="cursor:pointer;"></i></td>
    <td><i class="fa fa-edit edit-icon" style="cursor:pointer;"></i></td>
    <td><i class="fa fa-trash delete-icon" style="cursor:pointer;"></i></td>
  `;

  tbody.appendChild(row);
}

function atualizarTabela() {
  const tbody = document.getElementById('lista-produtos');
  tbody.innerHTML = '';
  const produtosFiltrados = aplicarFiltrosOrdenacao(produtos);

  const inicio = (paginaAtual - 1) * itensPorPagina;
  const fim = inicio + itensPorPagina;
  const produtosPaginados = produtosFiltrados.slice(inicio, fim);

  if (produtosPaginados.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px;">Nenhum produto encontrado.</td></tr>`;
    atualizarPaginacao(0);
    return;
  }

  produtosPaginados.forEach(produto => adicionarLinhaTabela(produto));
  atualizarBotaoExcluirSelecionados();
  atualizarPaginacao(produtosFiltrados.length);
}

function atualizarPaginacao(totalItens) {
  const controles = document.getElementById('controles-paginacao');
  if (!controles) return;

  const totalPaginas = Math.ceil(totalItens / itensPorPagina);
  if (totalPaginas <= 1) {
    controles.innerHTML = '';
    return;
  }

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

function atualizarBotaoExcluirSelecionados() {
  const selecionados = document.querySelectorAll('.selecionar-produto:checked');
  const botao = document.getElementById('btn-excluir-selecionados');
  botao.style.display = selecionados.length > 0 ? 'inline-block' : 'none';
}

function excluirSelecionados() {
  const selecionados = Array.from(document.querySelectorAll('.selecionar-produto:checked'));
  if (selecionados.length === 0) return;

  if (!confirm(`Deseja excluir ${selecionados.length} produto(s)?`)) return;

  selecionados.forEach(cb => {
    const row = cb.closest('tr');
    const key = row.getAttribute('data-key');
    const produto = produtos.find(p => p.firebaseKey === key);
    firebase.database().ref('produto/' + key).remove();
    registrarHistorico('Exclusão de produto', `Produto "${produto.nome}" excluído.`);
  });

  mostrarMensagem('Produtos excluídos com sucesso!', 'success');
  carregarProdutosDoFirebase();
}

function converterImagemParaBase64(file, callback) {
  const reader = new FileReader();
  reader.onload = e => callback(e.target.result);
  reader.readAsDataURL(file);
}

function handleFormSubmit(e) {
  e.preventDefault();

  const validade = document.getElementById('validade').value;
  const validadeSelecionada = new Date(validade);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  validadeSelecionada.setHours(0, 0, 0, 0);

  if (validadeSelecionada < hoje) {
    const confirmar = confirm('⚠️ A data de validade informada já passou. Deseja continuar mesmo assim?');
    if (!confirmar) return;
  }

  const codigo = document.getElementById('codigo').value.trim();
  const nome = document.getElementById('nome').value.trim();
  const categoria = document.getElementById('categoria').value.trim();
  const preco = parseFloat(document.getElementById('preco').value);
  const descricao = document.getElementById('descricao').value;
  const quantidadeEstoque = document.getElementById('qtd-atual').value;
  const quantidadeMinima = document.getElementById('qtd-minima').value;
  const unidadeMedida = document.getElementById('unidade-minima').value;
  const precoPor = document.getElementById('preco-por').value;
  const imagemInput = document.getElementById('imagem');
  const file = imagemInput.files[0];

  // Validação de campos obrigatórios
  if (!codigo || !nome || !categoria || isNaN(preco) || !validade || !quantidadeEstoque || !quantidadeMinima || !precoPor) {
    mostrarMensagem('⚠️ Preencha todos os campos obrigatórios!', 'error');
    return;
  }

  // Validação de coerência entre unidade e tipo de preço
  const combinacoesValidas = {
    unidade: 'unidade',
    pacote: 'unidade',
    kg: 'kg',
    '100g': 'kg',
    litro: 'l',
    ml: 'ml'
  };

  if (combinacoesValidas[precoPor] && unidadeMedida !== combinacoesValidas[precoPor]) {
    mostrarMensagem(`🚫 A unidade de medida deve ser "${combinacoesValidas[precoPor]}" para o tipo de preço "${precoPor}".`, 'error');
    return;
  }

  // Monta o objeto produto
  const produto = {
    codigo,
    nome,
    descricao,
    categoria,
    validade,
    preco: preco.toFixed(2),
    precoPor,
    quantidadeEstoque: parseFloat(quantidadeEstoque),
    quantidadeMinima: parseFloat(quantidadeMinima),
    unidadeMedida,
    ativo: true,
    fornecedor: "a", // Ajuste conforme necessário
    imagemUrl: '',
    dataUltimaAtualizacao: obterDataLegivel()
  };

  if (indiceParaEditar === null) {
    produto.dataCadastro = obterDataLegivel();
  }

  const salvar = imagem => {
    produto.imagemUrl = imagem;

    if (indiceParaEditar !== null) {
      const key = produtos[indiceParaEditar].firebaseKey;
      firebase.database().ref('produto/' + key).set(produto).then(() => {
        registrarHistorico('Edição de produto', `Produto "${produto.nome}" atualizado.`);
        carregarProdutosDoFirebase();
        mostrarMensagem('✅ Produto atualizado com sucesso!', 'success');
        document.getElementById('modal-produto').style.display = 'none';
        indiceParaEditar = null;
      });
    } else {
      firebase.database().ref('produto').push(produto).then(() => {
        registrarHistorico('Cadastro de produto', `Produto "${produto.nome}" cadastrado.`);
        carregarProdutosDoFirebase();
        mostrarMensagem('✅ Produto cadastrado com sucesso!', 'success');
        document.getElementById('modal-produto').style.display = 'none';
      });
    }
  };

  if (file) {
    converterImagemParaBase64(file, salvar);
  } else {
    salvar('');
  }
}

function mostrarMensagem(texto, tipo = 'success') {
  const msg = document.createElement('div');
  msg.textContent = texto;
  msg.className = `mensagem-alerta ${tipo}`;
  document.body.appendChild(msg);
  setTimeout(() => msg.remove(), 4000);
}

// --- CONSULTAR / EDITAR / EXCLUIR ---
document.getElementById('lista-produtos').addEventListener('click', e => {
  const row = e.target.closest('tr');
  const firebaseKey = row.getAttribute('data-key');
  const index = produtos.findIndex(p => p.firebaseKey === firebaseKey);
  const produto = produtos[index];

  if (e.target.classList.contains('search-icon')) {
    document.getElementById('ver-codigo').textContent = produto.codigo || '(sem código)';
    document.getElementById('ver-nome').textContent = produto.nome;
    document.getElementById('ver-categoria').textContent = produto.categoria;
    document.getElementById('ver-validade').textContent = formatarData(produto.validade);
    document.getElementById('ver-preco').textContent = `R$ ${produto.preco} por ${produto.precoPor}`;
    document.getElementById('ver-total-estimado').textContent = calcularValorTotalEstoque(produto);
    document.getElementById('ver-descricao').textContent = produto.descricao;
    document.getElementById('ver-qtd-minima').textContent = `${produto.quantidadeMinima} ${produto.unidadeMedida}`;
    document.getElementById('ver-qtd-atual').textContent = `${produto.quantidadeEstoque} ${produto.unidadeMedida}`;
    document.getElementById('ver-imagem').src = produto.imagemUrl;
    document.getElementById('modal-visualizar').style.display = 'flex';
  }

  if (e.target.classList.contains('edit-icon')) {
    indiceParaEditar = index;
    document.getElementById('codigo').value = produto.codigo || '';
    document.getElementById('nome').value = produto.nome;
    document.getElementById('categoria').value = produto.categoria;
    document.getElementById('validade').value = produto.validade;
    document.getElementById('descricao').value = produto.descricao;
    document.getElementById('qtd-minima').value = produto.quantidadeMinima;
    document.getElementById('unidade-minima').value = produto.unidadeMedida;
    document.getElementById('qtd-atual').value = produto.quantidadeEstoque;
    document.getElementById('unidade-atual').value = produto.unidadeMedida;
    document.getElementById('preco').value = produto.preco;
    document.getElementById('preco-por').value = produto.precoPor;
    document.getElementById('modal-produto').style.display = 'flex';
  }

  if (e.target.classList.contains('delete-icon')) {
    firebaseKeyParaExcluir = firebaseKey;
    document.getElementById('modal-confirmar-exclusao').style.display = 'flex';
  }
});

document.getElementById('btn-confirmar-excluir').addEventListener('click', () => {
  if (!firebaseKeyParaExcluir) return;
  const produto = produtos.find(p => p.firebaseKey === firebaseKeyParaExcluir);
  firebase.database().ref('produto/' + firebaseKeyParaExcluir).remove().then(() => {
    registrarHistorico('Exclusão de produto', `Produto "${produto.nome}" excluído.`);
    carregarProdutosDoFirebase();
    mostrarMensagem('Produto excluído com sucesso!', 'success');
    document.getElementById('modal-confirmar-exclusao').style.display = 'none';
    firebaseKeyParaExcluir = null;
  });
});

document.getElementById('btn-cancelar-excluir').addEventListener('click', () => {
  firebaseKeyParaExcluir = null;
  document.getElementById('modal-confirmar-exclusao').style.display = 'none';
});

function calcularValorTotalEstoque(produto) {
  const preco = Number(produto.preco);
  const qtd = Number(produto.quantidadeEstoque);
  const unidade = produto.precoPor;

  let fator = 1;

  switch (unidade) {
    case '100g':
      fator = qtd * 10; // 1kg = 10x 100g
      break;
    case 'ml':
      fator = qtd; // preço por ml, quantidade em ml
      break;
    case 'litro':
    case 'kg':
    case 'unidade':
    case 'pacote':
    default:
      fator = qtd;
  }

  const total = preco * fator;
  return `R$ ${total.toFixed(2)}`;
}

//--Aplicação de filtros de ordenacao

function aplicarFiltrosOrdenacao(lista) {
  const termo = document.querySelector('.input-icon input')?.value.toLowerCase() || '';
  const categoriaSelecionada = document.getElementById('filtrar-categoria')?.value || '';
  const ordem = document.getElementById('ordenar-nome')?.value || '';

  let filtrados = lista.filter(p => {
    const nome = p.nome.toLowerCase();
    const categoria = p.categoria.toLowerCase();
    const matchTermo = nome.includes(termo) || categoria.includes(termo);
    const matchCategoria = categoriaSelecionada ? p.categoria === categoriaSelecionada : true;
    return matchTermo && matchCategoria;
  });

  if (ordem === 'az') filtrados.sort((a, b) => a.nome.localeCompare(b.nome));
  if (ordem === 'za') filtrados.sort((a, b) => b.nome.localeCompare(a.nome));
  if (ordem === 'preco-asc') filtrados.sort((a, b) => parseFloat(a.preco) - parseFloat(b.preco));
  if (ordem === 'preco-desc') filtrados.sort((a, b) => parseFloat(b.preco) - parseFloat(a.preco));
  if (ordem === 'validade') filtrados.sort((a, b) => new Date(a.validade) - new Date(b.validade));

  return filtrados;
}
