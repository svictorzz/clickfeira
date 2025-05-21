import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

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

async function trocarSenha() {
    const oldPassword = document.getElementById("senha_atual").value;
    const newPassword = document.getElementById("nova_senha").value;
    const confirmNewPassword = document.getElementById("confirmar_senha").value;
    const token = localStorage.getItem("token");

    if (!oldPassword || !newPassword) {
        alert("Por favor, preencha todos os campos.");
        return;
    }

    if (!token) {
        alert("Usuário não autenticado! Faça login novamente.");
        return;
    }

    try {
        const response = await fetch("http://127.0.0.1:5000/change-password", {
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
        } else {
            alert(`Erro: ${data.message}`);
        }
    } catch (error) {
        console.error("Erro ao trocar senha:", error);
        alert("Erro ao trocar a senha. Tente novamente.");
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