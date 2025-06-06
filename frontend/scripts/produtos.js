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
    document.getElementById('titulo-modal-produto').textContent = 'Adicionar Novo Produto';
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

  //Filtro de fornecedor
  document.getElementById('filtrar-fornecedor').addEventListener('change', () => {
    paginaAtual = 1;
    atualizarTabela();
    verificarFiltrosAtivos();
  });

  // Botão para mostrar/ocultar os filtros
  document.querySelector('.filter')?.addEventListener('click', () => {
    const filtros = document.getElementById('filtros-container');
    if (filtros) {
      filtros.style.display = filtros.style.display === 'none' ? 'flex' : 'none';
    }
  });

  carregarFornecedores();
  carregarFiltroFornecedores();
});

// TRAZER OS PRODUTOS DO FIREBASE À TELA
function carregarProdutosDoFirebase() {
  firebase.database().ref('produto').once('value').then(snapshot => {
    produtos.length = 0;
    snapshot.forEach(childSnapshot => {
      const produto = childSnapshot.val();
      produto.firebaseKey = childSnapshot.key;
      produtos.push(produto);
    });
    atualizarTabela();
  });
}

// PUXAR FORNECEDORES DE FIREBASE
function carregarFornecedores() {
  const select = document.getElementById('fornecedor');
  if (!select) return;

  firebase.database().ref('fornecedor').once('value').then(snapshot => {
    select.innerHTML = '<option value="">Selecione...</option>';
    snapshot.forEach(child => {
      const fornecedor = child.val();
      const option = document.createElement('option');
      option.value = fornecedor.nome;
      option.textContent = fornecedor.nome;
      select.appendChild(option);
    });
  });
}

// HISTÓRICO DE AÇÕES FEITAS EM CADASTRO
function registrarHistorico(tipo, descricao) {
  firebase.database().ref('historicoAcoes').push({
    tipo,
    descricao,
    data: new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  });
}

// -- DATA E HORA PARA O FIREBASE (CONVERTIDO PARA BR)
function obterDataLegivel() {
  const hoje = new Date();
  const dia = String(hoje.getDate()).padStart(2, '0');
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const ano = hoje.getFullYear();
  const hora = hoje.getHours().toString().padStart(2, '0');
  const min = hoje.getMinutes().toString().padStart(2, '0');
  return `${dia}/${mes}/${ano} às ${hora}:${min}`;
}

//-- CODIGO ALEATORIO DO PRODUTO
function gerarCodigoProduto() {
  let novoCodigo;
  do {
    novoCodigo = 'PRD-' + Math.floor(10000 + Math.random() * 90000);
  } while (produtos.some(p => p.codigo === novoCodigo));
  return novoCodigo;
}

//FORMATAR DATA PARA BR (DD/MM/YYYY)
function formatarData(dataStr) {
  const [ano, mes, dia] = dataStr.split('-');
  return `${dia}/${mes}/${ano}`;
}

