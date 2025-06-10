import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import {
  atualizarTodosDashboards,
} from './dashboard.js';

console.log("🧾 idComerciante atual:", localStorage.getItem("idComerciante") || sessionStorage.getItem("idComerciante"));

// Exporta funções utilitárias para uso em dashboard.js

export function obterIdComerciante() {
  return localStorage.getItem("idComerciante") || sessionStorage.getItem("idComerciante");
}

export function calcularFatorConversao(precoPor, unidade, qtd) {
  if (precoPor === unidade) return qtd;
  const chave = `${precoPor}_${unidade}`;
  const mapa = {
    "kg_g": qtd / 1000,
    "kg_100g": qtd / 10,
    "100g_kg": qtd * 10,
    "100g_g": qtd / 100,
    "g_kg": qtd * 1000,
    "g_100g": qtd * 100,
    "litro_ml": qtd / 1000,
    "ml_litro": qtd * 1000
  };
  return mapa[chave] ?? qtd;
}

export function formatarData(dataStr) {
  if (!dataStr) return "—";
  const data = new Date(dataStr);
  if (isNaN(data)) return "—";
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const ano = data.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

// Firebase config
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
export const db = getDatabase(app);

// === Indicador de carregamento ===
export function mostrarCarregando() {
  const el = document.getElementById("loading-indicador");
  if (el) el.style.display = "block";
}

export function esconderCarregando() {
  const el = document.getElementById("loading-indicador");
  if (el) el.style.display = "none";
}

// === Salvar filtro no localStorage ===
document.addEventListener("DOMContentLoaded", () => {
  const selectFiltro = document.getElementById("filtro-categoria");
  const btnLimpar = document.getElementById("limpar-filtro");
  const filtroSalvo = localStorage.getItem("categoriaSelecionada");

  if (filtroSalvo) selectFiltro.value = filtroSalvo;

  selectFiltro.addEventListener("change", () => {
    localStorage.setItem("categoriaSelecionada", selectFiltro.value);
    atualizarTodosDashboards();
  });

  if (btnLimpar) {
    btnLimpar.addEventListener("click", () => {
      selectFiltro.value = "todas";
      localStorage.setItem("categoriaSelecionada", "todas");
      selectFiltro.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  carregarCategoriasNoFiltro();
});

// Exportar dados para Excel
export function exportarParaExcel(dados, nomeArquivo = "relatorio", nomeAba = "Dados") {
  if (!Array.isArray(dados) || dados.length === 0) return;
  const worksheet = XLSX.utils.json_to_sheet(dados);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, nomeAba);
  const hoje = new Date().toISOString().split("T")[0];
  XLSX.writeFile(workbook, `${nomeArquivo}_${hoje}.xlsx`);
}

// Função para carregar categorias no filtro
function carregarCategoriasNoFiltro() {
  const refProdutos = ref(db, "produto");
  get(refProdutos).then(snapshot => {
    const idComerciante = obterIdComerciante();
    const lista = Object.values(snapshot.val() || {}).filter(p => p.idComerciante === idComerciante);

    const categoriasUnicas = [...new Set(lista.map(p => p.categoria).filter(Boolean))];

    const select = document.getElementById("filtro-categoria");
    select.innerHTML = "";

    // Adiciona a opção padrão
    const opcaoTodas = document.createElement("option");
    opcaoTodas.value = "todas";
    opcaoTodas.textContent = "Todas as Categorias";
    select.appendChild(opcaoTodas);

    categoriasUnicas.forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      select.appendChild(opt);
    });

    // Restaurar seleção só depois que tudo foi adicionado
    const filtroSalvo = localStorage.getItem("categoriaSelecionada") || "todas";
    select.value = filtroSalvo;

    atualizarTodosDashboards();
  });
}
