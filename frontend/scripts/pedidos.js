let tipoAtual = 'entrada';
let editando = false;
let indiceParaEditar = null;
let firebaseKeyParaExcluir = null;
let itemCounter = 0;
let paginaAtual = 1;
let quantidadeMaxima = null;
const itensPorPagina = 10;
const pedidos = [];

document.addEventListener('DOMContentLoaded', () => {
    carregarPedidosDoFirebase();
    configurarEventosPedidos();

    document.getElementById('button-entradas').addEventListener('click', () => alternarTipo('entrada'));
    document.getElementById('button-saidas').addEventListener('click', () => alternarTipo('saida'));

    document.getElementById('btnAbrirModal').addEventListener('click', exibirModal);
    document.getElementById('cancelarModal').addEventListener('click', fecharModal);
    document.getElementById('cancelarModalSaida').addEventListener('click', fecharModal);

    document.getElementById('fecharVisualizar').addEventListener('click', fecharModalVisualizar);
    document.getElementById('fecharVisualizarItens').addEventListener('click', fecharModalVisualizarItens);

    document.getElementById('nomeAdicionar').addEventListener('change', (e) => handleFornecedorChange(e, 'entrada'));
    document.getElementById('nomeAdicionarSaida').addEventListener('change', (e) => handleFornecedorChange(e, 'saida'));

    document.querySelectorAll('.adicionar-mais-item').forEach(botao => {
        botao.addEventListener('click', adicionarNovoItemPedido);
    });

    document.querySelectorAll('.itens-pedido-container').forEach(container => {
        container.addEventListener('change', (e) => {
            if (e.target.classList.contains('produto-select')) {
                const itemDiv = e.target.closest('.item-pedido');
                const quantidadeInput = itemDiv.querySelector('.quantidade-input');
                const subtotalInput = itemDiv.querySelector('.subtotal-input');
                const spanUnidade = itemDiv.querySelector('.unidade-medida');
                const produtoId = e.target.value;

                buscarProdutoPorId(produtoId)
                    .then(produto => {
                        if (produto && produto.preco) {
                            quantidadeInput.disabled = false;
                            quantidadeMaxima = (tipoAtual === 'saida') ? parseInt(produto.quantidadeEstoque || 0) : null;
                            spanUnidade.textContent = produto.unidadeMedida || '—';
                            calcularSubtotalItem(itemDiv);
                        } else {
                            quantidadeMaxima = null;
                            quantidadeInput.disabled = false;
                            subtotalInput.value = '0,00';
                            spanUnidade.textContent = '—';
                        }
                        atualizarProdutosDisponiveis(itemDiv.closest('.modal'));
                    })
                    .catch(error => {
                        console.error('Erro ao buscar preço do produto:', error);
                    });
            }

        });

        container.addEventListener('input', (e) => {
            if (e.target.classList.contains('quantidade-input')) {
                const itemDiv = e.target.closest('.item-pedido');
                const quantidadeInput = e.target;
                const quantidade = parseInt(quantidadeInput.value);

                if (tipoAtual === 'saida' && quantidadeMaxima !== null && quantidade > quantidadeMaxima) {
                    quantidadeInput.value = quantidadeMaxima;
                    mostrarMensagem(`Quantidade máxima disponível: ${quantidadeMaxima}`);
                }

                calcularSubtotalItem(itemDiv);
            }
        });
    });

    document.getElementById('btnFecharPedido').addEventListener('click', handlePedidoSubmit);
    document.getElementById('btnFecharPedidoSaida').addEventListener('click', handlePedidoSubmit);
});

function alternarTipo(tipo) {
    tipoAtual = tipo;

    const isEntrada = tipo === 'entrada';

    document.getElementById('tabela-entradas').style.display = isEntrada ? 'table' : 'none';
    document.getElementById('tabela-saidas').style.display = isEntrada ? 'none' : 'table';

    const btnEntradas = document.getElementById('button-entradas');
    const btnSaidas = document.getElementById('button-saidas');

    btnEntradas.classList.toggle('btn-ativo-verde', isEntrada);
    btnEntradas.classList.toggle('btn-inativo-verde', !isEntrada);

    btnSaidas.classList.toggle('btn-ativo-vermelho', !isEntrada);
    btnSaidas.classList.toggle('btn-inativo-vermelho', isEntrada);

    document.getElementById('tipo_titulo').textContent = isEntrada ? '/ Fornecedor' : '/ Cliente';

    carregarPedidosDoFirebase();
}

