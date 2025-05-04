document.addEventListener("DOMContentLoaded", function () {
    function toggleSenha(idInput, idIcone) {
        const input = document.getElementById(idInput);
        const icone = document.getElementById(idIcone);

        icone.addEventListener("click", function () {
            if (input.type === "password") {
                input.type = "text";
                icone.classList.replace("bi-eye", "bi-eye-slash");
            } else {
                input.type = "password";
                icone.classList.replace("bi-eye-slash", "bi-eye");
            }
        });
    }

    toggleSenha("senha", "iconeSenha");
    toggleSenha("confirmarSenha", "iconeConfirmarSenha"); 
});
