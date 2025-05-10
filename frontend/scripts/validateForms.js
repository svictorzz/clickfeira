document.addEventListener("DOMContentLoaded", function () {

    const formCadastro = document.getElementById("formCadastro");
    const formLogin = document.getElementById("formLogin"); 

    if (formCadastro) {
        formCadastro.addEventListener("submit", function (e) {
            e.preventDefault();
            let valid = true;

            const campos = {
                nome: {
                    el: document.getElementById("nome"),
                    cond: val => val.trim().length >= 3,
                    msg: "Nome deve ter pelo menos 3 caracteres."
                },
                email: {
                    el: document.getElementById("email"),
                    cond: val => val.includes("@") && val.includes("."),
                    msg: "Digite um e-mail válido."
                },
                cpf: {
                    el: document.getElementById("cpf"),
                    cond: val => val.trim().length === 11,
                    msg: "Informe um CPF válido."
                },
                endereco: {
                    el: document.getElementById("endereco"),
                    cond: val => val.trim().length >= 5,
                    msg: "Endereço inválido."
                },
                telefone: { 
                    el: document.getElementById("telefone"),
                    cond: val => val.trim().length >= 8,
                    msg: "Telefone inválido."
                },
                senha: {
                    el: document.getElementById("senha"),
                    cond: val => /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/.test(val),
                    msg: "A senha deve ter no mínimo 6 caracteres, incluindo uma letra maiúscula, um número e um caractere especial."
                },
                confirmarSenha: {
                    el: document.getElementById("confirmarSenha"),
                    cond: val => val === document.getElementById("senha").value,
                    msg: "As senhas não coincidem."
                }
            };

            for (const key in campos) {
                const campo = campos[key];
                if (!campo.el) {
                    console.error(`❌ Campo não encontrado: ${key}`);
                    valid = false;
                    continue;
                }
                const valor = campo.el.value;

                if (!campo.cond(valor)) {
                    campo.el.classList.add("is-invalid");
                    valid = false;
                } else {
                    campo.el.classList.remove("is-invalid");
                }
            }

            if (valid) {
                console.log("📤 Dados validados e prontos para envio!");
                const userData = new FormData(formCadastro);
                registerUser(Object.fromEntries(userData.entries()));
            }
        });
    }

    if (formLogin) {
        formLogin.addEventListener("submit", async function (e) {
            e.preventDefault();
            console.log("📤 Tentando login...");

            const email = document.getElementById("loginEmail").value.trim();
            const senha = document.getElementById("loginSenha").value.trim();
            const errorMessage = document.getElementById("erroLogin");

            try {
                const response = await fetch(`${API_URL}/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, senha }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || "Credenciais inválidas.");
                }
                window.location.href = "inicio.html";
            } catch (error) {
                console.error("❌ Erro de login:", error);

                if (errorMessage) {
                    errorMessage.textContent = error.message;
                    errorMessage.style.display = "block";
                } else {
                    alert(error.message);
                }
            }
        });
    }
});

async function registerUser(userData) {
    console.log("📤 Enviando dados para o backend:", userData);

    try {
        const response = await fetch(`${API_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(userData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Erro ao cadastrar usuário.");
        }

        window.location.href = "login.html";  
        
    } catch (error) {
        const errorMessage = document.getElementById("erroCadastro");

        if (errorMessage) {
            errorMessage.textContent = error.message;
            errorMessage.style.display = "block"; 
        } else {
            alert(error.message);
        }

        console.error("❌ Erro no cadastro:", error);   
    }
}
