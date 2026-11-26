// 1. Configurações do projeto Supabase e WhatsApp de atendimento
const SUPABASE_URL = "https://pxzcijkqulkrdcchwsma.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_JEjPqLMfA9Rn0Cw5kWFo2g_Hlw9Gyba";
const WHATSAPP_ATENDIMENTO = "5521996519930";
const TAXA_ENTREGA_PADRAO = 5.0;

// 2. Itens iniciais do cardápio (edita nomes, descrições e preços como quiseres)
const ITENS_CARDAPIO = [
  {
    id: "burger-classico",
    nome: "Bunker Clássico",
    categoria: "burgers",
    preco: 32.0,
    descricao: "Pão brioche, blend bovino 160g, queijo cheddar, alface, tomate e molho da casa."
  },
  {
    id: "burger-duplo-bacon",
    nome: "Bunker Duplo Bacon",
    categoria: "burgers",
    preco: 38.0,
    descricao: "Dois blends de 130g, cheddar duplo, bacon crocante e cebola caramelizada."
  },
  {
    id: "batata-frita",
    nome: "Batata Frita Crocante",
    categoria: "acompanhamentos",
    preco: 14.0,
    descricao: "Porção individual temperada com ervas e sal fino."
  },
  {
    id: "refrigerante-lata",
    nome: "Refrigerante Lata 350ml",
    categoria: "bebidas",
    preco: 7.0,
    descricao: "Gelado (Coca-Cola, Guaraná ou Zero)."
  }
];

let categoriaAtual = "todos";
let carrinho = [];

const listaCardapioEl = document.getElementById("lista-cardapio");
const itensCarrinhoEl = document.getElementById("itens-carrinho");
const subtotalEl = document.getElementById("valor-subtotal");
const entregaEl = document.getElementById("valor-entrega");
const totalEl = document.getElementById("valor-total");
const formPedidoEl = document.getElementById("form-pedido");
const tipoEntregaEl = document.getElementById("tipo-entrega");
const grupoEnderecoEl = document.getElementById("grupo-endereco");
const enderecoEl = document.getElementById("endereco");
const formaPagamentoEl = document.getElementById("forma-pagamento");
const grupoTrocoEl = document.getElementById("grupo-troco");
const trocoParaEl = document.getElementById("troco-para");
const btnEnviarEl = document.getElementById("btn-enviar");
const feedbackEl = document.getElementById("feedback-status");

