const graficosAtivos = {};

import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
export function atualizarTodosDashboards() {
  carregarDashboardFornecedores();
  carregarDashboardCategorias();
  carregarDashboardCritico();
  carregarDashboardValorTotal();
  carregarDashboardValidade();
  carregarDashboardValorCritico();
  carregarDashboardHistoricoEstoque();
}

import { 
  db, 
  exportarParaExcel, 
  calcularFatorConversao, 
  formatarData,
  mostrarCarregando,
  esconderCarregando
} from './relatorio.js';

// DASHBOARD 1: Fornecedores
export function carregarDashboardFornecedores() {
  const refProdutos = ref(db, "produto");
  const refFornecedores = ref(db, "fornecedor");

  Promise.all([get(refProdutos), get(refFornecedores)]).then(([prodSnap, fornSnap]) => {
    const produtos = Object.values(prodSnap.val() || {});
    const fornecedores = fornSnap.val() || {};

    console.log("📦 Produtos carregados:", produtos);
    console.log("🚚 Fornecedores carregados:", fornecedores);

    // Mapeia os dados dos fornecedores
    const mapaFornecedores = {};
    for (let id in fornecedores) {
      mapaFornecedores[id] = {
        nome: fornecedores[id].nome || "Fornecedor desconhecido",
        codigo: fornecedores[id].codigo || "—"
      };
    }

    // Agrupar produtos por fornecedor
    const fornecedoresMap = {};
    produtos.forEach(produto => {
      const idFornecedor = produto.fornecedorId;
      if (!idFornecedor) return;

      if (!fornecedoresMap[idFornecedor]) {
        fornecedoresMap[idFornecedor] = {
          nome: mapaFornecedores[idFornecedor]?.nome || "Fornecedor desconhecido",
          codigo: mapaFornecedores[idFornecedor]?.codigo || "—",
          produtos: []
        };
      }

      fornecedoresMap[idFornecedor].produtos.push({
        nome: produto.nome || "—",
        codigo: produto.codigo || "—",
        categoria: produto.categoria || "—"
      });
    });

    const lista = Object.entries(fornecedoresMap)
      .map(([id, dados]) => ({
        id,
        nome: dados.nome,
        codigo: dados.codigo,
        produtos: dados.produtos
      }))
      .sort((a, b) => b.produtos.length - a.produtos.length)
      .slice(0, 5);

    desenharGrafico(
      "grafico-fornecedores",
      lista.map(f => f.nome),
      lista.map(f => f.produtos.length),
      "Top 5 Fornecedores por Produtos",
      "rgba(50, 179, 7, 0.6)"
    );

    const btnFornecedores = document.getElementById("btn-exportar-fornecedores");
    if (btnFornecedores) {
      if (btnFornecedores) {
        btnFornecedores.onclick = () => {
          const dadosExportacao = [];

          lista.forEach(fornecedor => {
            const qtdProdutos = fornecedor.produtos.length;

            fornecedor.produtos.forEach(produto => {
              dadosExportacao.push({
                "Fornecedor": fornecedor.nome,
                "Código do Fornecedor": fornecedor.codigo,
                "Qtd. de Produtos": qtdProdutos,
                "Código do Produto": produto.codigo,
                "Nome do Produto": produto.nome,
                "Categoria do Produto": produto.categoria
              });
            });
          });

          if (dadosExportacao.length === 0) {
            alert("Nenhum produto encontrado para exportação.");
            return;
          }

          exportarParaExcel(
            dadosExportacao,
            "Top_Fornecedores",
            "Fornecedores"
          );
        };
      }

    }
  });
}

