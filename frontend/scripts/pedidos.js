const pedidos = [];
const idComerciante = localStorage.getItem('idComerciante') || sessionStorage.getItem('idComerciante');
let paginaAtualEntradas = 1;
let paginaAtualSaidas = 1;
const itensPorPagina = 10;
let itemCounter = 1;
let quantidadeMaxima = null;
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
        if (tipoAtual === 'entrada') {
            paginaAtualEntradas = 1;
        } else {
            paginaAtualSaidas = 1;
        }
        atualizarTabelaPedidos();
    });


    document.getElementById('limpar-filtros-pedidos').addEventListener('click', () => {
        document.getElementById('ordenar-pedidos').value = '';
        if (tipoAtual === 'entrada') {
            paginaAtualEntradas = 1;
        } else {
            paginaAtualSaidas = 1;
        }
        atualizarTabelaPedidos();
    });


    document.getElementById('btnAbrirModal').addEventListener('click', () => {
        const titulo = tipoAtual === 'entrada' ? 'titulo-modal-pedido' : 'titulo-modal-saida';
        document.getElementById(titulo).textContent = 'Pedido';
        editando = false;
        indiceParaEditar = null;
        itemCounter = 1;

        if (tipoAtual === 'entrada') {
            const modal = document.getElementById('modal-entrada');
            const container = modal.querySelector('.itens-pedido-container');
            container.innerHTML = ''; // Limpa tudo
            document.getElementById('nomeAdicionar').selectedIndex = 0;

            document.getElementById('modal-entrada').style.display = 'flex';
            document.getElementById('totalAdicionar').textContent = "0,00";
            modal.querySelector('.modal-order-number').textContent = gerarCodigoPedido();

            carregarFornecedores();

            // Adiciona primeiro item automaticamente
            document.getElementById('adicionar-mais').click();
        } else {
            const modal = document.getElementById('modal-saida');
            const container = modal.querySelector('.itens-pedido-container');
            container.innerHTML = '';
            document.getElementById('nomeAdicionarSaida').value = '';

            document.getElementById('modal-saida').style.display = 'flex';
            document.getElementById('totalAdicionarSaida').textContent = "0,00";
            modal.querySelector('.modal-order-number').textContent = gerarCodigoPedido();

            carregarFornecedores();

            // Adiciona primeiro item automaticamente
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

    let fornecedorSelecionado = null;

    // Modifique o evento change do fornecedor
    document.getElementById('nomeAdicionar').addEventListener('change', async (e) => {
        fornecedorSelecionado = e.target.value;
        const modal = e.target.closest('.modal-content');
        const produtoSelects = modal.querySelectorAll('.produto-select');
        const quantidadeInputs = modal.querySelectorAll('.quantidade-input');

        // Habilitar/desabilitar campos
        produtoSelects.forEach(select => select.disabled = !fornecedorSelecionado);
        quantidadeInputs.forEach(input => input.disabled = !fornecedorSelecionado);

        // Recarregar produtos apenas do fornecedor selecionado
        for (const select of produtoSelects) {
            await carregarProdutos(select, fornecedorSelecionado);
        }

        calcularValorPedido();
    });

    document.getElementById('nomeAdicionarSaida').addEventListener('change', (e) => {
        const modal = document.getElementById('modal-saida');
        const container = modal.querySelector('.itens-pedido-container');
        const item = container.querySelector('.item-pedido');

        const selectProduto = item.querySelector('select.produto-select');
        const inputQuantidade = item.querySelector('input.quantidade-input');

        selectProduto.disabled = false;
        inputQuantidade.disabled = false;

        carregarProdutos(selectProduto).then(() => {
            selectProduto.addEventListener('change', () => calcularSubtotalItem(item));
            inputQuantidade.addEventListener('input', () => calcularSubtotalItem(item));
            calcularSubtotalItem(item);
        });

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

    //Adicionar mais item
    document.querySelectorAll('.adicionar-mais-item').forEach(botao => {
        botao.addEventListener('click', async function (e) {
            e.preventDefault();
            itemCounter++;

            const modal = e.target.closest('.modal-content');
            const container = modal.querySelector('.itens-pedido-container');
            const isEntrada = modal.id === 'modal-entrada';

            // Quantos itens já existem? (para decidir se mostraremos botão Remover)
            const quantidadeItens = container.querySelectorAll('.item-pedido').length;
            const mostrarRemoverBtn = quantidadeItens > 0;

            const div = document.createElement('div');
            div.classList.add('item-pedido');
            div.setAttribute('data-item-id', itemCounter);
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
  <div>
    <label>Subtotal</label>
    <input type="text" class="campo-form subtotal-input" value="0,00" readonly>
  </div>
  ${isEntrada ? `
    <div class="grupo-form-duplo">
      <div>
        <label>Validade</label>
        <input type="date" class="campo-form validade-item" required>
      </div>
      <div>
        <label>Lote</label>
        <input type="text" class="campo-form lote-item" maxlength="20">
      </div>
    </div>
  ` : ''}
  <button type="button" class="botao-remover-item" style="display: ${quantidadeItens > 0 ? 'none' : 'none'};">Remover</button>
`;

            container.appendChild(div);

            const select = div.querySelector('select.produto-select');
            const inputQtd = div.querySelector('input.quantidade-input');
            const btnRemov = div.querySelector('.botao-remover-item');

            // ─── NOVO ───
            // Se já houver fornecedor selecionado, já pré-carrega e habilita os campos
            const fornecedorSelect = modal.querySelector('#nomeAdicionar');
            const fornecedorValor = fornecedorSelect?.value;
            if (fornecedorValor) {
                await carregarProdutos(select, fornecedorValor);
                select.disabled = false;
                inputQtd.disabled = false;
            }

            // ao mudar o produto, exibe o Remover (se não for o primeiro) e calcula subtotal
            select.addEventListener('change', () => {
                if (mostrarRemoverBtn) btnRemov.style.display = 'inline-block';
                calcularSubtotalItem(div);
            });

            inputQtd.addEventListener('input', () => calcularSubtotalItem(div));

            btnRemov.addEventListener('click', () => {
                const totalItens = container.querySelectorAll('.item-pedido').length;
                if (totalItens <= 1) return;  // nunca remove o único
                div.remove();
                atualizarTotalPedido();
            });

            calcularSubtotalItem(div);
        });
    });

    const saidaProduto = document.querySelector('#produtosAdicionarSaida');
    const saidaQuantidade = document.querySelector('#quantidadeAdicionarSaida');
    const saidaItem = document.querySelector('#modal-saida .item-pedido');

    if (saidaProduto && saidaQuantidade && saidaItem) {
        saidaProduto.addEventListener('change', () => calcularSubtotalItem(saidaItem));
        saidaQuantidade.addEventListener('input', () => calcularSubtotalItem(saidaItem));
    }
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
    const selects = document.querySelectorAll('#nomeAdicionar, #nomeAdicionarSaida'); // todos os selects

    selects.forEach(select => {
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

function carregarProdutos(selectEspecifico = null, fornecedorId = null) {
    const idComercianteLocal = localStorage.getItem('idComerciante') || sessionStorage.getItem('idComerciante');

    const produtosRef = firebase.database().ref('produto');

    return produtosRef.once('value')
        .then(snapshot => {
            const produtos = snapshot.val();
            if (!produtos) return;

            const opcoes = [];

            Object.entries(produtos).forEach(([key, produto]) => {
                const pertenceAoComerciante = produto.idComerciante === idComercianteLocal;
                const pertenceAoFornecedor =
                    fornecedorId
                        ? produto.fornecedorId === fornecedorId
                        : !!produto.fornecedorId; // Se não tiver fornecedorId, ignora

                if (pertenceAoComerciante && pertenceAoFornecedor) {
                    const preco = parseFloat(produto.preco || '0');
                    const optionHTML = `<option value="${key}" data-preco="${preco}">${produto.nome}</option>`;
                    opcoes.push(optionHTML);
                }
            });

            const htmlCompleto = '<option value="" selected disabled>Selecione...</option>' + opcoes.join('');

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
        });
}

function calcularValorPedido() {
    const selects = document.querySelectorAll('.produto-select');
    const quantidades = document.querySelectorAll('.quantidade-input');
    const subtotais = document.querySelectorAll('.subtotal-input');

    selects.forEach((produtoSelect, index) => {
        const quantidadeInput = quantidades[index];
        const subtotalInput = subtotais[index];

        produtoSelect.addEventListener('change', () => {
            const produtoId = produtoSelect.value;

            if (!produtoId) {
                quantidadeInput.value = 1;
                quantidadeInput.disabled = true;
                subtotalInput.value = '0,00';
                return;
            }

            const produtoRef = firebase.database().ref('produto/' + produtoId);

            produtoRef.once('value')
                .then(snapshot => {
                    const produto = snapshot.val();
                    if (produto && produto.preco) {
                        quantidadeMaxima = parseInt(produto.quantidadeEstoque || 0);
                        quantidadeInput.disabled = false;
                        calcularSubtotalItem(document.querySelector('.item-pedido'));
                    } else {
                        quantidadeMaxima = null;
                        quantidadeInput.disabled = true;
                        subtotalInput.value = '0,00';
                    }
                })
                .catch(error => {
                    console.error('Erro ao buscar preço do produto:', error);
                });
        });

        quantidadeInput.addEventListener('input', () => {
            const quantidade = parseInt(quantidadeInput.value);
            if (quantidadeMaxima !== null && quantidade > quantidadeMaxima) {
                quantidadeInput.value = quantidadeMaxima;
                alert(`Quantidade máxima disponível: ${quantidadeMaxima}`);
            }
            calcularSubtotalItem(document.querySelector('.item-pedido'));
        });
    });
}

async function calcularSubtotalItem(itemContainer) {
    const select = itemContainer.querySelector('select.produto-select');
    const quantidadeInput = itemContainer.querySelector('input.quantidade-input');
    const subtotalInput = itemContainer.querySelector('input.subtotal-input');

    const produtoId = select?.value;
    const quantidade = parseFloat(quantidadeInput?.value || '1');
    if (!produtoId || isNaN(quantidade)) {
        subtotalInput.value = '0,00';
        atualizarTotalPedido();
        return;
    }

    // 🔄 Puxa os dados reais do Firebase
    const snapshot = await firebase.database().ref('produto/' + produtoId).once('value');
    const produto = snapshot.val();
    if (!produto) {
        subtotalInput.value = '0,00';
        atualizarTotalPedido();
        return;
    }
    const unidadeSpan = itemContainer.querySelector('.unidade-produto');
    if (unidadeSpan && produto.unidadeMedida) {
        unidadeSpan.textContent = produto.unidadeMedida;
    }

    const preco = parseFloat(produto.preco || '0');
    const precoPor = produto.precoPor;
    const unidade = produto.unidadeMedida;

    let fator = 1;

    // Peso
    if (precoPor === 'kg') {
        if (unidade === 'kg') fator = quantidade;
        else if (unidade === 'g') fator = quantidade / 1000;
        else if (unidade === '100g') fator = quantidade / 10;
    } else if (precoPor === '100g') {
        if (unidade === 'kg') fator = quantidade * 10;
        else if (unidade === 'g') fator = quantidade / 100;
        else if (unidade === '100g') fator = quantidade;
    } else if (precoPor === 'g') {
        if (unidade === 'kg') fator = quantidade * 1000;
        else if (unidade === '100g') fator = quantidade * 100;
        else if (unidade === 'g') fator = quantidade;
    }

    // Volume
    else if (precoPor === 'litro') {
        if (unidade === 'ml') fator = quantidade / 1000;
        else if (unidade === 'litro') fator = quantidade;
    } else if (precoPor === 'ml') {
        if (unidade === 'litro') fator = quantidade * 1000;
        else if (unidade === 'ml') fator = quantidade;
    }

    // Unidade simples ou pacote
    else {
        fator = quantidade;
    }

    const subtotal = preco * fator;
    subtotalInput.value = subtotal.toFixed(2).replace('.', ',');
    atualizarTotalPedido();
}

function atualizarTotalPedido() {
    let total = 0;

    document.querySelectorAll('.item-pedido').forEach(item => {
        const subtotalInput = item.querySelector('.subtotal-input');
        const subtotalStr = (subtotalInput?.value || '0').replace(',', '.');

        const subtotal = parseFloat(subtotalStr);

        // Só soma se for um número válido e maior que 0
        if (!isNaN(subtotal) && subtotal > 0) {
            total += subtotal;
        }
    });

    const totalAdicionar = document.getElementById('totalAdicionar');
    if (totalAdicionar) totalAdicionar.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;

    const totalAdicionarSaida = document.getElementById('totalAdicionarSaida');
    if (totalAdicionarSaida) totalAdicionarSaida.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
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

                // CORREÇÃO: Garantir que itensPedido seja um objeto
                if (pedido.itensPedido && typeof pedido.itensPedido === 'object') {
                    // Converter para objeto se for array
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

        // 🔁 Enriquecer pedidos com nome do fornecedor
        const promessas = pedidos.map(async (pedido) => {
            if (pedido.tipoPedido === 'Compra') {
                pedido.nomeFornecedor = await buscarNomeFornecedorPorId(pedido.fornecedor);
            } else {
                // Já vem com nomeCliente salvo no Firebase
                pedido.nomeCliente = pedido.nomeCliente || '—';
            }
        });

        Promise.all(promessas).then(() => atualizarTabelaPedidos());

    });
}

function adicionarLinhaTabelaPedido(pedido, tbody) {
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

function buscarProdutoPorId(idProduto) {
    return new Promise((resolve, reject) => {
        if (!idProduto) {
            resolve(null); // ou '—' se preferir
            return;
        }

        firebase.database().ref(`produto/${idProduto}`).once('value')
            .then(snapshot => {
                const dados = snapshot.val();
                if (dados) {
                    resolve(dados);
                } else {
                    resolve(null);
                }
            })
            .catch(error => {
                console.error('Erro ao buscar produto:', error);
                reject(null);
            });
    });
}

function buscarItemPedidoPorId(idItemPedido) {
    return new Promise((resolve, reject) => {
        if (!idItemPedido) {
            resolve(null);
            return;
        }

        firebase.database().ref(`itemPedido/${idItemPedido}`).once('value')
            .then(snapshot => {
                const dados = snapshot.val();
                if (dados) {
                    resolve(dados);
                } else {
                    resolve(null);
                }
            })
            .catch(error => {
                console.error('Erro ao buscar itemPedido:', error);
                reject(null);
            });
    });
}

function atualizarTabelaPedidos() {
    const tbodyEntradas = document.getElementById('lista-pedidos-entradas');
    const tbodySaidas = document.getElementById('lista-pedidos-saidas');

    // Limpa a tabela da aba atual
    if (tipoAtual === 'entrada') {
        tbodyEntradas.innerHTML = '';
    } else {
        tbodySaidas.innerHTML = '';
    }

    // Página atual correta
    const paginaAtual = tipoAtual === 'entrada' ? paginaAtualEntradas : paginaAtualSaidas;

    // Filtro por tipo de pedido (Compra/Venda)
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

    // Ordenação (se aplicável)
    pedidosFiltrados = aplicarFiltrosOrdenacao(pedidosFiltrados);

    // Paginação
    const totalItens = pedidosFiltrados.length;
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    const pedidosPaginados = pedidosFiltrados.slice(inicio, fim);

    atualizarPaginacao(totalItens);

    // Tabela vazia
    if (pedidosPaginados.length === 0) {
        const mensagem = `<tr><td colspan="9" style="text-align: center; padding: 20px;">Nenhuma ${tipoAtual === 'entrada' ? 'entrada' : 'saída'} encontrada.</td></tr>`;
        if (tipoAtual === 'entrada') {
            tbodyEntradas.innerHTML = mensagem;
        } else {
            tbodySaidas.innerHTML = mensagem;
        }
        return;
    }

    // Preenche a tabela atual com os dados paginados
    pedidosPaginados.forEach(pedido => {
        if (tipoAtual === 'entrada') {
            adicionarLinhaTabelaPedido(pedido, tbodyEntradas);
        } else {
            adicionarLinhaTabelaPedido(pedido, tbodySaidas);
        }
    });


    atualizarBotaoExcluirSelecionados(); // botão excluir em massa
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

    // ✅ Eventos dos botões
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
    console.log('Modo edição:', editando, 'ID do pedido:', indiceParaEditar); // Debug

    const idComerciante = localStorage.getItem("idComerciante") || sessionStorage.getItem("idComerciante");
    const isEntrada = tipoAtual === 'entrada';
    const modalId = isEntrada ? 'modal-entrada' : 'modal-saida';
    const modal = document.getElementById(modalId);

    // Validação do nome (fornecedor/cliente)
    const nomeField = isEntrada ? modal.querySelector('#nomeAdicionar') : modal.querySelector('#nomeAdicionarSaida');
    const nomeValue = nomeField.value.trim();
    if (!nomeValue) {
        alert("Preencha o nome do " + (isEntrada ? "fornecedor" : "cliente") + ".");
        return;
    }

    // Coletar itens do pedido
    const container = modal.querySelector('.itens-pedido-container');
    const todosItens = modal.querySelectorAll('.item-pedido');
    for (const item of todosItens) {
        await calcularSubtotalItem(item); // Recalcula com os dados atuais
    }
    const itensPedidoDOM = container.querySelectorAll('.item-pedido');
    const itensPedido = [];

    for (const itemEl of itensPedidoDOM) {
        const select = itemEl.querySelector('select.produto-select');
        const inputQtd = itemEl.querySelector('input.quantidade-input');
        const inputSubtotal = itemEl.querySelector('input.subtotal-input');
        const inputValidade = itemEl.querySelector('input.validade-item');
        const inputLote = itemEl.querySelector('input.lote-item');

        if (!select || !select.value) continue;

        const produtoId = select.value;
        const nome = select.options[select.selectedIndex].textContent;
        const quantidade = parseFloat(inputQtd?.value || '0');
        const subtotal = parseFloat(inputSubtotal?.value.replace(',', '.') || '0');
        const validade = inputValidade?.value || '';
        const lote = inputLote?.value?.trim() || '';

        if (quantidade <= 0 || isNaN(quantidade)) continue;

        itensPedido.push({
            produtoId,
            nome,
            quantidade,
            subtotal,
            validade,
            lote
        });
    }

    if (itensPedido.length === 0) {
        alert("Adicione ao menos 1 produto ao pedido.");
        return;
    }

    // Validação de estoque para saídas
    if (!isEntrada) {
        for (const item of itensPedido) {
            const produtoRef = firebase.database().ref(`produto/${item.produtoId}`);
            const snapshot = await produtoRef.once('value');
            const produto = snapshot.val();

            if (!produto) continue;

            const chaveLote = `${item.validade || 'sem-validade'}|${item.lote || 'sem-lote'}`;
            const lotes = produto.lotes || {};
            const quantidadeDisponivel = lotes[chaveLote]?.quantidade || 0;

            if (quantidadeDisponivel < item.quantidade) {
                alert(`❌ Estoque insuficiente no lote ${item.lote} com validade ${item.validade} para o produto "${item.nome}".\n\nDisponível: ${quantidadeDisponivel}\nSolicitado: ${item.quantidade}`);
                return;
            }
        }
    }

    // 1. Cálculo de diferenças de estoque (para edição)
    let diferencasEstoque = [];
    if (editando && indiceParaEditar) {
        const pedidoOriginal = pedidos.find(p => p.firebaseKey === indiceParaEditar);
        const itensOriginais = Object.values(pedidoOriginal.itensPedido || {});

        // Comparar itens novos com originais
        for (const novoItem of itensPedido) {
            const itemOriginal = itensOriginais.find(i => i.produtoId === novoItem.produtoId);
            const diferenca = itemOriginal ? novoItem.quantidade - itemOriginal.quantidade : novoItem.quantidade;

            diferencasEstoque.push({
                produtoId: novoItem.produtoId,
                diferenca,
                novoItem
            });
        }

        // Verificar itens removidos
        for (const itemOriginal of itensOriginais) {
            if (!itensPedido.some(i => i.produtoId === itemOriginal.produtoId)) {
                diferencasEstoque.push({
                    produtoId: itemOriginal.produtoId,
                    diferenca: -itemOriginal.quantidade,
                    novoItem: null
                });
            }
        }
    }

    // 2. Montar objeto do pedido
    let numero;
    if (editando && indiceParaEditar) {
        const pedidoOriginal = pedidos.find(p => p.firebaseKey === indiceParaEditar);
        numero = pedidoOriginal.numero; // Mantém o número original
    } else {
        numero = gerarCodigoPedido(); // Novo número para pedidos novos
    }

    const dataHoje = new Date().toISOString().split('T')[0];
    const novoPedido = {
        tipoPedido: isEntrada ? "Compra" : "Venda",
        numero,
        data: dataHoje,
        valor: itensPedido.reduce((acc, item) => acc + (item.subtotal || 0), 0),
        idComerciante,
        fornecedor: isEntrada ? nomeValue : "",
        nomeCliente: isEntrada ? "" : nomeValue,
    };

    // 3. Remover itens antigos (se for edição)
    if (editando && indiceParaEditar) {
        const pedidoRef = firebase.database().ref(`pedido/${indiceParaEditar}`);
        const snapshot = await pedidoRef.child('itensPedido').once('value');
        const itensAntigos = snapshot.val();

        if (itensAntigos) {
            for (const idItem in itensAntigos) {
                await firebase.database().ref(`itemPedido/${idItem}`).remove();
            }
            await pedidoRef.child('itensPedido').remove();
        }
    }

    // 4. Criar/Atualizar pedido principal
    let idPedido = indiceParaEditar;
    if (editando && idPedido) {
        await firebase.database().ref(`pedido/${idPedido}`).update(novoPedido);
    } else {
        const pedidoRef = await firebase.database().ref('pedido').push(novoPedido);
        idPedido = pedidoRef.key;
    }

    // 5. Adicionar novos itens
    const itensDoPedido = {};
    for (const item of itensPedido) {
        const itemRef = firebase.database().ref('itemPedido').push();
        const idItem = itemRef.key;

        const itemData = {
            produtoId: item.produtoId,
            nome: item.nome,
            quantidade: item.quantidade,
            subtotal: item.subtotal,
            validade: item.validade,
            lote: item.lote
        };

        await itemRef.set(itemData);
        itensDoPedido[idItem] = itemData;
    }

    // 6. Vincular itens ao pedido
    await firebase.database().ref(`pedido/${idPedido}/itensPedido`).set(itensDoPedido);

    // 7. Atualizar estoque (método correto para edição)
    if (editando && indiceParaEditar) {
        for (const { produtoId, diferenca } of diferencasEstoque) {
            const produtoRef = firebase.database().ref(`produto/${produtoId}`);
            const snapshot = await produtoRef.once('value');
            const produto = snapshot.val();

            if (!produto) continue;

            // Atualizar estoque total
            const novoEstoque = parseFloat(produto.quantidadeEstoque || 0) + diferenca;
            await produtoRef.update({
                quantidadeEstoque: novoEstoque < 0 ? 0 : novoEstoque,
                dataUltimaAtualizacao: new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
            });

            // 🔎 Histórico
            const tipoMovimentacao = isEntrada ? 'Entrada' : 'Saída';
            const descricaoMovimentacao = `${tipoMovimentacao} de ${Math.abs(diferenca)} ${produto.unidadeMedida || ''} no produto "${produto.nome}"`;
            registrarHistorico(`Movimentação de estoque (${tipoMovimentacao})`, descricaoMovimentacao);

            // 🔁 Ajuste de lotes somente para entradas
            if (isEntrada) {
                const snapshotOriginais = await firebase.database()
                    .ref(`pedido/${indiceParaEditar}/itensPedido`)
                    .once('value');
                const itensOriginais = snapshotOriginais.val() || {};
                let lotesAtualizados = { ...(produto.lotes || {}) };

                for (const dadosOrig of Object.values(itensOriginais)) {
                    if (dadosOrig.produtoId !== produtoId) continue;
                    const chaveOrig = `${dadosOrig.validade || 'sem-validade'}|${dadosOrig.lote || 'sem-lote'}`;
                    if (lotesAtualizados[chaveOrig]) {
                        lotesAtualizados[chaveOrig].quantidade =
                            Math.max(0, lotesAtualizados[chaveOrig].quantidade - dadosOrig.quantidade);
                        if (lotesAtualizados[chaveOrig].quantidade === 0) {
                            delete lotesAtualizados[chaveOrig];
                        }
                    }
                }

                for (const novo of itensPedido) {
                    if (novo.produtoId !== produtoId) continue;
                    const chaveNovo = `${novo.validade || 'sem-validade'}|${novo.lote || 'sem-lote'}`;
                    lotesAtualizados[chaveNovo] = {
                        quantidade: (lotesAtualizados[chaveNovo]?.quantidade || 0) + novo.quantidade
                    };
                }

                await produtoRef.update({ lotes: lotesAtualizados });
            }
        }
    } else {
        // Atualização normal para novos pedidos
        for (const item of itensPedido) {
            const produtoRef = firebase.database().ref(`produto/${item.produtoId}`);
            const snapshot = await produtoRef.once('value');
            const produto = snapshot.val();

            if (!produto) continue;

            const estoqueAtual = parseFloat(produto.quantidadeEstoque || 0);
            const quantidade = parseFloat(item.quantidade || 0);
            const novoEstoque = isEntrada ? estoqueAtual + quantidade : estoqueAtual - quantidade;

            await produtoRef.update({
                quantidadeEstoque: novoEstoque < 0 ? 0 : novoEstoque,
                dataUltimaAtualizacao: new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
            });

            // 🔎 Histórico
            const tipoMovimentacao = isEntrada ? 'Entrada' : 'Saída';
            const descricaoMovimentacao = `${tipoMovimentacao} de ${quantidade} ${produto.unidadeMedida || ''} no produto "${produto.nome}"`;
            registrarHistorico(`Movimentação de estoque (${tipoMovimentacao})`, descricaoMovimentacao);

            // Atualizar lotes
            if (isEntrada) {
                const chaveLote = `${item.validade || 'sem-validade'}|${item.lote || 'sem-lote'}`;
                const lotes = produto.lotes || {};

                if (lotes[chaveLote]) {
                    lotes[chaveLote].quantidade += quantidade;
                } else {
                    lotes[chaveLote] = { quantidade };
                }

                await produtoRef.update({ lotes });
            }
        }
    }

    // Feedback e reset
    mostrarMensagem("✅ Pedido salvo com sucesso!", "success");
    modal.style.display = 'none';
    editando = false;
    indiceParaEditar = null;
    carregarPedidosDoFirebase();
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

    // Delegação de eventos para toda a área principal
    document.querySelector('main').addEventListener('click', async function (e) {
        const target = e.target;

        // Consultar pedido (ícone de lupa principal)
        if (e.target.classList.contains('search-icon') && !e.target.classList.contains('ver-itens-icon')) {
            const linha = e.target.closest('tr');
            if (!linha) return;

            // Obter a chave do Firebase
            const firebaseKey = linha.getAttribute('data-key');

            // Encontrar o pedido correspondente
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
            container.innerHTML = ''; // limpa os itens

            Object.values(pedido.itensPedido || {}).forEach(item => {
                const div = document.createElement('div');
                div.classList.add('item-visualizado');

                const quantidade = item.quantidade || 0;
                const subtotal = item.subtotal || 0;
                const nomeProduto = item.nome || '';
                const validade = item.validade ? formatarData(item.validade) : '—';
                const lote = item.lote || '—';

                div.innerHTML = `
            <div><strong>Produto:</strong> ${nomeProduto}</div>
            <div><strong>Quantidade:</strong> ${quantidade}</div>
            <div><strong>Subtotal:</strong> R$ ${parseFloat(subtotal).toFixed(2).replace('.', ',')}</div>
            ${pedido.tipoPedido === 'Compra' ? `
                <div><strong>Validade:</strong> ${validade}</div>
                <div><strong>Lote:</strong> ${lote}</div>
            ` : ''}
            <hr>
        `;
                container.appendChild(div);
            });

            const total = parseFloat(pedido.valor || 0).toFixed(2).replace('.', ',');
            document.getElementById('totalVisualizar').textContent = `R$ ${total}`;

            document.getElementById('modal-visualizar').style.display = 'flex';
        }

        // Ver itens (ícone de lupa na coluna Produtos)
        else if (target.classList.contains('ver-itens-icon')) {
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
        }

        // Editar pedido (ícone de lápis)
        else if (target.classList.contains('edit-icon')) {
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

            for (const itemId of Object.keys(pedido.itensPedido)) {
                const itemSnapshot = await firebase.database().ref(`itemPedido/${itemId}`).once('value');
                const itemData = itemSnapshot.val();
                if (!itemData) continue;

                const div = document.createElement('div');
                div.classList.add('item-pedido');

                div.innerHTML = `
                    <div class="grupo-form">
                        <label>Produto:</label>
                        <select class="campo-form produto-select" required>
                            <option value="" disabled>Carregando...</option>
                        </select>
                    </div>
                    <div class="grupo-form-duplo">
                        <div>
                            <label>Quantidade</label>
                            <input type="number" class="campo-form quantidade-input" min="1" value="${itemData.quantidade || 1}" required>
                        </div>
                        <div>
                            <label>Subtotal</label>
                            <input type="text" class="campo-form subtotal-input" value="0,00" readonly>
                        </div>
                    </div>
                    ${isEntrada ? `
                    <div class="grupo-form-duplo">
                        <div>
                            <label>Validade</label>
                            <input type="date" class="campo-form validade-item" value="${itemData.validade || ''}" required>
                        </div>
                        <div>
                            <label>Lote</label>
                            <input type="text" class="campo-form lote-item" value="${itemData.lote || ''}" maxlength="20">
                        </div>
                    </div>
                    ` : ''}
                    <button type="button" class="botao-remover-item">Remover</button>
                `;

                container.appendChild(div);

                const select = div.querySelector('select.produto-select');
                const inputQuantidade = div.querySelector('input.quantidade-input');
                const btnRemover = div.querySelector('.botao-remover-item');

                await carregarProdutos(select);
                select.value = itemData.produtoId;

                select.addEventListener('change', () => calcularSubtotalItem(div));
                inputQuantidade.addEventListener('input', () => calcularSubtotalItem(div));
                btnRemover.addEventListener('click', () => {
                    div.remove();
                    atualizarTotalPedido();
                });

                calcularSubtotalItem(div);
            }

            await carregarFornecedores();

            if (isEntrada) {
                const selectFornecedor = modal.querySelector('#nomeAdicionar');
                selectFornecedor.value = pedido.fornecedor || '';
            } else {
                const inputCliente = modal.querySelector('#nomeAdicionarSaida');
                inputCliente.value = pedido.nomeCliente || '';
            }

            modal.style.display = 'flex';
        }

        // Excluir pedido (ícone de lixeira)
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

    // Evento para checkboxes de seleção
    document.querySelector('main').addEventListener('change', e => {
        if (e.target.classList.contains('selecionar-pedido')) {
            atualizarBotaoExcluirSelecionados();
        }
    });

    // Fecha modais
    document.getElementById('fecharVisualizar').addEventListener('click', () => {
        document.getElementById('modal-visualizar').style.display = 'none';
    });

    document.getElementById('fecharVisualizarItens').addEventListener('click', () => {
        document.getElementById('modal-visualizar-itens').style.display = 'none';
    });

    // Confirma exclusão
    document.getElementById('btn-confirmar-excluir').addEventListener('click', () => {
        const modal = document.getElementById('modal-confirmar-exclusao');
        const multiplos = modal.getAttribute('data-multiplos') === 'true';

        if (multiplos) {
            const selecionados = Array.from(document.querySelectorAll('.selecionar-pedido:checked'));

            const promises = selecionados.map(cb => {
                const row = cb.closest('tr');
                const key = row.getAttribute('data-key');
                const pedido = pedidos.find(p => p.firebaseKey === key);

                const itens = pedido.itensPedido || {};
                const promisesItens = Object.keys(itens).map(itemId =>
                    firebase.database().ref('itemPedido/' + itemId).remove()
                );

                return Promise.all(promisesItens).then(() =>
                    firebase.database().ref('pedido/' + key).remove()
                );
            });

            Promise.all(promises).then(() => {
                mostrarMensagem('Pedidos excluídos com sucesso!', 'success');
                modal.style.display = 'none';
                carregarPedidosDoFirebase();
            });

        } else {
            if (!firebaseKeyParaExcluir) return;

            const pedido = pedidos.find(p => p.firebaseKey === firebaseKeyParaExcluir);
            const itens = pedido.itensPedido || {};

            const promisesItens = Object.keys(itens).map(itemId =>
                firebase.database().ref('itemPedido/' + itemId).remove()
            );

            Promise.all(promisesItens).then(() => {
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
        // Converter datas para timestamp (milissegundos)
        const timestampA = new Date(a.data).getTime();
        const timestampB = new Date(b.data).getTime();

        // Tratar casos onde a data pode ser inválida
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
            return 0; // sem ordenação
        }
    });
}

async function adicionarOuAtualizarLote(produtoId, lote, validade, quantidade) {
    const ref = firebase.database().ref('produto/' + produtoId);
    const snapshot = await ref.once('value');
    const produto = snapshot.val();

    if (!produto) return;

    if (!produto.lotes) produto.lotes = {};

    if (!produto.lotes[lote]) {
        produto.lotes[lote] = {
            validade,
            quantidade
        };
    } else {
        produto.lotes[lote].quantidade += quantidade;
    }

    // Atualiza a quantidade total
    let total = 0;
    for (const l in produto.lotes) {
        total += produto.lotes[l].quantidade;
    }

    await ref.update({
        lotes: produto.lotes,
        quantidadeTotal: total
    });
}

async function removerDoEstoquePorLote(produtoId, quantidade) {
    const ref = firebase.database().ref('produto/' + produtoId);
    const snapshot = await ref.once('value');
    const produto = snapshot.val();

    if (!produto?.lotes) return;

    const lotesOrdenados = Object.entries(produto.lotes).sort((a, b) => {
        return new Date(a[1].validade) - new Date(b[1].validade);
    });

    let restante = quantidade;

    for (const [loteId, lote] of lotesOrdenados) {
        if (restante <= 0) break;

        const disponivel = lote.quantidade;
        const usado = Math.min(disponivel, restante);
        produto.lotes[loteId].quantidade -= usado;
        restante -= usado;

        if (produto.lotes[loteId].quantidade <= 0) {
            delete produto.lotes[loteId];
        }
    }

    let total = 0;
    for (const l in produto.lotes) {
        total += produto.lotes[l].quantidade;
    }

    await ref.update({
        lotes: produto.lotes,
        quantidadeTotal: total
    });
}

async function atualizarEstoquePorPedido(itemPedido, tipoPedido) {
    const produtoId = itemPedido.produto.id;
    const lote = itemPedido.produto.lote || 'sem-lote';
    const validade = itemPedido.produto.validade || '';
    const quantidade = itemPedido.quantidade;

    const produtoRef = firebase.database().ref('produto/' + produtoId);
    const snapshot = await produtoRef.once('value');
    const produto = snapshot.val();

    if (!produto) return;

    if (!produto.lotes) produto.lotes = {};

    if (tipoPedido === 'Compra') {
        if (!produto.lotes[lote]) {
            produto.lotes[lote] = {
                validade,
                quantidade
            };
        } else {
            produto.lotes[lote].quantidade += quantidade;
        }
    } else if (tipoPedido === 'Venda') {
        const disponivel = produto.lotes[lote]?.quantidade || 0;
        const novoValor = disponivel - quantidade;

        if (novoValor <= 0) {
            delete produto.lotes[lote];
        } else {
            produto.lotes[lote].quantidade = novoValor;
        }
    }

    // Atualiza o total
    let total = 0;
    for (const l in produto.lotes) {
        total += produto.lotes[l].quantidade;
    }

    await produtoRef.update({
        lotes: produto.lotes,
        quantidadeTotal: total
    })

    async function registrarHistoricoMovimentacao(itemPedido, tipoPedido, idPedido) {
        const historicoRef = firebase.database().ref('historicoAcoes').push(); // ✅ CORRETO

        const hoje = new Date();
        hoje.setHours(hoje.getHours() - 3); // Fuso GMT-3
        const data = hoje.toISOString().slice(0, 10);

        await historicoRef.set({
            tipoMovimentacao: tipoPedido === 'Compra' ? 'Entrada' : 'Saída',
            produtoId: itemPedido.produto.id,
            produtoNome: itemPedido.produto.nome,
            lote: itemPedido.produto.lote || 'sem-lote',
            validade: itemPedido.produto.validade || '',
            quantidade: itemPedido.quantidade,
            dataMovimentacao: data,
            idPedido: idPedido
        });
    }
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
