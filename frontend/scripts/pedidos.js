const pedidos = [];
const idComerciante = localStorage.getItem('idComerciante') || sessionStorage.getItem('idComerciante');
let paginaAtualEntradas = 1;
let paginaAtualSaidas = 1;
const itensPorPagina = 10;
let itemCounter = 1;
let indiceParaEditar = null;
let firebaseKeyParaExcluir = null;
let tipoAtual = 'entrada';
let editando = false;

document.addEventListener('DOMContentLoaded', () => {
    carregarPedidosDoFirebase();
    configurarEventosPedidos();

    document.getElementById('button-entradas').addEventListener('click', mostrarEntradas);
    document.getElementById('button-saidas').addEventListener('click', mostrarSaidas);
    document.getElementById('btn-excluir-selecionados').addEventListener('click', excluirSelecionados);

    const tipoSalvo = sessionStorage.getItem('tipoPedidoAtual');
    if (tipoSalvo) tipoAtual = tipoSalvo;

    document.getElementById('ordenar-pedidos').addEventListener('change', () => {
        if (tipoAtual === 'entrada') paginaAtualEntradas = 1;
        else paginaAtualSaidas = 1;
        atualizarTabelaPedidos();
    });

    document.getElementById('limpar-filtros-pedidos').addEventListener('click', () => {
        document.getElementById('ordenar-pedidos').value = '';
        if (tipoAtual === 'entrada') paginaAtualEntradas = 1;
        else paginaAtualSaidas = 1;
        atualizarTabelaPedidos();
    });

    document.getElementById('btnAbrirModal').addEventListener('click', () => {
        const titulo = tipoAtual === 'entrada' ? 'titulo-modal-pedido' : 'titulo-modal-saida';
        document.getElementById(titulo).textContent = 'Pedido';
        editando = false;
        indiceParaEditar = null;
        itemCounter = 1;

        const contadorLotes = {};

        if (tipoAtual === 'entrada') {
            const modal = document.getElementById('modal-entrada');
            const container = modal.querySelector('.itens-pedido-container');
            container.innerHTML = '';
            document.getElementById('nomeAdicionar').selectedIndex = 0;

            modal.style.display = 'flex';
            document.getElementById('totalAdicionar').textContent = "0,00";
            modal.querySelector('.modal-order-number').textContent = gerarCodigoPedido();

            carregarFornecedores();

            document.getElementById('nomeAdicionar').addEventListener('change', async (e) => {
                const fornecedorId = e.target.value;
                if (!fornecedorId) return;

                container.querySelectorAll('.item-pedido').forEach(item => {
                    const selectProduto = item.querySelector('select.produto-select');
                    selectProduto.disabled = false;
                    carregarProdutos(selectProduto, fornecedorId);
                });
            });

            const configurarItemEntrada = (div) => {
                const selectProduto = div.querySelector('select.produto-select');
                const inputLote = div.querySelector('.lote-item');
                const inputQuantidade = div.querySelector('input.quantidade-input');
                const btnRemover = div.querySelector('.botao-remover-item');

                btnRemover.addEventListener('click', () => {
                    div.remove();
                    atualizarTotalPedido();
                });

                selectProduto.addEventListener('change', async function () {
                    const produtoId = this.value;
                    if (!produtoId) {
                        inputLote.value = '';
                        return;
                    }

                    try {
                        const loteBase = await obterProximoNumeroLote(produtoId);
                        const ocorrenciasNaTela = contarOcorrenciasProdutoNaTela(produtoId, div);
                        const numeroLote = Math.max(loteBase + ocorrenciasNaTela - 1, 1);
                        inputLote.value = numeroLote;
                    } catch (err) {
                        inputLote.value = 1;
                    }

                    const unidadeSpan = div.querySelector('.unidade-produto');
                    const produtoRef = firebase.database().ref(`produto/${produtoId}`);
                    const snapshot = await produtoRef.once('value');
                    const produto = snapshot.val();

                    if (produto && produto.unidadeMedida) {
                        unidadeSpan.textContent = produto.unidadeMedida;
                    }

                    inputQuantidade.disabled = false;
                    calcularSubtotalItem(div);
                });

                inputQuantidade.addEventListener('input', () => {
                    calcularSubtotalItem(div);
                });
            };

            const div = document.createElement('div');
            div.classList.add('item-pedido');
            div.setAttribute('data-item-id', itemCounter);
            itemCounter++;

            div.innerHTML = `
            <div class="grupo-form">
                <label>Produto:</label>
                <select class="campo-form produto-select" required disabled>
                    <option value="" disabled selected>Selecione um fornecedor primeiro</option>
                </select>
            </div>
            <div>
                <label>Quantidade</label>
                <div style="display: flex; gap: 5px;">
                    <input type="number" class="campo-form quantidade-input" min="1" value="1" required disabled style="flex: 1;">
                    <span class="unidade-produto" style="min-width: 40px; padding-top: 8px;">—</span>
                </div>
            </div>
            <div class="grupo-form">
                <label>Lote</label>
                <input type="text" class="campo-form lote-item" readonly required>
            </div>
            <div class="grupo-form">
                <label>Validade</label>
                <input type="date" class="campo-form validade-input" required>
            </div>
            <div class="grupo-form">
                <label>Subtotal</label>
                <input type="text" class="campo-form subtotal-input" value="0,00" readonly>
            </div>
            <button type="button" class="botao-remover-item" style="display: none;">Remover</button>
        `;

            container.appendChild(div);
            configurarItemEntrada(div);

        } else {
            const modal = document.getElementById('modal-saida');
            const container = modal.querySelector('.itens-pedido-container');
            container.innerHTML = '';
            document.getElementById('fornecedorSaida').value = '';

            modal.style.display = 'flex';
            document.getElementById('totalAdicionarSaida').textContent = "0,00";
            modal.querySelector('.modal-order-number').textContent = gerarCodigoPedido();

            carregarFornecedores();

            document.getElementById('adicionar-mais-saida').click();
        }
    });

    document.getElementById('input-pesquisa-pedidos').addEventListener('input', () => {
        paginaAtual = 1;
        atualizarTabelaPedidos();
    });

    document.getElementById('cancelarModal').addEventListener('click', () => {
        document.getElementById('modal-entrada').style.display = 'none';
    });

    document.getElementById('cancelarModalSaida').addEventListener('click', () => {
        document.getElementById('modal-saida').style.display = 'none';
    });

    document.getElementById('fecharVisualizar').addEventListener('click', () => {
        document.getElementById('modal-visualizar').style.display = 'none';
    });

    document.getElementById('fecharVisualizarItens').addEventListener('click', () => {
        document.getElementById('modal-visualizar-itens').style.display = 'none';
    });

    document.getElementById('btnFecharPedido').addEventListener('click', handlePedidoSubmit);
    document.getElementById('btnFecharPedidoSaida').addEventListener('click', handlePedidoSubmit);

    document.querySelector('.search-input input').addEventListener('input', () => {
        paginaAtual = 1;
        atualizarTabelaPedidos();
    });

    document.querySelector('.filter-button')?.addEventListener('click', () => {
        const filtros = document.getElementById('filtros-container-pedidos');
        filtros.style.display = filtros.style.display === 'none' ? 'flex' : 'none';
    });

    document.getElementById('fornecedorSaida').addEventListener('change', async (e) => {
        const fornecedorId = e.target.value;
        const modal = document.getElementById('modal-saida');
        const container = modal.querySelector('.itens-pedido-container');

        container.querySelectorAll('.item-pedido').forEach(item => {
            const selectProduto = item.querySelector('select.produto-select');
            const inputQuantidade = item.querySelector('input.quantidade-input');
            const selectLote = item.querySelector('select.lote-select');

            selectProduto.disabled = !fornecedorId;
            inputQuantidade.disabled = !fornecedorId;
            if (selectLote) selectLote.disabled = !fornecedorId;

            if (fornecedorId) {
                carregarProdutos(selectProduto, fornecedorId);
            }
        });

        atualizarTotalPedido();
    });

    document.getElementById('selecionar-todos-saidas').addEventListener('change', e => {
        const checkboxes = document.querySelectorAll('.selecionar-pedido');
        checkboxes.forEach(cb => cb.checked = e.target.checked);
        atualizarBotaoExcluirSelecionados();
    });

    document.getElementById('selecionar-todos-entradas').addEventListener('change', e => {
        const checkboxes = document.querySelectorAll('.selecionar-pedido');
        checkboxes.forEach(cb => cb.checked = e.target.checked);
        atualizarBotaoExcluirSelecionados();
    });

    document.addEventListener('change', e => {
        if (e.target.classList.contains('selecionar-produto')) {
            const todos = document.querySelectorAll('.selecionar-produto');
            const marcados = document.querySelectorAll('.selecionar-produto:checked');
            document.getElementById('selecionar-todos').checked = todos.length === marcados.length;
            atualizarBotaoExcluirSelecionados();
        }
    });

    document.querySelectorAll('.adicionar-mais-item').forEach(botao => {
        botao.addEventListener('click', async function (e) {
            e.preventDefault();

            const isEntrada = this.id === 'adicionar-mais';
            const modal = isEntrada
                ? document.getElementById('modal-entrada')
                : document.getElementById('modal-saida');

            const container = modal.querySelector('.itens-pedido-container');
            const quantidadeItens = container.querySelectorAll('.item-pedido').length;
            const mostrarRemoverBtn = quantidadeItens > 0;

            const div = document.createElement('div');
            div.classList.add('item-pedido');
            div.setAttribute('data-item-id', itemCounter);

            const loteAtual = itemCounter;
            itemCounter++;

            let html = `
  <div class="grupo-form">
    <label>Produto:</label>
    <select class="campo-form produto-select" required disabled>
      <option value="" disabled selected>Selecione um fornecedor primeiro</option>
    </select>
  </div>
  <div>
    <label>Quantidade</label>
    <div style="display: flex; gap: 5px;">
      <input type="number" class="campo-form quantidade-input" min="1" value="1" required disabled style="flex: 1;">
      <span class="unidade-produto" style="min-width: 40px; padding-top: 8px;">—</span>
    </div>
  </div>`;

            if (isEntrada) {
                html += `
    <div class="grupo-form">
      <label>Lote</label>
      <input type="text" class="campo-form lote-item" readonly required>
    </div>
    <div class="grupo-form">
      <label>Validade</label>
      <input type="date" class="campo-form validade-input" required>
    </div>`;
            } else {
                html += `
    <div class="grupo-form">
      <label>Lote</label>
      <select class="campo-form lote-select" required disabled>
        <option value="" selected disabled>Selecione o produto primeiro</option>
      </select>
    </div>
    <div class="grupo-form">
      <label>Validade</label>
      <input type="date" class="campo-form validade-input" readonly required>
    </div>`;
            }

            html += `
  <div class="grupo-form">
    <label>Subtotal</label>
    <input type="text" class="campo-form subtotal-input" value="0,00" readonly>
  </div>
  <button type="button" class="botao-remover-item" style="display: ${mostrarRemoverBtn ? 'block' : 'none'};">Remover</button>
`;
            div.innerHTML = html;
            container.appendChild(div);
            configurarProdutoDinamico(div, isEntrada);

            if (isEntrada) {
                const fornecedorSelect = document.getElementById('nomeAdicionar');
                if (fornecedorSelect && fornecedorSelect.value) {
                    const selectProduto = div.querySelector('select.produto-select');
                    selectProduto.disabled = false;
                    carregarProdutos(selectProduto, fornecedorSelect.value);
                }
            }

            if (!isEntrada) {
                const fornecedorSelect = document.getElementById('fornecedorSaida');
                const selectProduto = div.querySelector('select.produto-select');
                if (fornecedorSelect && fornecedorSelect.value && selectProduto) {
                    selectProduto.disabled = false;
                    carregarProdutos(selectProduto, fornecedorSelect.value);
                } else if (selectProduto) {
                    selectProduto.disabled = true;
                }
            }
        });
    })
});