function exibirModal() {
    editando = false;
    indiceParaEditar = null;
    itemCounter = 0;

    const isEntrada = tipoAtual === 'entrada';
    const prefixo = isEntrada ? '' : 'Saida';

    document.getElementById(`titulo-modal-${isEntrada ? 'pedido' : 'saida'}`).textContent = 'Pedido';
    document.getElementById(isEntrada ? 'numeroEntrada' : 'numeroSaida').textContent = gerarCodigoPedido();
    document.getElementById(`totalAdicionar${prefixo}`).textContent = "0,00";

    const nome = document.getElementById(`nomeAdicionar${prefixo}`);
    if (nome.tagName === 'SELECT') {
        nome.selectedIndex = 0;
        carregarFornecedores();
    } else {
        nome.value = '';
    }

    const container = isEntrada
        ? document.querySelector('#modal-entrada .itens-pedido-container')
        : document.getElementById('container-itens-saida');
    container.querySelectorAll('.item-pedido-dinamico').forEach(el => el.remove());

    adicionarNovoItemPedido({ preventDefault: () => { }, target: document.querySelector(`#modal-${tipoAtual} .modal-content`) });

    document.getElementById(`modal-${tipoAtual}`).style.display = 'flex';
}

function fecharModal() {
    document.getElementById(`modal-${tipoAtual}`).style.display = 'none';
}

function fecharModalVisualizar() {
    document.getElementById('modal-visualizar').style.display = 'none';
}

function fecharModalVisualizarItens() {
    document.getElementById('modal-visualizar-itens').style.display = 'none';
}

function adicionarNovoItemPedido(e) {
    e.preventDefault();

    itemCounter++;

    const modal = e.target.closest('.modal-content');

    const container = modal.querySelector('.itens-pedido-container');
    const originalItem = modal.querySelector('.item-pedido-modelo');
    const newItem = originalItem.cloneNode(true);

    newItem.classList.remove('item-pedido-modelo');
    newItem.classList.add('item-pedido-dinamico');
    newItem.style.display = 'block';
    newItem.setAttribute('data-item-id', itemCounter);

    const selectProduto = newItem.querySelector('select.produto-select');
    const inputQuantidade = newItem.querySelector('input.quantidade-input');
    const inputSubtotal = newItem.querySelector('input.subtotal-input');
    const selectUnidade = newItem.querySelector('.unidade-medida');

    selectProduto.name = `produto_${itemCounter}`;
    selectProduto.selectedIndex = 0;

    inputQuantidade.name = `quantidade_${itemCounter}`;
    inputQuantidade.value = 1;

    selectUnidade.textContent = '—';

    const fornecedorSelect = modal.querySelector('.fornecedor-select');
    const fornecedorSelecionado = fornecedorSelect && fornecedorSelect.value;

    selectProduto.disabled = !fornecedorSelecionado;
    inputQuantidade.disabled = !fornecedorSelecionado;

    inputSubtotal.name = `subtotal_${itemCounter}`;
    inputSubtotal.value = '0,00';

    if (itemCounter > 1) {
        const btnRemover = newItem.querySelector('.botao-remover-item');
        btnRemover.style.display = 'inline-block';
        btnRemover.addEventListener('click', () => {
            newItem.remove();
            atualizarTotalPedido();
            itemCounter--;
        });
    }
    container.appendChild(newItem);
}

function carregarPedidosDoFirebase() {
    const idComerciante = localStorage.getItem("idComerciante") || sessionStorage.getItem("idComerciante");
    if (!idComerciante) {
        console.warn("ID do comerciante não encontrado. Redirecionando para login.");
        window.location.href = "login.html";
        return;
    }

    firebase.database().ref('pedido').once('value').then(snapshot => {
        pedidos.length = 0;
        snapshot.forEach(childSnapshot => {
            const pedido = childSnapshot.val();
            pedido.firebaseKey = childSnapshot.key;

            if (pedido.idComerciante === idComerciante) {
                pedidos.push(pedido);
            }
        });
        atualizarTabelaPedidos();
    });
}

