document.addEventListener("DOMContentLoaded", function () {
    function toggleSenha(inputSelector, iconeSelector) {
        const input = document.querySelector(inputSelector);
        const icone = document.querySelector(`#${iconeSelector}`);

        if (!input || !icone) {
            return;
        }

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

    toggleSenha("input[name='senha']", "iconeSenha");
    toggleSenha("input[name='confirmarSenha']", "iconeConfirmarSenha");
});