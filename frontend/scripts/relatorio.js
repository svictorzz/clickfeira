import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

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

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

//
// UTILITÁRIO: Exportar dados para Excel
//
function exportarParaExcel(dados, nomeArquivo = "relatorio", nomeAba = "Dados") {
  if (!Array.isArray(dados) || dados.length === 0) return;
  const worksheet = XLSX.utils.json_to_sheet(dados);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, nomeAba);
  const hoje = new Date().toISOString().split("T")[0];
  XLSX.writeFile(workbook, `${nomeArquivo}_${hoje}.xlsx`);
}

//
// DASHBOARD 1: Fornecedores
//
function carregarDashboardFornecedores() {
  const refFornecedores = ref(db, "fornecedor");
  get(refFornecedores).then(snapshot => {
    const lista = Object.values(snapshot.val() || {}).map(f => ({
      nome: f.nome,
      cnpj: f.cnpj,
      contato: f.contato,
      qtd: f.produtosFornecidos ? Object.keys(f.produtosFornecidos).length : 0
    })).sort((a, b) => b.qtd - a.qtd).slice(0, 5);

    desenharGrafico("grafico-fornecedores", lista.map(f => f.nome), lista.map(f => f.qtd), "Top 5 Fornecedores por Produtos", "rgba(40, 167, 69, 0.7)");

    document.getElementById("btn-exportar-excel").addEventListener("click", () => {
      exportarParaExcel(lista.map(f => ({
        Fornecedor: f.nome,
        Contato: f.contato,
        CNPJ: f.cnpj,
        "Total de Produtos": f.qtd
      })), "Top_Fornecedores", "Fornecedores");
    });
  });
}

//
// DASHBOARD 2: Estoque Atual
//
function carregarDashboardEstoque() {
  const refProdutos = ref(db, "produto");
  get(refProdutos).then(snapshot => {
    const lista = Object.values(snapshot.val() || {}).map(p => ({
      nome: p.nome,
      categoria: p.categoria,
      quantidade: p.quantidadeEstoque || 0
    })).sort((a, b) => b.quantidade - a.quantidade).slice(0, 5);

    desenharGrafico("grafico-estoque", lista.map(p => p.nome), lista.map(p => p.quantidade), "Top 5 Produtos com Maior Estoque", "rgba(0, 123, 255, 0.6)");

    document.getElementById("btn-exportar-estoque").addEventListener("click", () => {
      exportarParaExcel(lista.map(p => ({
        Produto: p.nome,
        Categoria: p.categoria,
        "Qtd. em Estoque": p.quantidade
      })), "Top_Estoque", "Estoque Atual");
    });
  });
}

//
// DASHBOARD 3: Categorias com mais produtos
//
function carregarDashboardCategorias() {
  const refProdutos = ref(db, "produto");
  get(refProdutos).then(snapshot => {
    const lista = Object.values(snapshot.val() || {});
    const agrupado = {};

    lista.forEach(p => {
      if (!agrupado[p.categoria]) agrupado[p.categoria] = 0;
      agrupado[p.categoria] += Number(p.quantidadeEstoque || 0);
    });

    const categorias = Object.entries(agrupado).map(([cat, qtd]) => ({ categoria: cat, qtd }))
      .sort((a, b) => b.qtd - a.qtd).slice(0, 5);

    desenharGrafico("grafico-categorias", categorias.map(c => c.categoria), categorias.map(c => c.qtd), "Categorias com Mais Produtos", "rgba(240, 173, 78, 0.7)");

    document.getElementById("btn-exportar-categorias").addEventListener("click", () => {
      exportarParaExcel(categorias.map(c => ({
        Categoria: c.categoria,
        "Total em Estoque": c.qtd
      })), "Categorias_Mais_Produtos", "Categorias");
    });
  });
}

//
// DASHBOARD 4: Produtos com estoque crítico
//
function carregarDashboardCritico() {
  const refProdutos = ref(db, "produto");
  get(refProdutos).then(snapshot => {
    const lista = Object.values(snapshot.val() || {});
    const criticos = lista.filter(p =>
      Number(p.quantidadeEstoque || 0) < Number(p.quantidadeMinima || 0)
    ).map(p => ({
      nome: p.nome,
      categoria: p.categoria,
      estoque: p.quantidadeEstoque,
      minimo: p.quantidadeMinima
    })).sort((a, b) => a.estoque - b.estoque).slice(0, 5);

    desenharGrafico("grafico-critico", criticos.map(p => p.nome), criticos.map(p => p.estoque), "Produtos com Estoque Crítico", "rgba(220, 53, 69, 0.7)");

    document.getElementById("btn-exportar-critico").addEventListener("click", () => {
      exportarParaExcel(criticos.map(p => ({
        Produto: p.nome,
        Categoria: p.categoria,
        "Qtd. Atual": p.estoque,
        "Qtd. Mínima": p.minimo
      })), "Estoque_Critico", "Estoque Crítico");
    });
  });
}

//
// Função genérica para desenhar gráficos
//
function desenharGrafico(canvasId, labels, dados, titulo, cor) {
  const ctx = document.getElementById(canvasId);
  new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: titulo,
        data: dados,
        backgroundColor: cor,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: titulo },
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 }
        }
      }
    }
  });
}

//
// Iniciar todos dashboards
//
document.addEventListener("DOMContentLoaded", () => {
  carregarDashboardFornecedores();
  carregarDashboardEstoque();
  carregarDashboardCategorias();
  carregarDashboardCritico();
});
