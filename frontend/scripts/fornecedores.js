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

// DOM Elements
const elements = {
    tabelaFornecedores: document.getElementById('tabela-fornecedores'),
    pesquisarFornecedor: document.getElementById('pesquisar-fornecedor'),
    nomeFornecedorExcluir: document.getElementById('nome-fornecedor-excluir'),
    filtrosContainer: document.getElementById('filtros-container'),
    ordenarNome: document.getElementById('ordenar-nome')
};

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
  
  // Garante que a data é válida
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
    
    // Toggle para mostrar/ocultar filtros
    document.querySelector('.filter').addEventListener('click', function() {
        if (elements.filtrosContainer.style.display === 'none') {
            elements.filtrosContainer.style.display = 'flex';
        } else {
            elements.filtrosContainer.style.display = 'none';
        }
    });
    
    // Formulários
    document.getElementById('form-adicionar').addEventListener('submit', salvarFornecedor);
    document.getElementById('form-editar').addEventListener('submit', atualizarFornecedor);
    
    // Máscaras e validações
    aplicarMascaras();
});

// Carregar fornecedores do Firebase
function carregarFornecedoresDoFirebase() {
  firebase.database().ref('fornecedor').on('value', (snapshot) => {
    fornecedores = [];
    snapshot.forEach((childSnapshot) => {
      const fornecedor = childSnapshot.val();
      fornecedor.firebaseKey = childSnapshot.key;
      fornecedores.push(fornecedor);
      
      // Atualizar próximo código disponível
      if (fornecedor.codigo) {
        const numCodigo = parseInt(fornecedor.codigo.replace(/\D/g, ''));
        if (numCodigo >= proximoCodigo) {
          proximoCodigo = numCodigo + 1;
        }
      }
    });
    renderizarTabela();
  });
}

// Funções para abrir/fechar modais
function mostrarModalAdicionar() {
    document.getElementById('form-adicionar').reset();
    // Gerar código sequencial para novo fornecedor
    document.getElementById('codigo').value = proximoCodigo.toString().padStart(3, '0');
    document.getElementById('modal-adicionar').style.display = 'flex';
    fornecedorParaEditar = null;
}

function fecharModalAdicionar() {
    document.getElementById('modal-adicionar').style.display = 'none';
}

function mostrarModalEditar(key) {
    const fornecedor = fornecedores.find(f => f.firebaseKey === key);
    if (!fornecedor) return;
    
    fornecedorParaEditar = fornecedor;
    
    document.getElementById('edit-id').value = fornecedor.firebaseKey;
    document.getElementById('edit-codigo').value = fornecedor.codigo || '';
    document.getElementById('edit-nome').value = fornecedor.nome || '';
    document.getElementById('edit-cnpj').value = fornecedor.cnpj || '';
    document.getElementById('edit-email').value = fornecedor.email || '';
    document.getElementById('edit-cep').value = fornecedor.cep || '';
    document.getElementById('edit-telefone').value = fornecedor.telefone || '';
    document.getElementById('edit-endereco').value = fornecedor.endereco || '';
    document.getElementById('edit-produtos').value = fornecedor.produtos || '';
    
    document.getElementById('modal-editar').style.display = 'flex';
}

function fecharModalEditar() {
    document.getElementById('modal-editar').style.display = 'none';
    fornecedorParaEditar = null;
}

function mostrarModalVisualizar(key) {
    const fornecedor = fornecedores.find(f => f.firebaseKey === key);
    if (!fornecedor) return;
    
    // Preencher os dados do fornecedor
    document.getElementById('view-codigo').textContent = fornecedor.codigo || 'Não informado';
    document.getElementById('view-nome').textContent = fornecedor.nome || 'Não informado';
    document.getElementById('view-cnpj').textContent = fornecedor.cnpj || 'Não informado';
    document.getElementById('view-email').textContent = fornecedor.email || 'Não informado';
    document.getElementById('view-cep').textContent = fornecedor.cep || 'Não informado';
    document.getElementById('view-telefone').textContent = fornecedor.telefone || 'Não informado';
    document.getElementById('view-endereco').textContent = fornecedor.endereco || 'Não informado';
    document.getElementById('view-dataCadastro').textContent = fornecedor.dataCadastro ? formatarData(fornecedor.dataCadastro) : 'Não informado';
    document.getElementById('view-dataAtualizacao').textContent = fornecedor.dataUltimaAtualizacao ? formatarData(fornecedor.dataUltimaAtualizacao) : 'Não informado';
    
    // Traduzir o valor dos produtos
    const produtos = {
        'frutas': 'Frutas',
        'legumes': 'Legumes',
        'vegetais': 'Vegetais',
        'verduras': 'Verduras',
        'temperos': 'Temperos',
        'laticínios': 'Laticínios',
        'doces': 'Doces',
        'salgados': 'Salgados',
        'carnes': 'Carnes',
        'grãos': 'Grãos',
        'bebidas': 'Bebidas',
        'outros': 'Outros'
    };
    document.getElementById('view-produtos').textContent = fornecedor.produtos ? produtos[fornecedor.produtos] || fornecedor.produtos : 'Não informado';
    
    document.getElementById('modal-visualizar').style.display = 'flex';
}

