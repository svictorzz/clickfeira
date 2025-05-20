import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// Configuração Firebase
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
  if (!Array.isArray(dados) || dados.length === 0) {
    console.warn("Nenhum dado para exportar.");
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(dados);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, nomeAba);

  const hoje = new Date().toISOString().split("T")[0];
  const nomeFinal = `${nomeArquivo}_${hoje}.xlsx`;

  XLSX.writeFile(workbook, nomeFinal);
}

//
// DASHBOARD 1: Fornecedores mais utilizados
//
function carregarDashboardFornecedores() {
  const fornecedoresRef = ref(db, "fornecedor");

  get(fornecedoresRef)
    .then(snapshot => {
      const dados = snapshot.val();
      const lista = Object.values(dados || {}).map(f => ({
        nome: f.nome,
        cnpj: f.cnpj,
        contato: f.contato,
        qtd: typeof f.produtosFornecidos === "object"
          ? Object.keys(f.produtosFornecidos).length
          : 0
      }));

      const topFornecedores = lista.sort((a, b) => b.qtd - a.qtd).slice(0, 5);
      desenharGraficoFornecedores(topFornecedores);

      document.getElementById("btn-exportar-excel").addEventListener("click", () => {
        const dadosExport = topFornecedores.map(f => ({
          Fornecedor: f.nome,
          Contato: f.contato,
          CNPJ: f.cnpj,
          "Total de Produtos": f.qtd
        }));
        exportarParaExcel(dadosExport, "Top_Fornecedores", "Fornecedores");
      });
    })
    .catch(error => {
      console.error("Erro ao carregar fornecedores:", error);
    });
}

function desenharGraficoFornecedores(fornecedores) {
  const ctx = document.getElementById("grafico-fornecedores");
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: fornecedores.map(f => f.nome),
      datasets: [{
        label: "Total de Produtos",
        data: fornecedores.map(f => f.qtd),
        backgroundColor: "rgba(40, 167, 69, 0.7)",
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: "Top 5 Fornecedores por Produtos"
        },
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
// DASHBOARD 2: Estoque Atual
//
function carregarDashboardEstoque() {
  const produtosRef = ref(db, "produto");

  get(produtosRef)
    .then(snapshot => {
      const dados = snapshot.val();
      const lista = Object.values(dados || {}).map(p => ({
        nome: p.nome,
        categoria: p.categoria,
        quantidade: p.quantidadeEstoque || 0
      }));

      const topEstoque = lista.sort((a, b) => b.quantidade - a.quantidade).slice(0, 5);
      desenharGraficoEstoque(topEstoque);

      document.getElementById("btn-exportar-estoque").addEventListener("click", () => {
        const dadosExport = topEstoque.map(p => ({
          Produto: p.nome,
          Categoria: p.categoria,
          "Qtd. em Estoque": p.quantidade
        }));
        exportarParaExcel(dadosExport, "Top_Estoque", "Estoque Atual");
      });
    })
    .catch(error => {
      console.error("Erro ao carregar produtos:", error);
    });
}

function desenharGraficoEstoque(produtos) {
  const ctx = document.getElementById("grafico-estoque");
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: produtos.map(p => p.nome),
      datasets: [{
        label: "Quantidade em Estoque",
        data: produtos.map(p => p.quantidade),
        backgroundColor: "rgba(0, 123, 255, 0.6)",
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: "Top 5 Produtos com Maior Estoque"
        },
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

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  carregarDashboardFornecedores();
  carregarDashboardEstoque();
});
