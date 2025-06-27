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
  calcularDiasParaVencer,
  calcularValidadeMaisProxima,
  mostrarCarregando,
  esconderCarregando
} from './relatorio.js';

// Helper para filtrar pelo comerciante logado
function getIdComerciante() {
  return localStorage.getItem("idComerciante") || sessionStorage.getItem("idComerciante");
}

// DASHBOARD 1: Fornecedores por produtos
export async function carregarDashboardFornecedores() {
  const idComerciante = getIdComerciante();

  // Busca dados em paralelo
  const [prodSnap, fornSnap] = await Promise.all([
    get(ref(db, "produto")),
    get(ref(db, "fornecedor"))
  ]);

  const produtosRaw = prodSnap.val() || {};
  const fornecedoresRaw = fornSnap.val() || {};

  // 1) Filtra só produtos e fornecedores do comerciante
  const produtos = Object.values(produtosRaw)
    .filter(p => p.idComerciante === idComerciante);

  const fornecedores = Object.fromEntries(
    Object.entries(fornecedoresRaw)
      .filter(([_, f]) => f.idComerciante === idComerciante)
  );

  // 2) Mapeia dados básicos dos fornecedores
  const mapaFornecedores = {};
  Object.entries(fornecedores).forEach(([id, f]) => {
    mapaFornecedores[id] = {
      nome: f.nome || "Fornecedor desconhecido",
      codigo: f.codigo || "—"
    };
  });

  // 3) Agrupa produtos por fornecedor
  const fornecedoresMap = {};
  produtos.forEach(prod => {
    const idF = prod.fornecedorId;
    if (!idF) return;

    if (!fornecedoresMap[idF]) {
      fornecedoresMap[idF] = {
        nome: mapaFornecedores[idF].nome,
        codigo: mapaFornecedores[idF].codigo,
        produtos: []
      };
    }

    fornecedoresMap[idF].produtos.push({
      nome: prod.nome || "—",
      codigo: prod.codigo || "—",
      categoria: prod.categoria || "—"
    });
  });

  // 4) Prepara Top 5
  const lista = Object.entries(fornecedoresMap)
    .map(([id, d]) => ({ id, ...d }))
    .sort((a, b) => b.produtos.length - a.produtos.length)
    .slice(0, 5);

  // 5) Desenha gráfico
  desenharGrafico(
    "grafico-fornecedores",
    lista.map(item => item.nome),
    lista.map(item => item.produtos.length),
    "Top 5 Fornecedores por Produtos"
  );

  // 6) Exportação para Excel
  const btnExport = document.getElementById("btn-exportar-fornecedores");
  if (btnExport) {
    btnExport.onclick = () => {
      const dadosExportacao = [];

      lista.forEach(f => {
        const qtd = f.produtos.length;
        f.produtos.forEach(prod => {
          dadosExportacao.push({
            Fornecedor: f.nome,
            "Código do Fornecedor": f.codigo,
            "Qtd. de Produtos": qtd,
            "Código do Produto": prod.codigo,
            "Nome do Produto": prod.nome,
            "Categoria do Produto": prod.categoria
          });
        });
      });

      if (dadosExportacao.length === 0) {
        alert("Nenhum produto encontrado para exportação.");
        return;
      }

      exportarParaExcel(dadosExportacao, "Top_Fornecedores", "Fornecedores");
    };
  }
}