function fecharModalVisualizar() {
    document.getElementById('modal-visualizar').style.display = 'none';
}

function mostrarModalExclusao(key, nome) {
    fornecedorParaExcluir = key;
    elements.nomeFornecedorExcluir.textContent = nome;
    modalExcluir.show();
}

// Funções de renderização
function renderizarTabela(fornecedoresParaRenderizar = fornecedores) {
    elements.tabelaFornecedores.innerHTML = '';
    
    if (fornecedoresParaRenderizar.length === 0) {
        elements.tabelaFornecedores.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-3 text-muted">
                    Nenhum fornecedor cadastrado
                </td>
            </tr>
        `;
        return;
    }
    
    fornecedoresParaRenderizar.forEach(fornecedor => {
        const tr = document.createElement('tr');
        tr.setAttribute('data-key', fornecedor.firebaseKey);
        tr.innerHTML = `
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
        
        // Adiciona event listeners
        tr.querySelector('.btn-visualizar').addEventListener('click', () => 
            mostrarModalVisualizar(fornecedor.firebaseKey));
            
        tr.querySelector('.btn-editar').addEventListener('click', () => 
            mostrarModalEditar(fornecedor.firebaseKey));
            
        tr.querySelector('.btn-excluir').addEventListener('click', () => 
            mostrarModalExclusao(fornecedor.firebaseKey, fornecedor.nome));
        
        elements.tabelaFornecedores.appendChild(tr);
    });
}

// Funções CRUD
function confirmarExclusao() {
    if (fornecedorParaExcluir) {
        firebase.database().ref('fornecedor/' + fornecedorParaExcluir).remove()
            .then(() => {
                mostrarMensagem('Fornecedor excluído com sucesso!', 'success');
                modalExcluir.hide();
                fornecedorParaExcluir = null;
            })
            .catch(error => {
                console.error('Erro ao excluir fornecedor:', error);
                mostrarMensagem('Erro ao excluir fornecedor', 'error');
            });
    }
}

