const produtos = [];
let indiceParaEditar = null;
let firebaseKeyParaExcluir = null;
let paginaAtual = 1;
const itensPorPagina = 10;
let filtroEspecialAtivo = null;

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', inicializarApp);

function inicializarApp() {
  carregarProdutosDoFirebase();
  configurarEventListeners();
  carregarFornecedores();
  carregarFiltroFornecedores();
  criarBotaoLimparFiltros();
  carregarMapaFornecedores();
}

function configurarEventListeners() {
  // Modal de cadastro
  document.querySelector('.abrir-modal').addEventListener('click', abrirModalCadastro);

  //Modal de Visualização
  document.getElementById('lista-produtos').addEventListener('click', function (e) {
    if (e.target.classList.contains('search-icon')) {
      const linha = e.target.closest('tr') || e.target.closest('.acoes-icones');
      const firebaseKey = linha?.getAttribute('data-key');
      const produto = produtos.find(p => p.firebaseKey === firebaseKey);

      if (produto) {
        preencherModalVisualizacao(produto);
        document.getElementById('modal-visualizar').style.display = 'flex';
      } else {
        console.warn('Produto não encontrado para a chave:', firebaseKey);
      }
    }
  });

  // Cancelamentos
  document.querySelector('.cancelar').addEventListener('click', () => {
    document.getElementById('modal-produto').style.display = 'none';
  });
  document.querySelector('.cancelar-visualizar').addEventListener('click', () => {
    document.getElementById('modal-visualizar').style.display = 'none';
  });

  // Validação de compatibilidade unidade/preço
  document.getElementById('preco-por').addEventListener('change', validarCompatibilidadeUnidadePreco);

  // Formulário
  document.getElementById('form-produto').addEventListener('submit', handleFormSubmit);

  // Exclusão múltipla
  document.getElementById('btn-excluir-selecionados').addEventListener('click', excluirSelecionados);

  // Seleção de itens
  document.getElementById('selecionar-todos').addEventListener('change', toggleSelecaoTodos);
  document.addEventListener('change', e => {
    if (e.target.classList.contains('selecionar-produto')) {
      atualizarSelecaoIndividual();
    }
  });

  // Filtros e ordenação
  document.querySelector('.input-icon input').addEventListener('input', () => {
    paginaAtual = 1;
    atualizarTabela();
    verificarFiltrosAtivos();
  });
  document.getElementById('filtrar-categoria').addEventListener('change', () => {
    paginaAtual = 1;
    atualizarTabela();
    verificarFiltrosAtivos();
  });
  document.getElementById('ordenar-nome').addEventListener('change', () => {
    paginaAtual = 1;
    atualizarTabela();
    verificarFiltrosAtivos();
  });
  document.getElementById('filtrar-fornecedor').addEventListener('change', () => {
    paginaAtual = 1;
    atualizarTabela();
    verificarFiltrosAtivos();
  });

  document.getElementById('categoria').addEventListener('change', e => {
    // recarrega fornecedores, filtrando pela categoria atual
    carregarFornecedores(e.target.value);
  });

  // Botão de filtros
  document.querySelector('.filter')?.addEventListener('click', toggleFiltros);

  // Ações na tabela
  document.getElementById('lista-produtos').addEventListener('click', handleAcoesTabela);

  // Confirmação de exclusão
  document.getElementById('btn-confirmar-excluir').addEventListener('click', confirmarExclusao);
  document.getElementById('btn-cancelar-excluir').addEventListener('click', () => {
    firebaseKeyParaExcluir = null;
    document.getElementById('modal-confirmar-exclusao').style.display = 'none';
  });

  // Validade vencida
  document.getElementById('btn-confirmar-validade').addEventListener('click', confirmarValidadeVencida);
  document.getElementById('btn-cancelar-validade').addEventListener('click', () => {
    document.getElementById('modal-validade-vencida').style.display = 'none';
    window.submissaoPendente = null;
  });

  // Exportação
  document.getElementById('btn-exportar-todos').addEventListener('click', exportarTodosVisiveisParaCSV);
  document.getElementById('btn-exportar-selecionados').addEventListener('click', exportarSelecionadosParaCSV);
}