// -- CADASTRAR NOVO PRODUTO E LINHA NOVA NA TABELA
function adicionarLinhaTabela(produto) {
  const tbody = document.getElementById('lista-produtos');
  const row = document.createElement('tr');
  row.setAttribute('data-key', produto.firebaseKey);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  // Validade
  let validade = null;
  if (produto.validade) {
    const [ano, mes, dia] = produto.validade.split('-').map(Number);
    validade = new Date(ano, mes - 1, dia);
    validade.setHours(0, 0, 0, 0);
  }

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
  <td data-label="Código: ">${produto.codigo || '(sem código)'}</td>
  <td data-label="Produto: ">${produto.nome || 'Sem nome'}</td>
  <td data-label="Estoque: ">${qtdAtual} ${unidade}</td>
  <td data-label="Validade: ">${validade ? formatarData(produto.validade) : '—'}</td>
  <td class="col-consultar" data-label="Consultar"><i class="fa fa-search search-icon"></i></td>
  <td class="col-editar" data-label="Editar"><i class="fa fa-edit edit-icon"></i></td>
  <td class="col-excluir" data-label="Excluir"><i class="fa fa-trash delete-icon"></i></td>
  <td class="acoes-mobile" data-label="Ações">
    <div class="acoes-icones">
      <i class="fa fa-search search-icon"></i>
      <i class="fa fa-edit edit-icon"></i>
      <i class="fa fa-trash delete-icon"></i>
    </div>
  </td>
`;

  tbody.appendChild(row);
}

// ATUALIZAR TABELA
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

function verificarFiltrosAtivos() {
  const termo = document.querySelector('.input-icon input')?.value || '';
  const categoria = document.getElementById('filtrar-categoria')?.value || '';
  const fornecedor = document.getElementById('filtrar-fornecedor')?.value || '';
  const ordenacao = document.getElementById('ordenar-nome')?.value || '';
  const filtroAlerta = filtroEspecialAtivo;

  const algumAtivo = termo || categoria || fornecedor || ordenacao || filtroAlerta;
  document.getElementById('btn-limpar-filtros').style.display = algumAtivo ? 'inline-block' : 'none';
}

// -- PAGINACAO ATUALIZADA (10 ITENS POR PAGINA)
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

// -- EXCLUIR TODOS OS PRODUTOS DA SEÇÃO (PÁGINA)
function atualizarBotaoExcluirSelecionados() {
  const selecionados = document.querySelectorAll('.selecionar-produto:checked');
  const botao = document.getElementById('btn-excluir-selecionados');
  botao.style.display = selecionados.length > 0 ? 'inline-block' : 'none';
}

// -- EXCLUIR PRODUTOS INDIVIDUAIS ESCOLHIDOSS
function excluirSelecionados() {
  const selecionados = Array.from(document.querySelectorAll('.selecionar-produto:checked'));
  if (selecionados.length === 0) return;

  // Atualiza texto do modal para múltiplos
  const modal = document.getElementById('modal-confirmar-exclusao');
  const titulo = modal.querySelector('h4');
  const subtitulo = modal.querySelector('p');
  titulo.textContent = `Deseja realmente excluir ${selecionados.length} produto(s)?`;
  subtitulo.textContent = 'Essa ação não poderá ser desfeita.';

  // Marca como múltipla
  modal.setAttribute('data-multiplos', 'true');
  modal.setAttribute('data-quantidade', selecionados.length);
  modal.classList.add('ativo');
  modal.style.display = 'flex';
}

// -- IMAGEM ACESSIVEL PARA USO NO FIREBASE
function converterImagemParaBase64(file, callback) {
  const reader = new FileReader();
  reader.onload = e => callback(e.target.result);
  reader.readAsDataURL(file);
}

// -- ENVIAR FORMULARIO DE CADASTRO
function handleFormSubmit(e) {
  e.preventDefault();

  const validadeInput = document.getElementById('validade').value;
  const [ano, mes, dia] = validadeInput.split('-').map(Number);
  const validadeSelecionada = new Date(ano, mes - 1, dia);
  const hoje = new Date();
  const fornecedor = document.getElementById('fornecedor').value;
  hoje.setHours(0, 0, 0, 0);
  validadeSelecionada.setHours(0, 0, 0, 0);

  // Se a data estiver vencida, exibe o modal e salva o evento para depois
  if (validadeSelecionada < hoje && !window.continuarMesmoComValidadeVencida) {
    window.submissaoPendente = e;
    document.getElementById('modal-validade-vencida').style.display = 'flex';
    return;
  }

  // Resetar a flag de continuidade
  window.continuarMesmoComValidadeVencida = false;

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
  if (!codigo || !nome || !categoria || isNaN(preco) || !validadeInput || !quantidadeEstoque || !quantidadeMinima || !precoPor) {
    mostrarMensagem('⚠️ Preencha todos os campos obrigatórios!', 'error');
    return;
  }

  // Validação de coerência entre unidade e tipo de preço
  const combinacoesValidas = {
    unidade: ['unidade', 'pacote'],
    pacote: ['unidade', 'pacote'],
    litro: ['litro', 'ml'],
    ml: ['litro', 'ml'],
    kg: ['kg', 'g', '100g'],
    g: ['kg', 'g', '100g'],
    '100g': ['kg', 'g', '100g']
  };

  // -- MENSAGEM CASO COERENCIA ENTRE UNIDADE E TIPO DE PREÇO NAO BATER
  if (!combinacoesValidas[unidadeMedida]?.includes(precoPor)) {
    mostrarMensagem(`🚫 A unidade "${unidadeMedida}" não é compatível com o tipo de preço "${precoPor}". Corrija antes de salvar.`, 'error');
    return;
  }

  // Monta o objeto produto
  const produto = {
    codigo,
    nome,
    descricao,
    categoria,
    validade: validadeInput,
    preco: preco.toFixed(2),
    precoPor,
    quantidadeEstoque: parseFloat(quantidadeEstoque),
    quantidadeMinima: parseFloat(quantidadeMinima),
    unidadeMedida,
    ativo: true,
    fornecedor,
    imagemUrl: '',
    dataUltimaAtualizacao: obterDataLegivel()
  };

  // -- EDITAR PRODUTO - DATA DE CADASTRO
  if (indiceParaEditar === null) {
    produto.dataCadastro = obterDataLegivel();
  }

  // -- SALVAR IMG NO FIREBASE
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

// -- MOSTRA MENSAGEM NO TOPO DA TELA
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
    document.getElementById('ver-fornecedor').textContent = produto.fornecedor || '—';
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
    document.getElementById('fornecedor').value = produto.fornecedor || '';
    document.getElementById('titulo-modal-produto').textContent = 'Editar Produto';
    document.getElementById('modal-produto').style.display = 'flex';
  }

  if (e.target.classList.contains('delete-icon')) {
    firebaseKeyParaExcluir = firebaseKey;
    document.getElementById('modal-confirmar-exclusao').style.display = 'flex';
  }
});

// -- BOTAO DE CONFIRMAR EXCLUSAO DE PRODUTO
document.getElementById('btn-confirmar-excluir').addEventListener('click', () => {
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
});

//--BOTAO DE CANCELAR EXCLUSAO DE PRODUTO
document.getElementById('btn-cancelar-excluir').addEventListener('click', () => {
  firebaseKeyParaExcluir = null;
  document.getElementById('modal-confirmar-exclusao').style.display = 'none';
});

// --- CONTROLE DO MODAL DE VALIDADE VENCIDA ---
document.getElementById('btn-confirmar-validade').addEventListener('click', () => {
  window.continuarMesmoComValidadeVencida = true;
  document.getElementById('modal-validade-vencida').style.display = 'none';
  if (window.submissaoPendente) {
    handleFormSubmit(window.submissaoPendente); // reenviar
    window.submissaoPendente = null;
  }
});

//-- BOTAO SE A PESSOA QUER CADASTRAR PRODUTO VENCIDO/DE VALIDADE ULTRAPASSADA
document.getElementById('btn-cancelar-validade').addEventListener('click', () => {
  document.getElementById('modal-validade-vencida').style.display = 'none';
  window.submissaoPendente = null;
});

//-- CALCULA VALOR DO ESTOQUE NA HORA DE VISUALIZAR DETALHES DO PRODUTO
function calcularValorTotalEstoque(produto) {
  const preco = Number(produto.preco);
  const qtd = Number(produto.quantidadeEstoque);
  const precoPor = produto.precoPor;
  const unidade = produto.unidadeMedida;

  let fator;

  // 🧪 Peso
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

  // 🧪 Volume
  else if (precoPor === 'litro' && unidade === 'ml') {
    fator = qtd / 1000;
  } else if (precoPor === 'ml' && unidade === 'litro') {
    fator = qtd * 1000;
  }

  // 🧪 Unidade ou pacote
  else {
    fator = qtd;
  }

  const total = preco * fator;
  return `R$ ${total.toFixed(2)}`;
}

// --- FILTROS POR ALERTAS (Validade, Estoque, Vencido) ---
let filtroEspecialAtivo = null;

const botoesLegenda = document.querySelectorAll('#legenda-alertas span');
const btnLimparFiltros = document.createElement('button');
btnLimparFiltros.id = 'btn-limpar-filtros';
btnLimparFiltros.textContent = 'Limpar Filtros';
document.getElementById('topo-tabela').appendChild(btnLimparFiltros);

btnLimparFiltros.addEventListener('click', () => {
  filtroEspecialAtivo = null;
  paginaAtual = 1;

  // Limpar campo de busca
  const inputBusca = document.querySelector('.input-icon input');
  if (inputBusca) inputBusca.value = '';

  // Resetar selects
  document.getElementById('filtrar-categoria').value = '';
  document.getElementById('filtrar-fornecedor').value = '';
  document.getElementById('ordenar-nome').value = '';

  // Resetar destaques de alerta
  botoesLegenda.forEach(btn => btn.classList.remove('filtro-ativo'));

  // Atualizar a tabela
  atualizarTabela();

  // Esconder botão de limpar
  verificarFiltrosAtivos();
});

botoesLegenda.forEach(btn => {
  btn.style.cursor = 'pointer';
  btn.addEventListener('click', () => {
    // Define o tipo de filtro
    const texto = btn.textContent.toLowerCase();
    if (texto.includes('validade')) filtroEspecialAtivo = 'validade';
    else if (texto.includes('estoque')) filtroEspecialAtivo = 'estoque';
    else if (texto.includes('vencido')) filtroEspecialAtivo = 'vencido';

    paginaAtual = 1;
    atualizarTabela();

    // Aplica destaque
    botoesLegenda.forEach(outro => outro.classList.remove('filtro-ativo'));
    btn.classList.add('filtro-ativo');
    verificarFiltrosAtivos();

    btnLimparFiltros.style.display = 'inline-block';
  });
});

//--Aplicação de filtros de ordenacao

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
    const matchFornecedor = fornecedorSelecionado ? p.fornecedor === fornecedorSelecionado : true;

    let matchEspecial = true;
    if (filtroEspecialAtivo) {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const validade = new Date(p.validade);
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
    }

    return matchTermo && matchCategoria && matchFornecedor && matchEspecial;
  });

  // Exibe mensagem se não houver resultados
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

//Filtro por fornecedores
function carregarFiltroFornecedores() {
  const select = document.getElementById('filtrar-fornecedor');
  if (!select) return;

  firebase.database().ref('fornecedor').once('value').then(snapshot => {
    select.innerHTML = '<option value="">Todos</option>';
    snapshot.forEach(child => {
      const fornecedor = child.val();
      const option = document.createElement('option');
      option.value = fornecedor.nome;
      option.textContent = fornecedor.nome;
      select.appendChild(option);
    });
  });
}