function salvarFornecedor(e) {
    e.preventDefault();
    
    if (!validarFormulario('form-adicionar')) return;
    
    const novoFornecedor = {
        codigo: document.getElementById('codigo').value,
        nome: document.getElementById('nome').value,
        cnpj: document.getElementById('cnpj').value,
        email: document.getElementById('email').value,
        cep: document.getElementById('cep').value,
        telefone: document.getElementById('telefone').value,
        endereco: document.getElementById('endereco').value,
        produtos: document.getElementById('produtos').value,
        dataCadastro: obterDataLegivel(),
        dataUltimaAtualizacao: obterDataLegivel()
    };
    
    if (fornecedorParaEditar) {
        // Atualizar fornecedor existente
        firebase.database().ref('fornecedor/' + fornecedorParaEditar.firebaseKey).update(novoFornecedor)
            .then(() => {
                mostrarMensagem('Fornecedor atualizado com sucesso!', 'success');
                fecharModalAdicionar();
                fornecedorParaEditar = null;
            })
            .catch(error => {
                console.error('Erro ao atualizar fornecedor:', error);
                mostrarMensagem('Erro ao atualizar fornecedor', 'error');
            });
    } else {
        // Criar novo fornecedor
        firebase.database().ref('fornecedor').push(novoFornecedor)
            .then(() => {
                mostrarMensagem('Fornecedor cadastrado com sucesso!', 'success');
                fecharModalAdicionar();
                proximoCodigo++;
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
    
    const dadosAtualizados = {
        codigo: document.getElementById('edit-codigo').value,
        nome: document.getElementById('edit-nome').value,
        cnpj: document.getElementById('edit-cnpj').value,
        email: document.getElementById('edit-email').value,
        cep: document.getElementById('edit-cep').value,
        telefone: document.getElementById('edit-telefone').value,
        endereco: document.getElementById('edit-endereco').value,
        produtos: document.getElementById('edit-produtos').value,
        dataUltimaAtualizacao: obterDataLegivel()
    };
    
    const fornecedorId = document.getElementById('edit-id').value;
    
    firebase.database().ref('fornecedor/' + fornecedorId).update(dadosAtualizados)
        .then(() => {
            mostrarMensagem('Fornecedor atualizado com sucesso!', 'success');
            fecharModalEditar();
        })
        .catch(error => {
            console.error('Erro ao atualizar fornecedor:', error);
            mostrarMensagem('Erro ao atualizar fornecedor', 'error');
        });
}

// Funções auxiliares
function pesquisarFornecedores() {
    const termo = elements.pesquisarFornecedor.value.toLowerCase();
    
    if (!termo) {
        renderizarTabela();
        return;
    }
    
    const resultados = fornecedores.filter(fornecedor => 
        (fornecedor.nome && fornecedor.nome.toLowerCase().includes(termo)) || 
        (fornecedor.cnpj && fornecedor.cnpj.includes(termo)) ||
        (fornecedor.codigo && fornecedor.codigo.includes(termo))
    );
    
    renderizarTabela(resultados);
}

function ordenarFornecedores() {
    const ordenacao = elements.ordenarNome.value;
    let fornecedoresOrdenados = [...fornecedores];
    
    switch(ordenacao) {
        case 'az':
            fornecedoresOrdenados.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
            break;
        case 'za':
            fornecedoresOrdenados.sort((a, b) => (b.nome || '').localeCompare(a.nome || ''));
            break;
        default:
            // Mantém a ordenação original
            break;
    }
    
    renderizarTabela(fornecedoresOrdenados);
}


document.getElementById('filtrar-tipo').addEventListener('change', function () {
  const tipoSelecionado = this.value;
  aplicarFiltroTipo(tipoSelecionado);
});

function aplicarFiltroTipo(tipo) {
  let filtrados = [...fornecedores];

  if (tipo === 'cpf') {
    filtrados = filtrados.filter(f => f.cnpj && f.cnpj.replace(/\D/g, '').length === 11);
  } else if (tipo === 'cnpj') {
    filtrados = filtrados.filter(f => f.cnpj && f.cnpj.replace(/\D/g, '').length === 14);
  }

  renderizarTabela(filtrados);
}

function validarFormulario(formId) {
    let valido = true;
    const form = document.getElementById(formId);
    
    // Validar campos obrigatórios
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
    
    // Validações específicas
    if (formId === 'form-adicionar' || formId === 'form-editar') {
        // Validar CNPJ/CPF
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
        
        // Validar e-mail
        const emailField = form.querySelector('#email, #edit-email');
        if (emailField && emailField.value.trim()) {
            const emailError = document.getElementById(emailField.id + '-error');
            if (!validarEmail(emailField.value)) {
                emailField.classList.add('is-invalid');
                if (emailError) emailError.style.display = 'block';
                valido = false;
            }
        }
        
        // Validar nome (apenas letras e espaços)
        const nomeField = form.querySelector('#nome, #edit-nome');
        if (nomeField && nomeField.value.trim()) {
            const nomeError = document.getElementById(nomeField.id + '-error');
            if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(nomeField.value)) {
                nomeField.classList.add('is-invalid');
                if (nomeError) {
                    nomeError.textContent = 'Nome deve conter apenas letras e espaços';
                    nomeError.style.display = 'block';
                }
                valido = false;
            }
        }
        
        // Validar telefone
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
    
    return valido;
}

function aplicarMascaras() {
    // Máscara para CNPJ/CPF
    const cnpjFields = document.querySelectorAll('#cnpj, #edit-cnpj');
    cnpjFields.forEach(field => {
        field.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            
            if (value.length <= 11) { // CPF
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            } else { // CNPJ
                value = value.replace(/^(\d{2})(\d)/, '$1.$2');
                value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
                value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
                value = value.replace(/(\d{4})(\d)/, '$1-$2');
            }
            
            e.target.value = value;
        });
    });
    
    // Máscara para CEP
    const cepFields = document.querySelectorAll('#cep, #edit-cep');
    cepFields.forEach(field => {
        field.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            value = value.replace(/^(\d{5})(\d)/, '$1-$2');
            e.target.value = value;
        });
    });
    
    // Máscara para telefone (com DDD e 9º dígito ou sem 9º dígito)
    const telefoneFields = document.querySelectorAll('#telefone, #edit-telefone');
    telefoneFields.forEach(field => {
        field.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            
            if (value.length > 10) { // Com DDD e 9º dígito (celular)
                value = value.replace(/^(\d{2})(\d)/, '($1) $2');
                value = value.replace(/(\d{5})(\d)/, '$1-$2');
            } else if (value.length > 6) { // Com DDD (telefone fixo)
                value = value.replace(/^(\d{2})(\d)/, '($1) $2');
                value = value.replace(/(\d{4})(\d)/, '$1-$2');
            }
            
            e.target.value = value;
        });
    });
    
    // Validar apenas letras e espaços no nome
    const nomeFields = document.querySelectorAll('#nome, #edit-nome');
    nomeFields.forEach(field => {
        field.addEventListener('input', function(e) {
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
    
    // Elimina CPFs invalidos conhecidos
    if (cpf.length !== 11 || 
        /^(\d)\1{10}$/.test(cpf)) {
        return false;
    }
    
    // Valida 1o digito
    let add = 0;
    for (let i = 0; i < 9; i++) {
        add += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let rev = 11 - (add % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(cpf.charAt(9))) return false;
    
    // Valida 2o digito
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
    
    // Elimina CNPJs invalidos conhecidos
    if (cnpj.length !== 14 || 
        /^(\d)\1{13}$/.test(cnpj)) {
        return false;
    }
    
    // Valida DVs
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
    // Valida formatos: (DDD) 99999-9999 ou (DDD) 9999-9999
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
