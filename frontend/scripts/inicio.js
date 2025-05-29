const token = localStorage.getItem("token") || sessionStorage.getItem("token");  // 🔹 Pega o token salvo

if (!token) {
    window.location.href = "login.html";  // 🔹 Se não houver token, redireciona para login
}

// --- VARIÁVEIS GLOBAIS ---
let alertas = [];
let paginaAtual = 0;
const itensPorPagina = 5;
let filtroAtual = 'todos';

// memória do histórico em sessão (item 8)
let memoriaHistorico = JSON.parse(localStorage.getItem('historicoAcoes')) || [];
let paginaHistorico = 0;
const itensHistoricoPorPagina = 5;
let termoBusca = '';

// --- FUNÇÕES AUXILIARES ---
function formatarData(dataString) {
  // parseDateYMD
  const data = parseDateYMD(dataString);
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const ano = data.getFullYear();
  return `${dia}-${mes}-${ano}`;
}

function parseDateYMD(ymd) {
  // ymd ex: "2025-05-04"
  const [year, month, day] = ymd.split('-').map(n => parseInt(n, 10));
  return new Date(year, month - 1, day);
}

function calcularDiasParaVencer(validadeStr) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);          // zera as horas
  const validade = parseDateYMD(validadeStr);
  const diff = validade.getTime() - hoje.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function mostrarMensagem(texto, tipo) {
  const mensagem = document.createElement('div');
  mensagem.textContent = texto;
  mensagem.className = `mensagem-alerta ${tipo}`;
  document.body.appendChild(mensagem);
  setTimeout(() => mensagem.remove(), 3000);
}

function gerarCodigoProduto() {
  let novoCodigo, existe;
  const produtos = JSON.parse(localStorage.getItem('produtos')) || [];
  do {
    const random = Math.floor(Math.random() * 90000) + 10000;
    novoCodigo = `PRD-${random}`;
    existe = produtos.some(p => p.codigo === novoCodigo);
  } while (existe);
  return novoCodigo;
}

// --- DEBOUNCE PARA FILTROS ---
function debounce(fn, delay = 150) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(null, args), delay);
  };
}

// --- BADGES DE CONTAGEM ---
function updateBadgeAlertas() {
  const badge = document.getElementById('badge-alertas');
  if (badge) badge.textContent = alertas.length;
}
function updateBadgeHistorico() {
  const badge = document.getElementById('badge-historico');
  if (badge) badge.textContent = memoriaHistorico.length;
}

// --- ALERTAS ---
function gerarAlertas(produto) {
  const dias = calcularDiasParaVencer(produto.validade);
  const atual = parseFloat(produto.qtdAtual.split(' ')[0]);
  const minimo = parseFloat(produto.qtdMinima.split(' ')[0]);
  const out = [];
  if (dias <= 0) {
    out.push({ tipo: 'vencido', produto: produto.nome, dataValidade: produto.validade, diasParaVencer: dias });
  } else if (dias <= 7) {
    out.push({ tipo: 'validade', produto: produto.nome, dataValidade: produto.validade, diasParaVencer: dias });
  }
  if (atual < minimo) {
    out.push({ tipo: 'estoque', produto: produto.nome, qtdAtual: produto.qtdAtual });
  }
  return out;
}

function carregarAlertas() {
  const produtos = JSON.parse(localStorage.getItem('produtos')) || [];
  alertas = produtos.flatMap(gerarAlertas);
  updateBadgeAlertas();
  atualizarLista();
}