function mostrarEntradas() {
    tipoAtual = 'entrada';

    document.getElementById('tabela-entradas').style.display = 'table';
    document.getElementById('tabela-saidas').style.display = 'none';

    const btnEntradas = document.getElementById('button-entradas');
    const btnSaidas = document.getElementById('button-saidas');

    btnEntradas.classList.add('btn-ativo-verde');
    btnEntradas.classList.remove('btn-inativo-verde');

    btnSaidas.classList.add('btn-inativo-vermelho');
    btnSaidas.classList.remove('btn-ativo-vermelho');

    document.getElementById('tipo_titulo').textContent = '/ Fornecedor';

    sessionStorage.setItem('tipoPedidoAtual', tipoAtual);
    carregarPedidosDoFirebase();
}

function mostrarSaidas() {
    tipoAtual = 'saida';

    document.getElementById('tabela-entradas').style.display = 'none';
    document.getElementById('tabela-saidas').style.display = 'table';

    const btnEntradas = document.getElementById('button-entradas');
    const btnSaidas = document.getElementById('button-saidas');

    btnEntradas.classList.add('btn-inativo-verde');
    btnEntradas.classList.remove('btn-ativo-verde');

    btnSaidas.classList.add('btn-ativo-vermelho');
    btnSaidas.classList.remove('btn-inativo-vermelho');

    document.getElementById('tipo_titulo').textContent = '/ Cliente';

    sessionStorage.setItem('tipoPedidoAtual', tipoAtual);
    carregarPedidosDoFirebase();
}

function carregarFornecedores() {
    const selects = document.querySelectorAll('#nomeAdicionar, #fornecedorSaida'); selects.forEach(select => {
        select.innerHTML = '<option value="" selected disabled>Selecione...</option>';
    });

    const fornecedoresRef = firebase.database().ref('fornecedor');

    fornecedoresRef.once('value')
        .then(snapshot => {
            const fornecedores = [];

            snapshot.forEach(childSnapshot => {
                const fornecedor = childSnapshot.val();
                fornecedores.push({
                    key: childSnapshot.key,
                    nome: fornecedor.nome
                });
            });

            selects.forEach(select => {
                fornecedores.forEach(f => {
                    const option = document.createElement('option');
                    option.value = f.key;
                    option.textContent = f.nome;
                    select.appendChild(option);
                });
            });
        })
        .catch(error => {
            console.error("Erro ao carregar fornecedores:", error);
        });
}

// Atualize a função carregarProdutos
function carregarProdutos(selectEspecifico = null, fornecedorId = null) {
    const idComercianteLocal = localStorage.getItem('idComerciante') || sessionStorage.getItem('idComerciante');

    const produtosRef = firebase.database().ref('produto');

    return produtosRef.once('value')
        .then(snapshot => {
            const produtos = snapshot.val();
            if (!produtos) return;

            const opcoes = [];

            Object.entries(produtos).forEach(([key, produto]) => {
                const precoBase = parseFloat(produto.preco || '0');    // ex: 2.50
                const precoporValue = parseInt(produto.precoPor || '1');    // ex: "100g" → 100
                const precoUnitario = precoBase / precoporValue;              // ex: 2.50/100 = 0.025

                const option = document.createElement('option');
                option.value = key;
                option.textContent = produto.nome;
                option.dataset.precoBase = precoBase;      // valor original (raro de usar)
                option.dataset.precopor = precoporValue;  // quantidade base em g
                option.dataset.precounitario = precoUnitario;  // preço por g
                option.dataset.unidademedida = produto.unidadeMedida; // ex: "g"

                opcoes.push(option.outerHTML);
            });

            const htmlCompleto = opcoes.length > 0
                ? '<option value="" selected disabled>Selecione...</option>' + opcoes.join('')
                : '<option value="" selected disabled>Nenhum produto encontrado</option>';

            if (selectEspecifico) {
                selectEspecifico.innerHTML = htmlCompleto;
                selectEspecifico.disabled = false;
            } else {
                document.querySelectorAll('.produto-select').forEach(select => {
                    select.innerHTML = htmlCompleto;
                    select.disabled = false;
                });
            }
        })
        .catch(error => {
            console.error("Erro ao carregar produtos:", error);

            // Mensagem de erro no próprio select
            if (selectEspecifico) {
                selectEspecifico.innerHTML = '<option value="" selected disabled>Erro ao carregar produtos</option>';
            }
        });
}