function formatarMoeda(valor) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function escaparHtml(texto) {
  return String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderizarCardapio() {
  const filtrados =
    categoriaAtual === "todos"
      ? ITENS_CARDAPIO
      : ITENS_CARDAPIO.filter((item) => item.categoria === categoriaAtual);

  listaCardapioEl.innerHTML = filtrados
    .map(
      (item) => `
      <article class="item-card">
        <div>
          <div class="item-topo">
            <h3 class="item-nome">${escaparHtml(item.nome)}</h3>
            <span class="item-preco">${formatarMoeda(item.preco)}</span>
          </div>
          <p class="item-desc">${escaparHtml(item.descricao)}</p>
        </div>
        <input
          type="text"
          class="item-obs"
          id="obs-${escaparHtml(item.id)}"
          placeholder="Observação (ex.: sem cebola, ponto da carne)..."
        />
        <button type="button" class="btn-add" data-add-id="${escaparHtml(item.id)}">
          Adicionar ao pedido
        </button>
      </article>
    `
    )
    .join("");
}

function adicionarAoCarrinho(idItem) {
  const produto = ITENS_CARDAPIO.find((item) => item.id === idItem);
  if (!produto) return;

  const obsInput = document.getElementById(`obs-${idItem}`);
  const obs = obsInput ? obsInput.value.trim() : "";

  const existente = carrinho.find((item) => item.id === idItem && item.obs === obs);
  if (existente) {
    existente.qtd += 1;
  } else {
    carrinho.push({
      id: produto.id,
      nome: produto.nome,
      preco: produto.preco,
      qtd: 1,
      obs
    });
  }

  if (obsInput) obsInput.value = "";
  atualizarCarrinho();
}

function alterarQuantidade(indice, delta) {
  const item = carrinho[indice];
  if (!item) return;

  item.qtd += delta;
  if (item.qtd <= 0) {
    carrinho.splice(indice, 1);
  }
  atualizarCarrinho();
}

function calcularTotais() {
  const subtotal = carrinho.reduce((acc, item) => acc + item.preco * item.qtd, 0);
  const taxaEntrega =
    carrinho.length > 0 && tipoEntregaEl.value === "entrega" ? TAXA_ENTREGA_PADRAO : 0;
  const total = subtotal + taxaEntrega;
  return { subtotal, taxaEntrega, total };
}

function atualizarCarrinho() {
  if (carrinho.length === 0) {
    itensCarrinhoEl.innerHTML =
      '<p class="carrinho-vazio">Seu carrinho está vazio. Adicione um item acima.</p>';
  } else {
    itensCarrinhoEl.innerHTML = carrinho
      .map(
        (item, index) => `
        <div class="carrinho-item">
          <div class="carrinho-info">
            <strong>${item.qtd}x ${escaparHtml(item.nome)}</strong>
            <small>${formatarMoeda(item.preco * item.qtd)}${
              item.obs ? ` • Obs: ${escaparHtml(item.obs)}` : ""
            }</small>
          </div>
          <div class="carrinho-acoes">
            <button type="button" class="btn-qtd" data-qtd-index="${index}" data-qtd-delta="-1">-</button>
            <span>${item.qtd}</span>
            <button type="button" class="btn-qtd" data-qtd-index="${index}" data-qtd-delta="1">+</button>
          </div>
        </div>
      `
      )
      .join("");
  }

  const { subtotal, taxaEntrega, total } = calcularTotais();
  subtotalEl.textContent = formatarMoeda(subtotal);
  entregaEl.textContent = formatarMoeda(taxaEntrega);
  totalEl.textContent = formatarMoeda(total);
}

function montarMensagemWhatsApp(pedido) {
  const linhasItens = pedido.itens
    .map((item) => {
      const obsTexto = item.obs ? ` _(Obs: ${item.obs})_` : "";
      return `• ${item.qtd}x ${item.nome} — ${formatarMoeda(item.preco * item.qtd)}${obsTexto}`;
    })
    .join("\n");

  const enderecoLinha =
    pedido.tipo_entrega === "entrega"
      ? `📍 *Endereço:* ${pedido.endereco}`
      : `🏪 *Retirada:* No balcão`;

  const trocoLinha =
    pedido.forma_pagamento === "dinheiro" && pedido.troco_para
      ? `\n💵 *Troco para:* ${formatarMoeda(pedido.troco_para)}`
      : "";

  return [
    "*NOVO PEDIDO — HAMBÚRGUERES DE BUNKER*",
    "",
    `👤 *Cliente:* ${pedido.cliente_nome}`,
    `📱 *Telefone:* ${pedido.cliente_telefone}`,
    enderecoLinha,
    "",
    "🍔 *Itens:*",
    linhasItens,
    "",
    `💳 *Pagamento:* ${pedido.forma_pagamento.toUpperCase()}${trocoLinha}`,
    `💰 *Total:* *${formatarMoeda(pedido.total)}*`
  ].join("\n");
}

async function salvarPedidoNoSupabase(payload) {
  const endpoint = `${SUPABASE_URL}/rest/v1/pedidos`;
  const resposta = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Prefer: "return=minimal"
    },
    body: JSON.stringify(payload)
  });

  if (!resposta.ok) {
    let detalhe = `Erro HTTP ${resposta.status}`;
    try {
      const dadosErro = await resposta.json();
      detalhe = dadosErro.message || dadosErro.details || detalhe;
    } catch {
      const textoErro = await resposta.text();
      if (textoErro) detalhe = textoErro;
    }
    throw new Error(detalhe);
  }

  return true;
}