function carregarFornecedores() {
    const select = document.getElementById('nomeAdicionar');
    select.innerHTML = '<option value="" selected disabled>Selecione...</option>';

    const idComerciante = localStorage.getItem("idComerciante") || sessionStorage.getItem("idComerciante");

    if (!idComerciante) {
        console.warn("ID do comerciante não encontrado. Redirecionando para login.");
        window.location.href = "login.html";
        return;
    }

    const fornecedoresRef = firebase.database().ref('fornecedor');

    fornecedoresRef.orderByChild('idComerciante').equalTo(idComerciante).once('value')
        .then(snapshot => {
            snapshot.forEach(childSnapshot => {
                const fornecedor = childSnapshot.val();
                const option = document.createElement('option');
                option.value = childSnapshot.key; // ID do fornecedor
                option.textContent = fornecedor.nome; // Nome visível
                select.appendChild(option);
            });
        })
        .catch(error => {
            console.error("Erro ao carregar fornecedores:", error);
        });
}

function carregarProdutos(fornecedorId = null, container = document) {
    const selects = container.querySelectorAll('.produto-select');

    selects.forEach(select => {
        select.innerHTML = '<option value="" selected disabled>Selecione...</option>';
        select.disabled = true;
    });

    const idComerciante = localStorage.getItem("idComerciante") || sessionStorage.getItem("idComerciante");

    if (!idComerciante) {
        console.warn("ID do comerciante não encontrado. Redirecionando para login.");
        window.location.href = "login.html";
        return;
    }

    return firebase.database().ref('produto').once('value')
        .then(snapshot => {
            const produtos = snapshot.val();
            const opcoes = [];

            Object.entries(produtos).forEach(([key, produto]) => {
                const pertenceAoComerciante = produto.idComerciante === idComerciante;
                const correspondeAoFornecedor = fornecedorId ? produto.fornecedorId === fornecedorId : true;

                if (pertenceAoComerciante && correspondeAoFornecedor) {
                    opcoes.push({ id: key, nome: produto.nome, preco: produto.preco });
                }
            });

            selects.forEach(select => {
                opcoes.forEach(produto => {
                    const option = document.createElement('option');
                    option.value = produto.id;
                    option.dataset.preco = produto.preco;
                    option.textContent = produto.nome;
                    select.appendChild(option);
                });
                select.disabled = false;
            });
        })
        .catch(error => {
            console.error("Erro ao carregar produtos:", error);
        });
}

function atualizarProdutosDisponiveis(container = document) {
    const selects = Array.from(container.querySelectorAll('.produto-select'));
    const selecionados = selects.map(sel => sel.value).filter(v => v);

    selects.forEach(select => {
        const atual = select.value;
        Array.from(select.options).forEach(option => {
            option.disabled = selecionados.includes(option.value) && option.value !== atual;
        });
    });
}

function handleFornecedorChange(e, tipo = 'entrada') {
    const container = e.target.closest('.modal-content');
    const itensContainer = container.querySelector('.itens-pedido-container');
    const produtoSelect = container.querySelector('.produto-select');
    const quantidadeInput = container.querySelector('.quantidade-input');

    const itensDinamicos = itensContainer.querySelectorAll('.item-pedido-dinamico');
    itensDinamicos.forEach(item => item.remove());

    itemCounter = 0;
    adicionarNovoItemPedido({ preventDefault: () => { }, target: document.querySelector(`#modal-${tipoAtual} .modal-content`) });

    produtoSelect.disabled = false;
    quantidadeInput.disabled = false;

    if (tipo === 'entrada') {
        const fornecedorId = e.target.value;
        carregarProdutos(fornecedorId, container);
    } else if (tipo === 'saida') {
        carregarProdutos(null, container);
    }
}

function gerarCodigoPedido() {
    let novoCodigo;
    do {
        novoCodigo = 'PED-' + Math.floor(10000 + Math.random() * 90000);
    } while (pedidos.some(p => p.codigo === novoCodigo));
    return novoCodigo;
}