// Atualize o evento de change para o modal de saída
document.getElementById('fornecedorSaida').addEventListener('change', async (e) => {
    const fornecedorId = e.target.value;
    const modal = document.getElementById('modal-saida');
    const container = modal.querySelector('.itens-pedido-container');

    // Correção: Carregar produtos apenas se fornecedor for selecionado
    if (fornecedorId) {
        container.querySelectorAll('.item-pedido').forEach(item => {
            const selectProduto = item.querySelector('select.produto-select');
            selectProduto.disabled = false;
            carregarProdutos(selectProduto, fornecedorId);
        });
    } else {
        container.querySelectorAll('.item-pedido').forEach(item => {
            const selectProduto = item.querySelector('select.produto-select');
            selectProduto.disabled = true;
            selectProduto.innerHTML = '<option value="" selected disabled>Selecione um fornecedor primeiro</option>';
        });
    }

    atualizarTotalPedido();
});

async function carregarLotesDoProduto(produtoId, selectLote, inputValidade) {
    const snap = await firebase.database().ref(`produto/${produtoId}`).once('value');
    const produto = snap.val() || {};

    selectLote.innerHTML = `
    <option value="" disabled selected>Selecione um lote</option>
  `;

    for (const [numero, dados] of Object.entries(produto.lotes || {})) {
        const option = document.createElement('option');
        const qtd = dados.quantidade || 0;
        const subt = dados.subtotal || 0;
        // recalcula o preço unitário correto em tempo real:
        const precoU = qtd > 0 ? (subt / qtd) : 0;

        option.value = numero;
        option.textContent = `${numero} (${qtd} disp.)`;
        option.dataset.preco = precoU.toFixed(4);     // ex: "0.0250"
        option.dataset.validade = dados.validade;        // ex: "2025-09-20"

        // se zerado, deixa disabled
        if (qtd === 0) {
            option.disabled = true;
            option.textContent += ' (zerado)';
        }

        selectLote.appendChild(option);
    }
}

function calcularSubtotalItem(itemContainer) {
    const qtyInput = itemContainer.querySelector('input.quantidade-input');
    const prodSelect = itemContainer.querySelector('select.produto-select');
    const loteSelect = itemContainer.querySelector('select.lote-select');
    const validadeInput = itemContainer.querySelector('input.validade-input');
    const subtotalInput = itemContainer.querySelector('input.subtotal-input');

    // 1) Lê quantidade (tratando vírgula)
    const quantidade = parseFloat(qtyInput.value.replace(',', '.')) || 0;
    if (quantidade <= 0) {
        subtotalInput.value = 'R$ 0,00';
        atualizarTotalPedido();
        return;
    }

    // 2) Preço unitário (por “base unit”)  
    // – saída: pega do data-preco do lote  
    // – entrada: pega do data-preco-base e data-preco-por do produto e normaliza
    let precoUnit = 0;

    if (loteSelect) {
        // Saída
        const opt = loteSelect.selectedOptions[0];
        precoUnit = parseFloat(opt.dataset.preco) || 0;
        // atualiza validade
        if (opt.dataset.validade) validadeInput.value = opt.dataset.validade;

    } else {
        // Entrada
        const opt = prodSelect.selectedOptions[0];
        const precoBase = parseFloat(opt.dataset.precoBase) || 0;  // ex: 2.50
        const precopor = parseFloat(opt.dataset.precopor) || 1;  // ex: 100 (para “100g”)
        // preço por **unidade básica** (g, ml ou un)
        precoUnit = precoBase / precopor;
    }

    // 3) Cálculo
    const subtotal = precoUnit * quantidade;

    // 4) Exibe
    subtotalInput.value = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;

    // 5) Atualiza total do pedido
    atualizarTotalPedido();
}

function atualizarTotalPedido() {
    let total = 0;
    let itemContainers = [];

    if (tipoAtual === 'entrada') {
        itemContainers = document.querySelectorAll('#modal-entrada .item-pedido');
    } else {
        itemContainers = document.querySelectorAll('#modal-saida .item-pedido');
    }

    itemContainers.forEach(item => {
        const subtotalInput = item.querySelector('.subtotal-input');
        if (!subtotalInput) return;

        // Extrai o valor numérico corretamente (considerando R$ 2,50 ou 2,50)
        const valorTexto = subtotalInput.value.replace('R$', '').trim();
        const valorNumerico = parseFloat(valorTexto.replace('.', '').replace(',', '.'));

        if (!isNaN(valorNumerico)) {
            total += valorNumerico;
        }
    });

    const totalFormatado = total.toFixed(2).replace('.', ',');

    if (tipoAtual === 'entrada') {
        const totalElement = document.getElementById('totalAdicionar');
        if (totalElement) totalElement.textContent = `R$ ${totalFormatado}`;
    } else {
        const totalElement = document.getElementById('totalAdicionarSaida');
        if (totalElement) totalElement.textContent = `R$ ${totalFormatado}`;
    }
}

function gerarCodigoPedido() {
    let novoCodigo;
    do {
        novoCodigo = 'PED-' + Math.floor(10000 + Math.random() * 90000);
    } while (pedidos.some(p => p.codigo === novoCodigo));
    return novoCodigo;
}

function formatarData(dataStr) {
    const [ano, mes, dia] = dataStr.split('-');
    return `${dia}/${mes}/${ano}`;
}

function atualizarBotaoExcluirSelecionados() {
    const selecionados = document.querySelectorAll('.selecionar-pedido:checked');
    const botao = document.getElementById('btn-excluir-selecionados');
    botao.style.display = selecionados.length > 0 ? 'inline-block' : 'none';
}

function excluirSelecionados() {
    const selecionados = Array.from(document.querySelectorAll('.selecionar-pedido:checked'));
    if (selecionados.length === 0) return;

    const modal = document.getElementById('modal-confirmar-exclusao');
    const titulo = modal.querySelector('h4');
    const subtitulo = modal.querySelector('p');
    titulo.textContent = `Deseja realmente excluir ${selecionados.length} produto(s)?`;
    subtitulo.textContent = 'Essa ação não poderá ser desfeita.';

    modal.setAttribute('data-multiplos', 'true');
    modal.setAttribute('data-quantidade', selecionados.length);
    modal.classList.add('ativo');
    modal.style.display = 'flex';
}

function carregarPedidosDoFirebase() {
    firebase.database().ref('pedido').once('value').then(snapshot => {
        pedidos.length = 0;
        snapshot.forEach(childSnapshot => {
            const pedido = childSnapshot.val();
            if (pedido.idComerciante === idComerciante) {
                pedido.firebaseKey = childSnapshot.key;

                if (pedido.itensPedido && typeof pedido.itensPedido === 'object') {
                    if (Array.isArray(pedido.itensPedido)) {
                        const itensObj = {};
                        pedido.itensPedido.forEach((item, index) => {
                            itensObj[`item${index}`] = item;
                        });
                        pedido.itensPedido = itensObj;
                    }
                } else {
                    pedido.itensPedido = {};
                }

                pedidos.push(pedido);
            }
        });

        const promessas = pedidos.map(async (pedido) => {
            if (pedido.tipoPedido === 'Compra') {
                pedido.nomeFornecedor = await buscarNomeFornecedorPorId(pedido.fornecedor);
            } else {
                pedido.nomeCliente = pedido.nomeCliente || '—';
            }
        });

        Promise.all(promessas).then(() => atualizarTabelaPedidos());
    });
}

