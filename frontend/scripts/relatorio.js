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
const graficosAtivos = {}; // Armazena instâncias dos gráficos por ID


// === Indicador de carregamento ===
function mostrarCarregando() {
  const el = document.getElementById("loading-indicador");
  if (el) el.style.display = "block";
}

function esconderCarregando() {
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

//
// UTILITÁRIOS

function calcularFatorConversao(precoPor, unidade, qtd) {
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

// Exportar dados para Excel
//
function exportarParaExcel(dados, nomeArquivo = "relatorio", nomeAba = "Dados") {
  if (!Array.isArray(dados) || dados.length === 0) return;
  const worksheet = XLSX.utils.json_to_sheet(dados);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, nomeAba);
  const hoje = new Date().toISOString().split("T")[0];
  XLSX.writeFile(workbook, `${nomeArquivo}_${hoje}.xlsx`);
}
// Cor dos dashboards
function corDoGrafico(idCanvas) {
  const canvas = document.getElementById(idCanvas);
  return getComputedStyle(canvas).getPropertyValue('--grafico-cor').trim();
}

//Atualizar todos os dashboards
function atualizarTodosDashboards() {
  carregarDashboardFornecedores(); // continua sem filtro
  carregarDashboardEstoque();
  carregarDashboardCategorias();
  carregarDashboardCritico();
  carregarDashboardValorTotal();
  carregarDashboardValidade();
  carregarDashboardValorCritico();
  carregarDashboardHistoricoEstoque();
}

// DASHBOARD 1: Fornecedores
function carregarDashboardFornecedores() {
  const refProdutos = ref(db, "produto");
  const refFornecedores = ref(db, "fornecedor");

  Promise.all([get(refProdutos), get(refFornecedores)]).then(([prodSnap, fornSnap]) => {
    const produtos = Object.values(prodSnap.val() || {});
    const fornecedores = fornSnap.val() || {};

    // Mapeia os nomes dos fornecedores
    const mapaFornecedores = {};
    for (let id in fornecedores) {
      mapaFornecedores[id] = fornecedores[id].nome || "Fornecedor desconhecido";
    }

    const fornecedoresMap = {};

    produtos.forEach(produto => {
      const idFornecedor = produto.fornecedorId;
      const nomeFornecedor = mapaFornecedores[idFornecedor] || "Fornecedor desconhecido";

      if (!fornecedoresMap[nomeFornecedor]) {
        fornecedoresMap[nomeFornecedor] = 0;
      }
      fornecedoresMap[nomeFornecedor]++;
    });

    const lista = Object.entries(fornecedoresMap)
      .map(([nome, qtd]) => ({ nome, qtd }))
      .sort((a, b) => b.qtd - a.qtd)
      .slice(0, 5);

    desenharGrafico(
      "grafico-fornecedores",
      lista.map(f => f.nome),
      lista.map(f => f.qtd),
      "Top 5 Fornecedores por Produtos",
      "rgba(50, 179, 7, 0.6)"
    );
    const btnFornecedores = document.getElementById("btn-exportar-fornecedores");
    if (btnFornecedores) {
      btnFornecedores.onclick = () => {
        exportarParaExcel(lista.map(f => ({
          Fornecedor: f.nome,
          "Qtd. de Produtos": f.qtd
        })), "Top_Fornecedores", "Fornecedores");
      };
    }
  });
}

// DASHBOARD 2: Estoque Atual
function carregarDashboardEstoque() {
  const filtro = document.getElementById("filtro-categoria").value;

  const refProdutos = ref(db, "produto");
  get(refProdutos).then(snapshot => {
    let lista = Object.values(snapshot.val() || {});

    if (filtro !== "todas") {
      lista = lista.filter(p => p.categoria === filtro);
    }

    lista = lista.map(p => ({
      nome: p.nome,
      categoria: p.categoria,
      quantidade: p.quantidadeEstoque || 0
    })).sort((a, b) => b.quantidade - a.quantidade).slice(0, 5);

    desenharGrafico("grafico-estoque", lista.map(p => p.nome), lista.map(p => p.quantidade), "Top 5 Produtos com Maior Estoque", "rgba(50, 179, 7, 0.6)");

    const btnEstoque = document.getElementById("btn-exportar-estoque");
    if (btnEstoque) {
      btnEstoque.onclick = () => {
        exportarParaExcel(lista.map(p => ({
          Produto: p.nome,
          Categoria: p.categoria,
          "Qtd. em Estoque": p.quantidade
        })), "Top_Estoque", "Estoque Atual");
      };
    }

  });
}

// Dashboard 3: Categorias com mais produtos (com filtro)
function carregarDashboardCategorias() {
  const refProdutos = ref(db, "produto");

  get(refProdutos).then(snapshot => {
    const lista = Object.values(snapshot.val() || {});

    // Agrupa por categoria, contando o número de produtos únicos em cada
    const agrupado = {};
    lista.forEach(p => {
      const categoria = p.categoria || "Sem categoria";
      if (!agrupado[categoria]) {
        agrupado[categoria] = 0;
      }
      agrupado[categoria]++;
    });

    const categorias = Object.entries(agrupado)
      .map(([categoria, qtd]) => ({ categoria, qtd }))
      .sort((a, b) => b.qtd - a.qtd)
      .slice(0, 5);

    const total = categorias.reduce((soma, c) => soma + c.qtd, 0);

    desenharGraficoComPercentual(
      "grafico-categorias",
      categorias.map(c => c.categoria),
      categorias.map(c => c.qtd),
      total,
      "Categorias com Mais Produtos",
      "rgba(50, 179, 7, 0.6)"
    );

    // Exportar para Excel
    const btnCategorias = document.getElementById("btn-exportar-categorias");
    if (btnCategorias) {
      btnCategorias.onclick = () => {
        exportarParaExcel(
          categorias.map(c => ({
            Categoria: c.categoria,
            "Total de Produtos": c.qtd,
            "Percentual (%)": `${((c.qtd / total) * 100).toFixed(1)}%`
          })),
          "Categorias_Mais_Produtos",
          "Categorias"
        );
      };
    }

  });
}

// Dashboard 4: Estoque Crítico
function carregarDashboardCritico() {
  const filtro = document.getElementById("filtro-categoria").value;
  const refProdutos = ref(db, "produto");
  get(refProdutos).then(snapshot => {
    let lista = Object.values(snapshot.val() || {});
    if (filtro !== "todas") {
      lista = lista.filter(p => p.categoria === filtro);
    }
    const criticos = lista.filter(p => Number(p.quantidadeEstoque || 0) < Number(p.quantidadeMinima || 0))
      .map(p => ({ nome: p.nome, categoria: p.categoria, estoque: Number(p.quantidadeEstoque || 0), minimo: Number(p.quantidadeMinima || 0), cor: Number(p.quantidadeEstoque || 0) === 0 ? "#dc3545" : "#fd7e14" }))
      .sort((a, b) => a.estoque - b.estoque).slice(0, 5);
    desenharGrafico("grafico-critico", criticos.map(p => p.nome), criticos.map(p => p.estoque), "Produtos com Estoque Crítico", "rgba(50, 179, 7, 0.6)");
    const btnCritico = document.getElementById("btn-exportar-critico");
    if (btnCritico) {
      btnCritico.onclick = () => {
        exportarParaExcel(criticos.map(p => ({
          Produto: p.nome,
          Categoria: p.categoria,
          "Qtd. Atual": p.estoque,
          "Qtd. Mínima": p.minimo,
          "Situação": p.estoque === 0 ? "Zerado" : "Abaixo do mínimo"
        })), "Estoque_Critico", "Estoque Crítico");
      };
    }

  });
}

// Dashboard 5: Valor Total em Estoque (com filtro)
function carregarDashboardValorTotal() {
  const filtro = document.getElementById("filtro-categoria").value;
  const refProdutos = ref(db, "produto");
  get(refProdutos).then(snapshot => {
    let lista = Object.values(snapshot.val() || {});
    if (filtro !== "todas") {
      lista = lista.filter(p => p.categoria === filtro);
    }
    let valorGeral = 0;
    const produtosComValor = lista.map(p => {
      const preco = Number(p.preco);
      const qtd = Number(p.quantidadeEstoque);
      const precoPor = p.precoPor;
      const unidade = p.unidadeMedida;
      const fator = calcularFatorConversao(precoPor, unidade, qtd);
      const valor = preco * fator;
      valorGeral += valor;
      return {
        nome: p.nome,
        categoria: p.categoria || "Sem categoria",
        preco: preco.toFixed(2),
        quantidade: qtd,
        unidadeMedida: p.unidadeMedida || "unidade(s)",
        valorTotal: Number(valor.toFixed(2))
      };

    });
    const top5 = produtosComValor.sort((a, b) => b.valorTotal - a.valorTotal).slice(0, 5);
    desenharGrafico(
      "grafico-valor",
      top5.map(p => p.nome),
      top5.map(p => p.valorTotal),
      "Top 5 por Valor em Estoque",
      "rgba(50, 179, 7, 0.6)",
      false,
      (context, index) => {
        const valor = context.parsed.y;
        const produto = top5[index];
        const unidade = produto.quantidade + ' ' + (produto.unidadeMedida || 'unidade(s)');
        return `R$ ${valor.toFixed(2).replace('.', ',')} (${unidade})`;
      }
    );
    document.getElementById("valor-total-geral").textContent = `Total em Estoque: R$ ${valorGeral.toFixed(2).replace('.', ',')}`;
    const btnValor = document.getElementById("btn-exportar-valor");
    if (btnValor) {
      btnValor.onclick = () => {
        exportarParaExcel(top5.map(p => ({
          Produto: p.nome,
          Categoria: p.categoria,
          Preço: `R$ ${p.preco}`,
          Quantidade: p.quantidade,
          "Valor Total": `R$ ${p.valorTotal.toFixed(2)}`
        })), "Top_Valor_Estoque", "Valor Total Estoque");
      };
    }
  });
}

// DASHBOARD 6: Status de validade (com filtro)
function carregarDashboardValidade() {
  const filtro = document.getElementById("filtro-categoria").value;
  const refProdutos = ref(db, "produto");
  get(refProdutos).then(snapshot => {
    let lista = Object.values(snapshot.val() || {});
    if (filtro !== "todas") {
      lista = lista.filter(p => p.categoria === filtro);
    }
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    let vencido = 0;
    let proximo = 0;
    let ok = 0;
    const exportacao = [];

    lista.forEach(p => {
      const validade = p.validade ? new Date(p.validade) : null;
      let diasParaVencer = null;

      if (validade) {
        validade.setHours(0, 0, 0, 0);
        if (!isNaN(validade.getTime())) {
          diasParaVencer = Math.floor((validade - hoje) / (1000 * 60 * 60 * 24));
        }
      }


      if (validade && diasParaVencer < 0) {
        vencido++;
        exportacao.push({ Produto: p.nome, Status: "VENCIDO", Validade: formatarData(p.validade) });
      } else if (validade && diasParaVencer <= 7) {
        proximo++;
        exportacao.push({ Produto: p.nome, Status: "PRÓXIMO", Validade: formatarData(p.validade) });
      } else {
        ok++;
        exportacao.push({ Produto: p.nome, Status: "OK", Validade: validade ? formatarData(p.validade) : "—" });
      }
    });

    desenharGraficoPizza("grafico-validade", ["Vencido", "Próximo", "OK"], [vencido, proximo, ok], ["#dc3545", "#ffc107", "rgba(50, 179, 7, 0.6)"]);

    const btnValidade = document.getElementById("btn-exportar-validade");
    if (btnValidade) {
      btnValidade.onclick = () => {
        exportarParaExcel(exportacao, "Status_Validade", "Validade");
      };
    }

  });
}

// DASHBOARD 7: Valor crítico com filtro
function carregarDashboardValorCritico() {
  const filtro = document.getElementById("filtro-categoria").value;
  const refProdutos = ref(db, "produto");
  get(refProdutos).then(snapshot => {
    let lista = Object.values(snapshot.val() || {});
    if (filtro !== "todas") {
      lista = lista.filter(p => p.categoria === filtro);
    }
    let valorCriticoTotal = 0;
    let valorEstoqueTotal = 0;

    const criticos = lista.filter(p => Number(p.quantidadeEstoque || 0) < Number(p.quantidadeMinima || 0)).map(p => {
      const preco = Number(p.preco);
      const qtd = Number(p.quantidadeEstoque);
      const precoPor = p.precoPor;
      const unidade = p.unidadeMedida;
      const fator = calcularFatorConversao(precoPor, unidade, qtd);
      const valor = preco * fator;
      valorCriticoTotal += valor;

      return {
        nome: p.nome,
        categoria: p.categoria || "Sem categoria",
        preco: preco.toFixed(2),
        estoque: qtd,
        minimo: p.quantidadeMinima,
        valorTotal: Number(valor.toFixed(2))
      };
    });

    lista.forEach(p => {
      const preco = Number(p.preco);
      const qtd = Number(p.quantidadeEstoque);
      const precoPor = p.precoPor;
      const unidade = p.unidadeMedida;
      const fator = calcularFatorConversao(precoPor, unidade, qtd);

      valorEstoqueTotal += preco * fator;
    });

    const percentual = valorEstoqueTotal > 0 ? ((valorCriticoTotal / valorEstoqueTotal) * 100).toFixed(1) : 0;
    const top5 = criticos.sort((a, b) => a.estoque - b.estoque).slice(0, 5);

    desenharGrafico("grafico-valor-critico", top5.map(p => p.nome), top5.map(p => p.valorTotal), "Top 5 Críticos por Valor", "rgba(50, 179, 7, 0.6)");

    document.getElementById("valor-total-critico").innerHTML =
      `Total Crítico: R$ ${valorCriticoTotal.toFixed(2).replace('.', ',')}<br>` +
      `<span style="font-size: 14px; color: gray;">💥 Isso representa ${percentual}% do valor total do estoque</span>`;

    const btnValorCritico = document.getElementById("btn-exportar-valor-critico");
    if (btnValorCritico) {
      btnValorCritico.onclick = () => {
        exportarParaExcel(criticos.map(p => ({
          Produto: p.nome,
          Categoria: p.categoria,
          Preço: `R$ ${p.preco}`,
          "Qtd. Atual": p.estoque,
          "Qtd. Mínima": p.minimo,
          "Valor Total": `R$ ${p.valorTotal.toFixed(2)}`
        })), "Estoque_Critico_Valor", "Críticos por Valor");
      };
    }

  });
}

// DASHBOARD 8: Histórico de estoque (com filtro)
function carregarDashboardHistoricoEstoque() {
  const filtro = document.getElementById("filtro-categoria").value;
  const refProdutos = ref(db, "produto");
  get(refProdutos).then(snapshot => {
    let produtos = Object.values(snapshot.val() || {});
    if (filtro !== "todas") {
      produtos = produtos.filter(p => p.categoria === filtro);
    }

    const agrupado = {};
    produtos.forEach(p => {
      const preco = Number(p.preco);
      const qtd = Number(p.quantidadeEstoque);
      const precoPor = p.precoPor;
      const unidade = p.unidadeMedida;

      const fator = calcularFatorConversao(precoPor, unidade, qtd);

      const valor = preco * fator;
      const data = p.dataUltimaAtualizacao || p.dataCadastro;
      if (!data) return;

      if (!data || !data.includes("/")) return;

      const partes = data.split(" ")[0].split("/");
      if (partes.length !== 3) return;

      const [dia, mes, ano] = partes;
      const chave = `${ano}-${mes}`;

      if (!agrupado[chave]) agrupado[chave] = 0;
      agrupado[chave] += valor;
    });

    const chavesOrdenadas = Object.keys(agrupado).sort();
    const valoresOrdenados = chavesOrdenadas.map(k => Number(agrupado[k].toFixed(2)));
    const mediaMovel = valoresOrdenados.map((_, i, arr) => {
      if (i < 2) return null;
      return Number(((arr[i] + arr[i - 1] + arr[i - 2]) / 3).toFixed(2));
    });

    const ctx = document.getElementById("grafico-historico");
    if (graficosAtivos["grafico-historico"]) graficosAtivos["grafico-historico"].destroy();
    desenharGraficoLinhaEBarra("grafico-historico", chavesOrdenadas, valoresOrdenados, mediaMovel, "Valor Total do Estoque por Mês");


    const btnHistorico = document.getElementById("btn-exportar-historico");
    if (btnHistorico) {
      btnHistorico.onclick = () => {
        const dadosExportar = chavesOrdenadas.map((mes, i) => ({
          "Mês": mes,
          "Valor Total em Estoque": `R$ ${valoresOrdenados[i].toFixed(2)}`,
          "Média Móvel": mediaMovel[i] != null ? `R$ ${mediaMovel[i].toFixed(2)}` : "—"
        }));
        exportarParaExcel(dadosExportar, "Historico_Estoque", "Histórico Estoque");
      };
    }

  });
}

//
// Funções genérica para desenhar gráficos
//
function desenharGrafico(canvasId, labels, dados, titulo, cor = "rgba(50, 179, 7, 0.6)", mostrarLegenda = false, customTooltipCallback = null) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  if (graficosAtivos[canvasId]) graficosAtivos[canvasId].destroy();

  graficosAtivos[canvasId] = new Chart(ctx, {
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
        title: {
          display: true,
          text: titulo
        },
        legend: {
          display: mostrarLegenda
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const index = context.dataIndex;
              return customTooltipCallback
                ? customTooltipCallback(context, index)
                : `${context.parsed.y.toLocaleString('pt-BR')} unidade(s)`;
            }
          }
        }
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

function desenharGraficoLinhaEBarra(canvasId, labels, valores, mediaMovel, titulo = "Histórico") {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  if (graficosAtivos[canvasId]) graficosAtivos[canvasId].destroy();

  graficosAtivos[canvasId] = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Valor Total em Estoque",
          data: valores,
          backgroundColor: "rgba(50, 179, 7, 0.6)",
          borderRadius: 6,
          yAxisID: "y"
        },
        {
          label: "Média Móvel (3 meses)",
          data: mediaMovel,
          type: "line",
          borderColor: "rgba(0, 0, 0, 0.8)",
          backgroundColor: "transparent",
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: "black",
          spanGaps: true,
          yAxisID: "y"
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: titulo
        },
        legend: {
          position: "bottom"
        },
        tooltip: {
          callbacks: {
            label: ctx => {
              if (ctx.dataset.type === "line" && ctx.parsed.y != null) {
                return `Média: R$ ${ctx.parsed.y.toFixed(2).replace(".", ",")}`;
              } else if (ctx.parsed.y != null) {
                return `R$ ${ctx.parsed.y.toFixed(2).replace(".", ",")}`;
              }
              return "";
            }
          }
        }
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

function desenharGraficoPizza(canvasId, labels, dados, cores = ["#dc3545", "#ffc107", "rgba(50, 179, 7, 0.6)"]) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  if (graficosAtivos[canvasId]) {
    graficosAtivos[canvasId].destroy();
  }

  const total = dados.reduce((acc, val) => acc + val, 0);

  graficosAtivos[canvasId] = new Chart(ctx, {
    type: "pie",
    data: {
      labels,
      datasets: [{
        data: dados,
        backgroundColor: cores,
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: "Distribuição por Validade"
        },
        legend: {
          position: "bottom"
        },
        tooltip: {
          callbacks: {
            label: context => {
              const valor = context.raw;
              const percentual = total > 0 ? ((valor / total) * 100).toFixed(1) : 0;
              return `${context.label}: ${valor.toLocaleString('pt-BR')} unidade(s) (${percentual}%)`;
            }
          }
        }
      }
    }
  });
}

function desenharGraficoComPercentual(canvasId, labels, dados, total, titulo, cor = "rgba(50, 179, 7, 0.6)") {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  if (graficosAtivos[canvasId]) {
    graficosAtivos[canvasId].destroy();
  }

  graficosAtivos[canvasId] = new Chart(ctx, {
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
        title: {
          display: true,
          text: titulo
        },
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: context => {
              const qtd = context.raw;
              const percentual = total > 0 ? ((qtd / total) * 100).toFixed(1) : 0;
              return `${qtd.toLocaleString('pt-BR')} unidade(s) (${percentual}%)`;
            }
          }
        }
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

//Auxiliares!
// --- Função para formatar datas no padrão DD/MM/AAAA ---
function formatarData(dataStr) {
  const data = new Date(dataStr);
  if (isNaN(data)) return "—";
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const ano = data.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

// Filtros!
function carregarCategoriasNoFiltro() {
  const refProdutos = ref(db, "produto");
  get(refProdutos).then(snapshot => {
    const lista = Object.values(snapshot.val() || {});
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
