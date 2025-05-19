// Variáveis globais
let fornecedores = [];
let fornecedorParaExcluir = null;
const modalExcluir = new bootstrap.Modal(document.getElementById('modal-excluir'));
let proximoCodigo = 1; // Variável para gerar códigos sequenciais

// DOM Elements
const elements = {
    tabelaFornecedores: document.getElementById('tabela-fornecedores'),
    pesquisarFornecedor: document.getElementById('pesquisar-fornecedor'),
    nomeFornecedorExcluir: document.getElementById('nome-fornecedor-excluir'),
    filtrosContainer: document.getElementById('filtros-container'),
    ordenarNome: document.getElementById('ordenar-nome')
};

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
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
    
    // Renderizar tabela
    renderizarTabela();
});

// Funções para abrir/fechar modais
function mostrarModalAdicionar() {
    document.getElementById('form-adicionar').reset();
    // Gerar código sequencial para novo fornecedor
    document.getElementById('codigo').value = proximoCodigo.toString().padStart(3, '0');
    document.getElementById('modal-adicionar').style.display = 'flex';
}

function fecharModalAdicionar() {
    document.getElementById('modal-adicionar').style.display = 'none';
}

function mostrarModalEditar(id) {
    const fornecedor = fornecedores.find(f => f.id === id);
    if (!fornecedor) return;
    
    document.getElementById('edit-id').value = fornecedor.id;
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
}

function mostrarModalVisualizar(id) {
    const fornecedor = fornecedores.find(f => f.id === id);
    if (!fornecedor) return;
    
    // Preencher os dados do fornecedor
    document.getElementById('view-codigo').textContent = fornecedor.codigo || 'Não informado';
    document.getElementById('view-nome').textContent = fornecedor.nome || 'Não informado';
    document.getElementById('view-cnpj').textContent = fornecedor.cnpj || 'Não informado';
    document.getElementById('view-email').textContent = fornecedor.email || 'Não informado';
    document.getElementById('view-cep').textContent = fornecedor.cep || 'Não informado';
    document.getElementById('view-telefone').textContent = fornecedor.telefone || 'Não informado';
    document.getElementById('view-endereco').textContent = fornecedor.endereco || 'Não informado';
    
    // Traduzir o valor dos produtos
    const produtos = {
        '1': 'Frutas',
        '2': 'Verduras',
        '3': 'Legumes'
    };
    document.getElementById('view-produtos').textContent = fornecedor.produtos ? produtos[fornecedor.produtos] : 'Não informado';
    
    document.getElementById('modal-visualizar').style.display = 'flex';
}

function fecharModalVisualizar() {
    document.getElementById('modal-visualizar').style.display = 'none';
}

function mostrarModalExclusao(id, nome) {
    fornecedorParaExcluir = id;
    elements.nomeFornecedorExcluir.textContent = nome;
    modalExcluir.show();
}

// Funções de renderização
function renderizarTabela(fornecedoresParaRenderizar = fornecedores) {
    elements.tabelaFornecedores.innerHTML = '';
    
    if (fornecedoresParaRenderizar.length === 0) {
        elements.tabelaFornecedores.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-3 text-muted">
                    Nenhum fornecedor cadastrado
                </td>
            </tr>
        `;
        return;
    }
    
    fornecedoresParaRenderizar.forEach(fornecedor => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${fornecedor.codigo || ''}</td>
            <td>${fornecedor.cnpj || ''}</td>
            <td>${fornecedor.nome || ''}</td>
            <td>${fornecedor.telefone || ''}</td>
            <td class="text-center">
                <i class="fas fa-search text-muted cursor-pointer btn-visualizar" data-id="${fornecedor.id}"></i>
            </td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-primary btn-editar me-1" data-id="${fornecedor.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger btn-excluir" data-id="${fornecedor.id}" data-nome="${fornecedor.nome}">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        elements.tabelaFornecedores.appendChild(tr);
    });
    
    // Adicionar event listeners aos botões
    document.querySelectorAll('.btn-editar').forEach(btn => {
        btn.addEventListener('click', () => mostrarModalEditar(parseInt(btn.dataset.id)));
    });
    
    document.querySelectorAll('.btn-excluir').forEach(btn => {
        btn.addEventListener('click', () => mostrarModalExclusao(
            parseInt(btn.dataset.id), 
            btn.dataset.nome
        ));
    });
    
    document.querySelectorAll('.btn-visualizar').forEach(btn => {
        btn.addEventListener('click', () => mostrarModalVisualizar(parseInt(btn.dataset.id)));
    });
}

// Funções CRUD
function confirmarExclusao() {
    if (fornecedorParaExcluir) {
        fornecedores = fornecedores.filter(f => f.id !== fornecedorParaExcluir);
        renderizarTabela();
        fornecedorParaExcluir = null;
        modalExcluir.hide();
    }
}

function salvarFornecedor(e) {
    e.preventDefault();
    
    if (!validarFormulario('form-adicionar')) return;
    
    const novoFornecedor = {
        id: fornecedores.length > 0 ? Math.max(...fornecedores.map(f => f.id)) + 1 : 1,
        codigo: document.getElementById('codigo').value,
        nome: document.getElementById('nome').value,
        cnpj: document.getElementById('cnpj').value,
        email: document.getElementById('email').value,
        cep: document.getElementById('cep').value,
        telefone: document.getElementById('telefone').value,
        endereco: document.getElementById('endereco').value,
        produtos: document.getElementById('produtos').value
    };
    
    fornecedores.push(novoFornecedor);
    proximoCodigo++; // Incrementa o código para o próximo fornecedor
    renderizarTabela();
    fecharModalAdicionar();
}

function atualizarFornecedor(e) {
    e.preventDefault();
    
    if (!validarFormulario('form-editar')) return;
    
    const id = parseInt(document.getElementById('edit-id').value);
    const index = fornecedores.findIndex(f => f.id === id);
    
    if (index !== -1) {
        fornecedores[index] = {
            id: id,
            codigo: document.getElementById('edit-codigo').value, // Mantém o código original
            nome: document.getElementById('edit-nome').value,
            cnpj: document.getElementById('edit-cnpj').value,
            email: document.getElementById('edit-email').value,
            cep: document.getElementById('edit-cep').value,
            telefone: document.getElementById('edit-telefone').value,
            endereco: document.getElementById('edit-endereco').value,
            produtos: document.getElementById('edit-produtos').value
        };
        
        renderizarTabela();
        fecharModalEditar();
    }
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