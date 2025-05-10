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
