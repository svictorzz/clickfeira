// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyD_8Rr7Ya6MzqJ6Hn6vJwQZ7yj6Qt8sE7A",
  authDomain: "click-feira.firebaseapp.com",
  databaseURL: "https://click-feira-default-rtdb.firebaseio.com",
  projectId: "click-feira",
  storageBucket: "click-feira.appspot.com",
  messagingSenderId: "108583577904",
  appId: "1:108583577904:web:7d9b3d0c8d9b0d8d8e6e7f"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Variáveis globais
let fornecedores = [];
let fornecedorParaEditar = null;
let fornecedorParaExcluir = null;
const modalExcluir = new bootstrap.Modal(document.getElementById('modal-excluir'));
let proximoCodigo = 1;
let ordenacaoAtual = '';

// DOM Elements
const elements = {
  tabelaFornecedores: document.getElementById('tabela-fornecedores'),
  pesquisarFornecedor: document.getElementById('pesquisar-fornecedor'),
  nomeFornecedorExcluir: document.getElementById('nome-fornecedor-excluir'),
  filtrosContainer: document.getElementById('filtros-container'),
  ordenarNome: document.getElementById('ordenar-nome'),
  filtrarTipo: document.getElementById('filtrar-tipo'),
  filtrarCategoria: document.getElementById('filtrar-categoria'),
  btnExportarTodos: document.getElementById('btn-exportar-todos'),
  btnLimparFiltros: document.getElementById('btn-limpar-filtros'),
  btnExcluirSelecionados: document.getElementById('btn-excluir-selecionados'),
  btnExportarSelecionados: document.getElementById('btn-exportar-selecionados'),
  selecionarTodos: document.getElementById('selecionar-todos'),
  acoesMultiplas: document.getElementById('acoes-multiplas')
};

// Registrar ação no histórico
function registrarHistorico(tipo, descricao) {
  const idComerciante = localStorage.getItem("idComerciante") || sessionStorage.getItem("idComerciante");
  if (!idComerciante) {
    console.warn("ID do comerciante não encontrado. Histórico não registrado.");
    return;
  }

  const historico = {
    tipo,
    descricao,
    data: new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
    idComerciante
  };

  firebase.database().ref('historicoAcoes').push(historico);
}

// Função para obter data legível
function obterDataLegivel() {
  const hoje = new Date();
  const dia = String(hoje.getDate()).padStart(2, '0');
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const ano = hoje.getFullYear();
  const hora = hoje.getHours().toString().padStart(2, '0');
  const minutos = hoje.getMinutes().toString().padStart(2, '0');
  return `${dia}/${mes}/${ano} às ${hora}:${minutos}`;
}

// Função para formatar data 
function formatarData(dataISO) {
  if (!dataISO) return '';
  if (dataISO.includes('às')) return dataISO;

  const data = new Date(dataISO);
  if (isNaN(data.getTime())) return '';

  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const ano = data.getFullYear();
  const horas = String(data.getHours()).padStart(2, '0');
  const minutos = String(data.getMinutes()).padStart(2, '0');

  return `${dia}/${mes}/${ano} às ${horas}:${minutos}`;
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  carregarFornecedoresDoFirebase();

  // Event Listeners
  document.getElementById('btn-adicionar').addEventListener('click', mostrarModalAdicionar);
  document.getElementById('btn-cancelar-adicionar').addEventListener('click', fecharModalAdicionar);
  document.getElementById('btn-cancelar-editar').addEventListener('click', fecharModalEditar);
  document.getElementById('btn-voltar-visualizar').addEventListener('click', fecharModalVisualizar);
  document.getElementById('btn-cancelar-exclusao').addEventListener('click', () => modalExcluir.hide());
  document.getElementById('btn-confirmar-exclusao').addEventListener('click', confirmarExclusao);
  elements.pesquisarFornecedor.addEventListener('input', pesquisarFornecedores);
  elements.ordenarNome.addEventListener('change', ordenarFornecedores);
  elements.filtrarTipo.addEventListener('change', () => aplicarOrdenacaoEFiltros());
  elements.filtrarCategoria.addEventListener('change', aplicarOrdenacaoEFiltros);
  elements.btnExcluirSelecionados.addEventListener('click', excluirSelecionados);
  elements.btnExportarSelecionados.addEventListener('click', exportarSelecionadosParaCSV);
  elements.selecionarTodos.addEventListener('change', toggleSelecaoTodos);
  
  // Toggle para mostrar/ocultar filtros
  document.querySelector('.filter').addEventListener('click', function () {
    if (elements.filtrosContainer.style.display === 'none') {
      elements.filtrosContainer.style.display = 'flex';
    } else {
      elements.filtrosContainer.style.display = 'none';
    }
  });

  // Evitar envio com Enter
  document.querySelectorAll('form').forEach(form => {
    form.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
      }
    });
  });

  // Formulários
  document.getElementById('form-adicionar').addEventListener('submit', salvarFornecedor);
  document.getElementById('form-editar').addEventListener('submit', atualizarFornecedor);

  // Máscaras e validações
  aplicarMascaras();
});

