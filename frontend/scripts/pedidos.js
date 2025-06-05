const pedidos = [];
let paginaAtual = 1;
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

    document.getElementById('button-entradas').addEventListener('click', () => {
        mostrarEntradas();
    });

    document.getElementById('button-saidas').addEventListener('click', () => {
        mostrarSaidas();
    });

    document.getElementById('btn-excluir-selecionados').addEventListener('click', excluirSelecionados);

    document.getElementById('btnAbrirModal').addEventListener('click', () => {
        const titulo = tipoAtual === 'entrada' ? 'titulo-modal-pedido' : 'titulo-modal-saida';
        document.getElementById(titulo).textContent = 'Pedido';
        editando = false;
        if (tipoAtual === 'entrada') {
            const nome = document.getElementById('nomeAdicionar');
            const produtoSelect = document.getElementById('produtosAdicionar');
            const quantidadeInput = document.getElementById('quantidadeAdicionar');
            const subtotalInput = document.getElementById('subtotalAdicionar');
            indiceParaEditar = null;

            const container = document.querySelector('#modal-entrada .itens-pedido-container');
            container.querySelectorAll('.item-pedido-dinamico').forEach(el => el.remove());

            nome.selectedIndex = 0;
            produtoSelect.selectedIndex = 0;
            quantidadeInput.value = 1;
            subtotalInput.value = "0,00";

            document.getElementById('modal-entrada').style.display = 'flex';
            document.getElementById('totalAdicionar').textContent = "0,00";

            document.querySelector('.modal-order-number').textContent = gerarCodigoPedido();

            carregarFornecedores();
        }
        else if (tipoAtual === 'saida') {
            const nome = document.getElementById('nomeAdicionarSaida');
            const produtoSelect = document.getElementById('produtosAdicionarSaida');
            const quantidadeInput = document.getElementById('quantidadeAdicionarSaida');
            const subtotalInput = document.getElementById('subtotalAdicionarSaida');
            indiceParaEditar = null;

            const container = document.getElementById('container-itens-saida');
            container.querySelectorAll('.item-pedido-dinamico').forEach(el => el.remove());

            nome.value = '';
            produtoSelect.selectedIndex = 0;
            quantidadeInput.value = 1;
            subtotalInput.value = "0,00";

            document.getElementById('modal-saida').style.display = 'flex';
            document.getElementById('totalAdicionarSaida').textContent = "0,00";

            document.querySelector('.modal-order-number').textContent = gerarCodigoPedido();
        }
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

    document.getElementById('ordenar-pedidos').addEventListener('change', () => {
        paginaAtual = 1;
        atualizarTabelaPedidos();
    });

    document.querySelector('.filter-button')?.addEventListener('click', () => {
        const filtros = document.getElementById('filtros-container-pedidos');
        filtros.style.display = filtros.style.display === 'none' ? 'flex' : 'none';
    });

    document.getElementById('nomeAdicionar').addEventListener('change', (e) => {
        const container = e.target.closest('.modal-content');
        const produtoSelect = container.querySelector('.produto-select');
        const quantidadeInput = container.querySelector('.quantidade-input');

        if (produtoSelect && quantidadeInput) {
            produtoSelect.disabled = false;
            quantidadeInput.disabled = false;
        }

        carregarProdutos();
        calcularValorPedido();
    });

    document.getElementById('nomeAdicionarSaida').addEventListener('change', () => {
        document.getElementById('produtosAdicionarSaida').disabled = false;
        document.getElementById('quantidadeAdicionarSaida').disabled = false;

        carregarProdutos();
        calcularValorPedido();
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
        botao.addEventListener('click', function (e) {
            e.preventDefault();

            itemCounter++;

            // Encontra o modal onde o botão foi clicado
            const modal = e.target.closest('.modal-content');

            const container = modal.querySelector('.itens-pedido-container');
            const originalItem = modal.querySelector('.item-pedido');
            const newItem = originalItem.cloneNode(true);

            newItem.setAttribute('data-item-id', itemCounter);

            const selectProduto = newItem.querySelector('select.produto-select');
            const inputQuantidade = newItem.querySelector('input.quantidade-input');
            const inputSubtotal = newItem.querySelector('input.subtotal-input');

            selectProduto.name = `produto_${itemCounter}`;
            selectProduto.id = `produtosAdicionar_${itemCounter}`;
            selectProduto.disabled = false;
            selectProduto.selectedIndex = 0;

            inputQuantidade.name = `quantidade_${itemCounter}`;
            inputQuantidade.id = `quantidadeAdicionar_${itemCounter}`;
            inputQuantidade.value = 1;
            inputQuantidade.disabled = false;

            inputSubtotal.name = `subtotal_${itemCounter}`;
            inputSubtotal.id = `subtotalAdicionar_${itemCounter}`;
            inputSubtotal.value = '0,00';

            selectProduto.addEventListener('change', () => calcularSubtotalItem(newItem));
            inputQuantidade.addEventListener('input', () => calcularSubtotalItem(newItem));

            const btnRemover = newItem.querySelector('.botao-remover-item');
            btnRemover.style.display = 'inline-block';
            btnRemover.addEventListener('click', () => {
                newItem.remove();
                atualizarTotalPedido();
                itemCounter--;
            });

            container.appendChild(newItem);
        });
    });

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

    carregarPedidosDoFirebase();
}

function carregarFornecedores() {
    const select = document.getElementById('nomeAdicionar');
    select.innerHTML = '<option value="" selected disabled>Selecione...</option>';

    const fornecedoresRef = firebase.database().ref('fornecedor');

    fornecedoresRef.once('value')
        .then(snapshot => {
            snapshot.forEach(childSnapshot => {
                const fornecedor = childSnapshot.val();
                const option = document.createElement('option');
                option.value = childSnapshot.key; // pode ser o ID único
                option.textContent = fornecedor.nome; // exibe o nome no select
                select.appendChild(option);
            });
        })
        .catch(error => {
            console.error("Erro ao carregar fornecedores:", error);
        });
}

function carregarProdutos() {
    if (!editando) {
        document.querySelectorAll('.produto-select').forEach(select => {
            select.innerHTML = '<option value="" selected disabled>Selecione...</option>';
            select.disabled = true;
        });
    }
    const produtosRef = firebase.database().ref('produto');

    produtosRef.once('value')
        .then(snapshot => {
            const produtos = snapshot.val();
            if (!produtos) return;

            const opcoes = [];

            Object.entries(produtos).forEach(([key, produto]) => {
                const optionHTML = `<option value="${key}" data-preco="${produto.preco}">${produto.nome}</option>`;
                opcoes.push(optionHTML);
            });

            document.querySelectorAll('.produto-select').forEach(select => {
                select.innerHTML += opcoes.join('');
                select.disabled = false;
            });
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

function calcularSubtotalItem(itemContainer) {
    const select = itemContainer.querySelector('select.produto-select');
    const quantidadeInput = itemContainer.querySelector('input.quantidade-input');
    const subtotalInput = itemContainer.querySelector('input.subtotal-input');

    const selectedOption = select.options[select.selectedIndex];
    const preco = parseFloat(selectedOption?.dataset.preco || 0);
    const quantidade = parseFloat(quantidadeInput.value || 1);

    if (!isNaN(preco) && !isNaN(quantidade)) {
        const subtotal = preco * quantidade;
        subtotalInput.value = subtotal.toFixed(2).replace('.', ',');
    } else {
        subtotalInput.value = '0,00';
    }

    atualizarTotalPedido();
}

function atualizarTotalPedido() {
    let total = 0;

    document.querySelectorAll('.item-pedido').forEach(item => {
        const subtotalInput = item.querySelector('.subtotal-input');
        const subtotalStr = subtotalInput?.value?.replace(',', '.') || "0";
        const subtotal = parseFloat(subtotalStr);
        if (!isNaN(subtotal)) {
            total += subtotal;
        }
    });

    document.getElementById('totalAdicionar').textContent = total.toFixed(2).replace('.', ',');
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
            pedido.firebaseKey = childSnapshot.key;
            pedidos.push(pedido);
        });
        atualizarTabelaPedidos();
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
        fornecedorCelula.textContent = pedido.fornecedor || '';
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
        }
        if (tipoAtual === 'entrada') {
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

function handlePedidoSubmit(e) {
    e.preventDefault();

    const isEntrada = tipoAtual === 'entrada';
    const modalId = isEntrada ? 'modal-entrada' : 'modal-saida';
    const modal = document.getElementById(modalId);

    const nomeAdicionar = isEntrada ? modal.querySelector('#nomeAdicionar') : modal.querySelector('#nomeAdicionarSaida');

    const nomeValue = nomeAdicionar.value.trim();

    const numeroPedido = modal.querySelector('.modal-order-number').textContent;

    const itensContainer = isEntrada
        ? modal.querySelectorAll('.item-pedido')
        : modal.querySelectorAll('.item-pedido');

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

    const idPedido = firebase.database().ref().push().key;
    const pedidoRef = firebase.database().ref('pedido').child(idPedido);
    let totalPedido = 0;
    const itensASalvar = [];
    const itensPedidoRefs = {};

    for (const item of itensContainer) {
        const produtoSelect = item.querySelector('select.produto-select');
        const quantidadeInput = item.querySelector('input.quantidade-input');
        const subtotalInput = item.querySelector('input.subtotal-input');

        const idProduto = produtoSelect ? produtoSelect.value : null;
        const quantidade = quantidadeInput ? parseFloat(quantidadeInput.value) : 0;
        const subtotal = subtotalInput ? parseFloat(subtotalInput.value.replace(',', '.')) : 0;

        if (!idProduto || isNaN(quantidade) || quantidade <= 0) {
            mostrarMensagem('⚠️ Todos os itens devem ter um produto selecionado e uma quantidade válida.', 'error');
            return;
        }

        totalPedido += subtotal;

        const idItemPedido = firebase.database().ref().push().key;

        itensASalvar.push({
            ref: firebase.database().ref('itemPedido/' + idItemPedido),
            data: {
                idItemPedido,
                produto: idProduto,
                quantidade,
                subtotal
            }
        });

        itensPedidoRefs[idItemPedido] = { idItemPedido };
    }

    const dadosPedido = {
        fornecedor: nomeValue,
        numero: numeroPedido,
        tipoPedido: tipoPedido,
        data: new Date().toISOString().slice(0, 10),
        comerciante: "admin",
        itensPedido: itensPedidoRefs,
        valor: totalPedido
    };

    pedidoRef.set(dadosPedido)
        .then(() => {
            const promessas = itensASalvar.map(item => item.ref.set(item.data));
            return Promise.all(promessas);
        })
        .then(() => {
            mostrarMensagem('✅ Pedido e itens salvos com sucesso!', 'success');
            document.getElementById(modalId).style.display = 'none';
            carregarPedidosDoFirebase();
        })
        .catch(error => {
            console.error('Erro ao salvar pedido:', error);
            mostrarMensagem('🚫 Erro ao salvar o pedido. Tente novamente.', 'error');
        });
}

function mostrarMensagem(texto, tipo = 'success') {
    const msg = document.createElement('div');
    msg.textContent = texto;
    msg.className = `mensagem-alerta ${tipo}`;
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 4000);
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
                document.getElementById('visualizarID').textContent = pedido.numero || '(sem número)';
                const tipo = pedido.tipoPedido;

                const labelNome = document.getElementById('labelNome');
                labelNome.textContent = pedido.tipoPedido === 'Venda' ? 'Cliente:' : 'Fornecedor:';
                if (tipo === 'Compra') {
                    buscarNomeFornecedorPorId(pedido.fornecedor).then(nomeFornecedor => {
                        document.getElementById('nomeVisualizar').innerHTML = `
                            <option value="${pedido.fornecedor}" selected>${nomeFornecedor}</option>
                        `;
                    });
                } else {
                    document.getElementById('nomeVisualizar').value = pedido.fornecedor || '';
                }

                const container = document.querySelector('#modal-visualizar .itens-pedido-container');
                container.innerHTML = '';

                const itemIds = Object.values(pedido.itensPedido).map(obj => obj.idItemPedido);
                const promessas = itemIds.map(id => buscarItemPedidoPorId(id));

                Promise.all(promessas).then(itens => {
                    itens.forEach((item, index) => {
                        const div = document.createElement('div');
                        div.classList.add('item-pedido');
                        div.setAttribute('data-item-id', index + 1);

                        buscarProdutoPorId(item.produto).then(produto => {
                            const nomeProduto = produto && produto.nome ? produto.nome : '(produto não encontrado)';

                            div.innerHTML = `
                            <div class="grupo-form">
                                <label>Produto:</label>
                                <span class="campo-form leitura">${nomeProduto}</span>
                            </div>
                            <div class="grupo-form-duplo">
                                <div>
                                    <label>Quantidade:</label>
                                    <span class="campo-form leitura">${item.quantidade}</span>
                                </div>
                                <div>
                                    <label>Subtotal:</label>
                                    <span class="campo-form leitura">R$ ${parseFloat(item.subtotal).toFixed(2).replace('.', ',')}</span>
                                </div>
                            </div>
                        `;
                            container.appendChild(div);
                        });
                    });
                });

                document.getElementById('totalVisualizar').textContent = `R$ ${parseFloat(pedido.valor).toFixed(2).replace('.', ',')}`;
                document.getElementById('modal-visualizar').style.display = 'flex';
            }

            if (e.target.classList.contains('edit-icon')) {
                editando = true;
                indiceParaEditar = index;
                const tipo = pedido.tipoPedido;
                const modalId = tipo === 'Compra' ? 'modal-entrada' : 'modal-saida';
                const titulo = tipo === 'Compra' ? 'titulo-modal-pedido' : 'titulo-modal-saida';
                const modal = document.getElementById(modalId);

                modal.querySelector('.modal-order-number').textContent = pedido.numero || '(sem número)';
                document.getElementById(titulo).textContent = 'Editar Pedido';

                if (tipo === 'Compra') {
                    buscarNomeFornecedorPorId(pedido.fornecedor).then(nomeFornecedor => {
                        document.getElementById('nomeAdicionar').innerHTML = `
                <option value="${pedido.fornecedor}" selected>${nomeFornecedor}</option>
            `;
                    });
                } else {
                    document.getElementById('nomeAdicionarSaida').value = pedido.fornecedor || '';
                }

                const container = tipo === 'Compra'
                    ? document.querySelector('#modal-entrada .itens-pedido-container')
                    : document.getElementById('container-itens-saida');

                // Limpa apenas os blocos dinâmicos (não os campos fixos)
                container.querySelectorAll('.item-pedido-dinamico').forEach(el => el.remove());

                const itemIds = Object.values(pedido.itensPedido).map(obj => obj.idItemPedido);
                const promessas = itemIds.map(id => buscarItemPedidoPorId(id));

                Promise.all(promessas).then(itens => {
                    itens.forEach((item, i) => {
                        buscarProdutoPorId(item.produto).then(produto => {
                            const nomeProduto = produto && produto.nome ? produto.nome : '(produto não encontrado)';
                            const subtotalFormatado = `R$ ${parseFloat(item.subtotal).toFixed(2).replace('.', ',')}`;

                            if (i === 0) {
                                // Preenche os campos fixos do modal
                                const selectProduto = document.getElementById('produtosAdicionar');
                                const inputQuantidade = document.getElementById('quantidadeAdicionar');
                                const inputSubtotal = document.getElementById('subtotalAdicionar');

                                if (selectProduto && inputQuantidade && inputSubtotal) {
                                    selectProduto.innerHTML = `<option selected>${nomeProduto}</option>`;
                                    selectProduto.disabled = false;
                                    inputQuantidade.value = item.quantidade;
                                    inputQuantidade.disabled = false;
                                    inputSubtotal.value = subtotalFormatado;
                                }
                            } else {
                                // Adiciona blocos dinamicamente para os outros itens
                                const div = document.createElement('div');
                                div.classList.add('item-pedido', 'item-pedido-dinamico');
                                div.setAttribute('data-item-id', i + 1);

                                div.innerHTML = `
                        <div class="grupo-form">
                            <label>Produto:</label>
                            <select class="campo-form produto-select">
                                <option selected>${nomeProduto}</option>
                            </select>
                        </div>
                        <div class="grupo-form-duplo">
                            <div>
                                <label>Quantidade</label>
                                <input type="number" class="campo-form quantidade-input" value="${item.quantidade}">
                            </div>
                            <div>
                                <label>Subtotal</label>
                                <input type="text" class="campo-form subtotal-input" value="${subtotalFormatado}" readonly>
                            </div>
                        </div>
                        <button type="button" class="botao-remover-item" style="display: none;">Remover</button>
                    `;
                                container.appendChild(div);
                            }

                            if (tipo === 'Compra') {
                                carregarFornecedores();
                            }
                            carregarProdutos();
                            calcularValorPedido();
                        });
                    });
                });

                modal.style.display = 'flex';
            }


            if (e.target.classList.contains('delete-icon')) {
                firebaseKeyParaExcluir = firebaseKey;
                document.getElementById('modal-confirmar-exclusao').style.display = 'flex';
            }

            if (e.target.classList.contains('ver-itens-icon')) {
                const container = document.getElementById('itens-lista-visualizacao');
                container.innerHTML = '';

                const itemIds = Object.values(pedido.itensPedido).map(obj => obj.idItemPedido);
                const promessas = itemIds.map(id => buscarItemPedidoPorId(id));

                Promise.all(promessas).then(itens => {
                    itens.forEach((item, index) => {
                        const div = document.createElement('div');
                        div.classList.add('item-pedido');
                        div.setAttribute('data-item-id', index + 1);

                        buscarProdutoPorId(item.produto).then(produto => {
                            const nomeProduto = produto && produto.nome ? produto.nome : '(produto não encontrado)';
                            const quantidade = item.quantidade;
                            const subtotal = parseFloat(item.subtotal).toFixed(2).replace('.', ',');

                            const div = document.createElement('div');
                            div.innerHTML = `
                                <p><strong>Produto:</strong> ${nomeProduto}</p>
                                <p><strong>Quantidade:</strong> ${quantidade}</p>
                                <p><strong>Subtotal:</strong> R$ ${subtotal}</p>
                                <hr>
                            `;
                            container.appendChild(div);
                        });
                    });
                });

                document.getElementById('modal-visualizar-itens').style.display = 'flex';
            }
        });
    });
}

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
            const promisesItens = Object.values(itens).map(item =>
                firebase.database().ref('itemPedido/' + item.idItemPedido).remove()
            );

            // Excluir o pedido após os itens
            return Promise.all(promisesItens).then(() =>
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

        const pedido = pedidos.find(p => p.firebaseKey === firebaseKeyParaExcluir);
        const itens = pedido.itensPedido || {};

        const promisesItens = Object.values(itens).map(item =>
            firebase.database().ref('itemPedido/' + item.idItemPedido).remove()
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