// Dashboard 3: Categorias com mais produtos (com filtro)
export function carregarDashboardCategorias() {
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
      if (btnCategorias) {
        btnCategorias.onclick = async () => {
          const refProdutos = ref(db, "produto");
          const refFornecedores = ref(db, "fornecedor");
          const [snapshotProdutos, snapshotFornecedores] = await Promise.all([
            get(refProdutos),
            get(refFornecedores)
          ]);

          const todosProdutos = Object.entries(snapshotProdutos.val() || {});
          const fornecedores = snapshotFornecedores.val() || {};

          const mapaFornecedores = {};
          for (let id in fornecedores) {
            mapaFornecedores[id] = {
              nome: fornecedores[id].nome || "Fornecedor desconhecido",
              codigo: fornecedores[id].codigo || "-"
            };
          }

          const produtosCompletos = todosProdutos.map(([id, p]) => {
            const fornecedor = mapaFornecedores[p.fornecedorId] || { nome: "Fornecedor desconhecido", codigo: "-" };
            return {
              categoria: p.categoria || "Sem categoria",
              codigoProduto: p.codigo || "-",
              nomeProduto: p.nome || "-",
              quantidade: `${p.quantidadeEstoque || 0} ${p.unidadeMedida || "unidade(s)"}`,
              fornecedor: fornecedor.nome,
              codigoFornecedor: fornecedor.codigo
            };
          });

          // Ordenar por categoria, depois nome
          produtosCompletos.sort((a, b) => {
            if (a.categoria < b.categoria) return -1;
            if (a.categoria > b.categoria) return 1;
            return a.nomeProduto.localeCompare(b.nomeProduto);
          });

          exportarParaExcel(produtosCompletos, "Categorias_Produtos", "Produtos por Categoria");
        };
      }

    }

  });
}

// Dashboard 4: Estoque Crítico
export function carregarDashboardCritico() {
  const filtro = document.getElementById("filtro-categoria").value;
  const refProdutos = ref(db, "produto");

  get(refProdutos).then(snapshot => {
    let lista = Object.values(snapshot.val() || {});
    if (filtro !== "todas") {
      lista = lista.filter(p => p.categoria === filtro);
    }

    const criticos = [];
    const ok = [];

    lista.forEach(p => {
      const atual = Number(p.quantidadeEstoque);
      const minima = Number(p.quantidadeMinima);
      const unidade = p.unidadeMedida || "unidade(s)";
      const situacao = atual === 0 ? "Zerado" : "Abaixo do mínimo";

      const produto = {
        codigo: p.codigo || "-",
        nome: p.nome,
        categoria: p.categoria,
        atual,
        minima,
        unidade,
        situacao,
        fornecedorId: p.fornecedorId || "-"
      };


      if (atual < minima) {
        criticos.push(produto);
      } else {
        ok.push(produto);
      }
    });

    const dadosPizza = [criticos.length, ok.length];
    const labels = ["Abaixo do Mínimo", "Dentro do Estoque"];

    desenharGraficoPizza(
      "grafico-critico",
      labels,
      dadosPizza,
      ["#dc3545", "rgba(50, 179, 7, 0.6)"]
    );

    const btn = document.getElementById("btn-exportar-critico");
    if (btn) {
      if (btn) {
        btn.onclick = async () => {
          if (criticos.length === 0) {
            alert("Não há produtos abaixo do mínimo para exportar.");
            return;
          }

          const refFornecedores = ref(db, "fornecedor");
          const snapshotFornecedores = await get(refFornecedores);
          const fornecedores = snapshotFornecedores.val() || {};

          const mapaFornecedores = {};
          for (let id in fornecedores) {
            mapaFornecedores[id] = {
              nome: fornecedores[id].nome || "Fornecedor desconhecido",
              codigo: fornecedores[id].codigo || "-"
            };
          }

          const dadosExportar = criticos.map(p => {
            const fornecedor = mapaFornecedores[p.fornecedorId] || { nome: "Fornecedor desconhecido", codigo: "-" };
            return {
              "Código do Produto": p.codigo || "-",
              "Produto": p.nome,
              "Categoria": p.categoria,
              "Qtd. Atual": `${p.atual} ${p.unidade}`,
              "Qtd. Mínima": `${p.minima} ${p.unidade}`,
              "Situação": p.situacao,
              "Fornecedor": fornecedor.nome,
              "Código do Fornecedor": fornecedor.codigo
            };
          });

          exportarParaExcel(dadosExportar, "Produtos_Estoque_Critico", "Estoque Crítico");
        };
      }
    }
  });
}