// Limpar Filtro
elements.btnLimparFiltros.addEventListener('click', () => {
  elements.filtrarTipo.value = '';
  elements.filtrarCategoria.value = '';
  aplicarOrdenacaoEFiltros();
});

// Exportar fornecedores (todos)
elements.btnExportarTodos.addEventListener('click', exportarTodosFornecedores);

// Carregar fornecedores do Firebase
function carregarFornecedoresDoFirebase() {
  const idComerciante = localStorage.getItem("idComerciante") || sessionStorage.getItem("idComerciante");
  if (!idComerciante) {
    console.warn("ID do comerciante não encontrado.");
    return;
  }

  firebase.database().ref('fornecedor').on('value', (snapshot) => {
    fornecedores = [];
    snapshot.forEach((childSnapshot) => {
      const fornecedor = childSnapshot.val();
      if (fornecedor.idComerciante === idComerciante) {
        fornecedor.firebaseKey = childSnapshot.key;
        fornecedores.push(fornecedor);

        // Atualiza o proximoCodigo
        const numCodigo = parseInt(fornecedor.codigo?.replace(/\D/g, ''));
        if (!isNaN(numCodigo) && numCodigo >= proximoCodigo) {
          proximoCodigo = numCodigo + 1;
        }
      }
    });
    aplicarOrdenacaoEFiltros();
  });
}

// Função para aplicar ordenação e filtros juntos
function aplicarOrdenacaoEFiltros() {
  let filtrados = [...fornecedores];
  const tipoFiltro = elements.filtrarTipo.value;
  const termoPesquisa = elements.pesquisarFornecedor.value.toLowerCase();
  const categoriaSelecionada = elements.filtrarCategoria.value;

  // Aplicar filtro por tipo (CPF/CNPJ)
  if (tipoFiltro === 'cpf') {
    filtrados = filtrados.filter(f => f.cnpj && f.cnpj.replace(/\D/g, '').length === 11);
  } else if (tipoFiltro === 'cnpj') {
    filtrados = filtrados.filter(f => f.cnpj && f.cnpj.replace(/\D/g, '').length === 14);
  }

  // Filtrar por categoria de produtos
  if (categoriaSelecionada) {
    filtrados = filtrados.filter(f =>
      Array.isArray(f.produtos) && f.produtos.includes(categoriaSelecionada)
    );
  }

  // Aplicar pesquisa
  if (termoPesquisa) {
    filtrados = filtrados.filter(fornecedor =>
      (fornecedor.nome && fornecedor.nome.toLowerCase().includes(termoPesquisa)) ||
      (fornecedor.cnpj && fornecedor.cnpj.includes(termoPesquisa)) ||
      (fornecedor.codigo && fornecedor.codigo.includes(termoPesquisa))
    );
  }

  // Aplicar ordenação
  switch (ordenacaoAtual) {
    case 'az':
      filtrados.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
      break;
    case 'za':
      filtrados.sort((a, b) => (b.nome || '').localeCompare(a.nome || ''));
      break;
  }

  const algumFiltroAtivo = elements.filtrarTipo.value || elements.filtrarCategoria.value;
  elements.btnLimparFiltros.style.display = algumFiltroAtivo ? 'inline-block' : 'none';

  renderizarTabela(filtrados);
}