function atualizarLista() {
  const lista = document.getElementById('lista-alertas');
  lista.innerHTML = '';
  const filtrados = alertas.filter(a => filtroAtual === 'todos' || a.tipo === filtroAtual);
  const inicio = paginaAtual * itensPorPagina;
  const pageItens = filtrados.slice(inicio, inicio + itensPorPagina);

  if (pageItens.length === 0) {
    lista.innerHTML = '<p>Nenhum alerta encontrado.</p>';
  } else {
    pageItens.forEach(a => {
      const icone = a.tipo === 'vencido' ? '⏰' : a.tipo === 'validade' ? '⏳' : '📦';
      const mensagem = a.tipo === 'estoque'
        ? `Estoque abaixo do mínimo (${a.qtdAtual}).`
        : (a.tipo === 'vencido'
          ? `${a.produto} venceu em ${formatarData(a.dataValidade)}`
          : `Vence em ${a.diasParaVencer} dia(s).`);
      const div = document.createElement('div');
      div.className = `linha-alerta alerta-${a.tipo}`;
      div.innerHTML = `<span style="font-size:20px">${icone}</span><div><b>${a.produto}</b><br>${mensagem}</div>`;
      lista.appendChild(div);
    });
  }

  const total = Math.ceil(filtrados.length / itensPorPagina);
  document.getElementById('btnAnterior').disabled = paginaAtual === 0;
  document.getElementById('btnProximo').disabled = paginaAtual >= total - 1;
}

const aplicarFiltro = debounce(filtro => {
  filtroAtual = filtro;
  paginaAtual = 0;
  atualizarLista();
}, 150);

document.querySelectorAll('.botao-filtro').forEach(btn => {
  btn.addEventListener('click', () => aplicarFiltro(btn.dataset.filtro));
});

document.getElementById('btnAnterior').addEventListener('click', () => {
  if (paginaAtual > 0) { paginaAtual--; atualizarLista(); }
});

document.getElementById('btnProximo').addEventListener('click', () => {
  const total = Math.ceil(alertas.filter(a => filtroAtual === 'todos' || a.tipo === filtroAtual).length / itensPorPagina);
  if (paginaAtual < total - 1) { paginaAtual++; atualizarLista(); }
});

// --- HISTÓRICO COM PAGINAÇÃO ---
function exibirHistorico() {
  const container = document.getElementById('historico-acoes');
  const todos = memoriaHistorico.slice().reverse().filter(item =>
    item.tipo.toLowerCase().includes(termoBusca) || item.descricao.toLowerCase().includes(termoBusca)
  );

  const totalPaginas = Math.ceil(todos.length / itensHistoricoPorPagina) || 1;
  if (paginaHistorico >= totalPaginas) paginaHistorico = totalPaginas - 1;
  if (paginaHistorico < 0) paginaHistorico = 0;

  const inicio = paginaHistorico * itensHistoricoPorPagina;
  const pageHist = todos.slice(inicio, inicio + itensHistoricoPorPagina);

  if (pageHist.length === 0) {
    container.innerHTML = '<p>Nenhuma ação registrada.</p>';
  } else {
    const ul = document.createElement('ul');
    ul.style.listStyle = 'none'; ul.style.padding = '0';
    pageHist.forEach(a => {
      const li = document.createElement('li');
      const dt = new Date(a.data).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      li.innerHTML = `<b>${a.tipo}</b> - ${a.descricao}<br><small>${dt}</small>`;
      ul.appendChild(li);
    });
    container.innerHTML = '';
    container.appendChild(ul);
  }

  document.getElementById('btnAnteriorHistorico').disabled = paginaHistorico === 0;
  document.getElementById('btnProximoHistorico').disabled = paginaHistorico >= totalPaginas - 1;
  const contador = document.getElementById('contador-paginas-historico');
  if (contador) contador.textContent = `Página ${paginaHistorico + 1} de ${totalPaginas}`;
}

document.getElementById('btnAnteriorHistorico').addEventListener('click', () => {
  if (paginaHistorico > 0) { paginaHistorico--; exibirHistorico(); }
});

document.getElementById('btnProximoHistorico').addEventListener('click', () => {
  const todos = memoriaHistorico.slice().reverse();
  const totalPaginas = Math.ceil(todos.length / itensHistoricoPorPagina) || 1;
  if (paginaHistorico < totalPaginas - 1) { paginaHistorico++; exibirHistorico(); }
});

document.getElementById('search-historico').addEventListener('input', e => {
  termoBusca = e.target.value.toLowerCase();
  paginaHistorico = 0;
  exibirHistorico();
});

document.getElementById('limpar-historico').addEventListener('click', () => {
  if (confirm('Deseja apagar todo o histórico?')) {
    memoriaHistorico = [];
    paginaHistorico = 0;
    exibirHistorico();
    updateBadgeHistorico();
    mostrarMensagem('Histórico apagado.', 'success');
  }
});