async function adicionarLinhaTabelaPedido(pedido, tbody) {
    const row = document.createElement('tr');
    row.setAttribute('data-key', pedido.firebaseKey);

    const codigo = pedido.numero || pedido.firebaseKey.slice(-5).toUpperCase();
    const dataFormatada = pedido.data ? formatarData(pedido.data) : '—';

    const itens = pedido.itensPedido || {};
    const qtdItens = Object.keys(itens).length;

    const total = Number(pedido.valor) || 0;
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

    // Verifica se há lote encerrado neste pedido
    let totalItens = 0, lotesZerados = 0;
    for (const chave in pedido.itensPedido) {
        totalItens++;
        const item = pedido.itensPedido[chave];
        const produtoSnap = await firebase.database().ref(`produto/${item.produtoId}`).once('value');
        const lote = produtoSnap.val()?.lotes?.[item.lote];
        if (!lote || lote.quantidade === 0) {
            lotesZerados++;
        }
    }

    if (lotesZerados === totalItens) {
        row.classList.add('lote-encerrado');
        row.title = 'Este pedido contém lote encerrado';

        const btnEditar = row.querySelector('.edit-icon');
        const btnExcluir = row.querySelector('.delete-icon');
        if (btnEditar) btnEditar.style.pointerEvents = 'none';
        if (btnExcluir) btnExcluir.style.pointerEvents = 'none';
        if (btnEditar) btnEditar.style.opacity = '0.3';
        if (btnExcluir) btnExcluir.style.opacity = '0.3';
    }

    const tipo = pedido.tipoPedido;
    const fornecedorCelula = row.querySelector('td[data-label="Fornecedor: "]');
    if (tipo === 'Compra') {
        buscarNomeFornecedorPorId(pedido.fornecedor)
            .then(nome => {
                fornecedorCelula.textContent = nome;
            })
            .catch(() => {
                fornecedorCelula.textContent = '(erro ao carregar)';
            });
    } else {
        fornecedorCelula.textContent = pedido.nomeCliente || '—';
    }
}

function buscarNomeFornecedorPorId(idFornecedor) {
    return new Promise((resolve, reject) => {
        if (!idFornecedor) {
            resolve('—');
            return;
        }
        firebase.database().ref(`fornecedor/${idFornecedor}`).once('value')
            .then(snapshot => {
                const dados = snapshot.val();
                if (dados && dados.nome) {
                    resolve(dados.nome);
                } else {
                    resolve('(sem nome)');
                }
            })
            .catch(error => {
                console.error('Erro ao buscar fornecedor:', error);
                reject('(erro ao carregar)');
            });
    });
}