// --- FUNÇÕES DO FIREBASE ---
function carregarProdutosDoFirebase() {
  const idComerciante = localStorage.getItem("idComerciante") || sessionStorage.getItem("idComerciante");
  if (!idComerciante) {
    console.warn("ID do comerciante não encontrado. Redirecionando para login.");
    window.location.href = "login.html";
    return;
  }

  firebase.database().ref('produto').once('value').then(snapshot => {
    produtos.length = 0;
    snapshot.forEach(childSnapshot => {
      const produto = childSnapshot.val();
      produto.firebaseKey = childSnapshot.key;

      // ✅ Somente produtos do comerciante logado
      if (produto.idComerciante === idComerciante) {
        produtos.push(produto);
      }
    });
    atualizarTabela();
  });
}

//traz fornecedores
function carregarFornecedores(categoriaFiltro = '') {
  const select = document.getElementById('fornecedor');
  if (!select) return;

  const idComerciante = localStorage.getItem("idComerciante") || sessionStorage.getItem("idComerciante");
  firebase.database().ref('fornecedor').once('value').then(snapshot => {
    // limpa e cria a opção padrão
    select.innerHTML = '<option value="">Selecione...</option>';
    let count = 0;

    snapshot.forEach(child => {
      const fornecedor = child.val();
      const atende = Array.isArray(fornecedor.produtos) && fornecedor.produtos.includes(categoriaFiltro);
      if (fornecedor.idComerciante === idComerciante
        && (!categoriaFiltro || atende)) {

        const opt = document.createElement('option');
        opt.value = child.key;
        opt.textContent = fornecedor.nome;
        opt.dataset.produtos = JSON.stringify(fornecedor.produtos || []);
        select.appendChild(opt);
        count++;
      }
    });

    // Se não encontrou nenhum, insere mensagem no próprio select
    if (count === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '❌ Nenhum fornecedor para essa categoria';
      opt.disabled = true;
      select.appendChild(opt);

      // opcional: exibe um aviso flutuante
      mostrarMensagem(
        '🚨 Nenhum fornecedor cadastrado para a categoria selecionada!',
        'warning'
      );
    }
  });
}

let mapaFornecedores = {};

function carregarMapaFornecedores() {
  const idComerciante = localStorage.getItem("idComerciante") || sessionStorage.getItem("idComerciante");

  firebase.database().ref('fornecedor').once('value').then(snapshot => {
    mapaFornecedores = {};
    snapshot.forEach(child => {
      const fornecedor = child.val();
      if (fornecedor.idComerciante === idComerciante) {
        mapaFornecedores[child.key] = fornecedor.nome;
      }
    });
    atualizarTabela(); // só depois que o mapa estiver preenchido
  });
}

function carregarFiltroFornecedores() {
  const select = document.getElementById('filtrar-fornecedor');
  if (!select) return;

  const idComerciante = localStorage.getItem("idComerciante") || sessionStorage.getItem("idComerciante");
  firebase.database().ref('fornecedor').once('value').then(snapshot => {
    select.innerHTML = '<option value="">Todos</option>';
    snapshot.forEach(child => {
      const fornecedor = child.val();
      if (fornecedor.idComerciante === idComerciante) {
        const option = document.createElement('option');
        option.value = child.key;
        option.textContent = fornecedor.nome;
        select.appendChild(option);
      }
    });
  });
}

function registrarHistorico(tipo, descricao) {
  const idComerciante = localStorage.getItem("idComerciante") || sessionStorage.getItem("idComerciante");

  firebase.database().ref('historicoAcoes').push({
    tipo,
    descricao,
    data: new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
    idComerciante // associando o histórico ao comerciante
  });
}

// --- FUNÇÕES DE INTERFACE ---
function abrirModalCadastro() {
  document.getElementById('form-produto').reset();
  document.getElementById('codigo').value = gerarCodigoProduto();
  document.getElementById('modal-produto').style.display = 'flex';
  document.getElementById('unidade-atual').value = document.getElementById('unidade-minima').value;
  document.getElementById('titulo-modal-produto').textContent = 'Adicionar Novo Produto';
  indiceParaEditar = null;
}

function toggleFiltros() {
  const filtros = document.getElementById('filtros-container');
  if (filtros) {
    filtros.style.display = filtros.style.display === 'none' ? 'flex' : 'none';
  }
}