listaCardapioEl.addEventListener("click", (event) => {
  const botaoAdd = event.target.closest("[data-add-id]");
  if (!botaoAdd) return;
  adicionarAoCarrinho(botaoAdd.dataset.addId);
});

itensCarrinhoEl.addEventListener("click", (event) => {
  const botaoQtd = event.target.closest("[data-qtd-index]");
  if (!botaoQtd) return;
  const indice = Number(botaoQtd.dataset.qtdIndex);
  const delta = Number(botaoQtd.dataset.qtdDelta);
  alterarQuantidade(indice, delta);
});

document.querySelectorAll(".cat-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".cat-btn").forEach((b) => b.classList.remove("ativo"));
    btn.classList.add("ativo");
    categoriaAtual = btn.dataset.categoria;
    renderizarCardapio();
  });
});

tipoEntregaEl.addEventListener("change", () => {
  const ehEntrega = tipoEntregaEl.value === "entrega";
  grupoEnderecoEl.classList.toggle("oculto", !ehEntrega);
  enderecoEl.required = ehEntrega;
  if (!ehEntrega) {
    enderecoEl.value = "";
  }
  atualizarCarrinho();
});

formaPagamentoEl.addEventListener("change", () => {
  const ehDinheiro = formaPagamentoEl.value === "dinheiro";
  grupoTrocoEl.classList.toggle("oculto", !ehDinheiro);
  if (!ehDinheiro) {
    trocoParaEl.value = "";
  }
});

formPedidoEl.addEventListener("submit", async (event) => {
  event.preventDefault();
  feedbackEl.textContent = "";
  feedbackEl.className = "feedback";

  if (carrinho.length === 0) {
    feedbackEl.textContent = "Adicione pelo menos um item ao carrinho antes de enviar.";
    feedbackEl.classList.add("erro");
    return;
  }

  const { total } = calcularTotais();
  const ehEntrega = tipoEntregaEl.value === "entrega";
  const valorTroco =
    formaPagamentoEl.value === "dinheiro" && trocoParaEl.value
      ? Number(trocoParaEl.value)
      : null;

  const payload = {
    cliente_nome: document.getElementById("cliente-nome").value.trim(),
    cliente_telefone: document.getElementById("cliente-telefone").value.trim(),
    tipo_entrega: tipoEntregaEl.value,
    endereco: ehEntrega ? enderecoEl.value.trim() : "Retirada no balcão",
    forma_pagamento: formaPagamentoEl.value,
    troco_para: valorTroco,
    itens: carrinho.map(({ nome, qtd, preco, obs }) => ({ nome, qtd, preco, obs })),
    total,
    origem: "site",
    status: "pendente"
  };

  btnEnviarEl.disabled = true;
  btnEnviarEl.textContent = "Enviando pedido...";

  try {
    await salvarPedidoNoSupabase(payload);

    const textoWhatsApp = encodeURIComponent(montarMensagemWhatsApp(payload));
    const linkWhatsApp = `https://wa.me/${WHATSAPP_ATENDIMENTO}?text=${textoWhatsApp}`;

    feedbackEl.textContent = "Pedido registrado com sucesso! Abrindo o WhatsApp...";
    feedbackEl.classList.add("sucesso");

    carrinho = [];
    formPedidoEl.reset();
    grupoEnderecoEl.classList.remove("oculto");
    enderecoEl.required = true;
    grupoTrocoEl.classList.add("oculto");
    atualizarCarrinho();

    window.open(linkWhatsApp, "_blank", "noopener,noreferrer");
  } catch (erro) {
    feedbackEl.textContent = `Não foi possível enviar o pedido: ${erro.message}`;
    feedbackEl.classList.add("erro");
  } finally {
    btnEnviarEl.disabled = false;
    btnEnviarEl.textContent = "Enviar Pedido e Abrir WhatsApp";
  }
});

renderizarCardapio();
atualizarCarrinho();