function atualizarTabelaPedidos() {
    const tbodyEntradas = document.getElementById('lista-pedidos-entradas');
    const tbodySaidas = document.getElementById('lista-pedidos-saidas');

    if (tipoAtual === 'entrada') {
        tbodyEntradas.innerHTML = '';
    } else {
        tbodySaidas.innerHTML = '';
    }

    const paginaAtual = tipoAtual === 'entrada' ? paginaAtualEntradas : paginaAtualSaidas;

    let pedidosFiltrados = pedidos.filter(p => {
        const tipoCorreto = p.tipoPedido === (tipoAtual === 'entrada' ? 'Compra' : 'Venda');

        const termo = document.getElementById('input-pesquisa-pedidos')?.value?.toLowerCase() || '';
        if (!termo) return tipoCorreto;

        const fornecedorOuCliente = p.tipoPedido === 'Compra'
            ? p.nomeFornecedor?.toLowerCase?.() || ''
            : p.nomeCliente?.toLowerCase?.() || '';

        const numero = p.numero?.toLowerCase?.() || '';
        const data = p.data?.toLowerCase?.() || '';

        const contemProduto = Object.values(p.itensPedido || {}).some(item =>
            (item.nome || '').toLowerCase().includes(termo)
        );

        return tipoCorreto && (
            fornecedorOuCliente.includes(termo) ||
            numero.includes(termo) ||
            data.includes(termo) ||
            contemProduto
        );
    });

    pedidosFiltrados = aplicarFiltrosOrdenacao(pedidosFiltrados);

    const totalItens = pedidosFiltrados.length;
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    const pedidosPaginados = pedidosFiltrados.slice(inicio, fim);

    atualizarPaginacao(totalItens);

    if (pedidosPaginados.length === 0) {
        const mensagem = `<tr><td colspan="9" style="text-align: center; padding: 20px;">Nenhuma ${tipoAtual === 'entrada' ? 'entrada' : 'saída'} encontrada.</td></tr>`;
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

    atualizarBotaoExcluirSelecionados();
}

function atualizarPaginacao(totalItens) {
    const totalPaginas = Math.ceil(totalItens / itensPorPagina);
    const controles = document.getElementById('controles-paginacao');

    let paginaAtual = tipoAtual === 'entrada' ? paginaAtualEntradas : paginaAtualSaidas;

    controles.innerHTML = `
      <button class="btn-paginacao" id="btn-anterior" ${paginaAtual === 1 ? 'disabled' : ''}>
          <i class="fas fa-chevron-left"></i>
      </button>
      <span>Página ${paginaAtual} de ${totalPaginas}</span>
      <button class="btn-paginacao" id="btn-proximo" ${paginaAtual === totalPaginas ? 'disabled' : ''}>
          <i class="fas fa-chevron-right"></i>
      </button>
  `;

    document.getElementById('btn-anterior')?.addEventListener('click', () => {
        if (paginaAtual > 1) {
            if (tipoAtual === 'entrada') {
                paginaAtualEntradas--;
            } else {
                paginaAtualSaidas--;
            }
            atualizarTabelaPedidos();
        }
    });

    document.getElementById('btn-proximo')?.addEventListener('click', () => {
        if (paginaAtual < totalPaginas) {
            if (tipoAtual === 'entrada') {
                paginaAtualEntradas++;
            } else {
                paginaAtualSaidas++;
            }
            atualizarTabelaPedidos();
        }
    });
}

async function handlePedidoSubmit(e) {
    e.preventDefault();

    // 1) Determina se é entrada ou saída
    const isEntrada = tipoAtual === 'entrada';
    const fornecedorId = isEntrada
        ? document.getElementById('nomeAdicionar')?.value
        : document.getElementById('fornecedorSaida')?.value;

    // 2) Valida seleção de fornecedor/cliente
    if (!fornecedorId) {
        mostrarMensagem('Selecione um fornecedor/cliente primeiro!', 'error');
        return;
    }

    // 3) Obtém itens e valida quantidade mínima
    const itensNovos = obterItensPedido();
    if (itensNovos.length === 0) {
        mostrarMensagem('Adicione pelo menos um item ao pedido!', 'error');
        return;
    }
    if (itensNovos.some(item => item.quantidade <= 0)) {
        mostrarMensagem('A quantidade deve ser maior que zero para todos os itens!', 'error');
        return;
    }

    // 4) Valida validade em entradas
    if (isEntrada && itensNovos.some(item => !item.validade)) {
        mostrarMensagem('Informe a validade para todos os itens de entrada!', 'error');
        return;
    }

    // 5) Valida estoque em saídas
    if (!isEntrada) {
        for (const item of itensNovos) {
            const snap = await firebase.database().ref(`produto/${item.produtoId}`).once('value');
            const produto = snap.val() || {};
            if (!produto.lotes) {
                if ((produto.quantidadeEstoque || 0) < item.quantidade) {
                    alert(`❌ Estoque insuficiente para "${item.nome}".\nDisponível: ${produto.quantidadeEstoque || 0}\nSolicitado: ${item.quantidade}`);
                    return;
                }
            } else {
                const disponivel = produto.lotes[item.lote]?.quantidade || 0;
                if (disponivel < item.quantidade) {
                    alert(`❌ Estoque insuficiente no lote ${item.lote} para "${item.nome}".\nDisponível: ${disponivel}\nSolicitado: ${item.quantidade}`);
                    return;
                }
            }
        }
    }

    // 6) Metadados do pedido
    const numeroPedido = document.querySelector('.modal-order-number').textContent;
    const dataAtual = new Date().toISOString().split('T')[0];

    // 7) Define referência e ID (criação vs. edição)
    let pedidoRef, pedidoId;
    if (editando && indiceParaEditar) {
        pedidoRef = firebase.database().ref(`pedido/${indiceParaEditar}`);
        pedidoId = indiceParaEditar;
    } else {
        pedidoRef = firebase.database().ref('pedido').push();
        pedidoId = pedidoRef.key;
    }

    // 8) Se editando, primeiro REVERTE as movimentações antigas
    if (editando) {
        const oldSnap = await firebase.database()
            .ref(`pedido/${pedidoId}/itensPedido`)
            .once('value');
        const itensAntigos = Object.values(oldSnap.val() || {});
        for (const antigo of itensAntigos) {
            // inverte a movimentação: se era entrada, trata como saída e vice-versa
            await atualizarEstoqueProduto(antigo, !isEntrada, pedidoId);
        }
    }

    // 9) Monta o objeto do pedido
    const novoPedido = {
        idComerciante: idComerciante,
        numero: numeroPedido,
        data: dataAtual,
        fornecedor: isEntrada ? fornecedorId : null,
        nomeCliente: !isEntrada
            ? document.getElementById('nomeAdicionarSaida')?.value || 'Cliente não identificado'
            : null,
        tipoPedido: isEntrada ? 'Compra' : 'Venda',
        valor: calcularTotalPedido(itensNovos),
        status: 'Concluído',
        itensPedido: {}
    };
    itensNovos.forEach((item, idx) => {
        novoPedido.itensPedido[`item${idx}`] = { ...item };
    });

    try {
        // 10) Grava ou sobrescreve no Firebase
        await pedidoRef.set(novoPedido);

        // 11) Aplica as movimentações dos itens atuais
        for (const item of itensNovos) {
            await atualizarEstoqueProduto(item, isEntrada, pedidoId);
        }

        // 12) Feedback e limpeza de flags
        mostrarMensagem('Pedido salvo com sucesso!', 'success');
        editando = false;
        indiceParaEditar = null;

        // 13) Fecha modal e recarrega lista
        document
            .getElementById(isEntrada ? 'modal-entrada' : 'modal-saida')
            .style.display = 'none';
        carregarPedidosDoFirebase();

    } catch (error) {
        console.error('Erro ao salvar pedido:', error);
        mostrarMensagem('Erro ao salvar pedido!', 'error');
    }
}

function obterItensPedido() {
    const modal = tipoAtual === 'entrada' ? document.getElementById('modal-entrada') : document.getElementById('modal-saida');
    const itensContainers = modal.querySelectorAll('.item-pedido');

    const itens = [];

    itensContainers.forEach(item => {
        const produtoSelect = item.querySelector('select.produto-select');
        const quantidadeInput = item.querySelector('input.quantidade-input');
        const subtotalInput = item.querySelector('input.subtotal-input');
        const unidadeSpan = item.querySelector('.unidade-produto');
        const validadeInput = item.querySelector('input.validade-input') || item.querySelector('input.validade-item');

        const produtoId = produtoSelect?.value;
        const nome = produtoSelect?.options[produtoSelect.selectedIndex]?.textContent || '';
        const quantidade = parseFloat(quantidadeInput?.value || 0);
        const subtotalStr = subtotalInput?.value?.replace('R$', '').trim().replace('.', '').replace(',', '.') || '0';
        const subtotal = parseFloat(subtotalStr);
        const unidadeMedida = unidadeSpan?.textContent || 'un';

        let lote = null;
        if (tipoAtual === 'entrada') {
            const inputLote = item.querySelector('input.lote-item');
            lote = inputLote?.value?.trim();
        } else {
            const selectLote = item.querySelector('select.lote-select');
            lote = selectLote?.value;
        }

        const validade = validadeInput?.value || null;

        const preco = subtotal / (quantidade || 1);

        if (produtoId) {
            itens.push({
                produtoId,
                nome,
                quantidade,
                preco,
                subtotal,
                lote,
                validade,
                unidadeMedida
            });
        }
    });

    return itens;
}

// Função auxiliar para calcular o total do pedido
function calcularTotalPedido(itensPedido) {
    return itensPedido.reduce((total, item) => {
        return total + (item.subtotal || 0);
    }, 0);
}

// Função auxiliar para atualizar estoque do produto
async function atualizarEstoqueProduto(item, isEntrada, pedidoId) {
    const produtoRef = firebase.database().ref(`produto/${item.produtoId}`);
    const snap = await produtoRef.once('value');
    const produto = snap.val() || { lotes: {}, quantidadeEstoque: 0, valorEstoque: 0 };

    produto.lotes = produto.lotes || {};
    const loteId = String(item.lote);

    // busca ou inicializa o objeto de lote
    const existente = produto.lotes[loteId];
    const agoraISO = new Date().toISOString();

    // monta o objeto mínimo com todos os campos
    const loteObj = {
        numero: loteId,
        idPedido: pedidoId,
        precoUnitario: parseFloat(item.preco) || 0.0,
        quantidade: existente ? existente.quantidade : 0,
        subtotal: existente ? existente.subtotal : 0.0,
        tipo: isEntrada ? 'entrada' : 'saida',
        validade: item.validade || null,
        dataCadastro: existente
            ? existente.dataCadastro
            : agoraISO,
        ultimaAtualizacao: agoraISO
    };

    // ajusta quantidade e subtotal
    if (isEntrada) {
        loteObj.quantidade += item.quantidade;
        loteObj.subtotal += item.subtotal;
    } else {
        loteObj.quantidade -= item.quantidade;
        loteObj.subtotal -= item.subtotal;
        // se virar negativo, zera mas mantém o registro
        if (loteObj.quantidade < 0) {
            loteObj.quantidade = 0;
            loteObj.subtotal = 0.0;
        }
    }

    // assegura inteiros e floats corretos
    loteObj.quantidade = Math.floor(loteObj.quantidade);
    loteObj.subtotal = parseFloat(loteObj.subtotal.toFixed(2));
    loteObj.precoUnitario = parseFloat(loteObj.precoUnitario.toFixed(2));

    // grava de volta
    produto.lotes[loteId] = loteObj;

    // recalcula totais do produto
    const todos = Object.values(produto.lotes);
    produto.quantidadeEstoque = todos.reduce((sum, l) => sum + l.quantidade, 0);
    produto.valorEstoque = todos.reduce((sum, l) => sum + l.subtotal, 0);

    await produtoRef.set(produto);
}

// Função para verificar se um lote já foi usado anteriormente
async function verificarUsoAnteriorDoLote(produtoId, numeroLote) {
    const fornecedorId = document.getElementById('nomeAdicionar')?.value;
    if (!fornecedorId) return false;

    try {
        // Primeiro, verifique se o lote já existe no próprio produto
        const produtoRef = firebase.database().ref(`produto/${produtoId}`);
        const snapshotProduto = await produtoRef.once("value");
        const produto = snapshotProduto.val();

        if (produto && produto.lotes && produto.lotes[numeroLote]) {
            return true; // já existe, então não permitir recriar
        }

        // Agora verifica se já foi usado em pedidos antigos (mas não mais existe no produto)
        const snapshot = await firebase.database().ref("pedido").once("value");
        const pedidos = snapshot.val();

        if (!pedidos || Object.keys(pedidos).length === 0) return false;

        for (const pedidoKey in pedidos) {
            const pedido = pedidos[pedidoKey];
            if (!pedido || pedido.fornecedor !== fornecedorId) continue;
            if (pedido.tipoPedido !== 'Compra') continue;

            const itens = pedido.itensPedido || {};
            for (const itemKey in itens) {
                const item = itens[itemKey];
                if (!item) continue;

                if (
                    item.produtoId === produtoId &&
                    String(item.lote) === String(numeroLote) &&
                    produto?.lotes?.[item.lote] // só bloqueia se o lote ainda existir no produto
                ) {
                    return true;
                }
            }
        }

        return false;
    } catch (error) {
        console.error('Erro ao verificar uso anterior de lote:', error);
        return false;
    }
}

// Função para obter o próximo número de lote disponível
async function obterProximoNumeroLote(produtoId) {
    try {
        const fornecedorId = document.getElementById('nomeAdicionar')?.value;
        if (!fornecedorId) return 1;

        const snapshotPedidos = await firebase.database().ref("pedido").once("value");
        const pedidos = snapshotPedidos.val() || {};

        const lotesUsados = new Set();

        // 1. Lotes já usados em pedidos
        for (const pedidoKey in pedidos) {
            const pedido = pedidos[pedidoKey];
            if (pedido.fornecedor !== fornecedorId) continue;
            if (pedido.tipoPedido !== 'Compra') continue;

            const itens = pedido.itensPedido || {};
            for (const itemKey in itens) {
                const item = itens[itemKey];
                if (item.produtoId === produtoId && item.lote) {
                    lotesUsados.add(parseInt(item.lote));
                }
            }
        }

        // 2. Lotes ainda presentes no produto, inclusive zerados
        const produtoSnap = await firebase.database().ref(`produto/${produtoId}`).once("value");
        const produto = produtoSnap.val();
        if (produto?.lotes) {
            Object.values(produto.lotes).forEach(l => {
                if (l.lote) lotesUsados.add(parseInt(l.lote));
            });
        }

        // 3. Descobrir o menor número ainda não usado
        let proximoNumero = 1;
        while (lotesUsados.has(proximoNumero)) {
            proximoNumero++;
        }

        return proximoNumero;

    } catch (err) {
        return 1;
    }
}

// Função para obter o próximo lote disponível verificando se já foi usado
async function obterProximoLoteDisponivel(produtoId, loteInicial) {
    let loteAtual = loteInicial;
    let tentativas = 0;
    const MAX_TENTATIVAS = 100;

    // Verifica se o lote inicial já foi usado
    let loteJaUsado = await verificarUsoAnteriorDoLote(produtoId, loteAtual);

    // Incrementa até encontrar um lote disponível
    while (loteJaUsado && tentativas < MAX_TENTATIVAS) {
        loteAtual++;
        tentativas++;
        loteJaUsado = await verificarUsoAnteriorDoLote(produtoId, loteAtual);
    }

    return loteAtual;
}

// Atualização na função que configura os itens de entrada
function configurarItemEntrada(div) {
    const selectProduto = div.querySelector('select.produto-select');
    const inputLote = div.querySelector('.lote-item');
    const inputQuantidade = div.querySelector('input.quantidade-input');
    const btnRemover = div.querySelector('.botao-remover-item');

    btnRemover.addEventListener('click', () => {
        div.remove();
        atualizarTotalPedido();
    });

    selectProduto.addEventListener('change', async function () {
        const produtoId = this.value;
        if (!produtoId) {
            inputLote.value = '';
            return;
        }

        try {
            // Obtém o próximo número de lote base
            let loteBase = await obterProximoNumeroLote(produtoId);
            const ocorrenciasNaTela = contarOcorrenciasProdutoNaTela(produtoId, div);
            let numeroLote = Math.max(loteBase + ocorrenciasNaTela - 1, 1);

            // Obtém o próximo lote disponível (verificando se já foi usado)
            numeroLote = await obterProximoLoteDisponivel(produtoId, numeroLote);

            inputLote.value = numeroLote;
        } catch (err) {
            console.error('Erro ao definir lote:', err);
            inputLote.value = 1;
        }

        const unidadeSpan = div.querySelector('.unidade-produto');
        const produtoRef = firebase.database().ref(`produto/${produtoId}`);
        const snapshot = await produtoRef.once('value');
        const produto = snapshot.val();

        if (produto && produto.unidadeMedida) {
            unidadeSpan.textContent = produto.unidadeMedida;
        }

        inputQuantidade.disabled = false;
        calcularSubtotalItem(div);
    });

    inputQuantidade.addEventListener('input', () => {
        calcularSubtotalItem(div);
    });
}

function mostrarMensagem(texto, tipo = 'success') {
    const msg = document.createElement('div');
    msg.textContent = texto;
    msg.className = `mensagem-alerta ${tipo}`;
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 4000);
}