function calcularSubtotalItem(itemDiv) {
    const selectProduto = itemDiv.querySelector('.produto-select');
    const quantidadeInput = itemDiv.querySelector('.quantidade-input');
    const subtotalInput = itemDiv.querySelector('.subtotal-input');

    const quantidade = parseFloat(quantidadeInput.value) || 0;
    const idProduto = selectProduto.value;

    buscarProdutoPorId(idProduto).then(produto => {
        if (produto && produto.preco) {
            const subtotal = calcularSubtotalComConversao(quantidade, produto);
            subtotalInput.value = `R$ ${subtotal.replace('.', ',')}`;
        } else {
            subtotalInput.value = "R$ 0,00";
        }
        atualizarTotalPedido();
    }).catch(() => {
        subtotalInput.value = "R$ 0,00";
    });
}

function calcularSubtotalComConversao(quantidade, produto) {
    const preco = Number(produto.preco);
    const precoPor = produto.precoPor;

    const fator = obterFatorConversao(produto.unidadeMedida, precoPor);
    const subtotal = (quantidade / fator) * preco;

    return subtotal.toFixed(2);
}

function obterFatorConversao(de, para) {
    const tabela = {
        kg: { g: 1000, '100g': 10 },
        g: { kg: 1 / 1000, '100g': 1 / 100 },
        '100g': { kg: 1 / 10, g: 100 },

        litro: { ml: 1000 },
        ml: { litro: 1 / 1000 },

        unidade: { pacote: 1 },
        pacote: { unidade: 1 },
    };

    if (de === para) return 1;
    return tabela[para]?.[de] || 1;
}

function atualizarTotalPedido() {
    let total = 0;

    document.querySelectorAll('.item-pedido').forEach(item => {
        const subtotalInput = item.querySelector('.subtotal-input');
        let subtotalStr = subtotalInput?.value || "0";
        subtotalStr = subtotalStr.replace('R$', '').trim().replace(',', '.');
        const subtotal = parseFloat(subtotalStr);
        if (!isNaN(subtotal)) {
            total += subtotal;
        }
    });

    const idTotal = tipoAtual === 'entrada' ? 'totalAdicionar' : 'totalAdicionarSaida';
    document.getElementById(idTotal).textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
}

function mostrarMensagem(texto, tipo = 'success') {
    const msg = document.createElement('div');
    msg.textContent = texto;
    msg.className = `mensagem-alerta ${tipo}`;
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 4000);
}

function atualizarTabelaPedidos() {
    const tbodyEntradas = document.getElementById('lista-pedidos-entradas');
    const tbodySaidas = document.getElementById('lista-pedidos-saidas');

    if (tipoAtual === 'entrada') {
        tbodyEntradas.innerHTML = '';
    } else if (tipoAtual === 'saida') {
        tbodySaidas.innerHTML = '';
    }

    const tipoPedido = tipoAtual === 'entrada' ? 'Compra' : 'Venda';

    const pedidosFiltrados = aplicarFiltrosOrdenacao(pedidos)
        .filter(p => p.tipoPedido === tipoPedido);

    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;

    const pedidosPaginados = pedidosFiltrados.slice(inicio, fim);

    if (pedidosPaginados.length === 0) {
        const mensagem = `<tr><td colspan="8" style="text-align: center; padding: 20px;">Nenhuma ${tipoAtual === 'entrada' ? 'entrada' : 'saída'} encontrada.</td></tr>`;
        if (tipoAtual === 'entrada') {
            tbodyEntradas.innerHTML = mensagem;
        } else {
            tbodySaidas.innerHTML = mensagem;
        }
        return;
    }

    pedidosPaginados.forEach(pedido => {
        if (tipoAtual === 'entrada') {
            adicionarLinhaTabelaPedido(pedido, tbodyEntradas);
        } else {
            adicionarLinhaTabelaPedido(pedido, tbodySaidas);
        }
    });

    //atualizarBotaoExcluirSelecionados();
    //atualizarPaginacao(produtosFiltrados.length);
}

