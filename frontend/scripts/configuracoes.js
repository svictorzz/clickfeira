import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import { API_URL } from "./api.js";

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD_8Rr7Ya6MzqJ6Hn6vJwQZ7yj6Qt8sE7A",
  authDomain: "click-feira.firebaseapp.com",
  databaseURL: "https://click-feira-default-rtdb.firebaseio.com",
  projectId: "click-feira",
  storageBucket: "click-feira.appspot.com",
  messagingSenderId: "108583577904",
  appId: "1:108583577904:web:7d9b3d0c8d9b0d8d8e6e7f"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

document.addEventListener("DOMContentLoaded", () => {
  const idComerciante = localStorage.getItem("idComerciante");

  if (!idComerciante) {
    console.warn("ID do comerciante não encontrado no localStorage.");
    return;
  }

  const userRef = ref(db, `comerciante/${idComerciante}`);

  get(userRef)
    .then((snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();

        // Preenche os campos do formulário
        document.getElementById("cpf").value = data.cpf || "";
        document.getElementById("nome").value = data.nome || data.listaFeiras?.nome || "";
        document.getElementById("email").value = data.email || "";
        document.getElementById("telefone").value = data.telefone || data.listaFeiras?.telefone || "";
        document.getElementById("endereco").value = data.endereco || "";
        document.getElementById("senha_atual").value = data.senha || "";
      } else {
        console.warn("Nenhum dado encontrado para o comerciante.");
      }
    })
    .catch((error) => {
      console.error("Erro ao buscar dados do comerciante:", error);
    });
});

async function editarInformacoes() {
    const novoEmail = document.getElementById("email").value;
    const novoEndereco = document.getElementById("endereco").value;
    const novoTelefone = document.getElementById("telefone").value;
    const token = localStorage.getItem("token");

    if (!novoEmail && !novoEndereco && !novoTelefone) {
        alert("Por favor, preencha pelo menos um campo para atualizar.");
        return;
    }

    if (!token) {
        alert("Usuário não autenticado! Faça login novamente.");
        return;
    }

    try {
        const response = await fetch("http://127.0.0.1:5000/edit-info", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                new_email: novoEmail || null,
                new_address: novoEndereco || null,
                new_phone: novoTelefone || null
            })
        });

        const data = await response.json();
        if (response.ok) {
            alert("Informações atualizadas com sucesso!");
        } else {
            alert(`Erro: ${data.message}`);
        }
    } catch (error) {
        console.error("Erro ao editar informações:", error);
        alert("Erro ao editar as informações. Tente novamente.");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const btnTrocarSenha = document.getElementById("btn-confirmar-info");

    if (btnTrocarSenha) {
        btnTrocarSenha.addEventListener("click", function (event) {
            event.preventDefault();
            editarInformacoes();
        });
    } else {
        console.warn("Botão de troca de senha não encontrado.");
    }
});

async function trocarSenha() {
    const oldPassword = document.getElementById("senha_atual").value;
    const newPassword = document.getElementById("nova_senha").value;
    const confirmNewPassword = document.getElementById("confirmar_senha").value;
    const token = localStorage.getItem("token");

    if (!oldPassword || !newPassword) {
        alert("Por favor, preencha todos os campos.");
        return;
    }

    if (oldPassword === newPassword) {
        alert("A nova senha não pode ser igual à senha atual.");
        return;
    }

    if (!token) {
        alert("Usuário não autenticado! Faça login novamente.");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/change-password`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                old_password: oldPassword,
                new_password: newPassword,
                confirm_new_password: confirmNewPassword
            })
        });

        const data = await response.json();
        if (response.ok) {
            alert("Senha alterada com sucesso!");
            document.getElementById("senha_atual").value = newPassword;
            document.getElementById("nova_senha").value = "";
            document.getElementById("confirmar_senha").value = "";
        } else {
            alert(`Erro: ${data.message}`);
        }
    } catch (error) {
        console.error("Erro ao trocar senha:", error);
        alert("Erro ao trocar a senha. Tente novamente.");
    }
}

async function atualizarDadosComerciante() {
    console.log("Função atualizarDadosComerciante() foi chamada! ✅");

    const comercianteId = localStorage.getItem("idComerciante");
    const token = localStorage.getItem("token");

    if (!comercianteId || !token) {
        alert("Usuário não autenticado! Faça login novamente.");
        return;
    }

    const novosDados = {
        email: document.getElementById("email").value,
        telefone: document.getElementById("telefone").value,
        endereco: document.getElementById("endereco").value
    };

    try {
        const response = await fetch(`${API_URL}/config/users/${comercianteId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(novosDados)
        });

        console.log("Status da resposta:", response.status);

        const data = await response.json();
        if (response.ok) {
            alert("Dados atualizados com sucesso!");
        } else {
            alert(`Erro: ${data.message}`);
        }
    } catch (error) {
        console.error("Erro ao atualizar dados:", error);
        alert("Erro ao atualizar dados. Tente novamente.");
    }
}

async function excluirUsuario(comercianteId) {
    try {
        const response = await fetch(`${API_URL}/config/users/${comercianteId}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("token")}`,
                "Content-Type": "application/json"
            }
        });

        if (response.ok) {
            alert("Usuário excluído com sucesso!");
            window.location.href = "login.html";  
        } else {
            const errorData = await response.json();
            alert(`Erro: ${errorData.message}`);
        }
    } catch (error) {
        console.error("Erro ao excluir usuário:", error);
        alert("Erro ao excluir usuário.");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const btnTrocarSenha = document.getElementById("btn-mudar-senha");

    if (btnTrocarSenha) {
        btnTrocarSenha.addEventListener("click", function (event) {
            event.preventDefault();
            trocarSenha();
        });
    } else {
        console.warn("Botão de troca de senha não encontrado.");
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const btnSalvar = document.getElementById("btn-salvar-dados");

    if (btnSalvar) {
        btnSalvar.addEventListener("click", function (event) {
            event.preventDefault();
            console.log("Botão 'Salvar' foi clicado! 🚀");
            atualizarDadosComerciante();  
        });
    } else {
        console.warn("Botão de salvar dados não encontrado!");
    }
});

document.getElementById("btn-confirmar-exclusao").addEventListener("click", function() {
    const comercianteId = localStorage.getItem("idComerciante");
    excluirUsuario(comercianteId);
});