function registrarHistorico(tipo, descricao) {
  memoriaHistorico.push({ tipo, descricao, data: new Date().toISOString() });
  updateBadgeHistorico();
  exibirHistorico();
}

window.addEventListener('beforeunload', () => {
  localStorage.setItem('historicoAcoes', JSON.stringify(memoriaHistorico));
});

// --- CADASTRO DE PRODUTO & MODAL ---
function salvarProduto(imagemBase64 = '') {
  const nome = document.getElementById('nome').value.trim();
  const categoria = document.getElementById('categoria').value;
  const preco = parseFloat(document.getElementById('preco').value);
  const validade = document.getElementById('validade').value;
  const qtdMin = document.getElementById('qtd-minima').value;
  const unidadeMin = document.getElementById('unidade-minima').value;
  const unidadeAt = document.getElementById('unidade-atual').value;

  // Validação obrigatória de data de validade
  if (!validade) {
    mostrarMensagem('Data de validade é obrigatória!', 'error');
    return;
  }
  // Validação: data de validade não pode ser anterior ao dia de hoje
  const dataVal = new Date(validade);
  const hojeDate = new Date(); hojeDate.setHours(0, 0, 0, 0);
  if (dataVal < hojeDate) {
    mostrarMensagem('Data de validade não pode ser anterior ao dia de hoje!', 'error');
    return;
  }

  if (!nome || !categoria || isNaN(preco) || !qtdMin || !unidadeAt) {
    mostrarMensagem('Preencha todos os campos obrigatórios!', 'error');
    return;
  }

  const produtos = JSON.parse(localStorage.getItem('produtos')) || [];
  const produto = {
    codigo: gerarCodigoProduto(),
    nome,
    categoria,
    preco: preco.toFixed(2),
    validade: validade,
    qtdMinima: `${qtdMin} ${unidadeMin}`,
    qtdAtual: `${document.getElementById('qtd-atual').value} ${unidadeAt}`, 
    imagem: imagemBase64,
    descricao: document.getElementById('descricao').value.trim()
  };
  produtos.push(produto);
  localStorage.setItem('produtos', JSON.stringify(produtos));
  document.getElementById('modal-produto').style.display = 'none';
  document.getElementById('form-produto').reset();
  mostrarMensagem('Produto cadastrado com sucesso!', 'success');
  registrarHistorico('Cadastro de Produto', `Produto "${nome}" cadastrado.`);
  carregarAlertas();
}

document.getElementById('botao-flutuante').addEventListener('click', () => {
  document.getElementById('form-produto').reset();
  document.getElementById('codigo').value = gerarCodigoProduto();
  document.getElementById('modal-produto').style.display = 'flex';
});
document.querySelector('.cancelar').addEventListener('click', () => {
  document.getElementById('modal-produto').style.display = 'none';
});
document.getElementById('form-produto').addEventListener('submit', e => {
  e.preventDefault();
  const file = document.getElementById('imagem').files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = evt => salvarProduto(evt.target.result);
    reader.readAsDataURL(file);
  } else {
    salvarProduto();
  }
});

// --- REFLETIR UNIDADE MÍNIMA NA UNIDADE ATUAL ---
document.getElementById('unidade-minima').addEventListener('change', function () {
  // Atualiza apenas a unidade
  document.getElementById('unidade-atual').value = this.value;
});

// --- TOGGLE NOSSA HISTÓRIA (ARIA/CSS) ---
document.getElementById('toggle-historia').addEventListener('click', function () {
  const conteudo = document.getElementById('conteudo-historia');
  const expanded = this.getAttribute('aria-expanded') === 'true';
  if (expanded) {
    conteudo.classList.add('hidden');
    this.setAttribute('aria-expanded', 'false');
    this.innerHTML = '⇔';
  } else {
    conteudo.classList.remove('hidden');
    this.setAttribute('aria-expanded', 'true');
    this.innerHTML = '⇕';
  }
});

// --- INICIALIZAÇÃO ---
window.addEventListener('DOMContentLoaded', () => {
  carregarAlertas();
  updateBadgeHistorico();
  exibirHistorico();
  //iniciarPagina();
});