async function adicionarLinhaTabelaPedido(pedido, tbody) {
    const row = document.createElement('tr');
    row.setAttribute('data-key', pedido.firebaseKey);

    const codigo = pedido.numero || pedido.firebaseKey.slice(-5).toUpperCase();
    const dataFormatada = pedido.data ? formatarData(pedido.data) : '—';

    const itens = await obterItensDoPedido(pedido.firebaseKey); // ← busca correta
    const qtdItens = itens.length;

    const total = Number(pedido.total) || 0;
    const totalFormatado = `R$ ${total.toFixed(2).replace('.', ',')}`;

    row.innerHTML = `
        <td><input type="checkbox" class="selecionar-pedido"></td>
        <td data-label="ID Pedido: ">${codigo}</td>
        <td data-label="Fornecedor: ">Carregando...</td>
        <td data-label="Data: ">${dataFormatada}</td>
        <td data-label="Produtos: ">${qtdItens} <i class="fa fa-search search-icon ver-itens-icon"></i></td>
        <td data-label="Total: ">${totalFormatado}</td>
        <td class="col-consultar" data-label="Consultar"><i class="fa fa-search search-icon"></i></td>
        <td class="col-editar" data-label="Editar"><i class="fa fa-edit edit-icon"></i></td>
        <td class="col-excluir" data-label="Excluir"><i class="fa fa-trash delete-icon"></i></td>
    `;

    tbody.appendChild(row);

    const tipo = pedido.tipoPedido;
    const fornecedorCelula = row.querySelector('td[data-label="Fornecedor: "]');
    if (tipo === 'Compra') {
        buscarFornecedorPorId(pedido.fornecedor)
            .then(fornecedor => {
                fornecedorCelula.textContent = fornecedor.nome;
            })
            .catch(() => {
                fornecedorCelula.textContent = '(erro ao carregar)';
            });
    } else {
        fornecedorCelula.textContent = pedido.fornecedor || '';
    }
}

function handlePedidoSubmit(e) {
    e.preventDefault();

    const isEntrada = tipoAtual === 'entrada';
    const modalId = isEntrada ? 'modal-entrada' : 'modal-saida';
    const modal = document.getElementById(modalId);

    const nomeAdicionar = isEntrada
        ? modal.querySelector('#nomeAdicionar')
        : modal.querySelector('#nomeAdicionarSaida');

    const nomeValue = nomeAdicionar?.value.trim();
    const numeroPedido = modal.querySelector('.modal-order-number').textContent;

    const totalEl = isEntrada
        ? document.getElementById('totalAdicionar')
        : document.getElementById('totalAdicionarSaida');

    const totalStr = totalEl.textContent.replace('R$', '').trim().replace(',', '.');
    const totalPedido = parseFloat(totalStr);

    const itensContainer = modal.querySelectorAll('.item-pedido:not(.item-pedido-modelo)');

    if (!nomeValue) {
        const msg = isEntrada
            ? '⚠️ Selecione um fornecedor antes de finalizar o pedido.'
            : '⚠️ Informe o nome do cliente antes de finalizar o pedido.';
        mostrarMensagem(msg, 'error');
        return;
    }

    if (itensContainer.length === 0) {
        mostrarMensagem('⚠️ Adicione pelo menos um item ao pedido.', 'error');
        return;
    }

    const tipoPedido = isEntrada ? 'Compra' : 'Venda';

    const idPedido = indiceParaEditar !== null
        ? pedidos[indiceParaEditar].firebaseKey
        : firebase.database().ref().push().key;

    const itensASalvar = [];

    for (const item of itensContainer) {
        const produtoSelect = item.querySelector('select.produto-select');
        const quantidadeInput = item.querySelector('input.quantidade-input');
        const subtotalInput = item.querySelector('input.subtotal-input');

        const idProduto = produtoSelect?.value || null;
        const quantidade = quantidadeInput ? parseFloat(quantidadeInput.value) : 0;
        const subtotalStr = subtotalInput?.value || "0";
        const subtotal = parseFloat(subtotalStr.replace('R$', '').trim().replace(',', '.'));

        if (!idProduto || isNaN(quantidade) || quantidade <= 0 || isNaN(subtotal)) {
            mostrarMensagem('⚠️ Todos os itens devem ter um produto selecionado e uma quantidade válida.', 'error');
            return;
        }

        const idItemPedido = firebase.database().ref().push().key;

        itensASalvar.push({
            ref: firebase.database().ref('itemPedido/' + idItemPedido),
            data: {
                idPedido: idPedido,
                produto: idProduto,
                quantidade: quantidade,
                subtotal: subtotal
            }
        });
    }

    const dadosPedido = {
        numero: numeroPedido,
        idComerciante: localStorage.getItem("idComerciante") || sessionStorage.getItem("idComerciante"),
        fornecedor: nomeValue,
        tipoPedido: tipoPedido,
        data: new Date().toISOString().slice(0, 10),
        total: totalPedido
    };

    const pedidoRef = firebase.database().ref('pedido').child(idPedido);
    const apagarItensAntigos = indiceParaEditar !== null
        ? apagarItensDoPedido(idPedido)
        : Promise.resolve();

    apagarItensAntigos
        .then(() => pedidoRef.set(dadosPedido))
        .then(() => {
            const promessas = itensASalvar.map(item => item.ref.set(item.data));
            return Promise.all(promessas);
        })
        .then(() => {
            mostrarMensagem('✅ Pedido e itens salvos com sucesso!', 'success');
            document.getElementById(modalId).style.display = 'none';
            carregarPedidosDoFirebase();
            indiceParaEditar = null; // Resetar para novos cadastros
        })
        .catch(error => {
            console.error('Erro ao salvar pedido:', error);
            mostrarMensagem('🚫 Erro ao salvar o pedido. Tente novamente.', 'error');
        });
}