function toggleSelecaoTodos(e) {
  const checkboxes = document.querySelectorAll('.selecionar-produto');
  checkboxes.forEach(cb => cb.checked = e.target.checked);
  atualizarBotaoExcluirSelecionados();
}

function atualizarSelecaoIndividual() {
  const todos = document.querySelectorAll('.selecionar-produto');
  const marcados = document.querySelectorAll('.selecionar-produto:checked');
  document.getElementById('selecionar-todos').checked = todos.length === marcados.length;
  atualizarBotaoExcluirSelecionados();
}

function verificarFiltrosAtivos() {
  const termo = document.querySelector('.input-icon input')?.value || '';
  const categoria = document.getElementById('filtrar-categoria')?.value || '';
  const fornecedor = document.getElementById('filtrar-fornecedor')?.value || '';
  const ordenacao = document.getElementById('ordenar-nome')?.value || '';
  const filtroAlerta = filtroEspecialAtivo;

  const algumAtivo = termo || categoria || fornecedor || ordenacao || filtroAlerta;
  document.getElementById('btn-limpar-filtros').style.display = algumAtivo ? 'inline-block' : 'none';
}

function criarBotaoLimparFiltros() {
  const btnLimparFiltros = document.createElement('button');
  btnLimparFiltros.id = 'btn-limpar-filtros';
  btnLimparFiltros.textContent = 'Limpar Filtros';
  document.getElementById('topo-tabela').appendChild(btnLimparFiltros);

  btnLimparFiltros.addEventListener('click', () => {
    filtroEspecialAtivo = null;
    paginaAtual = 1;

    // Limpar controles
    document.querySelector('.input-icon input').value = '';
    document.getElementById('filtrar-categoria').value = '';
    document.getElementById('filtrar-fornecedor').value = '';
    document.getElementById('ordenar-nome').value = '';

    // Resetar destaques de alerta
    document.querySelectorAll('#legenda-alertas span').forEach(btn => {
      btn.classList.remove('filtro-ativo');
    });

    atualizarTabela();
    verificarFiltrosAtivos();
  });
}

// --- MANIPULAÇÃO DE TABELA ---
function adicionarLinhaTabela(produto) {
  const tbody = document.getElementById('lista-produtos');
  const row = document.createElement('tr');
  row.setAttribute('data-key', produto.firebaseKey);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  // Cálculo de validade
  let validade = null;
  if (produto.validade) {
    const [ano, mes, dia] = produto.validade.split('-').map(Number);
    validade = new Date(ano, mes - 1, dia);
    validade.setHours(0, 0, 0, 0);
  }

  const diasParaVencer = validade ? Math.floor((validade - hoje) / (1000 * 60 * 60 * 24)) : null;

  // Estoque
  const qtdAtual = parseFloat(produto.quantidadeEstoque) || 0;
  const qtdMinima = parseFloat(produto.quantidadeMinima) || 0;
  const unidade = produto.unidadeMedida || '';

  // Classes de alerta
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
    <td data-label="Código: ">${produto.codigo || '(sem código)'}</td>
    <td data-label="Produto: ">${produto.nome || 'Sem nome'}</td>
    <td data-label="Estoque: ">${qtdAtual} ${unidade}</td>
    <td data-label="Validade: ">${validade ? formatarData(produto.validade) : '—'}</td>
    <td class="col-consultar" data-label="Consultar"><i class="fa fa-search search-icon"></i></td>
    <td class="col-editar" data-label="Editar"><i class="fa fa-edit edit-icon"></i></td>
    <td class="col-excluir" data-label="Excluir"><i class="fa fa-trash delete-icon"></i></td>
<td class="acoes-mobile" data-label="Ações">
  <div class="acoes-icones" data-key="${produto.firebaseKey}">
    <i class="fa fa-search search-icon"></i>
    <i class="fa fa-edit edit-icon"></i>
    <i class="fa fa-trash delete-icon"></i>
  </div>
</td>

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
  const container = document.getElementById('acoes-multiplas');
  container.style.display = selecionados.length > 0 ? 'flex' : 'none';
}

// --- FORMULÁRIOS E VALIDAÇÕES ---
function validarCompatibilidadeUnidadePreco(e) {
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
}

