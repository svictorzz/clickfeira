import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import {
  atualizarTodosDashboards,
} from './dashboard.js';

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
  appId: "1:108583577904:web:7d93b0d8ad8e6e7f"
};
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

export function mostrarCarregando() { /* ... */ }
export function esconderCarregando() { /* ... */ }

// Salvar filtro no localStorage
document.addEventListener("DOMContentLoaded", () => {
  const selectFiltro = document.getElementById("filtro-categoria");
  const btnLimpar = document.getElementById("limpar-filtro");
  const filtroSalvo = localStorage.getItem("categoriaSelecionada");
  if (filtroSalvo) selectFiltro.value = filtroSalvo;
  selectFiltro.addEventListener("change", () => {
    localStorage.setItem("categoriaSelecionada", selectFiltro.value);
    atualizarTodosDashboards();
  });
  if (btnLimpar) btnLimpar.addEventListener("click", () => {
    selectFiltro.value = "todas";
    localStorage.setItem("categoriaSelecionada", "todas");
    selectFiltro.dispatchEvent(new Event("change", { bubbles: true }));
  });
  carregarCategoriasNoFiltro();
});

export function exportarParaExcel(dados, nomeArquivo = "relatorio", nomeAba = "Dados") {
  if (!Array.isArray(dados) || dados.length === 0) return;
  const worksheet = XLSX.utils.json_to_sheet(dados);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, nomeAba);
  const hoje = new Date().toISOString().split("T")[0];
  XLSX.writeFile(workbook, `${nomeArquivo}_${hoje}.xlsx`);
}

async function carregarCategoriasNoFiltro() {
  const idComerciante = localStorage.getItem("idComerciante") || sessionStorage.getItem("idComerciante");
  const refProdutos = ref(db, "produto");
  const snap = await get(refProdutos);
  const raw = snap.val() || {};
  const lista = Object.values(raw).filter(p => p.idComerciante === idComerciante);
  const categoriasUnicas = [...new Set(lista.map(p => p.categoria).filter(Boolean))];

  const select = document.getElementById("filtro-categoria");
  select.innerHTML = '';
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

  const filtroSalvo = localStorage.getItem("categoriaSelecionada") || "todas";
  select.value = filtroSalvo;
  atualizarTodosDashboards();
}

/*Validade mais próxima e dias para vencer*/

export function calcularValidadeMaisProxima(produto) {
  if (!produto.lotes) return null;
  const datas = Object.values(produto.lotes)
    .map(l => l.validade)
    .filter(Boolean)
    .map(d => new Date(d))
    .filter(d => !isNaN(d));
  if (datas.length === 0) return null;
  datas.sort((a, b) => a - b);
  return datas[0];
}

export function calcularDiasParaVencer(validade) {
  if (!validade) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.floor((validade - hoje) / (1000 * 60 * 60 * 24));
}
