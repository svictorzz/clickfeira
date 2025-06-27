const pedidos = [];
const idComerciante = localStorage.getItem('idComerciante') || sessionStorage.getItem('idComerciante');
let paginaAtualEntradas = 1;
let paginaAtualSaidas = 1;
const itensPorPagina = 10;
let itemCounter = 1;
let indiceParaEditar = null;
let firebaseKeyParaExcluir = null;
let multiplos = false;
let selectedKeys = [];
let tipoAtual = 'entrada';
let editando = false;
let eventosPedidosConfigurados = false;

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

    document.getElementById('btnAbrirModal').addEventListener('click', async () => {
        const titulo = tipoAtual === 'entrada' ? 'titulo-modal-pedido' : 'titulo-modal-saida';
        document.getElementById(titulo).textContent = 'Pedido';
        editando = false;
        indiceParaEditar = null;
        itemCounter = 1;

        const contadorLotes = {};

        if (tipoAtual === 'entrada') {
            const modal = document.getElementById('modal-entrada');
            modal.querySelector('.adicionar-mais-item').classList.remove('inativo');
            const container = modal.querySelector('.itens-pedido-container');
            container.innerHTML = '';
            document.getElementById('nomeAdicionar').selectedIndex = 0;

            modal.style.display = 'flex';
            document.getElementById('totalAdicionar').textContent = "0,00";
            if (!editando && !modal.querySelector('.modal-order-number').textContent) {
                modal.querySelector('.modal-order-number').textContent = gerarCodigoPedido();
            }
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

                    // 1) Conta ocorrências do produto (ignorando o item atual)
                    const ocorrencias = contarOcorrenciasProdutoNaTela(produtoId, div);

                    // 2) Busca o próximo lote disponível
                    try {
                        const loteBase = await obterProximoNumeroLote(produtoId);
                        const numeroLote = loteBase + ocorrencias;
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

            const loteAtual = itemCounter;

            container.appendChild(div);
            configurarItemEntrada(div);

            // VERIFICAÇÃO DO FORNECEDOR MOVIDA PARA AQUI
            const fornecedorId = document.getElementById('nomeAdicionar').value;
            if (fornecedorId) {
                const selectProduto = div.querySelector('select.produto-select');
                selectProduto.disabled = false;
                await carregarProdutos(selectProduto, fornecedorId);
            }

        } else {
            const modal = document.getElementById('modal-saida');
            modal.querySelector('.itens-pedido-container').innerHTML = '';
            modal.style.display = 'flex';
            document.getElementById('totalAdicionarSaida').textContent = "0,00";
            modal.querySelector('.modal-order-number').textContent = gerarCodigoPedido();

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

    document.getElementById('btn-exportar-entradas').addEventListener('click', () => {
        exportarPedidosParaCSV('entrada');
    });
    document.getElementById('btn-exportar-saidas').addEventListener('click', () => {
        exportarPedidosParaCSV('saida');
    });

    // Entradas
    document.getElementById('selecionar-todos-entradas').addEventListener('change', e => {
        document
            .querySelectorAll('#lista-pedidos-entradas .selecionar-pedido')
            .forEach(cb => cb.checked = e.target.checked);
        atualizarBotaoExcluirSelecionados();
    });

    // Saídas
    document.getElementById('selecionar-todos-saidas').addEventListener('change', e => {
        document
            .querySelectorAll('#lista-pedidos-saidas .selecionar-pedido')
            .forEach(cb => cb.checked = e.target.checked);
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

            // HTML base (produto + quantidade)
            let html = `
      <div class="grupo-form">
        <label>Produto:</label>
        <select class="campo-form produto-select" required disabled>
          <option value="" disabled selected>Selecione um fornecedor primeiro</option>
        </select>
      </div>
      <div class="grupo-form">
        <label>Quantidade:</label>
        <div style="display: flex; gap: 5px;">
          <input type="number" class="campo-form quantidade-input" min="1" value="1" required disabled style="flex: 1;">
          <span class="unidade-produto" style="min-width: 40px; padding-top: 8px;">—</span>
        </div>
      </div>`;

            if (isEntrada) {
                html += `
    <div class="grupo-form">
      <label>Lote:</label>
      <input type="text" class="campo-form lote-item" readonly required>
    </div>
    <div class="grupo-form">
      <label>Validade:</label>
      <input type="date" class="campo-form validade-input" required>
    </div>
    <div class="grupo-form">
      <label>Subtotal:</label>
      <input type="text" class="campo-form subtotal-input" value="0,00" readonly>
    </div>
    <button type="button" class="botao-remover-item" style="display: block;">Remover</button>
    `;
            }
            else {
                // somente no modal de saída, para cada item adicional
                html = `
    <div class="grupo-form">
      <label>Fornecedor:</label>
      <select class="campo-form fornecedor-select" required>
        <option value="" disabled selected>Selecione fornecedor</option>
      </select>
    </div>
    <div class="grupo-form">
      <label>Produto:</label>
      <select class="campo-form produto-select" required disabled>
        <option value="" disabled selected>Selecione um fornecedor primeiro</option>
      </select>
    </div>
    <div class="grupo-form">
      <label>Quantidade:</label>
      <div style="display: flex; gap: 5px;">
        <input type="number" class="campo-form quantidade-input"
               min="1" value="1" required disabled style="flex: 1;">
        <span class="unidade-produto"
              style="min-width: 40px; padding-top: 8px;">—</span>
      </div>
    </div>
    <div class="grupo-form">
      <label>Lote:</label>
      <select class="campo-form lote-select" required disabled>
        <option value="" disabled selected>Selecione o produto primeiro</option>
      </select>
    </div>
    <div class="grupo-form">
      <label>Validade:</label>
      <input type="date" class="campo-form validade-input"
             readonly required>
    </div>
    <div class="grupo-form">
      <label>Subtotal:</label>
      <input type="text" class="campo-form subtotal-input"
             value="0,00" readonly>
    </div>
    <button type="button" class="botao-remover-item"
            style="display: ${mostrarRemoverBtn ? 'block' : 'none'};">
      Remover
    </button>
  `;
            }
            div.innerHTML = html;
            container.appendChild(div);
            await configurarItemEntrada(div);
            atualizarEstadoRemoverItens(modal);
            if (isEntrada) {
                // VERIFICAÇÃO DO FORNECEDOR AQUI
                const fornecedorId = document.getElementById('nomeAdicionar').value;
                if (fornecedorId) {
                    const selectProduto = div.querySelector('select.produto-select');
                    if (selectProduto) {
                        selectProduto.disabled = false;
                        await carregarProdutos(selectProduto, fornecedorId);
                    }
                }
            } else {
                configurarItemSaida(div);
                // carrega a lista de fornecedores para este item de saída
                await carregarFornecedoresNoItem(div);
            }
        });
    });
});