function handleFormSubmit(e) {
  e.preventDefault();

  // Resetar flag de continuidade
  window.continuarMesmoComValidadeVencida = false;

  // Obter valores do formulário
  const codigo = document.getElementById('codigo').value.trim();
  const nome = document.getElementById('nome').value.trim();
  const categoria = document.getElementById('categoria').value.trim();
  const preco = parseFloat(document.getElementById('preco').value);
  const descricao = document.getElementById('descricao').value;
  const quantidadeMinima = document.getElementById('qtd-minima').value;
  const unidadeMedida = document.getElementById('unidade-minima').value;
  const precoPor = document.getElementById('preco-por').value;
  const imagemInput = document.getElementById('imagem');
  const file = imagemInput.files[0];

  // Validação de campos obrigatórios
  if (!codigo || !nome || !categoria || isNaN(preco) || !quantidadeMinima || !precoPor) {
    mostrarMensagem('⚠️ Preencha todos os campos obrigatórios!', 'error');
    return;
  }

  // Validação de coerência unidade/preço
  const combinacoesValidas = {
    unidade: ['unidade', 'pacote'],
    pacote: ['unidade', 'pacote'],
    litro: ['litro', 'ml'],
    ml: ['litro', 'ml'],
    kg: ['kg', 'g', '100g'],
    g: ['kg', 'g', '100g'],
    '100g': ['kg', 'g', '100g']
  };

  if (!combinacoesValidas[unidadeMedida]?.includes(precoPor)) {
    mostrarMensagem(`🚫 A unidade "${unidadeMedida}" não é compatível com o tipo de preço "${precoPor}". Corrija antes de salvar.`, 'error');
    return;
  }

  const fornecedorSelect = document.getElementById('fornecedor');
  const selectedOption = fornecedorSelect.options[fornecedorSelect.selectedIndex];

  if (!selectedOption || !selectedOption.value) {
    mostrarMensagem('🚫 Selecione um fornecedor.', 'error');
    return;
  }

  const produtosFornecidos = JSON.parse(selectedOption.dataset.produtos || '[]');
  if (!produtosFornecidos.includes(categoria)) {
    mostrarMensagem(
      `🚫 O fornecedor "${selectedOption.textContent}" não fornece a categoria "${categoria}".`,
      'error'
    );
    return;
  }

  // Montar objeto produto
  const fornecedorId = document.getElementById('fornecedor').value;

  const produto = {
    codigo,
    nome,
    descricao,
    categoria,
    preco: preco.toFixed(2),
    precoPor,
    quantidadeMinima: parseFloat(quantidadeMinima),
    unidadeMedida,
    ativo: true,
    fornecedorId,
    imagemUrl: '',
    dataUltimaAtualizacao: obterDataLegivel(),
    idComerciante: localStorage.getItem("idComerciante") || sessionStorage.getItem("idComerciante"),
  };

  // Adicionar data de cadastro para novos produtos
  if (indiceParaEditar === null) {
    produto.dataCadastro = obterDataLegivel();
  }

  // Salvar no Firebase
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

  // Processar imagem
  if (file) {
    converterImagemParaBase64(file, salvar);
  } else {
    salvar('');
  }
}

// --- AÇÕES NA TABELA ---
function handleAcoesTabela(e) {
  const row = e.target.closest('tr');
  if (!row) return;

  const firebaseKey = row.getAttribute('data-key');
  const index = produtos.findIndex(p => p.firebaseKey === firebaseKey);
  const produto = produtos[index];

  // Consultar
  if (e.target.classList.contains('search-icon')) {
    preencherModalVisualizacao(produto);
    document.getElementById('modal-visualizar').style.display = 'flex';
  }

  // Editar
  if (e.target.classList.contains('edit-icon')) {
    preencherFormEdicao(produto, index);
    document.getElementById('modal-produto').style.display = 'flex';
  }

  // Excluir
  if (e.target.classList.contains('delete-icon')) {
    firebaseKeyParaExcluir = firebaseKey;
    document.getElementById('modal-confirmar-exclusao').style.display = 'flex';
  }
}