// Dashboard 5: Valor Total em Estoque (com filtro)
export function carregarDashboardValorTotal() {
  const filtro = document.getElementById("filtro-categoria").value;
  const refProdutos = ref(db, "produto");
  const refFornecedores = ref(db, "fornecedor");

  Promise.all([get(refProdutos), get(refFornecedores)]).then(([snapshot, snapshotFornecedores]) => {
    let lista = Object.values(snapshot.val() || {});
    const fornecedores = snapshotFornecedores.val() || {};

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

      const fornecedor = fornecedores[p.fornecedorId] || {};
      const codigoFornecedor = fornecedor.codigo || "-";
      const nomeFornecedor = fornecedor.nome || "Desconhecido";

      return {
        codigo: p.codigo || "-",
        nome: p.nome,
        categoria: p.categoria || "Sem categoria",
        preco: preco.toFixed(2),
        quantidade: qtd,
        unidadeMedida: unidade || "unidade(s)",
        valorTotal: Number(valor.toFixed(2)),
        codigoFornecedor,
        nomeFornecedor
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
        const unidade = produto.quantidade + ' ' + produto.unidadeMedida;
        return `R$ ${valor.toFixed(2).replace('.', ',')} (${unidade})`;
      }
    );

    document.getElementById("valor-total-geral").textContent = `Total em Estoque: R$ ${valorGeral.toFixed(2).replace('.', ',')}`;

    const btnValor = document.getElementById("btn-exportar-valor");
    if (btnValor) {
      btnValor.onclick = () => {
        exportarParaExcel(top5.map(p => ({
          "Código do Produto": p.codigo,
          "Produto": p.nome,
          "Categoria": p.categoria,
          "Código do Fornecedor": p.codigoFornecedor,
          "Nome do Fornecedor": p.nomeFornecedor,
          "Preço (R$)": `R$ ${p.preco}`,
          "Qtd. em Estoque": p.quantidade,
          "Unidade": p.unidadeMedida,
          "Valor Total (R$)": `R$ ${p.valorTotal.toFixed(2)}`
        })), "Top_Valor_Estoque", "Valor Total Estoque");
      };
    }
  });
}

// DASHBOARD 6: Status de validade (com filtro)
export function carregarDashboardValidade() {
  const filtro = document.getElementById("filtro-categoria").value;
  const refProdutos = ref(db, "produto");
  const refFornecedores = ref(db, "fornecedor");

  Promise.all([get(refProdutos), get(refFornecedores)]).then(([snapProdutos, snapFornecedores]) => {
    let lista = Object.values(snapProdutos.val() || {});
    const fornecedores = snapFornecedores.val() || {};

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

      const fornecedor = fornecedores[p.fornecedorId] || {};
      const nomeFornecedor = fornecedor.nome || "Desconhecido";
      const codigoFornecedor = fornecedor.codigo || "-";

      const itemExportar = {
        "Código do Produto": p.codigo || "-",
        "Produto": p.nome || "-",
        "Categoria": p.categoria || "-",
        "Validade": validade ? formatarData(p.validade) : "—",
        "Fornecedor": nomeFornecedor,
        "Código do Fornecedor": codigoFornecedor
      };

      if (validade && diasParaVencer < 0) {
        vencido++;
        itemExportar["Status de Validade"] = "VENCIDO";
      } else if (validade && diasParaVencer <= 7) {
        proximo++;
        itemExportar["Status de Validade"] = "PRÓXIMO DE VENCER";
      } else {
        ok++;
        itemExportar["Status de Validade"] = "OK";
      }

      exportacao.push(itemExportar);
    });

    desenharGraficoPizza(
      "grafico-validade",
      ["Vencido", "Próximo", "OK"],
      [vencido, proximo, ok],
      ["#dc3545", "#ffc107", "rgba(50, 179, 7, 0.6)"]
    );

    const btnValidade = document.getElementById("btn-exportar-validade");
    if (btnValidade) {
      btnValidade.onclick = () => {
        exportarParaExcel(exportacao, "Status_Validade", "Validade");
      };
    }
  });
}

