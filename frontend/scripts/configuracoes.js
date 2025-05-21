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