function preencherModalVisualizacao(produto) {
  document.getElementById('ver-codigo').textContent = produto.codigo || '(sem código)';
  document.getElementById('ver-nome').textContent = produto.nome;
  document.getElementById('ver-categoria').textContent = produto.categoria;
  document.getElementById('ver-preco').textContent = `R$ ${produto.preco} por ${produto.precoPor}`;
  document.getElementById('ver-total-estimado').textContent = `R$ ${parseFloat(produto.valorEstoque || 0).toFixed(2).replace('.', ',')}`;
  document.getElementById('ver-descricao').textContent = produto.descricao;
  document.getElementById('ver-qtd-minima').textContent = `${produto.quantidadeMinima} ${produto.unidadeMedida}`;
  document.getElementById('ver-imagem').src = produto.imagemUrl;
  const nomeFornecedor = mapaFornecedores[produto.fornecedorId];
  document.getElementById('ver-fornecedor').textContent = nomeFornecedor ? nomeFornecedor : 'Fornecedor não disponível';

  // 🔄 Exibir lotes no modal de visualização
  const corpoTabelaLotes = document.getElementById('ver-lotes');
  corpoTabelaLotes.innerHTML = '';

  if (produto.lotes && typeof produto.lotes === 'object') {
    const chavesOrdenadas = Object.keys(produto.lotes).sort((a, b) => {
      const validadeA = produto.lotes[a].validade || '';
      const validadeB = produto.lotes[b].validade || '';
      return validadeA.localeCompare(validadeB);
    });

    chavesOrdenadas.forEach(loteKey => {
      const lote = produto.lotes[loteKey];
      const tr = document.createElement('tr');
      tr.innerHTML = `
      <td style="padding: 4px;">${loteKey}</td>
      <td style="padding: 4px;">${lote.validade ? formatarData(lote.validade) : '—'}</td>
      <td style="padding: 4px;">${lote.quantidade || 0}</td>
    `;
      corpoTabelaLotes.appendChild(tr);
    });
  } else {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="3" style="padding: 4px;">Nenhum lote cadastrado ainda.</td>`;
    corpoTabelaLotes.appendChild(tr);
  }

}

function preencherFormEdicao(produto, index) {
  indiceParaEditar = index;
  document.getElementById('codigo').value = produto.codigo || '';
  document.getElementById('nome').value = produto.nome;
  document.getElementById('categoria').value = produto.categoria;
  document.getElementById('descricao').value = produto.descricao;
  document.getElementById('qtd-minima').value = produto.quantidadeMinima;
  document.getElementById('unidade-minima').value = produto.unidadeMedida;
  document.getElementById('preco').value = produto.preco;
  document.getElementById('preco-por').value = produto.precoPor;
  document.getElementById('fornecedor').value = produto.fornecedorId || '';
  document.getElementById('titulo-modal-produto').textContent = 'Editar Produto';
}

// --- EXCLUSÕES ---
function excluirSelecionados() {
  const selecionados = Array.from(document.querySelectorAll('.selecionar-produto:checked'));
  if (selecionados.length === 0) return;

  // Configurar modal para múltiplos
  const modal = document.getElementById('modal-confirmar-exclusao');
  const titulo = modal.querySelector('h4');
  const subtitulo = modal.querySelector('p');
  titulo.textContent = `Deseja realmente excluir ${selecionados.length} produto(s)?`;
  subtitulo.textContent = 'Essa ação não poderá ser desfeita.';

  // Marcar como múltipla
  modal.setAttribute('data-multiplos', 'true');
  modal.setAttribute('data-quantidade', selecionados.length);
  modal.classList.add('ativo');
  modal.style.display = 'flex';
}

function confirmarExclusao() {
  const modal = document.getElementById('modal-confirmar-exclusao');
  const multiplos = modal.getAttribute('data-multiplos') === 'true';

  if (multiplos) {
    const selecionados = Array.from(document.querySelectorAll('.selecionar-produto:checked'));

    selecionados.forEach(cb => {
      const row = cb.closest('tr');
      const key = row.getAttribute('data-key');
      const produto = produtos.find(p => p.firebaseKey === key);
      firebase.database().ref('produto/' + key).remove();
      registrarHistorico('Exclusão de produto', `Produto "${produto.nome}" excluído.`);
    });

    mostrarMensagem('Produtos excluídos com sucesso!', 'success');
    modal.removeAttribute('data-multiplos');
    modal.removeAttribute('data-quantidade');
    modal.style.display = 'none';
    carregarProdutosDoFirebase();
  } else {
    if (!firebaseKeyParaExcluir) return;
    const produto = produtos.find(p => p.firebaseKey === firebaseKeyParaExcluir);
    firebase.database().ref('produto/' + firebaseKeyParaExcluir).remove().then(() => {
      registrarHistorico('Exclusão de produto', `Produto "${produto.nome}" excluído.`);
      carregarProdutosDoFirebase();
      mostrarMensagem('Produto excluído com sucesso!', 'success');
      document.getElementById('modal-confirmar-exclusao').style.display = 'none';
      firebaseKeyParaExcluir = null;
    });
  }
}

function excluirProdutosDoFornecedor(nomeFornecedor) {
  firebase.database().ref('produto').once('value').then(snapshot => {
    snapshot.forEach(child => {
      const produto = child.val();
      const key = child.key;
      if (produto.fornecedorId === nomeFornecedor) {
        firebase.database().ref('produto/' + key).remove();
        registrarHistorico('Exclusão automática', `Produto "${produto.nome}" excluído pois o fornecedor "${nomeFornecedor}" foi removido.`);
      }
    });
  });
}

// --- VALIDADE VENCIDA ---
function confirmarValidadeVencida() {
  window.continuarMesmoComValidadeVencida = true;
  document.getElementById('modal-validade-vencida').style.display = 'none';
  if (window.submissaoPendente) {
    handleFormSubmit(window.submissaoPendente);
    window.submissaoPendente = null;
  }
}

// --- FILTROS E ORDENAÇÃO ---
function aplicarFiltrosOrdenacao(lista) {
  const termo = document.querySelector('.input-icon input')?.value.toLowerCase() || '';
  const categoriaSelecionada = document.getElementById('filtrar-categoria')?.value || '';
  const fornecedorSelecionado = document.getElementById('filtrar-fornecedor')?.value || '';
  const ordem = document.getElementById('ordenar-nome')?.value || '';

  let filtrados = lista.filter(p => {
    const nome = p.nome.toLowerCase();
    const categoria = p.categoria.toLowerCase();
    const matchTermo = nome.includes(termo) || categoria.includes(termo);
    const matchCategoria = categoriaSelecionada ? p.categoria === categoriaSelecionada : true;
    const matchFornecedor = fornecedorSelecionado ? p.fornecedorId === fornecedorSelecionado : true;

    let matchEspecial = true;
    if (filtroEspecialAtivo) {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const validade = p.validade ? new Date(p.validade) : null;
      if (validade) {
        validade.setHours(0, 0, 0, 0);
        const dias = Math.floor((validade - hoje) / (1000 * 60 * 60 * 24));
        const atual = parseFloat(p.quantidadeEstoque);
        const minima = parseFloat(p.quantidadeMinima);

        if (filtroEspecialAtivo === 'validade') {
          matchEspecial = dias <= 7 && dias >= 0;
        } else if (filtroEspecialAtivo === 'estoque') {
          matchEspecial = atual < minima;
        } else if (filtroEspecialAtivo === 'vencido') {
          matchEspecial = dias < 0;
        }
      } else {
        matchEspecial = false;
      }
    }

    return matchTermo && matchCategoria && matchFornecedor && matchEspecial;
  });

  // Mensagem sem resultados
  if (filtroEspecialAtivo && filtrados.length === 0) {
    mostrarMensagem('🚫 Nenhum produto encontrado com esse critério.', 'warning');
  }

  // Ordenação
  if (ordem === 'az') filtrados.sort((a, b) => a.nome.localeCompare(b.nome));
  if (ordem === 'za') filtrados.sort((a, b) => b.nome.localeCompare(a.nome));
  if (ordem === 'preco-asc') filtrados.sort((a, b) => parseFloat(a.preco) - parseFloat(b.preco));
  if (ordem === 'preco-desc') filtrados.sort((a, b) => parseFloat(b.preco) - parseFloat(a.preco));
  if (ordem === 'validade') filtrados.sort((a, b) => new Date(a.validade) - new Date(b.validade));

  return filtrados;
}

// Configuração de filtros especiais
document.querySelectorAll('#legenda-alertas span').forEach(btn => {
  btn.style.cursor = 'pointer';
  btn.addEventListener('click', () => {
    const texto = btn.textContent.toLowerCase();
    if (texto.includes('validade')) filtroEspecialAtivo = 'validade';
    else if (texto.includes('estoque')) filtroEspecialAtivo = 'estoque';
    else if (texto.includes('vencido')) filtroEspecialAtivo = 'vencido';

    paginaAtual = 1;
    atualizarTabela();

    // Destacar botão ativo
    document.querySelectorAll('#legenda-alertas span').forEach(outro => {
      outro.classList.remove('filtro-ativo');
    });
    btn.classList.add('filtro-ativo');
    verificarFiltrosAtivos();
  });
});

// --- EXPORTAÇÃO ---
function exportarTodosVisiveisParaCSV() {
  const produtosVisiveis = aplicarFiltrosOrdenacao(produtos);

  if (produtosVisiveis.length === 0) {
    mostrarMensagem('⚠️ Nenhum produto disponível para exportar.', 'warning');
    return;
  }

  gerarCSV(produtosVisiveis, 'produtos_tabela_atual.csv');
}

function exportarSelecionadosParaCSV() {
  const linhas = Array.from(document.querySelectorAll('.selecionar-produto:checked'))
    .map(cb => cb.closest('tr'));

  if (linhas.length === 0) return;

  const produtosSelecionados = linhas.map(tr => {
    const firebaseKey = tr.getAttribute('data-key');
    return produtos.find(p => p.firebaseKey === firebaseKey);
  });

  gerarCSV(produtosSelecionados, 'produtos_selecionados_completos.csv');
}

function gerarCSV(dados, nomeArquivo) {
  const headers = [
    'Código', 'Nome', 'Categoria', 'Validade',
    'Qtd. Mínima', 'Qtd. Atual', 'Unidade',
    'Preço', 'Preço por', 'Fornecedor', 'Descrição'
  ];

  const rows = dados.map(produto => [
    produto.codigo || '',
    produto.nome || '',
    produto.categoria || '',
    produto.validade ? formatarData(produto.validade) : '',
    produto.quantidadeMinima || '',
    produto.quantidadeEstoque || '',
    produto.unidadeMedida || '',
    produto.preco || '',
    produto.precoPor || '',
    mapaFornecedores[produto.fornecedorId] || '',
    produto.descricao || ''
  ]);

  // Gerar conteúdo CSV
  const csvContent = '\uFEFF' + [headers, ...rows]
    .map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(";"))
    .join("\n");

  // Criar e disparar download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", nomeArquivo);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// --- UTILITÁRIOS ---
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
  if (!dataStr) return '—';
  const [ano, mes, dia] = dataStr.split('-');
  return `${dia}/${mes}/${ano}`;
}

function mostrarMensagem(texto, tipo = 'success') {
  const msg = document.createElement('div');
  msg.textContent = texto;
  msg.className = `mensagem-alerta ${tipo}`;
  document.body.appendChild(msg);
  setTimeout(() => msg.remove(), 4000);
}

function converterImagemParaBase64(file, callback) {
  const reader = new FileReader();
  reader.onload = e => callback(e.target.result);
  reader.readAsDataURL(file);
}

function calcularValorTotalEstoque(produto) {
  const preco = Number(produto.preco);
  const qtd = Number(produto.quantidadeEstoque);
  const precoPor = produto.precoPor;
  const unidade = produto.unidadeMedida;

  let fator;

  // Conversões de peso
  if ((precoPor === 'kg' && unidade === 'g')) {
    fator = qtd / 1000;
  } else if (precoPor === 'kg' && unidade === '100g') {
    fator = qtd / 10;
  } else if (precoPor === '100g' && unidade === 'kg') {
    fator = qtd * 10;
  } else if (precoPor === '100g' && unidade === 'g') {
    fator = qtd / 100;
  } else if (precoPor === '100g' && unidade === '100g') {
    fator = qtd;
  } else if (precoPor === 'g' && unidade === 'kg') {
    fator = qtd * 1000;
  } else if (precoPor === 'g' && unidade === '100g') {
    fator = qtd * 100;
  }
  // Conversões de volume
  else if (precoPor === 'litro' && unidade === 'ml') {
    fator = qtd / 1000;
  } else if (precoPor === 'ml' && unidade === 'litro') {
    fator = qtd * 1000;
  }
  // Unidade ou pacote
  else {
    fator = qtd;
  }

  const total = preco * fator;
  return `R$ ${total.toFixed(2)}`;
}