// Funções para abrir/fechar modais
function mostrarModalAdicionar() {
  document.getElementById('form-adicionar').reset();
  document.getElementById('codigo').value = proximoCodigo.toString().padStart(3, '0');
  document.getElementById('modal-adicionar').style.display = 'flex';
  fornecedorParaEditar = null;
}

function fecharModalAdicionar() {
  document.getElementById('modal-adicionar').style.display = 'none';
}

function mostrarModalEditar(firebaseKey) {
  const fornecedor = fornecedores.find(f => f.firebaseKey === firebaseKey);
  if (!fornecedor) {
    mostrarMensagem("Fornecedor não encontrado.", "error");
    return;
  }

  const idComerciante = localStorage.getItem("idComerciante") || sessionStorage.getItem("idComerciante");
  if (fornecedor.idComerciante !== idComerciante) {
    mostrarMensagem("Você não tem permissão para editar este fornecedor.", "error");
    return;
  }

  // Preencher os campos do formulário de edição
  document.getElementById('edit-id').value = firebaseKey;
  document.getElementById('edit-codigo').value = fornecedor.codigo || '';
  document.getElementById('edit-nome').value = fornecedor.nome || '';
  document.getElementById('edit-cnpj').value = fornecedor.cnpj || '';
  document.getElementById('edit-email').value = fornecedor.email || '';
  // CEP REMOVIDO
  document.getElementById('edit-telefone').value = fornecedor.telefone || '';
  document.getElementById('edit-endereco').value = fornecedor.endereco || '';
  const checkboxes = document.querySelectorAll('#edit-produtos-checkboxes input[name="produtos"]');
  checkboxes.forEach(cb => {
    cb.checked = Array.isArray(fornecedor.produtos) && fornecedor.produtos.includes(cb.value);
  });
  document.getElementById('modal-editar').style.display = 'flex';
  fornecedorParaEditar = fornecedor;
}

function fecharModalEditar() {
  document.getElementById('modal-editar').style.display = 'none';
  fornecedorParaEditar = null;
}

function mostrarModalVisualizar(firebaseKey) {
  const fornecedor = fornecedores.find(f => f.firebaseKey === firebaseKey);
  if (!fornecedor) {
    mostrarMensagem("Fornecedor não encontrado.", "error");
    return;
  }

  const idComerciante = localStorage.getItem("idComerciante") || sessionStorage.getItem("idComerciante");
  if (fornecedor.idComerciante !== idComerciante) {
    mostrarMensagem("Você não tem permissão para acessar este fornecedor.", "error");
    return;
  }

  // Preenchimento do modal com dados do fornecedor
  document.getElementById('view-codigo').textContent = fornecedor.codigo || '';
  document.getElementById('view-nome').textContent = fornecedor.nome || '';
  document.getElementById('view-cnpj').textContent = fornecedor.cnpj || '';
  document.getElementById('view-email').textContent = fornecedor.email || '';
  // CEP REMOVIDO
  document.getElementById('view-telefone').textContent = fornecedor.telefone || '';
  document.getElementById('view-endereco').textContent = fornecedor.endereco || '';
  document.getElementById('view-dataCadastro').textContent = formatarData(fornecedor.dataCadastro) || '';
  document.getElementById('view-dataAtualizacao').textContent = formatarData(fornecedor.dataUltimaAtualizacao) || '';
  document.getElementById('view-produtos').textContent = Array.isArray(fornecedor.produtos)
    ? fornecedor.produtos.join(', ')
    : fornecedor.produtos || '';
  document.getElementById('modal-visualizar').style.display = 'flex';
}