let eventosPedidosConfigurados = false;

function configurarEventosPedidos() {
    if (eventosPedidosConfigurados) return;
    eventosPedidosConfigurados = true;

    document.querySelector('main').addEventListener('click', async function (e) {
        const target = e.target;

        if (e.target.classList.contains('search-icon') && !e.target.classList.contains('ver-itens-icon')) {
            const linha = e.target.closest('tr');
            if (!linha) return;

            const firebaseKey = linha.getAttribute('data-key');
            const pedido = pedidos.find(p => p.firebaseKey === firebaseKey);
            if (!pedido) return;

            document.getElementById('visualizarID').textContent = pedido.numero || '(sem número)';

            const labelNome = document.getElementById('labelNome');
            const nomeVisualizar = document.getElementById('nomeVisualizar');

            if (pedido.tipoPedido === 'Compra') {
                buscarNomeFornecedorPorId(pedido.fornecedor).then(nome => {
                    labelNome.textContent = 'Fornecedor:';
                    nomeVisualizar.textContent = nome || '(sem nome)';
                });
            } else {
                labelNome.textContent = 'Cliente:';
                nomeVisualizar.textContent = pedido.nomeCliente || '(sem nome)';
            }

            const container = document.querySelector('.itens-visualizacao-container');
            container.innerHTML = '';

            const promessasItens = Object.values(pedido.itensPedido || {}).map(async (item) => {
                const div = document.createElement('div');
                div.classList.add('item-visualizado');

                const quantidade = item.quantidade || 0;
                const subtotal = item.subtotal || 0;
                const nomeProduto = item.nome || '';
                const validade = item.validade ? formatarData(item.validade) : '—';
                let lote = item.lote || '—';
                let textoLote = lote;

                if (item.tipoPedido === 'Venda') {
                    try {
                        const produtoRef = firebase.database().ref(`produto/${item.produtoId}`);
                        const snapshot = await produtoRef.once('value');
                        const produto = snapshot.val();

                        if (!produto?.lotes?.[lote]) {
                            textoLote += ' (zerado)';
                        }
                    } catch (e) { }
                }

                let unidade = 'un';
                if (pedido.tipoPedido === 'Venda') {
                    try {
                        const produtoRef = firebase.database().ref(`produto/${item.produtoId}`);
                        const snapshot = await produtoRef.once('value');
                        const produto = snapshot.val();
                        if (produto && produto.unidadeMedida) {
                            unidade = produto.unidadeMedida;
                        }
                    } catch (error) { }
                }

                if (pedido.tipoPedido === 'Venda') {
                    div.innerHTML = `
                    <div><strong>Produto:</strong> ${nomeProduto}</div>
                    <div><strong>Quantidade:</strong> ${quantidade} ${unidade}</div>
                    <div><strong>Subtotal:</strong> R$ ${parseFloat(subtotal).toFixed(2).replace('.', ',')}</div>
                    <div><strong>Lote:</strong> ${lote}</div>
                    <div><strong>Validade:</strong> ${validade}</div>
                    <hr>
                `;
                } else {
                    div.innerHTML = `
                    <div><strong>Produto:</strong> ${nomeProduto}</div>
                    <div><strong>Quantidade:</strong> ${quantidade}</div>
                    <div><strong>Subtotal:</strong> R$ ${parseFloat(subtotal).toFixed(2).replace('.', ',')}</div>
                    <div><strong>Validade:</strong> ${validade}</div>
                    <div><strong>Lote:</strong> ${lote}</div>
                    <hr>
                `;
                }
                return div;
            });

            Promise.all(promessasItens).then(divs => {
                divs.forEach(div => container.appendChild(div));

                if (pedido.tipoPedido === 'Venda' && pedido.fornecedor) {
                    buscarNomeFornecedorPorId(pedido.fornecedor).then(nomeFornecedor => {
                        const fornecedorDiv = document.createElement('div');
                        fornecedorDiv.classList.add('info-pedido');
                        fornecedorDiv.innerHTML = `<div><strong>Fornecedor:</strong> ${nomeFornecedor || '—'}</div>`;
                        container.insertBefore(fornecedorDiv, container.firstChild);
                    });
                }
            });

            const total = parseFloat(pedido.valor || 0).toFixed(2).replace('.', ',');
            document.getElementById('totalVisualizar').textContent = `R$ ${total}`;

            document.getElementById('modal-visualizar').style.display = 'flex';
        } else if (target.classList.contains('ver-itens-icon')) {
            const linha = target.closest('tr');
            if (!linha) return;

            const firebaseKey = linha.getAttribute('data-key');
            const pedido = pedidos.find(p => p.firebaseKey === firebaseKey);
            if (!pedido) return;

            const container = document.getElementById('itens-lista-visualizacao');
            container.innerHTML = '';

            const itens = pedido.itensPedido || {};

            for (const idItem in itens) {
                const item = itens[idItem];
                if (!item) continue;

                const div = document.createElement('div');
                div.innerHTML = `
                    <p><strong>Produto:</strong> ${item.nome || '(desconhecido)'}</p>
                    <p><strong>Quantidade:</strong> ${item.quantidade || 0}</p>
                    <p><strong>Subtotal:</strong> R$ ${parseFloat(item.subtotal || 0).toFixed(2).replace('.', ',')}</p>
                    ${pedido.tipoPedido === 'Compra' ? `
                    <p><strong>Validade:</strong> ${item.validade || '-'}</p>
                    <p><strong>Lote:</strong> ${item.lote || '-'}</p>
                    ` : ''}
                    <hr>
                `;
                container.appendChild(div);
            }

            document.getElementById('modal-visualizar-itens').style.display = 'flex';
        } else if (target.classList.contains('edit-icon')) {
            // 1) identifica pedido e modal
            const linha = target.closest('tr');
            if (!linha) return;

            const firebaseKey = linha.getAttribute('data-key');
            const pedido = pedidos.find(p => p.firebaseKey === firebaseKey);
            if (!pedido) return;

            editando = true;
            indiceParaEditar = firebaseKey;

            const isEntrada = pedido.tipoPedido === 'Compra';
            const modalId = isEntrada ? 'modal-entrada' : 'modal-saida';
            const modal = document.getElementById(modalId);
            const container = modal.querySelector('.itens-pedido-container');
            container.innerHTML = '';

            // 2) monta cada item do pedido
            for (const itemId of Object.keys(pedido.itensPedido)) {
                const itemData = pedido.itensPedido[itemId];
                if (!itemData) continue;

                // 2.1) checa se lote está encerrado (quantidade = 0)
                let encerrado = false;
                if (isEntrada) {
                    const snap = await firebase.database()
                        .ref(`produto/${itemData.produtoId}`)
                        .once('value');
                    const produto = snap.val() || {};
                    const loteInfo = produto.lotes?.[itemData.lote];
                    encerrado = !loteInfo || loteInfo.quantidade === 0;
                }

                // 2.2) cria o HTML do item-pedido
                const div = document.createElement('div');
                div.classList.add('item-pedido');
                div.innerHTML = `
            <div class="grupo-form">
                <label>Produto:</label>
                <select class="campo-form produto-select" required ${encerrado ? 'disabled' : ''}>
                    <option value="" disabled>Carregando...</option>
                </select>
            </div>
            <div class="grupo-form-duplo">
                <div>
                    <label>Quantidade</label>
                    <div style="display: flex; gap: 5px;">
                        <input type="number"
                               class="campo-form quantidade-input"
                               min="0"
                               value="${itemData.quantidade}"
                               required
                               ${encerrado ? 'disabled' : ''}
                               style="flex: 1;">
                        <span class="unidade-produto" style="padding-top: 8px;">—</span>
                    </div>
                </div>
                <div>
                    <label>Subtotal</label>
                    <input type="text"
                           class="campo-form subtotal-input"
                           value="R$ ${parseFloat(itemData.subtotal).toFixed(2).replace('.', ',')}"
                           readonly>
                </div>
            </div>
            ${isEntrada ? `
            <div class="grupo-form-duplo">
                <div>
                    <label>Validade</label>
                    <input type="date"
                           class="campo-form validade-item"
                           value="${itemData.validade || ''}"
                           required
                           ${encerrado ? 'disabled' : ''}>
                </div>
                <div>
                    <label>Lote</label>
                    <input type="text"
                           class="campo-form lote-item"
                           value="${itemData.lote || ''}"
                           readonly>
                </div>
            </div>` : ''}
            ${encerrado
                        ? `<small style="color: #c62828; display: block; margin-top: 4px;">
                     Lote encerrado — edição bloqueada
                   </small>`
                        : `<button type="button" class="botao-remover-item">Remover</button>`
                    }
        `;
                container.appendChild(div);

                // 2.3) referência aos campos e populações
                const select = div.querySelector('select.produto-select');
                const qtyInput = div.querySelector('.quantidade-input');
                const btnRemover = div.querySelector('.botao-remover-item');

                await carregarProdutos(select);
                select.value = itemData.produtoId;

                // 2.4) função que recalcula item + total
                const onItemChange = () => {
                    calcularSubtotalItem(div);
                    atualizarTotalPedido();
                };

                // 2.5) aplica estado encerrado ou adiciona listeners
                if (encerrado) {
                    select.disabled = true;
                    qtyInput.disabled = true;
                    select.style.opacity = '0.6';
                    qtyInput.style.opacity = '0.6';
                } else {
                    select.addEventListener('change', onItemChange);
                    qtyInput.addEventListener('input', onItemChange);

                    if (btnRemover) {
                        btnRemover.addEventListener('click', () => {
                            div.remove();
                            atualizarTotalPedido();
                        });
                    }
                    calcularSubtotalItem(div);
                }
            }

            // 3) após montar todos os itens, garante total correto (incluindo bloqueados)
            atualizarTotalPedido();

            // 4) preenche fornecedor/cliente e exibe modal
            await carregarFornecedores();
            if (isEntrada) {
                document.getElementById('nomeAdicionar').value = pedido.fornecedor || '';
            } else {
                document.getElementById('nomeAdicionarSaida').value = pedido.nomeCliente || '';
            }
            modal.style.display = 'flex';
        }
        else if (target.classList.contains('delete-icon')) {
            const linha = target.closest('tr');
            if (!linha) return;

            const firebaseKey = linha.getAttribute('data-key');
            const pedido = pedidos.find(p => p.firebaseKey === firebaseKey);
            if (!pedido) return;

            firebaseKeyParaExcluir = firebaseKey;
            const modal = document.getElementById('modal-confirmar-exclusao');
            const titulo = modal.querySelector('h4');
            const subtitulo = modal.querySelector('p');
            titulo.textContent = 'Deseja realmente excluir este pedido?';
            subtitulo.textContent = 'Essa ação não poderá ser desfeita.';
            modal.setAttribute('data-multiplos', 'false');
            modal.style.display = 'flex';
        }
    });

    document.querySelector('main').addEventListener('change', e => {
        if (e.target.classList.contains('selecionar-pedido')) {
            atualizarBotaoExcluirSelecionados();
        }
    });

    // Variáveis de estado (já declaradas no seu escopo geral)
    let multiplos = false;                   // se estou em “bulk delete”
    let firebaseKeyParaExcluir = null;       // chave única, se for single delete
    let selectedKeys = [];                   // lista de chaves marcadas, se bulk delete
    // Array pedidos já carregado em memória, cada objeto tem .firebaseKey e .itensPedido

    // Botão de confirmação da modal “Excluir”
    const btnConfirmarExcluir = document.getElementById('btn-confirmar-excluir');
    btnConfirmarExcluir.addEventListener('click', async () => {
        try {
            // 1) Define quais pedidos vamos apagar
            const keysToDelete = multiplos
                ? selectedKeys.slice()             // cópia do array de marcados
                : [firebaseKeyParaExcluir];       // single-delete

            if (keysToDelete.length === 0) {
                mostrarMensagem('Nenhum pedido selecionado para exclusão.', 'error');
                return;
            }

            // 2) Constrói um mapa para agrupar e reverter estoque por produto+lote
            const revertMap = {};
            for (const key of keysToDelete) {
                const pedido = pedidos.find(p => p.firebaseKey === key);
                if (!pedido) continue;

                const wasEntrada = pedido.tipoPedido === 'Compra';
                const isReversao = !wasEntrada;
                const itens = Object.values(pedido.itensPedido || {});

                for (const item of itens) {
                    const mapKey = `${item.produtoId}|${item.lote}|${isReversao}`;
                    if (!revertMap[mapKey]) {
                        revertMap[mapKey] = {
                            produtoId: item.produtoId,
                            lote: item.lote,
                            quantidade: 0,
                            subtotal: 0,
                            isReversao,
                            pedidoId: key,
                            validade: item.validade
                        };
                    }
                    revertMap[mapKey].quantidade += item.quantidade;
                    revertMap[mapKey].subtotal += item.subtotal;
                }
            }

            // 3) Para cada grupo, chama atualizarEstoqueProduto e, se zerar, remove lote
            for (const entry of Object.values(revertMap)) {
                // entry: {produtoId, lote, quantidade, subtotal, isReversao, pedidoId, validade}
                await atualizarEstoqueProduto({
                    produtoId: entry.produtoId,
                    lote: entry.lote,
                    quantidade: entry.quantidade,
                    preco: entry.subtotal / entry.quantidade, // opcional: unitário
                    subtotal: entry.subtotal,
                    validade: entry.validade
                }, entry.isReversao, entry.pedidoId);

                // após a reversão, verifica se o lote ficou completamente vazio
                const loteRef = firebase.database().ref(
                    `produto/${entry.produtoId}/lotes/${entry.lote}`
                );
                const lotSnap = await loteRef.once('value');
                const lotObj = lotSnap.val();
                if (lotObj
                    && lotObj.quantidade === 0
                    && lotObj.subtotal === 0
                ) {
                    await loteRef.remove();
                }
            }

            // 4) Só então remove os pedidos do nó /pedido
            for (const key of keysToDelete) {
                await firebase.database().ref(`pedido/${key}`).remove();
            }

            // 5) Cleanup UI & estado
            mostrarMensagem(
                multiplos
                    ? 'Pedidos excluídos com sucesso!'
                    : 'Pedido excluído com sucesso!',
                'success'
            );
            document.getElementById('modal-confirmar-exclusao').style.display = 'none';
            // reset flags
            multiplos = false;
            firebaseKeyParaExcluir = null;
            selectedKeys = [];
            // (se você usar checkboxes, desmarque-os aqui)

            // 6) Recarrega a tabela de pedidos
            carregarPedidosDoFirebase();

        } catch (error) {
            console.error('Erro ao reverter/excluir pedido(s):', error);
            mostrarMensagem('Não foi possível excluir o(s) pedido(s)!', 'error');
        }
    });

    document.getElementById('btn-cancelar-excluir').addEventListener('click', () => {
        firebaseKeyParaExcluir = null;
        document.getElementById('modal-confirmar-exclusao').style.display = 'none';
    });
}

