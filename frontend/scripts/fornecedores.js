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
let ordenacaoAtual = ''; // Adicionado para controlar a ordenação atual

// DOM Elements
const elements = {
    tabelaFornecedores: document.getElementById('tabela-fornecedores'),
    pesquisarFornecedor: document.getElementById('pesquisar-fornecedor'),
    nomeFornecedorExcluir: document.getElementById('nome-fornecedor-excluir'),
    filtrosContainer: document.getElementById('filtros-container'),
    ordenarNome: document.getElementById('ordenar-nome'),
    filtrarTipo: document.getElementById('filtrar-tipo')
};

// Registrar ação no histórico
function registrarHistorico(tipo, descricao) {
    firebase.database().ref('historicoAcoes').push({
        tipo,
        descricao,
        data: new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    });
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
    elements.filtrarTipo.addEventListener('change', () => aplicarOrdenacaoEFiltros());

    // Toggle para mostrar/ocultar filtros
    document.querySelector('.filter').addEventListener('click', function () {
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
        aplicarOrdenacaoEFiltros();
    });
}

// Função para aplicar ordenação e filtros juntos
function aplicarOrdenacaoEFiltros() {
    let filtrados = [...fornecedores];
    const tipoFiltro = elements.filtrarTipo.value;
    const termoPesquisa = elements.pesquisarFornecedor.value.toLowerCase();

    // Aplicar filtro por tipo (CPF/CNPJ)
    if (tipoFiltro === 'cpf') {
        filtrados = filtrados.filter(f => f.cnpj && f.cnpj.replace(/\D/g, '').length === 11);
    } else if (tipoFiltro === 'cnpj') {
        filtrados = filtrados.filter(f => f.cnpj && f.cnpj.replace(/\D/g, '').length === 14);
    }

    // Aplicar pesquisa se houver termo
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

    document.getElementById('view-codigo').textContent = fornecedor.codigo || 'Não informado';
    document.getElementById('view-nome').textContent = fornecedor.nome || 'Não informado';
    document.getElementById('view-cnpj').textContent = fornecedor.cnpj || 'Não informado';
    document.getElementById('view-email').textContent = fornecedor.email || 'Não informado';
    document.getElementById('view-cep').textContent = fornecedor.cep || 'Não informado';
    document.getElementById('view-telefone').textContent = fornecedor.telefone || 'Não informado';
    document.getElementById('view-endereco').textContent = fornecedor.endereco || 'Não informado';
    document.getElementById('view-dataCadastro').textContent = fornecedor.dataCadastro ? formatarData(fornecedor.dataCadastro) : 'Não informado';
    document.getElementById('view-dataAtualizacao').textContent = fornecedor.dataUltimaAtualizacao ? formatarData(fornecedor.dataUltimaAtualizacao) : 'Não informado';

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
                    Nenhum fornecedor encontrado
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
        const fornecedorRef = firebase.database().ref('fornecedor/' + fornecedorParaExcluir);

        fornecedorRef.once('value').then(snapshot => {
            const fornecedor = snapshot.val();
            const nomeFornecedor = fornecedor?.nome;

            return fornecedorRef.remove().then(() => {
                mostrarMensagem('Fornecedor excluído com sucesso!', 'success');
                modalExcluir.hide();
                registrarHistorico('Exclusão de fornecedor', `Fornecedor "${nomeFornecedor}" foi excluído.`);
                excluirProdutosDoFornecedor(fornecedorParaExcluir);
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
            if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(nomeField.value)) {
                nomeField.classList.add('is-invalid');
                if (nomeError) {
                    nomeError.textContent = 'Nome deve conter apenas letras e espaços';
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

    const cepFields = document.querySelectorAll('#cep, #edit-cep');
    cepFields.forEach(field => {
        field.addEventListener('input', function (e) {
            let value = e.target.value.replace(/\D/g, '');
            value = value.replace(/^(\d{5})(\d)/, '$1-$2');
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