function fecharModalVisualizar() {
  document.getElementById('modal-visualizar').style.display = 'none';
}

function mostrarModalExclusao(firebaseKey) {
  const fornecedor = fornecedores.find(f => f.firebaseKey === firebaseKey);
  if (!fornecedor) {
    mostrarMensagem("Fornecedor não encontrado.", "error");
    return;
  }

  const idComerciante = localStorage.getItem("idComerciante") || sessionStorage.getItem("idComerciante");
  if (fornecedor.idComerciante !== idComerciante) {
    mostrarMensagem("Você não tem permissão para excluir este fornecedor.", "error");
    return;
  }

  fornecedorParaExcluir = fornecedor;
  document.getElementById('nome-fornecedor-excluir').textContent = fornecedor.nome;
  modalExcluir.show();
}

// Funções de renderização
function renderizarTabela(fornecedoresParaRenderizar = fornecedores) {
  elements.tabelaFornecedores.innerHTML = '';

  if (fornecedoresParaRenderizar.length === 0) {
    elements.tabelaFornecedores.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-3 text-muted">
          Nenhum fornecedor encontrado
        </td>
      </tr>
    `;
    elements.acoesMultiplas.style.display = 'none';
    return;
  }

  fornecedoresParaRenderizar.forEach(fornecedor => {
    const tr = document.createElement('tr');
    tr.setAttribute('data-key', fornecedor.firebaseKey);
    tr.innerHTML = `
      <td><input type="checkbox" class="selecionar-fornecedor"></td>
      <td>${fornecedor.codigo || ''}</td>
      <td>${fornecedor.cnpj || ''}</td>
      <td>${fornecedor.nome || ''}</td>
      <td>${fornecedor.telefone || ''}</td>
      <td>${fornecedor.dataCadastro ? formatarData(fornecedor.dataCadastro) : ''}</td>
      <td>${fornecedor.dataUltimaAtualizacao ? formatarData(fornecedor.dataUltimaAtualizacao) : ''}</td>
      <td class="text-center">
        <i class="fas fa-search text-muted cursor-pointer btn-visualizar"></i>
        <button class="btn btn-sm btn-outline-primary btn-editar me-1">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger btn-excluir" data-nome="${fornecedor.nome}">
          <i class="fas fa-trash-alt"></i>
        </button>
      </td>
    `;

    tr.querySelector('.btn-visualizar').addEventListener('click', () =>
      mostrarModalVisualizar(fornecedor.firebaseKey));

    tr.querySelector('.btn-editar').addEventListener('click', () =>
      mostrarModalEditar(fornecedor.firebaseKey));

    tr.querySelector('.btn-excluir').addEventListener('click', () =>
      mostrarModalExclusao(fornecedor.firebaseKey));

    elements.tabelaFornecedores.appendChild(tr);
  });

  // Atualizar seleção
  document.querySelectorAll('.selecionar-fornecedor').forEach(checkbox => {
    checkbox.addEventListener('change', atualizarSelecaoIndividual);
  });
  
  atualizarAcoesMultiplas();
}

// Funções CRUD
function confirmarExclusao() {
  if (fornecedorParaExcluir) {
    const fornecedorRef = firebase.database().ref('fornecedor/' + fornecedorParaExcluir.firebaseKey);

    fornecedorRef.once('value').then(snapshot => {
      const fornecedor = snapshot.val();
      const nomeFornecedor = fornecedor?.nome;

      return fornecedorRef.remove().then(() => {
        mostrarMensagem('Fornecedor excluído com sucesso!', 'success');
        modalExcluir.hide();
        registrarHistorico('Exclusão de fornecedor', `Fornecedor "${nomeFornecedor}" foi excluído.`);
        excluirProdutosDoFornecedor(fornecedorParaExcluir.firebaseKey);
        fornecedorParaExcluir = null;
      });
    }).catch(error => {
      console.error('Erro ao excluir fornecedor:', error);
      mostrarMensagem('Erro ao excluir fornecedor', 'error');
    });
  }
}

function excluirProdutosDoFornecedor(fornecedorId) {
  firebase.database().ref('produto').once('value').then(snapshot => {
    snapshot.forEach(child => {
      const produto = child.val();
      const key = child.key;
      if (produto.fornecedorId === fornecedorId) {
        firebase.database().ref('produto/' + key).remove();
        registrarHistorico('Exclusão automática', `Produto "${produto.nome}" excluído porque o fornecedor foi removido.`);
      }
    });
  });
}

function salvarFornecedor(e) {
  e.preventDefault();

  if (!validarFormulario('form-adicionar')) return;

  const idComerciante = localStorage.getItem("idComerciante") || sessionStorage.getItem("idComerciante");
  if (!idComerciante) {
    console.warn("ID do comerciante não encontrado. Redirecionando para login.");
    window.location.href = "login.html";
    return;
  }

  const novoFornecedor = {
    codigo: document.getElementById('codigo').value,
    nome: document.getElementById('nome').value,
    cnpj: document.getElementById('cnpj').value,
    email: document.getElementById('email').value,
    // CEP REMOVIDO
    telefone: document.getElementById('telefone').value,
    endereco: document.getElementById('endereco').value,
    produtos: Array.from(document.querySelectorAll('#produtos-checkboxes input[name="produtos"]:checked'))
      .map(cb => cb.value),
    dataCadastro: obterDataLegivel(),
    dataUltimaAtualizacao: obterDataLegivel(),
    idComerciante: idComerciante
  };

  // Validações
  if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(novoFornecedor.nome) || novoFornecedor.nome.split(" ").length < 2) {
    mostrarMensagem('Nome inválido. Use apenas letras e espaços (mínimo 2 palavras).', 'error');
    return;
  }

  // Limite de tamanho
  if (novoFornecedor.nome.length > 80) {
    mostrarMensagem('Nome muito longo (máximo 80 caracteres)', 'error');
    return;
  }
  
  if (novoFornecedor.email.length > 100) {
    mostrarMensagem('E-mail muito longo (máximo 100 caracteres)', 'error');
    return;
  }

  // Produtos válidos
  novoFornecedor.produtos = novoFornecedor.produtos.filter(p => [
    "frutas", "legumes", "vegetais", "verduras", "temperos",
    "laticínios", "doces", "salgados", "carnes", "grãos", "bebidas", "outros"
  ].includes(p));

  if (fornecedorParaEditar) {
    firebase.database().ref('fornecedor/' + fornecedorParaEditar.firebaseKey).update(novoFornecedor)
      .then(() => {
        mostrarMensagem('Fornecedor atualizado com sucesso!', 'success');
        fecharModalAdicionar();
        fornecedorParaEditar = null;
        registrarHistorico('Edição de fornecedor', `Fornecedor "${novoFornecedor.nome}" atualizado.`);
      })
      .catch(error => {
        console.error('Erro ao atualizar fornecedor:', error);
        mostrarMensagem('Erro ao atualizar fornecedor', 'error');
      });
  } else {
    const cnpjNormalizado = novoFornecedor.cnpj.replace(/\D/g, '');
    const cnpjDuplicado = fornecedores.some(f =>
      f.cnpj.replace(/\D/g, '') === cnpjNormalizado
    );

    if (cnpjDuplicado) {
      mostrarMensagem('CNPJ/CPF já cadastrado para outro fornecedor.', 'error');
      return;
    }

    const emailNormalizado = novoFornecedor.email.toLowerCase().trim();
    const emailDuplicado = fornecedores.some(f =>
      f.email.toLowerCase().trim() === emailNormalizado
    );
    
    if (emailDuplicado) {
      mostrarMensagem('E-mail já cadastrado para outro fornecedor.', 'error');
      return;
    }
    
    firebase.database().ref('fornecedor').push(novoFornecedor)
      .then(() => {
        mostrarMensagem('Fornecedor cadastrado com sucesso!', 'success');
        fecharModalAdicionar();
        proximoCodigo++;
        registrarHistorico('Cadastro de fornecedor', `Fornecedor "${novoFornecedor.nome}" cadastrado.`);
      })
      .catch(error => {
        console.error('Erro ao cadastrar fornecedor:', error);
        mostrarMensagem('Erro ao cadastrar fornecedor', 'error');
      });
  }
}

function atualizarFornecedor(e) {
  e.preventDefault();

  if (!validarFormulario('form-editar')) return;

  const idComerciante = localStorage.getItem("idComerciante") || sessionStorage.getItem("idComerciante");
  if (!idComerciante) {
    console.warn("ID do comerciante não encontrado.");
    return;
  }

  const dadosAtualizados = {
    codigo: document.getElementById('edit-codigo').value,
    nome: document.getElementById('edit-nome').value,
    cnpj: document.getElementById('edit-cnpj').value,
    email: document.getElementById('edit-email').value,
    // CEP REMOVIDO
    telefone: document.getElementById('edit-telefone').value,
    endereco: document.getElementById('edit-endereco').value,
    produtos: Array.from(document.querySelectorAll('#edit-produtos-checkboxes input[name="produtos"]:checked'))
      .map(cb => cb.value),
    dataUltimaAtualizacao: obterDataLegivel(),
    idComerciante: idComerciante
  };

  const fornecedorId = document.getElementById('edit-id').value;

  firebase.database().ref('fornecedor/' + fornecedorId).update(dadosAtualizados)
    .then(() => {
      mostrarMensagem('Fornecedor atualizado com sucesso!', 'success');
      fecharModalEditar();
      registrarHistorico('Edição de fornecedor', `Fornecedor "${dadosAtualizados.nome}" atualizado.`);
    })
    .catch(error => {
      console.error('Erro ao atualizar fornecedor:', error);
      mostrarMensagem('Erro ao atualizar fornecedor', 'error');
    });
}

// Funções auxiliares
function pesquisarFornecedores() {
  aplicarOrdenacaoEFiltros();
}

function ordenarFornecedores() {
  ordenacaoAtual = elements.ordenarNome.value;
  aplicarOrdenacaoEFiltros();
}

function validarFormulario(formId) {
  let valido = true;
  const form = document.getElementById(formId);

  form.querySelectorAll('[required]').forEach(campo => {
    const errorElement = document.getElementById(campo.id + '-error');

    if (!campo.value.trim()) {
      campo.classList.add('is-invalid');
      if (errorElement) errorElement.style.display = 'block';
      valido = false;
    } else {
      campo.classList.remove('is-invalid');
      if (errorElement) errorElement.style.display = 'none';
    }
  });

  if (formId === 'form-adicionar' || formId === 'form-editar') {
    const cnpjField = form.querySelector('#cnpj, #edit-cnpj');
    if (cnpjField && cnpjField.value.trim()) {
      const cnpjError = document.getElementById(cnpjField.id + '-error');
      if (!validarCnpjCpf(cnpjField.value)) {
        cnpjField.classList.add('is-invalid');
        if (cnpjError) {
          cnpjError.textContent = 'CNPJ/CPF inválido';
          cnpjError.style.display = 'block';
        }
        valido = false;
      }
    }

    const emailField = form.querySelector('#email, #edit-email');
    if (emailField && emailField.value.trim()) {
      const emailError = document.getElementById(emailField.id + '-error');
      if (!validarEmail(emailField.value)) {
        emailField.classList.add('is-invalid');
        if (emailError) emailError.style.display = 'block';
        valido = false;
      }
    }

    const nomeField = form.querySelector('#nome, #edit-nome');
    if (nomeField && nomeField.value.trim()) {
      const nomeError = document.getElementById(nomeField.id + '-error');
      const nome = nomeField.value.trim();
      if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(nome) || nome.split(" ").length < 2) {
        nomeField.classList.add('is-invalid');
        if (nomeError) {
          nomeError.textContent = 'Nome inválido. Use apenas letras e espaços (mínimo 2 palavras).';
          nomeError.style.display = 'block';
        }
        valido = false;
      }
    }

    const telefoneField = form.querySelector('#telefone, #edit-telefone');
    if (telefoneField && telefoneField.value.trim()) {
      const telefoneError = document.getElementById(telefoneField.id + '-error');
      if (!validarTelefone(telefoneField.value)) {
        telefoneField.classList.add('is-invalid');
        if (telefoneError) {
          telefoneError.textContent = 'Formato inválido. Use (DDD) 99999-9999 ou (DDD) 9999-9999';
          telefoneError.style.display = 'block';
        }
        valido = false;
      }
    }
  }

  if (formId === 'form-adicionar' || formId === 'form-editar') {
    const produtosSelecionados = form.querySelectorAll('input[name="produtos"]:checked');
    if (produtosSelecionados.length === 0) {
      mostrarMensagem("Selecione pelo menos um produto fornecido.", "error");
      valido = false;
    }
  }

  return valido;
}

function aplicarMascaras() {
  const cnpjFields = document.querySelectorAll('#cnpj, #edit-cnpj');
  cnpjFields.forEach(field => {
    field.addEventListener('input', function (e) {
      let value = e.target.value.replace(/\D/g, '');

      if (value.length <= 11) {
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
      } else {
        value = value.replace(/^(\d{2})(\d)/, '$1.$2');
        value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
        value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
        value = value.replace(/(\d{4})(\d)/, '$1-$2');
      }

      e.target.value = value;
    });
  });

  const telefoneFields = document.querySelectorAll('#telefone, #edit-telefone');
  telefoneFields.forEach(field => {
    field.addEventListener('input', function (e) {
      let value = e.target.value.replace(/\D/g, '');

      if (value.length > 10) {
        value = value.replace(/^(\d{2})(\d)/, '($1) $2');
        value = value.replace(/(\d{5})(\d)/, '$1-$2');
      } else if (value.length > 6) {
        value = value.replace(/^(\d{2})(\d)/, '($1) $2');
        value = value.replace(/(\d{4})(\d)/, '$1-$2');
      }

      e.target.value = value;
    });
  });

  const nomeFields = document.querySelectorAll('#nome, #edit-nome');
  nomeFields.forEach(field => {
    field.addEventListener('input', function (e) {
      e.target.value = e.target.value.replace(/[^a-zA-ZÀ-ÿ\s]/g, '');
    });
  });
}

// Funções de validação
function validarCnpjCpf(valor) {
  const str = valor.replace(/[^\d]+/g, '');

  if (str.length === 11) {
    return validarCPF(str);
  } else if (str.length === 14) {
    return validarCNPJ(str);
  }
  return false;
}

function validarCPF(cpf) {
  cpf = cpf.replace(/[^\d]+/g, '');

  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  let add = 0;
  for (let i = 0; i < 9; i++) {
    add += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let rev = 11 - (add % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cpf.charAt(9))) return false;

  add = 0;
  for (let i = 0; i < 10; i++) {
    add += parseInt(cpf.charAt(i)) * (11 - i);
  }
  rev = 11 - (add % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cpf.charAt(10))) return false;

  return true;
}

function validarCNPJ(cnpj) {
  cnpj = cnpj.replace(/[^\d]+/g, '');

  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) {
    return false;
  }

  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  const digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) pos = 9;
  }

  let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
  if (resultado !== parseInt(digitos.charAt(0))) return false;

  tamanho = tamanho + 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) pos = 9;
  }

  resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
  if (resultado !== parseInt(digitos.charAt(1))) return false;

  return true;
}

function validarEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function validarTelefone(telefone) {
  const re = /^\(\d{2}\) \d{4,5}-\d{4}$/;
  return re.test(telefone);
}

function mostrarMensagem(texto, tipo = 'success') {
  const msg = document.createElement('div');
  msg.className = `mensagem-alerta ${tipo}`;
  msg.textContent = texto;
  document.body.appendChild(msg);

  setTimeout(() => msg.remove(), 3000);
}

//Exportar fornecedores
function exportarTodosFornecedores() {
  if (fornecedores.length === 0) {
    mostrarMensagem("Nenhum fornecedor para exportar.", "warning");
    return;
  }

  const dadosExportar = fornecedores.map(f => ({
    Código: f.codigo || '',
    Nome: f.nome || '',
    CNPJ_CPF: f.cnpj || '',
    Email: f.email || '',
    Telefone: f.telefone || '',
    Endereço: f.endereco || '',
    Produtos: Array.isArray(f.produtos) ? f.produtos.join(', ') : '',
    Data_Cadastro: f.dataCadastro || '',
    Última_Atualização: f.dataUltimaAtualizacao || ''
  }));

  const csv = Papa.unparse(dadosExportar, {
    quotes: true,
    delimiter: ";"
  });

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "fornecedores.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// --- SELEÇÃO MÚLTIPLA ---
function toggleSelecaoTodos() {
  const checkboxes = document.querySelectorAll('.selecionar-fornecedor');
  checkboxes.forEach(cb => cb.checked = elements.selecionarTodos.checked);
  atualizarAcoesMultiplas();
}

function atualizarSelecaoIndividual() {
  const todos = document.querySelectorAll('.selecionar-fornecedor');
  const marcados = document.querySelectorAll('.selecionar-fornecedor:checked');
  elements.selecionarTodos.checked = todos.length === marcados.length;
  atualizarAcoesMultiplas();
}

function atualizarAcoesMultiplas() {
  const selecionados = document.querySelectorAll('.selecionar-fornecedor:checked').length;
  elements.acoesMultiplas.style.display = selecionados > 0 ? 'flex' : 'none';
}

function excluirSelecionados() {
  const selecionados = Array.from(document.querySelectorAll('.selecionar-fornecedor:checked'));
  if (selecionados.length === 0) return;

  const firebaseKeys = selecionados.map(cb => cb.closest('tr').getAttribute('data-key'));
  
  firebaseKeys.forEach(key => {
    const fornecedor = fornecedores.find(f => f.firebaseKey === key);
    if (!fornecedor) return;
    
    firebase.database().ref('fornecedor/' + key).remove().then(() => {
      registrarHistorico('Exclusão de fornecedor', `Fornecedor "${fornecedor.nome}" excluído.`);
      excluirProdutosDoFornecedor(key);
    });
  });

  mostrarMensagem(`${selecionados.length} fornecedores excluídos com sucesso!`, 'success');
  elements.acoesMultiplas.style.display = 'none';
}

function exportarSelecionadosParaCSV() {
  const selecionados = Array.from(document.querySelectorAll('.selecionar-fornecedor:checked'));
  if (selecionados.length === 0) return;

  const firebaseKeys = selecionados.map(cb => cb.closest('tr').getAttribute('data-key'));
  const fornecedoresSelecionados = fornecedores.filter(f => firebaseKeys.includes(f.firebaseKey));

  const dadosExportar = fornecedoresSelecionados.map(f => ({
    Código: f.codigo || '',
    Nome: f.nome || '',
    CNPJ_CPF: f.cnpj || '',
    Email: f.email || '',
    Telefone: f.telefone || '',
    Endereço: f.endereco || '',
    Produtos: Array.isArray(f.produtos) ? f.produtos.join(', ') : '',
    Data_Cadastro: f.dataCadastro || '',
    Última_Atualização: f.dataUltimaAtualizacao || ''
  }));

  const csv = Papa.unparse(dadosExportar, {
    quotes: true,
    delimiter: ";"
  });

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "fornecedores_selecionados.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}