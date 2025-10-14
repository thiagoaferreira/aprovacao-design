// public/js/main.js
import { buildURL, centerDefaults } from "./preview.js";
import { enableDragAndResize } from "./drag.js";

/* ========= CONFIG vindas do index.html ========= */
const CFG = window.CONFIG || {};
const SUPA_URL  = CFG.SUPABASE_URL;
const SUPA_KEY  = CFG.SUPABASE_ANON_KEY;
const WEBHOOK_PREVIEW   = CFG.WEBHOOK_PREVIEW;
const WEBHOOK_APROVACAO = CFG.WEBHOOK_APROVACAO;

/* ========= DOM ========= */
const img = document.querySelector("#canvas");
const $orderNum = document.querySelector("#order-number");
const $prodNome = document.querySelector("#produto-nome");
const $prodSKU  = document.querySelector("#produto-sku");
const $overlay  = document.querySelector("#overlay");
const busy = (on) => { if ($overlay) $overlay.hidden = !on; };

/* ========= Estado ========= */
let linkData = null; // { id, order_id, order_number, produtos: [...] }
let fila = [];       // produtos do link
let atual = 0;       // índice do produto atual

let state = {
  cloud: CFG.CLOUDINARY_CLOUD || "dslzqtajk",
  baseId: "",
  logoId: "",
  natural: { w: 1000, h: 1000 },
  logo: { x: 0, y: 400, w: 100 },
  text: { x: 0, y: 520, w: 50 },
  fonte: "Arial",
  textoVal: "",
  hasText: false,
  logoRot: 0,
  textRot: 0,
};

/* ========= Helpers ========= */
function getLinkId() {
  const u = new URL(location.href);
  const p = u.searchParams.get("p");
  if (p) return p;
  const parts = u.pathname.split("/").filter(Boolean);
  if (parts[0] === "p" && parts[1]) return parts[1];
  return "";
}