document.getElementById('input-pesquisa-pedidos').addEventListener('input', () => {
    if (tipoAtual === 'entrada') {
        paginaAtualEntradas = 1;
    } else {
        paginaAtualSaidas = 1;
    }
    atualizarTabelaPedidos();
});

function aplicarFiltrosOrdenacao(lista) {
    const criterio = document.getElementById('ordenar-pedidos')?.value;

    return lista.slice().sort((a, b) => {
        const timestampA = new Date(a.data).getTime();
        const timestampB = new Date(b.data).getTime();

        const dataAValida = !isNaN(timestampA);
        const dataBValida = !isNaN(timestampB);

        if (criterio === 'data-asc') {
            if (!dataAValida) return 1;
            if (!dataBValida) return -1;
            return timestampA - timestampB;
        }
        else if (criterio === 'data-desc') {
            if (!dataAValida) return 1;
            if (!dataBValida) return -1;
            return timestampB - timestampA;
        }
        else if (criterio === 'total-asc') {
            return (a.valor || 0) - (b.valor || 0);
        }
        else if (criterio === 'total-desc') {
            return (b.valor || 0) - (a.valor || 0);
        }
        else {
            return 0;
        }
    });
}

function contarOcorrenciasProdutoNaTela(produtoId) {
    const itens = document.querySelectorAll('#modal-entrada .item-pedido');
    let count = 0;

    itens.forEach(item => {
        const select = item.querySelector('select.produto-select');
        if (select && select.value === produtoId) {
            count++;
        }
    });

    return count;
}