async function carregarFornecedoresNoItem(itemDiv) {
    const selectFornecedor = itemDiv.querySelector('select.fornecedor-select');
    if (!selectFornecedor) return;

    selectFornecedor.innerHTML = '<option value="" selected disabled>Selecione...</option>';

    const fornecedoresRef = firebase.database().ref('fornecedor');
    const snapshot = await fornecedoresRef.once('value');

    snapshot.forEach(child => {
        const fornecedor = child.val();
        const opt = document.createElement('option');
        opt.value = child.key;
        opt.textContent = fornecedor.nome;
        selectFornecedor.appendChild(opt);
    });

    // Configurar evento para carregar produtos quando selecionar fornecedor
    selectFornecedor.addEventListener('change', async function () {
        const selectProduto = itemDiv.querySelector('select.produto-select');
        const selectLote = itemDiv.querySelector('select.lote-select');
        const inputQuantidade = itemDiv.querySelector('input.quantidade-input');

        selectProduto.disabled = true;
        selectLote.disabled = true;
        inputQuantidade.disabled = true;

        if (this.value) {
            selectProduto.disabled = false;
            await carregarProdutos(selectProduto, this.value);
        } else {
            selectProduto.innerHTML = '<option value="" selected disabled>Selecione um fornecedor primeiro</option>';
        }
    });
}

function configurarItemSaida(div) {
    const btnRemover = div.querySelector('.botao-remover-item');
    btnRemover.addEventListener('click', () => {
        div.remove();
        atualizarTotalPedido();
    });

    // Configurar evento para quando produto for selecionado
    const selectProduto = div.querySelector('select.produto-select');
    selectProduto.addEventListener('change', async function () {
        const selectLote = div.querySelector('select.lote-select');
        const inputValidade = div.querySelector('input.validade-input');
        const inputQuantidade = div.querySelector('input.quantidade-input');

        if (this.value) {
            selectLote.disabled = false;
            await carregarLotesDoProduto(this.value, selectLote, inputValidade);
            inputQuantidade.disabled = false;
        } else {
            selectLote.disabled = true;
            inputQuantidade.disabled = true;
        }
    });

    // Configurar eventos para cálculo
    const inputQuantidade = div.querySelector('input.quantidade-input');
    const selectLote = div.querySelector('select.lote-select');

    inputQuantidade.addEventListener('input', () => calcularSubtotalItem(div));
    selectLote.addEventListener('change', () => calcularSubtotalItem(div));
}

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
    const selects = document.querySelectorAll('#nomeAdicionar');
    selects.forEach(select => {
        select.innerHTML = '<option value="" disabled selected>Selecione...</option>';
    });

    const fornecedoresRef = firebase.database().ref('fornecedor');
    // **retornamos** a promise para podermos await nela
    return fornecedoresRef.once('value')
        .then(snapshot => {
            const fornecedores = [];
            snapshot.forEach(child => {
                fornecedores.push({ key: child.key, nome: child.val().nome });
            });
            selects.forEach(select => {
                fornecedores.forEach(f => {
                    const opt = document.createElement('option');
                    opt.value = f.key;
                    opt.textContent = f.nome;
                    select.appendChild(opt);
                });
            });
        })
        .catch(error => {
            console.error("Erro ao carregar fornecedores:", error);
        });
}

// Atualize a função carregarProdutos
function carregarProdutos(selectEspecifico = null, fornecedorId = null) {
    const produtosRef = firebase.database().ref('produto');
    return produtosRef.once('value')
        .then(snapshot => {
            const produtos = snapshot.val() || {};
            const opcoes = [];

            Object.entries(produtos).forEach(([key, produto]) => {
                // **SÓ monta option se o produto pertencer ao fornecedor selecionado**
                if (fornecedorId && produto.fornecedorId !== fornecedorId) return;

                const precoBase = parseFloat(produto.preco || '0');
                const precoporVal = parseInt(produto.precoPor || '1', 10);
                const precoUnit = precoBase / precoporVal;

                const option = document.createElement('option');
                option.value = key;
                option.textContent = produto.nome;
                option.dataset.precoBase = precoBase;
                option.dataset.precopor = precoporVal;
                option.dataset.precounitario = precoUnit;
                option.dataset.unidademedida = produto.unidadeMedida;
                opcoes.push(option.outerHTML);
            });

            const htmlCompleto = opcoes.length
                ? '<option value="" disabled selected>Selecione...</option>' + opcoes.join('')
                : '<option value="" disabled selected>Nenhum produto encontrado</option>';

            if (selectEspecifico) {
                selectEspecifico.innerHTML = htmlCompleto;
                selectEspecifico.disabled = false;
            } else {
                document.querySelectorAll('.produto-select').forEach(sel => {
                    sel.innerHTML = htmlCompleto;
                    sel.disabled = false;
                });
            }
        })
        .catch(err => console.error('Erro ao carregar produtos:', err));
}

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

function atualizarEstadoRemoverItens(modal) {
    const botoes = Array.from(modal.querySelectorAll('.botao-remover-item'));
    if (botoes.length <= 1) {
        // Se só houver 1 ou nenhum item, desabilita TODOS os Remover
        botoes.forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.pointerEvents = 'none';
        });
    } else {
        // Se houver ≥2 itens, habilita TODOS os Remover
        botoes.forEach(btn => {
            btn.disabled = false;
            btn.style.opacity = '';
            btn.style.pointerEvents = '';
        });
    }
}

function gerarCodigoPedido() {
    let novoCodigo;
    do {
        novoCodigo = 'PED-' + Math.floor(10000 + Math.random() * 90000);
    } while (pedidos.some(p => p.codigoPedido === novoCodigo));
    return novoCodigo;
}

function formatarData(dataStr) {
    const [ano, mes, dia] = dataStr.split('-');
    return `${dia}/${mes}/${ano}`;
}