async function supaGET(pathAndQuery) {
  const r = await fetch(`${SUPA_URL}/rest/v1/${pathAndQuery}`, {
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` }
  });
  if (!r.ok) throw new Error(`Supabase GET ${r.status}`);
  return r.json();
}

function extractBaseId(url) {
  try { return new URL(url).pathname.split("/").pop() || ""; } catch { return ""; }
}
function extractLogoId(url) {
  const m = (url || "").match(/\/l_([^,\/]+)/);
  return m ? m[1].replace(/:/g, "/") : "";
}

/* ========= Aprovação / navegação entre produtos ========= */
const $panel = document.querySelector(".panel");
const $done  = document.querySelector("#done");

function preencherCabecalhoCom(prod) {
  $orderNum.textContent = linkData?.order_number ?? "—";
  $prodNome.textContent = prod?.nome ?? "—";
  $prodSKU.textContent  = prod?.sku  ?? "—";
}

function mostrarProduto(i) {
  const prod = fila[i];
  if (!prod) {
    // acabou a fila
    if ($panel) $panel.style.display = "none";
    if ($done)  $done.style.display  = "block";
    return;
  }
  // limpa formulário e preview
  document.querySelector("#logo").value = "";
  document.querySelector("#texto").value = "";
  document.querySelector("#preview-block").style.display = "none";
  state.baseId = ""; state.logoId = "";
  state.textoVal = ""; state.hasText = false;
  state.logoRot = 0; state.textRot = 0;

  preencherCabecalhoCom(prod);
}

async function aprovarProdutoAtual() {
  const prod = fila[atual];
  if (!prod) return;

  // monta payload pra sua automação
  const payload = {
    order_id:     linkData.order_id,
    order_number: linkData.order_number,
    sku:  prod.sku,
    cor:  prod.cor,
    fonte: state.fonte,
    texto: state.textoVal,
    base_public_id: state.baseId,
    logo_public_id: state.logoId,
    posicoes: {
      logo:  { x: Math.round(state.logo.x),  y: Math.round(state.logo.y),  w: Math.round(state.logo.w),  rot: state.logoRot || 0 },
      texto: { x: Math.round(state.text.x),  y: Math.round(state.text.y),  w: Math.round(state.text.w),  rot: state.textRot || 0 }
    }
  };

  busy(true);
  try {
    const r = await fetch(WEBHOOK_APROVACAO, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!r.ok) {
      const t = await r.text();
      throw new Error(t || `HTTP ${r.status}`);
    }

    // avançar na fila
    atual += 1;
    mostrarProduto(atual);
  } catch (e) {
    alert("Não foi possível concluir a aprovação agora.");
    console.error(e);
  } finally {
    busy(false);
  }
}


/* ========= Desenho ========= */
function positionBoxes() {
  const rect = img.getBoundingClientRect();
  const scaleX = rect.width / state.natural.w;
  const scaleY = rect.height / state.natural.h;

  const setBox = (sel, obj, color) => {
    const el = document.querySelector(sel);
    el.style.left = `${obj.x * scaleX}px`;
    el.style.top = `${obj.y * scaleY}px`;
    el.style.width = `${obj.w * scaleX}px`;
    el.style.height = `${obj.w * 0.6 * scaleY}px`;
    el.style.borderColor = color;
    el.style.display = "block";
  };

  setBox("#box-logo", state.logo, "#f68729");
  if (state.textoVal.trim() !== "") setBox("#box-texto", state.text, "#38bdf8");
}

function refresh() {
  const url = buildURL(state);
  if (!url) return;
  img.src = url;
  positionBoxes();
}

/* ========= Link curto → cabeçalho e fila ========= */
async function carregarLinkCurto() {
  const id = getLinkId();
  if (!id) return; // página neutra (sem p=)
  const arr = await supaGET(
    `links_aprovacao?id=eq.${encodeURIComponent(id)}&select=id,order_id,order_number,produtos`
  );
  linkData = arr[0];
  if (!linkData) throw new Error("Link não encontrado");

  fila = Array.isArray(linkData.produtos) ? linkData.produtos : [];
  if (!fila.length) throw new Error("Nenhum produto no link");

  atual = 0;
  const p = fila[0];
  $orderNum.textContent = linkData.order_number ?? "—";
  $prodNome.textContent = p?.nome ?? "—";
  $prodSKU.textContent  = p?.sku  ?? "—";
}

/* ========= Geração de prévia ========= */
async function gerarPrevia() {
  const file   = document.querySelector("#logo").files[0];
  const texto  = document.querySelector("#texto").value.trim();
  const fonte  = document.querySelector("#fonte").value || "Arial";
  if (!file) return alert("Envie o logo primeiro");

  // produto atual vindo do link curto
  const prod = fila[atual] || {};
  const SKU  = prod.sku || "";
  const COR  = prod.cor || "";

  busy(true);
  try {
    const fd = new FormData();
    fd.append("logo", file);
    fd.append("texto", texto);
    fd.append("fonte", fonte);
    fd.append("sku", SKU);
    fd.append("cor", COR);

    const r = await fetch(WEBHOOK_PREVIEW, { method: "POST", body: fd });
    const data = await r.json();
    const preview = Array.isArray(data) ? data[0] : data;

    // IDs vindos do webhook OU extraídos da preview_url
    state.baseId   = preview?.mockup_public_id || extractBaseId(preview?.preview_url) || state.baseId;
    state.logoId   = preview?.logo_public_id   || extractLogoId(preview?.preview_url) || state.logoId;
    state.textoVal = texto;
    state.fonte    = fonte;
    state.hasText  = !!texto;

    // Quando a imagem carregar, medimos e centralizamos as caixas
    img.onload = () => {
      state.natural = { w: img.naturalWidth, h: img.naturalHeight };
      const c = centerDefaults(img, state.natural);
      state.logo = c.logo;
      state.text = c.text;
      document.querySelector("#preview-block").style.display = "block";
      positionBoxes();
    };

    refresh(); // atualiza a imagem/URL
  } catch (e) {
    console.error(e);
    alert("Falha ao gerar prévia. Tente novamente.");
  } finally {
    busy(false);
  }
}

/* ========= Eventos ========= */
document.querySelector("#btn-gerar").addEventListener("click", gerarPrevia);
document.querySelector("#rot-logo").addEventListener("click", () => {
  state.logoRot = ((state.logoRot || 0) + 90) % 360; refresh();
});
document.querySelector("#rot-texto").addEventListener("click", () => {
  state.textRot = ((state.textRot || 0) + 90) % 360; refresh();
});
document.querySelector("#reset").addEventListener("click", () => {
  const c = centerDefaults(img, state.natural);
  state.logo = c.logo; state.text = c.text; refresh();
});

/* ========= Drag/Resize ========= */
enableDragAndResize(state, () => { refresh(); positionBoxes(); });

/* ========= Boot ========= */
(async () => {
  try {
    await carregarLinkCurto();
    mostrarProduto(0); // exibe o 1º produto da fila
  } catch (e) {
    console.error(e);
    const err = document.querySelector("#err");
    if (err) err.textContent = e.message || "Erro ao carregar link.";
  }
})();