// Dashboard 2: Categorias com mais produtos (com filtro)
export async function carregarDashboardCategorias() {
  const idComerciante = getIdComerciante();

  // 1) Busca produtos e fornecedores
  const [snapProdutos, snapFornecedores] = await Promise.all([
    get(ref(db, "produto")),
    get(ref(db, "fornecedor"))
  ]);

  // 2) Só produtos do comerciante (sem filtro de categoria)
  const lista = Object.values(snapProdutos.val() || {})
    .filter(p => p.idComerciante === idComerciante);

  // 3) Agrupa e conta por categoria
  const agrupado = {};
  lista.forEach(p => {
    const cat = p.categoria || "Sem categoria";
    agrupado[cat] = (agrupado[cat] || 0) + 1;
  });

  const categorias = Object.entries(agrupado)
    .map(([categoria, qtd]) => ({ categoria, qtd }))
    .sort((a, b) => b.qtd - a.qtd)
    .slice(0, 5);

  const total = categorias.reduce((soma, c) => soma + c.qtd, 0);

  // 4) Gráfico com percentual
  desenharGraficoComPercentual(
    "grafico-categorias",
    categorias.map(c => c.categoria),
    categorias.map(c => c.qtd),
    total,
    "Categorias com Mais Produtos"
  );

  // 5) Prepara mapa de fornecedores (sem filtro de categoria)
  const fornecedoresMap = Object.fromEntries(
    Object.entries(snapFornecedores.val() || {})
      .filter(([, f]) => f.idComerciante === idComerciante)
      .map(([id, f]) => [id, {
        nome: f.nome || "Fornecedor desconhecido",
        codigo: f.codigo || "-"
      }])
  );

  // 6) Exportar
  const btn = document.getElementById("btn-exportar-categorias");
  if (btn) {
    btn.onclick = () => {
      const produtosExport = lista.map(p => {
        const f = fornecedoresMap[p.fornecedorId] || { nome: "Fornecedor desconhecido", codigo: "-" };
        return {
          Categoria: p.categoria || "Sem categoria",
          "Código do Produto": p.codigo || "-",
          "Nome do Produto": p.nome || "-",
          "Quantidade em Estoque": `${p.quantidadeEstoque || 0} ${p.unidadeMedida || "unidade(s)"}`,
          Fornecedor: f.nome,
          "Código Fornecedor": f.codigo
        };
      });

      if (produtosExport.length === 0) {
        alert("Nenhum produto para exportar.");
        return;
      }
      exportarParaExcel(produtosExport, "Categorias_Produtos", "Produtos por Categoria");
    };
  }
}