function apagarItensDoPedido(idPedido) {
    return firebase.database().ref('itemPedido')
        .orderByChild('idPedido')
        .equalTo(idPedido)
        .once('value')
        .then(snapshot => {
            const updates = {};
            snapshot.forEach(child => {
                updates[child.key] = null;
            });
            return firebase.database().ref('itemPedido').update(updates);
        });
}

function formatarData(dataStr) {
    const [ano, mes, dia] = dataStr.split('-');
    return `${dia}/${mes}/${ano}`;
}

function buscarFornecedorPorId(id) {
    return firebase.database().ref(`fornecedor/${id}`).once('value').then(snap => snap.val());
}

function buscarProdutoPorId(idProduto) {
    return firebase.database().ref(`produto/${idProduto}`).once('value').then(snap => snap.val());
}

function buscarItemPedidoPorId(idItemPedido) {
    return firebase.database().ref(`itemPedido/${idItemPedido}`).once('value').then(snap => snap.val());
}

function configurarEventosPedidos() {
    const tabelas = ['lista-pedidos-entradas', 'lista-pedidos-saidas'];
    tabelas.forEach(id => {
        document.getElementById(id).addEventListener('click', e => {
            const row = e.target.closest('tr');
            const firebaseKey = row.getAttribute('data-key');
            const index = pedidos.findIndex(p => p.firebaseKey === firebaseKey);
            const pedido = pedidos[index];

            if (e.target.classList.contains('search-icon') && !e.target.classList.contains('ver-itens-icon')) {
                preencherModalVisualizacao(pedido, firebaseKey);
                document.getElementById('modal-visualizar').style.display = 'flex';
            }

            if (e.target.classList.contains('edit-icon')) {
                editando = true;
                indiceParaEditar = index;
                preencherModalEdicao(pedido, firebaseKey);
            }

            if (e.target.classList.contains('ver-itens-icon')) {
                preencherItensPedido(firebaseKey);
                document.getElementById('modal-visualizar-itens').style.display = 'flex';
            }

            if (e.target.classList.contains('delete-icon')) {
                firebaseKeyParaExcluir = firebaseKey;
                document.getElementById('modal-confirmar-exclusao').style.display = 'flex';
            }
        });
    });
}