function configurarProdutoDinamico(div, isEntrada) {
    const selectProduto = div.querySelector('select.produto-select');
    let inputQuantidade = div.querySelector('input.quantidade-input');
    const inputLoteText = div.querySelector('.lote-item');          // só em entrada
    const selectLote = isEntrada ? null : div.querySelector('select.lote-select');
    const inputValidade = div.querySelector('input.validade-input');
    const inputSubtotal = div.querySelector('input.subtotal-input');
    const unidadeSpan = div.querySelector('.unidade-produto');
    const btnRemover = div.querySelector('.botao-remover-item');

    // 1) Remover o item
    btnRemover.addEventListener('click', () => {
        div.remove();
        atualizarTotalPedido();
    });

    // 2) Quando selecionar um produto
    selectProduto.addEventListener('change', async () => {
        const produtoId = selectProduto.value;

        // ── reset de campos ──
        inputQuantidade.value = 1;
        inputQuantidade.disabled = true;
        if (selectLote) {
            selectLote.innerHTML = '<option value="" disabled selected>Selecione o produto primeiro</option>';
            selectLote.disabled = true;
        }
        inputValidade.value = '';
        inputSubtotal.value = 'R$ 0,00';
        unidadeSpan.textContent = '';

        // ── remove listeners antigos do inputQuantidade ──
        const novoQty = inputQuantidade.cloneNode(true);
        inputQuantidade.parentNode.replaceChild(novoQty, inputQuantidade);
        inputQuantidade = novoQty;

        if (!produtoId) return;

        // ── busca dados do produto ──
        const snap = await firebase.database().ref(`produto/${produtoId}`).once('value');
        const produto = snap.val() || {};
        if (produto.unidadeMedida) {
            unidadeSpan.textContent = produto.unidadeMedida;
        }

        // habilita quantidade
        inputQuantidade.disabled = false;

        if (isEntrada) {
            // ── fluxo de ENTRADA ──
            if (inputLoteText) {
                try {
                    const base = await obterProximoNumeroLote(produtoId);
                    const occ = contarOcorrenciasProdutoNaTela(produtoId);
                    inputLoteText.value = Math.max(base + occ - 1, 1);
                } catch {
                    inputLoteText.value = 1;
                }
            }

            // recalcula só no input da quantidade
            inputQuantidade.addEventListener('input', () => calcularSubtotalItem(div));
            calcularSubtotalItem(div);

        } else {
            // ── fluxo de SAÍDA ──
            if (!selectLote || !inputValidade) return;

            // popula o select de lotes
            selectLote.disabled = false;
            await carregarLotesDoProduto(produtoId, selectLote, inputValidade);

            // recalcula ao trocar lote
            selectLote.addEventListener('change', () => calcularSubtotalItem(div));
            // recalcula ao mudar quantidade
            inputQuantidade.addEventListener('input', () => calcularSubtotalItem(div));

            // cálculo inicial (caso já haja uma opção selecionada)
            calcularSubtotalItem(div);
        }
    });
}