// Dashboard 3: Estoque Crítico
export async function carregarDashboardCritico() {
  const idComerciante = getIdComerciante();

  // 1) Busca produtos e fornecedores em paralelo
  const [snapProdutos, snapFornecedores] = await Promise.all([
    get(ref(db, "produto")),
    get(ref(db, "fornecedor"))
  ]);

  // 2) Filtra só produtos deste comerciante
  let lista = Object.values(snapProdutos.val() || {})
    .filter(p => p.idComerciante === idComerciante);

  // 3) Aplica filtro de categoria, se houver
  const filtro = document.getElementById("filtro-categoria").value;
  if (filtro !== "todas") {
    lista = lista.filter(p => p.categoria === filtro);
  }

  // 4) Separa críticos e dentro do estoque
  const criticos = [];
  const ok = [];
  lista.forEach(p => {
    const atual = Number(p.quantidadeEstoque);
    const minima = Number(p.quantidadeMinima);
    const unidade = p.unidadeMedida || "unidade(s)";
    const situacao = atual === 0 ? "Zerado" : "Abaixo do mínimo";

    const produto = {
      codigo: p.codigo || "-",
      nome: p.nome || "-",
      categoria: p.categoria || "—",
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

  // 5) Desenha gráfico de pizza
  const dadosPizza = [criticos.length, ok.length];
  const labels = ["Abaixo do Mínimo", "Dentro do Estoque"];
  desenharGraficoPizza(
    "grafico-critico",
    labels,
    dadosPizza,
    ["#dc3545", "rgba(50, 179, 7, 0.6)"]
  );

  // 6) Botão de exportação
  const btn = document.getElementById("btn-exportar-critico");
  if (btn) {
    btn.onclick = async () => {
      if (criticos.length === 0) {
        alert("Não há produtos abaixo do mínimo para exportar.");
        return;
      }

      // 7) Prepara mapa de fornecedores filtrado
      const fornecedoresRaw = snapFornecedores.val() || {};
      const fornecedores = Object.fromEntries(
        Object.entries(fornecedoresRaw)
          .filter(([, f]) => f.idComerciante === idComerciante)
      );

      const mapaFornecedores = {};
      Object.entries(fornecedores).forEach(([id, f]) => {
        mapaFornecedores[id] = {
          nome: f.nome || "Fornecedor desconhecido",
          codigo: f.codigo || "-"
        };
      });

      // 8) Monta dados para exportar
      const dadosExportar = criticos.map(p => {
        const f = mapaFornecedores[p.fornecedorId] || { nome: "Fornecedor desconhecido", codigo: "-" };
        return {
          "Código do Produto": p.codigo,
          "Produto": p.nome,
          "Categoria": p.categoria,
          "Qtd. Atual": `${p.atual} ${p.unidade}`,
          "Qtd. Mínima": `${p.minima} ${p.unidade}`,
          "Situação": p.situacao,
          "Fornecedor": f.nome,
          "Código do Fornecedor": f.codigo
        };
      });

      exportarParaExcel(dadosExportar, "Produtos_Estoque_Critico", "Estoque Crítico");
    };
  }
}

// Dashboard 4: Valor Total em Estoque (com filtro)
export async function carregarDashboardValorTotal() {
  const idComerciante = getIdComerciante();

  // 1) Busca produtos e fornecedores em paralelo
  const [snapProdutos, snapFornecedores] = await Promise.all([
    get(ref(db, "produto")),
    get(ref(db, "fornecedor"))
  ]);

  // 2) Filtra só produtos deste comerciante
  let lista = Object.values(snapProdutos.val() || {})
    .filter(p => p.idComerciante === idComerciante);

  // 3) Aplica filtro de categoria, se houver
  const filtro = document.getElementById("filtro-categoria").value;
  if (filtro !== "todas") {
    lista = lista.filter(p => p.categoria === filtro);
  }

  // 4) Filtra só fornecedores deste comerciante
  const fornecedores = Object.fromEntries(
    Object.entries(snapFornecedores.val() || {})
      .filter(([, f]) => f.idComerciante === idComerciante)
  );

  // 5) Calcula valores e acumula total
  let valorGeral = 0;
  const produtosComValor = lista.map(p => {
    const preco = Number(p.preco) || 0;
    const qtd = Number(p.quantidadeEstoque) || 0;
    const fator = calcularFatorConversao(p.precoPor, p.unidadeMedida, qtd);
    const valorConvertido = preco * fator;
    valorGeral += valorConvertido;

    const f = fornecedores[p.fornecedorId] || {};
    return {
      codigo: p.codigo || "-",
      nome: p.nome || "-",
      categoria: p.categoria || "Sem categoria",
      preco: preco.toFixed(2),
      quantidade: qtd,
      unidadeMedida: p.unidadeMedida || "unidade(s)",
      valorTotal: Number(valorConvertido.toFixed(2)),
      codigoFornecedor: f.codigo || "-",
      nomeFornecedor: f.nome || "Fornecedor desconhecido"
    };
  });

  // 6) Prepara Top 5 e desenha gráfico
  const top5 = produtosComValor
    .sort((a, b) => b.valorTotal - a.valorTotal)
    .slice(0, 5);

  desenharGrafico(
    "grafico-valor",
    top5.map(p => p.nome),
    top5.map(p => p.valorTotal),
    "Top 5 por Valor em Estoque",
    "rgba(50, 179, 7, 0.6)",
    false,
    (context, index) => {
      const v = context.parsed.y;
      const prod = top5[index];
      return `R$ ${v.toFixed(2).replace(".", ",")} (${prod.quantidade} ${prod.unidadeMedida})`;
    }
  );

  // 7) Atualiza o total geral no dashboard
  document.getElementById("valor-total-geral").textContent =
    `Total em Estoque: R$ ${valorGeral.toFixed(2).replace(".", ",")}`;

  // 8) Botão de exportação
  const btn = document.getElementById("btn-exportar-valor");
  if (btn) {
    btn.onclick = () => {
      if (top5.length === 0) {
        alert("Nenhum dado para exportar.");
        return;
      }
      const dadosExport = top5.map(p => ({
        "Código do Produto": p.codigo,
        "Produto": p.nome,
        "Categoria": p.categoria,
        "Código do Fornecedor": p.codigoFornecedor,
        "Nome do Fornecedor": p.nomeFornecedor,
        "Preço (R$)": `R$ ${p.preco}`,
        "Qtd. em Estoque": p.quantidade,
        "Unidade": p.unidadeMedida,
        "Valor Total (R$)": `R$ ${p.valorTotal.toFixed(2)}`
      }));
      exportarParaExcel(dadosExport, "Top_Valor_Estoque", "Valor Total Estoque");
    };
  }
}

// DASHBOARD 5: Status de validade (com filtro)
export async function carregarDashboardValidade() {
  const idComerciante = getIdComerciante();

  // 1) Busca produtos e fornecedores em paralelo
  const [snapProdutos, snapFornecedores] = await Promise.all([
    get(ref(db, "produto")),
    get(ref(db, "fornecedor"))
  ]);

  // 2) Filtra só produtos deste comerciante
  let lista = Object.values(snapProdutos.val() || {})
    .filter(p => p.idComerciante === idComerciante);

  // 3) Filtra só fornecedores deste comerciante
  const fornecedores = Object.fromEntries(
    Object.entries(snapFornecedores.val() || {})
      .filter(([_, f]) => f.idComerciante === idComerciante)
  );

  // 4) Aplica filtro de categoria, se houver
  const filtro = document.getElementById("filtro-categoria").value;
  if (filtro !== "todas") {
    lista = lista.filter(p => p.categoria === filtro);
  }

  // 5) Inicializa contadores e array de exportação
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  let vencido = 0, proximo = 0, ok = 0;
  const exportacao = [];

  lista.forEach(p => {
    // Encontra a validade mais próxima entre os lotes
    let validadeMaisProxima = null;
    if (p.lotes) {
      const datas = Object.values(p.lotes)
        .map(l => l.validade)
        .filter(Boolean)
        .map(d => new Date(d))
        .filter(d => !isNaN(d));
      if (datas.length > 0) {
        datas.sort((a, b) => a - b);
        validadeMaisProxima = datas[0];
        validadeMaisProxima.setHours(0, 0, 0, 0);
      }
    }

    // Calcula dias para vencer
    let diasParaVencer = null;
    if (validadeMaisProxima) {
      diasParaVencer = Math.floor((validadeMaisProxima - hoje) / (1000 * 60 * 60 * 24));
    }

    // Dados do fornecedor
    const f = fornecedores[p.fornecedorId] || {};
    const nomeFornecedor = f.nome || "Fornecedor desconhecido";
    const codigoFornecedor = f.codigo || "-";

    // Monta o objeto para exportação e tabela
    const item = {
      "Código do Produto": p.codigo || "—",
      "Produto": p.nome || "—",
      "Categoria": p.categoria || "—",
      "Validade": validadeMaisProxima
        ? formatarData(validadeMaisProxima.toISOString().split("T")[0])
        : "—",
      "Fornecedor": nomeFornecedor,
      "Código do Fornecedor": codigoFornecedor
    };

    // Define status e incrementa contadores
    if (diasParaVencer !== null && diasParaVencer < 0) {
      vencido++;
      item["Status de Validade"] = "VENCIDO";
    } else if (diasParaVencer !== null && diasParaVencer <= 7) {
      proximo++;
      item["Status de Validade"] = "PRÓXIMO DE VENCER";
    } else {
      ok++;
      item["Status de Validade"] = "OK";
    }

    exportacao.push(item);
  });

  // 6) Desenha gráfico de pizza
  desenharGraficoPizza(
    "grafico-validade",
    ["Vencido", "Próximo de Vencer", "OK"],
    [vencido, proximo, ok],
    ["#dc3545", "#ffc107", "rgba(50, 179, 7, 0.6)"]
  );

  // 7) Botão de exportação
  const btn = document.getElementById("btn-exportar-validade");
  if (btn) {
    btn.onclick = () => {
      if (exportacao.length === 0) {
        alert("Nenhum produto para exportar.");
        return;
      }
      exportarParaExcel(exportacao, "Status_Validade", "Validade");
    };
  }
}

// DASHBOARD 6: Valor crítico com filtro
export async function carregarDashboardValorCritico() {
  const idComerciante = getIdComerciante();

  // 1) Carrega produtos e fornecedores em paralelo
  const [snapProdutos, snapFornecedores] = await Promise.all([
    get(ref(db, "produto")),
    get(ref(db, "fornecedor"))
  ]);

  // 2) Filtra só produtos do comerciante
  let produtosEntries = Object.entries(snapProdutos.val() || {})
    .filter(([, p]) => p.idComerciante === idComerciante);

  // 3) Aplica filtro de categoria
  const filtro = document.getElementById("filtro-categoria").value;
  if (filtro !== "todas") {
    produtosEntries = produtosEntries.filter(([, p]) => p.categoria === filtro);
  }

  // 4) Prepara mapa de fornecedores filtrados
  const fornecedoresMap = Object.fromEntries(
    Object.entries(snapFornecedores.val() || {})
      .filter(([, f]) => f.idComerciante === idComerciante)
      .map(([id, f]) => [id, { nome: f.nome || "Fornecedor desconhecido", codigo: f.codigo || "-" }])
  );

  // 5) Separa críticos e calcula totais
  let valorCriticoTotal = 0;
  let valorEstoqueTotal = 0;

  const criticos = produtosEntries
    .filter(([, p]) => Number(p.quantidadeEstoque || 0) < Number(p.quantidadeMinima || 0))
    .map(([firebaseKey, p]) => {
      const preco = Number(p.preco || 0);
      const qtd = Number(p.quantidadeEstoque || 0);
      const fator = calcularFatorConversao(p.precoPor, p.unidadeMedida, qtd);
      const valor = preco * fator;
      valorCriticoTotal += valor;

      const f = fornecedoresMap[p.fornecedorId] || {};
      return {
        firebaseKey,
        codigoProduto: p.codigo || "-",
        nome: p.nome || "-",
        categoria: p.categoria || "-",
        preco: preco.toFixed(2),
        estoque: qtd,
        minimo: Number(p.quantidadeMinima) || 0,
        unidadeMedida: p.unidadeMedida || "unidade(s)",
        valorTotal: Number(valor.toFixed(2)),
        codigoFornecedor: f.codigo,
        nomeFornecedor: f.nome
      };
    });

  // 6) Calcula valor total de estoque
  produtosEntries.forEach(([, p]) => {
    const preco = Number(p.preco || 0);
    const qtd = Number(p.quantidadeEstoque || 0);
    const fator = calcularFatorConversao(p.precoPor, p.unidadeMedida, qtd);
    valorEstoqueTotal += preco * fator;
  });

  // 7) Percentual crítico
  const percentual = valorEstoqueTotal > 0
    ? ((valorCriticoTotal / valorEstoqueTotal) * 100).toFixed(1)
    : "0";

  // 8) Top 5 críticos por valor
  const top5 = criticos
    .sort((a, b) => b.valorTotal - a.valorTotal)
    .slice(0, 5);

  desenharGrafico(
    "grafico-valor-critico",
    top5.map(p => p.nome),
    top5.map(p => p.valorTotal),
    "Top 5 Críticos por Valor",
    "rgba(220, 53, 69, 0.7)",
    false,
    (context, index) => {
      const prod = top5[index];
      return `R$ ${prod.valorTotal.toFixed(2).replace(".", ",")} (${prod.estoque} ${prod.unidadeMedida})`;
    }
  );

  // 9) Atualiza indicador de valor crítico
  document.getElementById("valor-total-critico").innerHTML =
    `Total Crítico: R$ ${valorCriticoTotal.toFixed(2).replace(".", ",")}<br>` +
    `<span style="font-size:14px;color:gray;">💥 Isso representa ${percentual}% do valor total do estoque</span>`;

  // 10) Exportação
  const btn = document.getElementById("btn-exportar-valor-critico");
  if (btn) {
    btn.onclick = () => {
      if (criticos.length === 0) {
        alert("Nenhum produto crítico para exportar.");
        return;
      }
      const dadosExport = criticos.map(p => ({
        "Código do Produto": p.codigoProduto,
        "Produto": p.nome,
        "Categoria": p.categoria,
        "Código do Fornecedor": p.codigoFornecedor,
        "Fornecedor": p.nomeFornecedor,
        "Preço Unitário": `R$ ${p.preco}`,
        "Qtd. Atual": `${p.estoque} ${p.unidadeMedida}`,
        "Qtd. Mínima": p.minimo,
        "Valor Total Crítico": `R$ ${p.valorTotal.toFixed(2)}`
      }));
      exportarParaExcel(dadosExport, "Estoque_Critico_Valor", "Críticos por Valor");
    };
  }
}

// DASHBOARD 7: Histórico de estoque (com filtro)
export async function carregarDashboardHistoricoEstoque() {
  const idComerciante = getIdComerciante();

  // 1) Busca todos os produtos
  const snap = await get(ref(db, "produto"));
  // 2) Filtra só produtos do comerciante
  let produtos = Object.values(snap.val() || {})
    .filter(p => p.idComerciante === idComerciante);

  // 3) Filtra por categoria, se selecionada
  const filtro = document.getElementById("filtro-categoria").value;
  if (filtro !== "todas") {
    produtos = produtos.filter(p => p.categoria === filtro);
  }

  // 4) Agrupa valores por mês (YYYY-MM)
  const agrupado = {};
  produtos.forEach(p => {
    const preco = Number(p.preco) || 0;
    const qtd = Number(p.quantidadeEstoque) || 0;
    const fator = calcularFatorConversao(p.precoPor, p.unidadeMedida, qtd);
    const valor = preco * fator;

    // Data no formato "DD/MM/YYYY ..." ou vazio
    const dataStr = p.dataUltimaAtualizacao || p.dataCadastro;
    if (!dataStr) return;
    const partes = dataStr.split(" ")[0].split("/");
    if (partes.length !== 3) return;
    const [dia, mes, ano] = partes;
    const chave = `${ano}-${mes.padStart(2, "0")}`;

    agrupado[chave] = (agrupado[chave] || 0) + valor;
  });

  // 5) Prepara arrays ordenados e média móvel
  const chavesOrdenadas = Object.keys(agrupado).sort();
  const valoresOrdenados = chavesOrdenadas.map(k => Number(agrupado[k].toFixed(2)));
  const mediaMovel = valoresOrdenados.map((_, i, arr) =>
    i < 2 ? null : Number(((arr[i] + arr[i - 1] + arr[i - 2]) / 3).toFixed(2))
  );

  // 6) Desenha gráfico (linha + barra)
  if (graficosAtivos["grafico-historico"]) {
    graficosAtivos["grafico-historico"].destroy();
  }
  desenharGraficoLinhaEBarra(
    "grafico-historico",
    chavesOrdenadas,
    valoresOrdenados,
    mediaMovel,
    "Valor Total do Estoque por Mês"
  );

  // 7) Botão de exportação
  const btn = document.getElementById("btn-exportar-historico");
  if (btn) {
    btn.onclick = () => {
      const dadosExportar = chavesOrdenadas.map((mes, i) => ({
        "Mês": mes,
        "Valor Total em Estoque": `R$ ${valoresOrdenados[i].toFixed(2)}`,
        "Média Móvel": mediaMovel[i] != null ? `R$ ${mediaMovel[i].toFixed(2)}` : "—"
      }));
      exportarParaExcel(dadosExportar, "Historico_Estoque", "Histórico Estoque");
    };
  }
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

window.atualizarTodosDashboards = atualizarTodosDashboards;

// dispara tudo ao carregar a página
document.addEventListener('DOMContentLoaded', atualizarTodosDashboards);