function preencherModalVisualizacao(pedido, firebaseKey) {
    document.getElementById('labelNome').textContent = pedido.tipoPedido === 'Venda' ? 'Cliente:' : 'Fornecedor:';
    document.getElementById('visualizarID').textContent = pedido.numero;

    const nomeVisualizarElement = document.getElementById('nomeVisualizar');
    if (pedido.tipoPedido === 'Compra') {
        buscarFornecedorPorId(pedido.fornecedor)
            .then(fornecedor => nomeVisualizarElement.textContent = fornecedor.nome || 'Fornecedor não encontrado')
            .catch(() => nomeVisualizarElement.textContent = 'Fornecedor não encontrado');
    } else {
        nomeVisualizarElement.textContent = pedido.fornecedor || 'Cliente não encontrado';
    }

    const total = parseFloat(pedido.total || 0).toFixed(2).replace('.', ',');
    document.getElementById('totalVisualizar').textContent = `R$ ${total}`;

    const container = document.querySelector('#modal-visualizar .itens-pedido-container');
    container.innerHTML = '';

    obterItensDoPedido(firebaseKey).then(itens => {
        itens.forEach((item, index) => {
            buscarProdutoPorId(item.produto).then(produto => {
                const nomeProduto = produto?.nome || '(produto não encontrado)';
                const unidadeMedida = produto?.unidadeMedida || '';
                const div = criarItemVisualizacao(item, index, nomeProduto, unidadeMedida);
                container.appendChild(div);
            });
        });
    }).catch(error => {
        console.error("Erro ao buscar itens do pedido:", error);
    });
}

function preencherModalEdicao(pedido, firebaseKey) {
    const isEntrada = pedido.tipoPedido === 'Compra';
    const modal = document.getElementById(isEntrada ? 'modal-entrada' : 'modal-saida');
    document.getElementById(isEntrada ? 'titulo-modal-pedido' : 'titulo-modal-saida').textContent = 'Editar Pedido';

    document.getElementById(isEntrada ? 'numeroEntrada' : 'numeroSaida').textContent = pedido.numero ? pedido.numero : '';

    const container = isEntrada
        ? document.querySelector('#modal-entrada .itens-pedido-container')
        : document.getElementById('container-itens-saida');
    container.querySelectorAll('.item-pedido-dinamico').forEach(el => el.remove());

    itemCounter = 0;

    const total = parseFloat(pedido.total || 0).toFixed(2).replace('.', ',');
    document.getElementById(isEntrada ? 'totalAdicionar' : 'totalAdicionarSaida').textContent = `R$ ${total}`;

    carregarFornecedores();

    if (isEntrada) {
        document.getElementById('nomeAdicionar').value = pedido.fornecedor || 'Fornecedor não encontrado';
        carregarProdutos(pedido.fornecedor);
    } else {
        document.getElementById('nomeAdicionarSaida').value = pedido.fornecedor || 'Cliente não encontrado';
        carregarProdutos();
    }

    obterItensDoPedido(firebaseKey).then(itens => {
        itens.forEach((item) => {
            adicionarNovoItemPedido({ preventDefault: () => { }, target: modal.querySelector('.modal-content') });

            const itensDinamicos = container.querySelectorAll('.item-pedido-dinamico');
            const novoItem = itensDinamicos[itensDinamicos.length - 1];

            novoItem.querySelector('.produto-select').value = item.produto;
            novoItem.querySelector('.quantidade-input').value = item.quantidade;
            novoItem.querySelector('.subtotal-input').value = `R$ ${parseFloat(item.subtotal).toFixed(2).replace('.', ',')}`;

            const spanUnidade = novoItem.querySelector('.unidade-medida');
            buscarProdutoPorId(item.produto).then(produto => {
                if (produto && produto.unidadeMedida && spanUnidade) {
                    spanUnidade.textContent = produto.unidadeMedida;
                } else if (spanUnidade) {
                    spanUnidade.textContent = '—';
                }
            }).catch(() => {
                if (spanUnidade) {
                    spanUnidade.textContent = '—';
                }
            });
        });
        atualizarTotalPedido();
    });
    modal.style.display = 'flex';
}

function preencherItensPedido(idPedido) {
    const container = document.getElementById('itens-lista-visualizacao');
    container.innerHTML = '';

    obterItensDoPedido(idPedido).then(itens => {
        itens.forEach((item, index) => {
            buscarProdutoPorId(item.produto).then(produto => {
                const nomeProduto = produto.nome || '(produto não encontrado)';
                const unidadeMedida = produto.unidadeMedida || '';
                const div = criarItemVisualizacao(item, index, nomeProduto, unidadeMedida);
                container.appendChild(div);
            });
        });
    }).catch(error => {
        console.error("Erro ao carregar itens:", error);
    });
}

