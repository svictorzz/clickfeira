<<<<<<< HEAD
const form = document.getElementById("formCadastro");

form.addEventListener("submit", function (e) {
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
    documento: {
      el: document.getElementById("documento"),
      cond: val => val.trim().length >= 11,
      msg: "Informe um CPF ou CNPJ válido."
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
      cond: val => {
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,20}$/;
        return regex.test(val);
      },
      msg: "A senha deve ter no mínimo 6 caracteres, incluindo uma letra maiúscula, uma letra minúscula, um número e um caractere especial."
    },
    confirmarSenha: {
      el: document.getElementById("confirmarSenha"),
      cond: val => val === document.getElementById("senha").value,
      msg: "As senhas não coincidem."
    }
  };

  for (const key in campos) {
    const campo = campos[key];
    const valor = campo.el.value;

    const inputGroup = campo.el.closest(".input-group");
    const feedback = inputGroup ? inputGroup.querySelector(".invalid-feedback") : campo.el.nextElementSibling;

    if (!campo.cond(valor)) {
      campo.el.classList.add("is-invalid");
      if (feedback) feedback.textContent = campo.msg;
      valid = false;
    } else {
      campo.el.classList.remove("is-invalid");
      if (feedback) feedback.textContent = "";
    }
  }

  if (valid) {
    console.log("Dados validados e prontos para envio!");
    // form.submit(); 
  }
});
=======
document.addEventListener("DOMContentLoaded", function () {
    console.log("🚀 DOM carregado!");

    const formCadastro = document.getElementById("formCadastro");
    const formLogin = document.getElementById("formLogin");

    if (formCadastro) {
        formCadastro.addEventListener("submit", async function (event) {
            event.preventDefault();
            console.log("🚀 Evento de cadastro disparado!");

            if (!validarCadastro()) return;

            const userData = {
                nome: document.getElementById("nome").value.trim(),
                email: document.getElementById("email").value.trim(),
                senha: document.getElementById("senha").value,
                contato: document.getElementById("telefone").value,
                cpf: document.getElementById("documento").value,
                endereco: document.getElementById("endereco").value.trim()
            };

            try {
                const result = await registerUser(userData);
                console.log("🔄 Resposta do backend:", result);

                alert(result.message); 

                if (result.message === "Cadastro realizado com sucesso!") {
                    window.location.href = "login.html";  
                }
            } catch (error) {
                console.error("❌ Erro ao conectar com o backend:", error);
                alert("Erro ao conectar com o servidor.");
            }
        });
    }

    if (formLogin) {
        formLogin.addEventListener("submit", async function (event) {
            event.preventDefault();
            console.log("🚀 Evento de login disparado!");

            const email = document.getElementById("email").value.trim();
            const senha = document.getElementById("senha").value;

            try {
                const result = await loginUser(email, senha);
                console.log("🔄 Resposta do backend:", result);

                if (result.token) {
                    localStorage.setItem("token", result.token);
                    console.log("✅ Token salvo:", result.token);
                    window.location.href = "inicio.html";
                } else {
                    alert(result.message || "Credenciais inválidas.");
                }
            } catch (error) {
                console.error("❌ Erro ao conectar ao backend:", error);
                alert("Erro ao conectar com o servidor.");
            }
        });
    }
});

function validarCadastro() {
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
        senha: {
            el: document.getElementById("senha"),
            cond: val => val.length >= 6,
            msg: "A senha deve ter pelo menos 6 caracteres."
        }
    };

    for (const key in campos) {
        const campo = campos[key];
        const valor = campo.el.value.trim();

        if (!campo.cond(valor)) {
            campo.el.classList.add("is-invalid");
            campo.el.nextElementSibling.textContent = campo.msg;
            valid = false;
        } else {
            campo.el.classList.remove("is-invalid");
            campo.el.nextElementSibling.textContent = "";
        }
    }

    if (!valid) console.error("❌ Erro: Formulário contém campos inválidos.");
    return valid;
}

async function loginUser(email, senha) {
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, senha }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Erro de autenticação:", data.message || "Erro desconhecido");
            return { message: data.message || "Credenciais inválidas." };
        }

        return data;
    } catch (error) {
        console.error("Erro de login:", error);
        return { message: "Erro ao conectar com o servidor." };
    }
}

async function registerUser(userData) {
    try {
        const response = await fetch(`${API_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(userData),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Erro no cadastro:", data.message);
            return { message: data.message || "Erro ao cadastrar usuário." };
        }

        return data;
    } catch (error) {
        console.error("Erro ao cadastrar:", error);
        return { message: "Falha na comunicação com o servidor." };
    }
}
>>>>>>> dc2a7aedc557e300e91836788e53eed5306edbcf