function atualizarBotaoExcluirSelecionados() {
    const tbodyId = tipoAtual === 'entrada'
        ? 'lista-pedidos-entradas'
        : 'lista-pedidos-saidas';
    const count = document.querySelectorAll(
        `#${tbodyId} .selecionar-pedido:checked`
    ).length;
    const btn = document.getElementById('btn-excluir-selecionados');
    btn.style.display = count > 0 ? 'inline-block' : 'none';
}

function excluirSelecionados() {
    // 1) escolhe o tbody correto
    const tbodyId = tipoAtual === 'entrada'
        ? 'lista-pedidos-entradas'
        : 'lista-pedidos-saidas';

    // 2) pega só os checkboxes marcados nessa tabela
    const selecionados = Array.from(
        document.querySelectorAll(`#${tbodyId} .selecionar-pedido:checked`)
    );
    if (selecionados.length === 0) return;

    // 3) armazena as chaves e habilita o modo múltiplo
    selectedKeys = selecionados.map(cb => cb.closest('tr').dataset.key);
    multiplos = true;
    firebaseKeyParaExcluir = null;

    // 4) configura e exibe o modal com mensagem adequada
    const modal = document.getElementById('modal-confirmar-exclusao');
    const titulo = modal.querySelector('h4');
    const subtitulo = modal.querySelector('p');

    if (tipoAtual === 'saida') {
        titulo.textContent = `Deseja realmente excluir ${selectedKeys.length} saída(s)?`;
        subtitulo.textContent = 'Esta(s) saída(s) será(ão) removida(s) e a(s) quantidade(s) reabastecida(s) no lote.';
    } else {
        titulo.textContent = `Deseja realmente excluir ${selectedKeys.length} pedido(s)?`;
        subtitulo.textContent = 'Estes pedidos e todas as saídas associadas serão removidos.';
    }

    modal.style.display = 'flex';
}

async function confirmarExclusaoEntrada(keys) {
    const single = keys.length === 1;
    const total = keys.length;

    // 1) Título
    document.getElementById('titulo-confirmacao').textContent =
        single ? 'Excluir esta entrada?' : `Excluir ${total} pedido(s)?`;

    // 2) Mensagem fixa de cascade
    document.getElementById('mensagem-confirmacao').textContent =
        single
            ? 'Esta entrada e todas as saídas associadas serão removidas.'
            : 'Estes pedidos e todas as saídas associadas serão removidos.';

    // 3) Flags
    firebaseKeyParaExcluir = single ? keys[0] : null;
    selectedKeys = keys.slice();
    multiplos = !single;

    // 4) Abre modal
    document.getElementById('modal-confirmar-exclusao').style.display = 'flex';
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
                pedido.nomeFornecedor = await buscarNomeFornecedorPorId(pedido.idFornecedor);
            } else {
                pedido.nomeCliente = pedido.nomeCliente || '—';
            }
        });

        Promise.all(promessas).then(() => atualizarTabelaPedidos());
    });
}