// DASHBOARD 7: Valor crítico com filtro
export function carregarDashboardValorCritico() {
  const filtro = document.getElementById("filtro-categoria").value;
  const refProdutos = ref(db, "produto");
  const refFornecedores = ref(db, "fornecedor");

  Promise.all([get(refProdutos), get(refFornecedores)]).then(([snapProdutos, snapFornecedores]) => {
    let lista = Object.entries(snapProdutos.val() || {});
    const fornecedores = snapFornecedores.val() || {};

    if (filtro !== "todas") {
      lista = lista.filter(([_, p]) => p.categoria === filtro);
    }

    let valorCriticoTotal = 0;
    let valorEstoqueTotal = 0;

    const mapaFornecedores = {};
    for (const id in fornecedores) {
      const forn = fornecedores[id];
      mapaFornecedores[id] = {
        nome: forn.nome || "Desconhecido",
        codigo: forn.codigo || "—"
      };
    }

    const criticos = lista
      .filter(([_, p]) => Number(p.quantidadeEstoque || 0) < Number(p.quantidadeMinima || 0))
      .map(([firebaseKey, p]) => {
        const preco = Number(p.preco || 0);
        const qtd = Number(p.quantidadeEstoque || 0);
        const precoPor = p.precoPor;
        const unidade = p.unidadeMedida;
        const fator = calcularFatorConversao(precoPor, unidade, qtd);
        const valor = preco * fator;
        valorCriticoTotal += valor;

        const fornecedor = mapaFornecedores[p.fornecedorId] || {};
        return {
          firebaseKey,
          codigoProduto: p.codigo || "—",
          nome: p.nome || "Sem nome",
          categoria: p.categoria || "Sem categoria",
          preco: preco.toFixed(2),
          estoque: qtd,
          minimo: p.quantidadeMinima,
          unidadeMedida: unidade || "unidade(s)",
          valorTotal: Number(valor.toFixed(2)),
          codigoFornecedor: fornecedor.codigo || "—",
          nomeFornecedor: fornecedor.nome || "Fornecedor desconhecido"
        };
      });

    lista.forEach(([_, p]) => {
      const preco = Number(p.preco);
      const qtd = Number(p.quantidadeEstoque);
      const precoPor = p.precoPor;
      const unidade = p.unidadeMedida;
      const fator = calcularFatorConversao(precoPor, unidade, qtd);
      valorEstoqueTotal += preco * fator;
    });

    const percentual = valorEstoqueTotal > 0 ? ((valorCriticoTotal / valorEstoqueTotal) * 100).toFixed(1) : 0;

    const top5 = criticos
      .sort((a, b) => b.valorTotal - a.valorTotal)
      .slice(0, 5);

    desenharGrafico(
      "grafico-valor-critico",
      top5.map(p => p.nome),
      top5.map(p => p.valorTotal),
      "Top 5 Críticos por Valor",
      "rgba(220, 53, 69, 0.7)", // vermelho claro
      false,
      (context, index) => {
        const p = top5[index];
        return `R$ ${p.valorTotal.toFixed(2).replace('.', ',')} (${p.estoque} ${p.unidadeMedida})`;
      }
    );

    document.getElementById("valor-total-critico").innerHTML =
      `Total Crítico: R$ ${valorCriticoTotal.toFixed(2).replace('.', ',')}<br>` +
      `<span style="font-size: 14px; color: gray;">💥 Isso representa ${percentual}% do valor total do estoque</span>`;

    const btnValorCritico = document.getElementById("btn-exportar-valor-critico");
    if (btnValorCritico) {
      btnValorCritico.onclick = () => {
        exportarParaExcel(criticos.map(p => ({
          "Código do Produto": p.codigoProduto,
          "Produto": p.nome,
          "Categoria": p.categoria,
          "Código do Fornecedor": p.codigoFornecedor,
          "Fornecedor": p.nomeFornecedor,
          "Preço Unitário": `R$ ${p.preco}`,
          "Qtd. Atual": `${p.estoque} ${p.unidadeMedida}`,
          "Qtd. Mínima": p.minimo,
          "Valor Total Crítico": `R$ ${p.valorTotal.toFixed(2)}`
        })), "Estoque_Critico_Valor", "Críticos por Valor");
      };
    }
  });
}

// DASHBOARD 8: Histórico de estoque (com filtro)
export function carregarDashboardHistoricoEstoque() {
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
export function desenharGrafico(canvasId, labels, dados, titulo, cor = "rgba(50, 179, 7, 0.6)", mostrarLegenda = false, customTooltipCallback = null) {
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
      parsing: {
        yAxisKey: typeof dados[0] === 'object' ? 'y' : undefined
      },
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
            label: function (context) {
              const index = context.dataIndex;
              if (customTooltipCallback) {
                return customTooltipCallback(context, index);
              }
              const raw = context.raw;
              if (raw && typeof raw === "object" && "y" in raw && "unidade" in raw) {
                return `${raw.y.toLocaleString('pt-BR')} ${raw.unidade}`;
              } else if (typeof raw === "number") {
                return `${raw.toLocaleString('pt-BR')}`;
              }
              return `${context.parsed.y.toLocaleString('pt-BR')} unidade(s)`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0
          }
        }
      }
    }
  });
}

export function desenharGraficoLinhaEBarra(canvasId, labels, valores, mediaMovel, titulo = "Histórico") {
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

export function desenharGraficoPizza(canvasId, labels, dados, cores = ["#dc3545", "#ffc107", "rgba(50, 179, 7, 0.6)"]) {
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

export function desenharGraficoComPercentual(canvasId, labels, dados, total, titulo, cor = "rgba(50, 179, 7, 0.6)") {
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