function obterItensDoPedido(idPedido) {
    return firebase.database().ref('itemPedido')
        .once('value')
        .then(snapshot => {
            const dados = snapshot.val() || {};
            const itensDoPedido = Object.entries(dados)
                .filter(([id, item]) => item.idPedido === idPedido)
                .map(([id, item]) => ({ idItemPedido: id, ...item }));
            return itensDoPedido;
        });
}

function criarItemVisualizacao(item, index, nomeProduto, unidadeMedida) {
    const div = document.createElement('div');
    div.classList.add('item-pedido');
    div.setAttribute('data-item-id', index + 1);
    div.innerHTML = `
        <div class="grupo-form">
            <label>Produto:</label>
            <span class="campo-form leitura">${nomeProduto}</span>
        </div>
        <div class="grupo-form-duplo">
            <div>
                <label>Quantidade:</label>
                <span class="campo-form leitura">${item.quantidade} ${unidadeMedida || ''}</span>
            </div>
            <div>
                <label>Subtotal:</label>
                <span class="campo-form leitura">R$ ${parseFloat(item.subtotal).toFixed(2).replace('.', ',')}</span>
            </div>
        </div>
    `;
    return div;
}

document.getElementById('btn-confirmar-excluir').addEventListener('click', () => {
    const modal = document.getElementById('modal-confirmar-exclusao');
    const multiplos = modal.getAttribute('data-multiplos') === 'true';

    if (multiplos) {
        const selecionados = Array.from(document.querySelectorAll('.selecionar-pedido:checked'));

        const promises = selecionados.map(cb => {
            const row = cb.closest('tr');
            const key = row.getAttribute('data-key');

            return apagarItensDoPedido(key).then(() =>
                firebase.database().ref('pedido/' + key).remove()
            );
        });

        Promise.all(promises).then(() => {
            mostrarMensagem('Pedidos excluídos com sucesso!', 'success');
            modal.removeAttribute('data-multiplos');
            modal.removeAttribute('data-quantidade');
            modal.style.display = 'none';
            carregarPedidosDoFirebase();
        });

    } else {
        if (!firebaseKeyParaExcluir) return;

        apagarItensDoPedido(firebaseKeyParaExcluir).then(() => {
            return firebase.database().ref('pedido/' + firebaseKeyParaExcluir).remove();
        }).then(() => {
            mostrarMensagem('Pedido excluído com sucesso!', 'success');
            modal.style.display = 'none';
            firebaseKeyParaExcluir = null;
            carregarPedidosDoFirebase();
        });
    }
});

document.getElementById('btn-cancelar-excluir').addEventListener('click', () => {
    firebaseKeyParaExcluir = null;
    document.getElementById('modal-confirmar-exclusao').style.display = 'none';
});

function aplicarFiltrosOrdenacao(lista) {
    const termo = document.querySelector('.search-input input')?.value.toLowerCase() || '';
    const ordem = document.getElementById('ordenar-pedidos')?.value || '';

    let filtrados = lista.filter(pedido => {
        const nome = pedido.nome?.toLowerCase() || '';
        return nome.includes(termo);
    });

    if (filtrados.length === 0) {
        mostrarMensagem('🚫 Nenhum pedido encontrado com esse critério.', 'warning');
    }

    // Ordenações
    if (ordem === 'data-asc') {
        filtrados.sort((a, b) => new Date(a.dataPedido) - new Date(b.dataPedido));
    } else if (ordem === 'data-desc') {
        filtrados.sort((a, b) => new Date(b.dataPedido) - new Date(a.dataPedido));
    } else if (ordem === 'total-asc') {
        filtrados.sort((a, b) => parseFloat(a.total || 0) - parseFloat(b.total || 0));
    } else if (ordem === 'total-desc') {
        filtrados.sort((a, b) => parseFloat(b.total || 0) - parseFloat(a.total || 0));
    }

    return filtrados;
}   