async function adicionarLinhaTabelaPedido(pedido, tbody) {
    // 1) Cria a linha e define a chave
    const row = document.createElement('tr');
    row.dataset.key = pedido.firebaseKey;

    // 2) Formata os campos básicos
    const codigo = pedido.codigoPedido || pedido.firebaseKey.slice(-5).toUpperCase();
    const dataFormatada = pedido.data ? formatarData(pedido.data) : '—';
    const itens = pedido.itensPedido || {};
    const qtdItens = Object.keys(itens).length;
    const total = Number(pedido.valor) || 0;
    const totalFormatado = `R$ ${total.toFixed(2).replace('.', ',')}`;

    // 3) Monta o HTML da linha
    row.innerHTML = `
      <td><input type="checkbox" class="selecionar-pedido"></td>
      <td data-label="ID Pedido: ">${codigo}</td>
      <td data-label="Fornecedor: ">Carregando...</td>
      <td data-label="Data: ">${dataFormatada}</td>
      <td data-label="Produtos: ">${qtdItens} <i class="fa fa-search search-icon ver-itens-icon"></i></td>
      <td data-label="Total: ">${totalFormatado}</td>
      <td class="col-consultar" data-label="Consultar"><i class="fa fa-search search-icon"></i></td>
      <td class="col-editar"     data-label="Editar"><i class="fa fa-edit edit-icon"></i></td>
      <td class="col-excluir"    data-label="Excluir"><i class="fa fa-trash delete-icon"></i></td>
    `;
    tbody.appendChild(row);

    // 4) Verifica se todos os lotes deste pedido estão zerados
    let totalItens = 0, lotesZerados = 0;
    for (const chave in itens) {
        totalItens++;
        const item = itens[chave];
        const loteSnap = await firebase.database()
            .ref(`produto/${item.idProduto}/lotes/${item.lote}`)
            .once('value');
        const loteInfo = loteSnap.val();
        if (!loteInfo || loteInfo.quantidade <= 0) {
            lotesZerados++;
        }
    }
    if (totalItens > 0 && lotesZerados === totalItens) {
        row.classList.add('lote-encerrado');
        row.title = 'Todos os lotes deste pedido foram encerrados';
        ['.edit-icon', '.delete-icon'].forEach(selector => {
            const btn = row.querySelector(selector);
            if (btn) {
                btn.style.pointerEvents = 'none';
                btn.style.opacity = '0.3';
            }
        });
    }

    // 5) Preenche o nome do fornecedor (ou cliente, no caso de saída)
    const celulaFornecedor = row.querySelector('td[data-label="Fornecedor: "]');
    if (pedido.tipoPedido === 'Compra') {
        try {
            const nome = await buscarNomeFornecedorPorId(pedido.idFornecedor);
            celulaFornecedor.textContent = nome;
        } catch {
            celulaFornecedor.textContent = '(erro ao carregar)';
        }
    } else {
        celulaFornecedor.textContent = pedido.nomeCliente || '—';
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

        const numero = p.codigoPedido?.toLowerCase?.() || '';
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

/**
 * Varre o modal (entrada ou saída) e monta
 * o array de itens a salvar. Ignora itens de lote zerado.
 */
function obterItensPedido() {
    const modal = tipoAtual === 'entrada'
        ? document.getElementById('modal-entrada')
        : document.getElementById('modal-saida');
    const itensContainers = modal.querySelectorAll('.item-pedido');
    const itens = [];

    itensContainers.forEach(item => {
        // se o campo quantidade estiver disabled, pula (lote encerrado)
        const quantidadeInput = item.querySelector('input.quantidade-input');
        if (quantidadeInput && quantidadeInput.disabled) return;

        const produtoSelect = item.querySelector('select.produto-select');
        const subtotalInput = item.querySelector('input.subtotal-input');
        const unidadeSpan = item.querySelector('.unidade-produto');
        const validadeInput = item.querySelector('input.validade-input')
            || item.querySelector('input.validade-item');

        const produtoId = produtoSelect?.value;
        const nome = produtoSelect?.options[produtoSelect.selectedIndex]?.textContent || '';
        const quantidade = parseFloat(quantidadeInput?.value || 0);
        if (!produtoId || quantidade <= 0) return;

        const subtotalStr = subtotalInput?.value
            .replace('R$', '')
            .trim()
            .replace('.', '')
            .replace(',', '.') || '0';
        const subtotal = parseFloat(subtotalStr);
        const unidadeMedida = unidadeSpan?.textContent.trim() || 'un';
        let lote = '';
        if (tipoAtual === 'entrada') {
            const inputLote = item.querySelector('input.lote-item');
            lote = inputLote?.value.trim() || '';
        } else {
            const selectLote = item.querySelector('select.lote-select');
            lote = selectLote?.value || '';
        }
        const validade = validadeInput?.value || null;
        const preco = subtotal / (quantidade || 1);

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
    });

    return itens;
}

async function handlePedidoSubmit(e) {
    e.preventDefault();

    // 1) Determina se é entrada ou saída
    const isEntrada = tipoAtual === 'entrada';
    const fornecedorId = isEntrada
        ? document.getElementById('nomeAdicionar')?.value
        : null;

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
            const disponivel = produto.lotes
                ? (produto.lotes[item.lote]?.quantidade || 0)
                : (produto.quantidadeEstoque || 0);
            if (disponivel < item.quantidade) {
                alert(`❌ Estoque insuficiente para "${item.nome}".\nDisponível: ${disponivel}\nSolicitado: ${item.quantidade}`);
                return;
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

    // 8) Se estivermos editando, REVERTE corretamente a movimentação antiga
    if (editando) {
        const oldSnap = await firebase.database().ref(`pedido/${pedidoId}/itensPedido`).once('value');
        const itensAntigos = oldSnap.val() || {};

        for (const chave in itensAntigos) {
            const antigo = itensAntigos[chave];
            // normaliza para a estrutura esperada por atualizarEstoqueProduto
            const itemReversao = {
                produtoId: antigo.produtoId || antigo.idProduto,
                lote: antigo.lote,
                quantidade: antigo.quantidade,
                subtotal: antigo.subtotal,
                validade: antigo.validade || antigo.validade,
                unidadeMedida: antigo.unidadeMedida
            };
            // inverte sinal: se era entrada, trata como saída e vice-versa
            await atualizarEstoqueProduto(itemReversao, !isEntrada, pedidoId);
        }
    }

    // 9) Monta o objeto do pedido (com novos atributos)
    const novoPedido = {
        codigoPedido: numeroPedido,
        tipoPedido: isEntrada ? 'Compra' : 'Venda',
        data: dataAtual,
        valor: calcularTotalPedido(itensNovos),
        idComerciante: idComerciante,
        idFornecedor: fornecedorId,
        nomeCliente: !isEntrada
            ? document.getElementById('nomeAdicionarSaida').value.trim() || 'Cliente não identificado'
            : null,
        itensPedido: {}
    };
    itensNovos.forEach((item, idx) => {
        novoPedido.itensPedido[`item${idx}`] = {
            idProduto: item.produtoId,
            nome: item.nome,
            quantidade: item.quantidade,
            subtotal: item.subtotal,
            validade: item.validade,
            lote: item.lote,
            unidadeMedida: item.unidadeMedida
        };
    });

    try {
        // 10) Grava ou sobrescreve no Firebase
        await pedidoRef.set(novoPedido);

        //gravar histórico
        const tipoHistorico = editando
            ? `Edição de estoque (${isEntrada ? 'Entrada' : 'Saída'})`
            : `Movimentação de estoque (${isEntrada ? 'Entrada' : 'Saída'})`;

        // registra UMA entrada no histórico para CADA item
        for (const item of itensNovos) {
            const nome = item.nome || 'item';
            const acao = editando ? 'editado' : 'cadastrado';
            const descricao = `Pedido ${numeroPedido} - ${nome} ${acao}.`;
            registrarHistorico(tipoHistorico, descricao);
        }

        // 11) Aplica as movimentações dos itens atuais
        for (const item of itensNovos) {
            await atualizarEstoqueProduto(item, isEntrada, pedidoId);
        }

        // 12) Feedback e limpeza de flags
        mostrarMensagem('Pedido salvo com sucesso!', 'success');
        editando = false;
        indiceParaEditar = null;

        // 13) Fecha modal e recarrega lista
        document.getElementById(isEntrada ? 'modal-entrada' : 'modal-saida').style.display = 'none';
        setTimeout(() => {
            carregarPedidosDoFirebase();
            atualizarTabelaPedidos();
        }, 500);

    } catch (error) {
        console.error('Erro ao salvar pedido:', error);
        mostrarMensagem('Erro ao salvar pedido!', 'error');
    }
}

async function obterSaidasAssociadas(pedidoEntrada) {
    const saidasSet = new Set();
    const snap = await firebase.database().ref('pedido').once('value');
    const todos = snap.val() || {};
    const lotesEntrada = Object.values(pedidoEntrada.itensPedido || {}).map(i => i.lote);
    Object.entries(todos).forEach(([fk, p]) => {
        if (p.tipoPedido === 'Venda' &&
            Object.values(p.itensPedido || {}).some(item => lotesEntrada.includes(item.lote))
        ) {
            saidasSet.add(fk);
        }
    });
    return Array.from(saidasSet);
}

// Função para calcular o total do pedido
function calcularTotalPedido(itensPedido) {
    // Garantir que está somando números válidos
    return itensPedido.reduce((total, item) => {
        const subtotal = parseFloat(item.subtotal) || 0;
        return total + subtotal;
    }, 0);
}

// Função auxiliar para atualizar estoque do produto
async function atualizarEstoqueProduto(item, isEntrada, pedidoId) {
    const produtoId = item.produtoId || item.idProduto;
    const produtoRef = firebase.database().ref(`produto/${produtoId}`);
    const snap = await produtoRef.once('value');
    const produto = snap.val() || { lotes: {}, quantidadeEstoque: 0, valorEstoque: 0 };

    produto.lotes = produto.lotes || {};
    const loteId = String(item.lote);
    const existente = produto.lotes[loteId];
    const agoraISO = new Date().toISOString();

    // monta objeto base
    const loteObj = {
        numero: loteId,
        idPedido: pedidoId,
        precoUnitario: parseFloat(item.preco) || 0.0,
        quantidade: existente?.quantidade ?? 0,
        subtotal: existente?.subtotal ?? 0.0,
        tipo: isEntrada ? 'entrada' : 'saida',
        validade: item.validade || null,
        dataCadastro: existente?.dataCadastro || agoraISO,
        ultimaAtualizacao: agoraISO
    };

    // soma ou subtrai
    if (isEntrada) {
        loteObj.quantidade += item.quantidade;
        loteObj.subtotal += item.subtotal;
    } else {
        loteObj.quantidade -= item.quantidade;
        loteObj.subtotal -= item.subtotal;
        if (loteObj.quantidade < 0) loteObj.quantidade = 0;
        if (loteObj.subtotal < 0) loteObj.subtotal = 0;
    }

    // arredonda
    loteObj.quantidade = parseFloat(loteObj.quantidade.toFixed(3));
    loteObj.subtotal = parseFloat(loteObj.subtotal.toFixed(2));

    // salva o lote
    produto.lotes[loteId] = loteObj;

    // recalcula totais globais e grava
    const todos = Object.values(produto.lotes);
    produto.quantidadeEstoque = todos.reduce((a, l) => a + l.quantidade, 0);
    produto.valorEstoque = todos.reduce((a, l) => a + l.subtotal, 0);
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
            if (!pedido || pedido.idFornecedor !== fornecedorId) continue;
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
    const snapLotes = await firebase
        .database()
        .ref(`produto/${produtoId}/lotes`)
        .once('value');
    const lotesObj = snapLotes.val() || {};

    // 1. Extrai números de lote (convertendo para inteiro)
    const numeros = Object.keys(lotesObj)
        .map(n => parseInt(n, 10))
        .filter(n => !isNaN(n));

    // 2. Define o maior número ou 0 se não houver
    const maxLote = numeros.length > 0 ? Math.max(...numeros) : 0;

    // 3. Próximo lote = maior + 1
    return maxLote + 1;
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
async function configurarItemEntrada(div) {
    // 1. Selecionar elementos com verificações
    const selectProduto = div.querySelector('select.produto-select');
    const inputLote = div.querySelector('.lote-item');
    const inputQuantidade = div.querySelector('input.quantidade-input');
    const spanUnidade = div.querySelector('.unidade-produto');
    const btnRemover = div.querySelector('.botao-remover-item');

    // 2. Configurar remoção apenas se o botão existir
    if (btnRemover) {
        btnRemover.addEventListener('click', () => {
            div.remove();
            atualizarTotalPedido();
            atualizarEstadoRemoverItens(document.getElementById('modal-entrada'));
        });
    }

    // 3. Configurar eventos de produto/quantidade
    if (selectProduto) {
        selectProduto.addEventListener('change', async function () {
            const produtoId = this.value;
            if (!produtoId) {
                if (inputLote) inputLote.value = '';
                return;
            }

            // 4. Contar ocorrências do mesmo produto
            const ocorrencias = contarOcorrenciasProdutoNaTela(produtoId, div);

            try {
                const loteBase = await obterProximoNumeroLote(produtoId);
                if (inputLote) inputLote.value = loteBase + ocorrencias;
            } catch (err) {
                if (inputLote) inputLote.value = 1;
            }

            // 5. Atualizar unidade de medida
            if (spanUnidade) {
                const produtoRef = firebase.database().ref(`produto/${produtoId}`);
                const snapshot = await produtoRef.once('value');
                const produto = snapshot.val();
                if (produto?.unidadeMedida) {
                    spanUnidade.textContent = produto.unidadeMedida;
                }
            }

            // 6. Habilitar quantidade e calcular
            if (inputQuantidade) {
                inputQuantidade.disabled = false;
                calcularSubtotalItem(div);
            }
        });
    }

    // 7. Configurar evento de quantidade
    if (inputQuantidade) {
        inputQuantidade.addEventListener('input', () => {
            calcularSubtotalItem(div);
        });
    }
}

function mostrarMensagem(texto, tipo = 'success') {
    const msg = document.createElement('div');
    msg.textContent = texto;
    msg.className = `mensagem-alerta ${tipo}`;
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 4000);
}

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

            document.getElementById('visualizarID').textContent = pedido.codigoPedido || '(sem número)';

            const labelNome = document.getElementById('labelNome');
            const nomeVisualizar = document.getElementById('nomeVisualizar');

            if (pedido.tipoPedido === 'Compra') {
                buscarNomeFornecedorPorId(pedido.idFornecedor).then(nome => {
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

                if (pedido.tipoPedido === 'Venda' && pedido.idFornecedor) {
                    buscarNomeFornecedorPorId(pedido.idFornecedor).then(nomeFornecedor => {
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
            // 1) Identifica pedido e modal
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

            // 2) Recarrega fornecedores/clientes e dispara change
            await carregarFornecedores();
            if (isEntrada) {
                const sel = document.getElementById('nomeAdicionar');
                sel.value = pedido.idFornecedor;
                sel.dispatchEvent(new Event('change'));

                // 🚨 Aqui está o que você precisa adicionar:
                await carregarProdutos(null, pedido.idFornecedor);
            } else {
                const clienteInput = document.getElementById('nomeAdicionarSaida');
                clienteInput.value = pedido.nomeCliente || '';
            }
            // 4) Limpa container e desabilita “Adicionar mais”
            const container = modal.querySelector('.itens-pedido-container');
            container.innerHTML = '';
            modal.querySelector('.adicionar-mais-item').classList.add('inativo');

            // 5) Monta cada item existente
            for (const itemId of Object.keys(pedido.itensPedido || {})) {
                const itemData = pedido.itensPedido[itemId];

                // 5.1) checa se o lote está zerado (só Entradas)
                let encerrado = false;
                if (isEntrada) {
                    const snap = await firebase.database()
                        .ref(`produto/${itemData.idProduto}/lotes/${itemData.lote}`)
                        .once('value');
                    const info = snap.val();
                    encerrado = !info || info.quantidade <= 0;
                }

                // 5.2) gera o HTML base
                const div = document.createElement('div');
                div.classList.add('item-pedido');
                let html = `
      <div class="grupo-form">
        <label>Produto:</label>
        <select class="campo-form produto-select" ${encerrado ? 'disabled' : ''}></select>
      </div>
      <div class="grupo-form-duplo">
        <div>
          <label>Quantidade</label>
          <div style="display:flex;gap:5px;">
            <input type="number" class="campo-form quantidade-input"
                   value="${itemData.quantidade}" min="0"
                   ${encerrado ? 'disabled' : ''} style="flex:1" />
            <span class="unidade-produto">—</span>
          </div>
        </div>
        <div>
          <label>Subtotal</label>
          <input type="text" class="campo-form subtotal-input"
                 value="R$ ${Number(itemData.subtotal).toFixed(2).replace('.', ',')}"
                 readonly />
        </div>
      </div>`;

                if (isEntrada) {
                    html += `
      <div class="grupo-form-duplo">
        <div>
          <label>Validade</label>
          <input type="date" class="campo-form validade-item"
                 value="${itemData.validade || ''}"
                 ${encerrado ? 'disabled' : ''} />
        </div>
        <div>
          <label>Lote</label>
          <input type="text" class="campo-form lote-item"
                 value="${itemData.lote || ''}"
                 readonly />
        </div>
      </div>
      `;
                } else {
                    html += `
      <div class="grupo-form-duplo">
        <div>
          <label>Lote</label>
          <select class="campo-form lote-select" ${encerrado ? 'disabled' : ''}></select>
        </div>
        <div>
          <label>Validade</label>
          <input type="date" class="campo-form validade-input"
                 readonly />
        </div>
      </div>
      `;
                }

                // botão remover ou aviso
                if (encerrado) {
                    html += `<small style="color:#c62828;display:block;margin-top:4px;">
                 Lote encerrado — edição bloqueada
               </small>`;
                } else {
                    html += `<button type="button" class="botao-remover-item">Remover</button>`;
                }

                div.innerHTML = html;
                container.appendChild(div);

                if (isEntrada) {
                    const selectProduto = div.querySelector('select.produto-select');
                    await carregarProdutos(selectProduto, pedido.idFornecedor);
                    selectProduto.value = itemData.idProduto;
                    selectProduto.dispatchEvent(new Event('change'));

                    const spanUnidade = div.querySelector('.unidade-produto');
                    const snap = await firebase.database().ref(`produto/${itemData.idProduto}`).once('value');
                    const produto = snap.val();
                    if (spanUnidade && produto?.unidadeMedida) {
                        spanUnidade.textContent = produto.unidadeMedida;
                    }
                }
                // 5.3) popula selects e unidade
                const selProd = div.querySelector('select.produto-select');
                const inpQty = div.querySelector('input.quantidade-input');
                const spanUni = div.querySelector('span.unidade-produto');
                const btnRem = div.querySelector('.botao-remover-item');
                const selLote = div.querySelector('select.lote-select');
                const inpVal = div.querySelector('input.validade-input') || div.querySelector('input.validade-item');
                if (!isEntrada) {
                    // Configurar fornecedor para cada item de saída
                    const selectFornecedor = div.querySelector('select.fornecedor-select');
                    if (selectFornecedor) {
                        // Carrega fornecedores no item
                        await carregarFornecedoresNoItem(div);

                        // Define o fornecedor e dispara evento
                        selectFornecedor.value = itemData.fornecedorId;
                        selectFornecedor.dispatchEvent(new Event('change'));

                        // Aguarda carregamento dos produtos
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                }

                // carrega produtos
                await carregarProdutos(selProd, pedido.idFornecedor);
                selProd.value = itemData.idProduto;
                const opt = selProd.selectedOptions[0];
                if (opt?.dataset.unidademedida) spanUni.textContent = opt.dataset.unidademedida;

                // se for saída, carrega lotes atuais
                if (!isEntrada && selLote) {
                    selLote.disabled = false;
                    await carregarLotesDoProduto(itemData.idProduto, selLote, inpVal);
                    selLote.value = itemData.lote;
                    inpVal.value = selLote.selectedOptions[0]?.dataset.validade || '';
                }

                // calcula subtotal e total
                calcularSubtotalItem(div);
                atualizarTotalPedido();

                // 5.4) listeners de mudança
                const onChange = () => {
                    const sel = selProd.selectedOptions[0];
                    if (sel?.dataset.unidademedida) spanUni.textContent = sel.dataset.unidademedida;
                    calcularSubtotalItem(div);
                    atualizarTotalPedido();
                };
                if (!encerrado) {
                    selProd.addEventListener('change', async () => {
                        onChange();
                        if (!isEntrada && selLote) {
                            selLote.innerHTML = '';
                            await carregarLotesDoProduto(selProd.value, selLote, inpVal);
                        }
                    });
                    inpQty.addEventListener('input', onChange);
                    if (selLote) selLote.addEventListener('change', onChange);

                    // 5.5) remover com cascade
                    btnRem.addEventListener('click', async () => {
                        const totalItensAtuais = Object.keys(pedido.itensPedido).length;

                        if (isEntrada) {
                            // Lógica original para entradas (com lotes e saídas associadas)
                            if (totalItensAtuais <= 1) {
                                mostrarMensagem('O pedido deve ter pelo menos um item!', 'error');
                                return;
                            }

                            try {
                                const snapshot = await firebase.database().ref('pedido').once('value');
                                const todosPedidos = snapshot.val() || {};

                                // Identificar saídas associadas ao lote sendo removido
                                const saidasDoLote = Object.entries(todosPedidos)
                                    .filter(([_, pedido]) => pedido.tipoPedido === 'Venda')
                                    .filter(([_, pedido]) => {
                                        const itens = pedido.itensPedido || {};
                                        return Object.values(itens).some(item =>
                                            item.idProduto === itemData.idProduto &&
                                            item.lote === itemData.lote
                                        );
                                    });

                                let mensagemConfirmacao = 'Deseja remover este item da entrada?';
                                if (saidasDoLote.length > 0) {
                                    mensagemConfirmacao += `\n\n⚠️ Este lote foi utilizado em ${saidasDoLote.length} saída(s). Essas saídas serão excluídas junto com o item e o lote.`;
                                }

                                if (!confirm(mensagemConfirmacao)) return;

                                // Excluir as saídas associadas
                                for (const [saidaId, saida] of saidasDoLote) {
                                    const itensSaida = saida.itensPedido || {};
                                    for (const [_, item] of Object.entries(itensSaida)) {
                                        await atualizarEstoqueProduto(item, true, saidaId);
                                    }
                                    await firebase.database().ref(`pedido/${saidaId}`).remove();
                                }

                                // Remover o item da entrada
                                await firebase.database()
                                    .ref(`pedido/${indiceParaEditar}/itensPedido/${itemId}`)
                                    .remove();

                                // Remover o lote do produto
                                await firebase.database()
                                    .ref(`produto/${itemData.idProduto}/lotes/${itemData.lote}`)
                                    .remove();

                                // Atualizar totais de estoque e valor do produto
                                await atualizarTotaisDoProduto(itemData.idProduto);

                                // Atualizar a interface
                                div.remove();
                                atualizarTotalPedido();
                                atualizarEstadoRemoverItens(modal);
                                delete pedido.itensPedido[itemId];

                                // Recalcula total após remoção
                                const novoTotal = Object.values(pedido.itensPedido).reduce(
                                    (total, item) => total + (item.subtotal || 0),
                                    0
                                );

                                // Atualiza no Firebase
                                await firebase.database().ref(`pedido/${indiceParaEditar}`).update({
                                    valor: novoTotal
                                });

                                // Atualiza visualmente na tabela (total na célula)
                                const linha = document.querySelector(`tr[data-key="${indiceParaEditar}"]`);
                                if (linha) {
                                    const totalFormatado = `R$ ${novoTotal.toFixed(2).replace('.', ',')}`;
                                    linha.querySelector('td[data-label="Total: "]').textContent = totalFormatado;
                                }

                                mostrarMensagem('Item removido com sucesso. Lote e saídas associadas também foram excluídos.', 'sucesso');

                            } catch (error) {
                                console.error('Erro ao remover item:', error);
                                mostrarMensagem('Erro ao remover item!', 'error');
                            }
                        } else {
                            // Lógica para SAÍDAS
                            if (totalItensAtuais <= 1) {
                                mostrarMensagem('A saída deve ter pelo menos um item!', 'error');
                                return;
                            }

                            if (!confirm('Deseja remover este item da saída?\nA quantidade será reabastecida no lote.')) {
                                return;
                            }

                            try {
                                // Reverte a saída (adiciona a quantidade de volta ao lote)
                                await atualizarEstoqueProduto(itemData, true, pedido.firebaseKey);

                                // Remove o item do pedido
                                await firebase.database()
                                    .ref(`pedido/${indiceParaEditar}/itensPedido/${itemId}`)
                                    .remove();

                                // Atualiza a interface
                                div.remove();
                                atualizarTotalPedido();
                                atualizarEstadoRemoverItens(modal);

                                // Atualiza o total do pedido
                                const novoTotal = Object.values(pedido.itensPedido).reduce(
                                    (total, item) => item === itemData ? total : total + (item.subtotal || 0),
                                    0
                                );

                                await firebase.database().ref(`pedido/${indiceParaEditar}`).update({
                                    valor: novoTotal
                                });

                                // Atualiza a tabela
                                const linha = document.querySelector(`tr[data-key="${indiceParaEditar}"]`);
                                if (linha) {
                                    const totalFormatado = `R$ ${novoTotal.toFixed(2).replace('.', ',')}`;
                                    linha.querySelector('td[data-label="Total: "]').textContent = totalFormatado;
                                }

                                mostrarMensagem('Item removido com sucesso. Estoque reabastecido.', 'sucesso');

                            } catch (error) {
                                console.error('Erro ao remover item:', error);
                                mostrarMensagem('Erro ao remover item!', 'error');
                            }
                        }
                    })
                }
            }

            // 6) termina de abrir modal
            atualizarEstadoRemoverItens(modal);
            // Manter o código original do pedido
            modal.querySelector('.modal-order-number').textContent = pedido.codigoPedido || '(sem número)';
            modal.querySelector(isEntrada ? '#btnFecharPedido' : '#btnFecharPedidoSaida')
                .textContent = 'Atualizar pedido';
            modal.style.display = 'flex';
        }
        else if (target.classList.contains('delete-icon')) {
            const linha = target.closest('tr');
            if (!linha) return;

            const key = linha.getAttribute('data-key');
            const pedido = pedidos.find(p => p.firebaseKey === key);
            if (!pedido) return;

            // prepara flags de exclusão
            firebaseKeyParaExcluir = key;
            selectedKeys = [];
            multiplos = false;

            // monta o modal de confirmação
            const modal = document.getElementById('modal-confirmar-exclusao');
            const titulo = modal.querySelector('h4');
            const subtitulo = modal.querySelector('p');

            if (pedido.tipoPedido === 'Venda') {
                titulo.textContent = 'Excluir esta saída?';
                subtitulo.textContent = 'Esta saída será removida e a quantidade reabastecida no lote.';
            } else {
                titulo.textContent = 'Excluir esta entrada?';
                subtitulo.textContent = 'Esta entrada e todas as saídas associadas serão removidas.';
            }

            modal.style.display = 'flex';
        }
    });

    document.querySelector('main').addEventListener('change', e => {
        if (e.target.classList.contains('selecionar-pedido')) {
            atualizarBotaoExcluirSelecionados();
        }
    });

    // Botão de confirmação da modal “Excluir” - Cascade-delete
    document
        .getElementById('btn-confirmar-excluir')
        .addEventListener('click', async () => {
            // 1) Define quais chaves vamos remover
            const keysToRemove = multiplos
                ? selectedKeys.slice()
                : [firebaseKeyParaExcluir];


            // 2) Carrega os pedidos completos antes de tocar no banco
            const pedidosParaRemover = [];
            for (const fk of keysToRemove) {
                const snap = await firebase.database().ref(`pedido/${fk}`).once('value');
                const p = snap.val() || {};
                p.firebaseKey = fk;
                pedidosParaRemover.push(p);
            }

            // 3) Processa cada pedido individualmente
            for (const pedido of pedidosParaRemover) {
                if (pedido.tipoPedido === 'Venda') {
                    // ---- REMOÇÃO DE SAÍDA ----
                    for (const item of Object.values(pedido.itensPedido || {})) {
                        // 1) reverte a saída como entrada
                        await atualizarEstoqueProduto(item, /*isEntrada=*/ true, pedido.firebaseKey);
                        // 2) recalcula totais globais do produto
                        const pid = item.produtoId || item.idProduto;
                        await atualizarTotaisDoProduto(pid);
                    }
                    // 3) apaga apenas o registro de saída
                    await firebase.database().ref(`pedido/${pedido.firebaseKey}`).remove();
                    const tipoHist = `Exclusão de estoque (Saída)`;
                    const cod = (pedido.codigoPedido || pedido.firebaseKey)
                        .toUpperCase().replace(/[^A-Z0-9\-]/g, '').trim();

                    for (const item of Object.values(pedido.itensPedido || {})) {
                        const nome = item.nome || 'item';
                        const descricao = `Pedido ${cod} - ${nome} excluído.`;
                        registrarHistorico(tipoHist, descricao);
                    }


                } else {
                    // ---- REMOÇÃO DE COMPRA (CASCADE) ----
                    // 3.1) Exclui todas as saídas associadas
                    const saidas = await obterSaidasAssociadas(pedido);
                    for (const fkSaida of saidas) {
                        await firebase.database().ref(`pedido/${fkSaida}`).remove();
                    }

                    // 3.2) Apaga a própria entrada
                    await firebase.database().ref(`pedido/${pedido.firebaseKey}`).remove();
                    const tipoHist = 'Exclusão de estoque (Entrada)';
                    const cod = (pedido.codigoPedido || pedido.firebaseKey)
                        .toUpperCase().replace(/[^A-Z0-9\-]/g, '').trim();

                    for (const item of Object.values(pedido.itensPedido || {})) {
                        const nome = item.nome || 'item';
                        const descricao = `Pedido ${cod} - ${nome} excluído.`;
                        registrarHistorico(tipoHist, descricao);
                    }

                    // 3.3) Remove cada lote do produto e recalcula
                    for (const item of Object.values(pedido.itensPedido || {})) {
                        const pid = item.produtoId || item.idProduto;
                        await firebase
                            .database()
                            .ref(`produto/${pid}/lotes/${item.lote}`)
                            .remove();
                        await atualizarTotaisDoProduto(pid);
                    }
                }
            }

            // 4) Fecha modal e recarrega tabela
            document.getElementById('modal-confirmar-exclusao').style.display = 'none';
            multiplos = false;
            firebaseKeyParaExcluir = null;
            selectedKeys = [];
            carregarPedidosDoFirebase();
        });


    // ── Listener de “Cancelar exclusão” ──
    document.getElementById('btn-cancelar-excluir')
        .addEventListener('click', () => {
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

function contarOcorrenciasProdutoNaTela(produtoId, currentDiv) {
    const itens = document.querySelectorAll('#modal-entrada .item-pedido');
    let count = 0;

    itens.forEach(item => {
        if (item === currentDiv) return; // Ignora o item atual
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

async function atualizarTotaisDoProduto(produtoId) {
    const produtoRef = firebase.database().ref(`produto/${produtoId}`);
    const snapshot = await produtoRef.once('value');
    const produto = snapshot.val() || { lotes: {} };

    let quantidadeTotal = 0;
    let valorTotal = 0;

    Object.values(produto.lotes || {}).forEach(lote => {
        quantidadeTotal += lote.quantidade || 0;
        valorTotal += lote.subtotal || 0;
    });

    // Atualizar os totais do produto
    await produtoRef.update({
        quantidadeEstoque: quantidadeTotal,
        valorEstoque: valorTotal
    });

    // Adicionado: Recalcular o valor total do pedido
    const pedidoRef = firebase.database().ref('pedido');
    const pedidosSnapshot = await pedidoRef.once('value');

    pedidosSnapshot.forEach(pedidoSnapshot => {
        const pedido = pedidoSnapshot.val();
        let totalPedido = 0;

        Object.values(pedido.itensPedido || {}).forEach(item => {
            if (item.produtoId === produtoId) {
                totalPedido += item.subtotal || 0;
            }
        });

        // Atualizar o total do pedido se for diferente
        if (totalPedido !== pedido.valor) {
            pedidoRef.child(pedidoSnapshot.key).update({
                valor: totalPedido
            });
        }
    });
}

async function exportarPedidosParaCSV(tipo) {
    const snapshot = await firebase.database().ref('pedido').once('value');
    const pedidos = snapshot.val() || {};

    const fornecedoresSnapshot = await firebase.database().ref('fornecedor').once('value');
    const fornecedores = fornecedoresSnapshot.val() || {};

    const linhas = [[
        'Código Pedido',
        tipo === 'entrada' ? 'Fornecedor' : 'Cliente',
        'Tipo de Pedido',
        'Data',
        'Produto',
        'Lote',
        'Quantidade',
        'Unidade',
        'Validade',
        'Subtotal (R$)'
    ]];

    Object.values(pedidos).forEach(pedido => {
        if (pedido.tipoPedido === (tipo === 'entrada' ? 'Compra' : 'Venda')) {
            const codigo = pedido.codigoPedido || '(sem código)';
            const tipoPedido = pedido.tipoPedido || '-';
            const data = pedido.data || '-';

            const nomePessoa = tipo === 'entrada'
                ? (fornecedores[pedido.idFornecedor]?.nome || 'Fornecedor não identificado')
                : pedido.nomeCliente || 'Cliente não identificado';

            const itens = pedido.itensPedido || {};
            Object.values(itens).forEach(item => {
                const linha = [
                    codigo,
                    nomePessoa,
                    tipoPedido,
                    data,
                    item.nome || '(sem nome)',
                    item.lote || '-',
                    item.quantidade || 0,
                    item.unidadeMedida || '-',
                    item.validade || '-',
                    (parseFloat(item.subtotal) || 0).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2
                    })
                ];
                linhas.push(linha);
            });
        }
    });

    // com acesso a acentos
    const BOM = '\uFEFF';
    const csvContent = BOM + linhas.map(linha => linha.map(c => `"${c}"`).join(';')).join('\n');

    const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_pedidos_${tipo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function registrarHistorico(tipo, descricao) {
    const idComerciante = localStorage.getItem("idComerciante") || sessionStorage.getItem("idComerciante");

    firebase.database().ref('historicoAcoes').push({
        tipo,
        descricao,
        data: new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
        idComerciante
    });
}
