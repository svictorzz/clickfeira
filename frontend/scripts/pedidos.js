document.addEventListener('DOMContentLoaded', function () {
    const modalAdicionar = document.getElementById('modal-pedidos');
    const modalEditar = document.getElementById('modal-visualizar');

    const btnAbrirModalAdicionar = document.getElementById('btnAbrirModal');
    const btnCancelarAdicionar = document.getElementById('cancelarModal');
    const btnAbrirModalEditar = document.getElementById('btnAbrirModalEditar');
    const btnCancelarEditar = document.getElementById('cancelarModalEditar');

    const btnFecharPedido = modalAdicionar.querySelector('.btn-success');
    const btnSalvarAlteracoes = modalEditar.querySelector('.btn-success');

    btnAbrirModalAdicionar.addEventListener('click', function () {
        modalAdicionar.style.display = 'flex';
    });

    btnCancelarAdicionar.addEventListener('click', function () {
        modalAdicionar.style.display = 'none';
    });

    btnAbrirModalEditar.addEventListener('click', function () {
        modalEditar.style.display = 'flex';
    });

    btnCancelarEditar.addEventListener('click', function () {
        modalEditar.style.display = 'none';
    });

    btnFecharPedido.addEventListener('click', function () {
        if (validarFormulario('#modal-pedidos')) {  
            modalAdicionar.style.display = 'none';
        }
    });

    btnSalvarAlteracoes.addEventListener('click', function () {
        if (validarFormulario('#modal-visualizar')) {
            modalEditar.style.display = 'none';
        }
    });
});
