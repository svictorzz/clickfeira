document.addEventListener('DOMContentLoaded', function () {
    // Função para calcular subtotal e total automaticamente
    function calcularSubtotalETotal(modalId) {
        const modal = document.querySelector(modalId);
        const produtoSelecionado = modal.querySelector(modalId === '#modalAdicionar' ? '#produtoAdicionar' : '#produtoEditar').value;
        const quantidade = modal.querySelector(modalId === '#modalAdicionar' ? '#quantidadeAdicionar' : '#quantidadeEditar').value;
        let precoUnitario = 0;

        // Definindo preço unitário com base no produto selecionado
        if (produtoSelecionado === "Maçã Fuji") {
            precoUnitario = 3.5;
        } else if (produtoSelecionado === "Banana Prata") {
            precoUnitario = 2.0;
        }

        // Calculando o subtotal e o total
        if (quantidade && precoUnitario) {
            const subtotal = parseFloat(quantidade) * precoUnitario;
            const subtotalEl = modal.querySelector(modalId === '#modalAdicionar' ? '#subtotalAdicionar' : '#subtotalEditar');
            const totalEl = modal.querySelector(modalId === '#modalAdicionar' ? '#totalAdicionar' : '#totalEditar');

            subtotalEl.value = "R$ " + subtotal.toFixed(2).replace('.', ',');  // Atualiza o subtotal
            totalEl.textContent = "R$ " + subtotal.toFixed(2).replace('.', ',');  // Atualiza o total
        }
    }

    // Função para validar os campos
    function validarFormulario(modalId) {
        const modal = document.querySelector(modalId);
        let valid = true;

        const campos = {
            fornecedor: {
                el: modal.querySelector(modalId === '#modalAdicionar' ? '#fornecedorAdicionar' : '#fornecedorEditar'),
                cond: val => val && val !== 'Selecione...',
                msg: "Selecione um fornecedor."
            },
            produto: {
                el: modal.querySelector(modalId === '#modalAdicionar' ? '#produtoAdicionar' : '#produtoEditar'),
                cond: val => val && val !== 'Selecione um produto...',
                msg: "Selecione um produto."
            },
            quantidade: {
                el: modal.querySelector(modalId === '#modalAdicionar' ? '#quantidadeAdicionar' : '#quantidadeEditar'),
                cond: val => val && parseInt(val) >= 1,
                msg: "Informe uma quantidade válida (mínimo 1)."
            }
        };

        // Valida os campos
        for (const key in campos) {
            const campo = campos[key];
            const valor = campo.el.value.trim();
            const feedback = campo.el.nextElementSibling; // Pega a mensagem de erro

            if (!campo.cond(valor)) {
                campo.el.classList.add("is-invalid");
                if (feedback) feedback.textContent = campo.msg;
                valid = false;
            } else {
                campo.el.classList.remove("is-invalid");
                if (feedback) feedback.textContent = "";
            }
        }

        return valid;  // Retorna true ou false, dependendo se todos os campos são válidos
    }

    // Atualizar subtotal e total sempre que a quantidade ou produto mudar
    const produtoInput = document.querySelector('#produtoAdicionar');
    const quantidadeInput = document.querySelector('#quantidadeAdicionar');

    if (produtoInput) {
        produtoInput.addEventListener('change', function() {
            calcularSubtotalETotal('#modalAdicionar');
        });
    }

    if (quantidadeInput) {
        quantidadeInput.addEventListener('input', function() {
            calcularSubtotalETotal('#modalAdicionar');
        });
    }

    // Event listener para o botão "Fechar Pedido" (Adicionar)
    const btnAdicionar = document.querySelector('#btnFecharPedido');
    if (btnAdicionar) {
        btnAdicionar.addEventListener('click', function (e) {
            if (!validarFormulario('#modalAdicionar')) {
                e.preventDefault(); // Impede o envio do formulário se a validação falhar
            }
        });
    }

    // Event listener para o botão "Salvar Alterações" (Editar)
    const btnEditar = document.querySelector('#btnSalvarEdicao');
    if (btnEditar) {
        btnEditar.addEventListener('click', function (e) {
            if (!validarFormulario('#modalEditar')) {
                e.preventDefault(); // Impede o envio do formulário se a validação falhar
            }
        });
    }
});
