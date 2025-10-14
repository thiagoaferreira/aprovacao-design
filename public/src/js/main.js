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
const img       = document.querySelector("#canvas");
const $orderNum = document.querySelector("#order-number");   // painel
const $prodNome = document.querySelector("#produto-nome");
const $prodSKU  = document.querySelector("#produto-sku");
const $headline = document.querySelector("#headline-order"); // topbar "Pedido #—"
const $overlay  = document.querySelector("#overlay");
const $designProgress = document.querySelector("#design-progress");
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

function progressLabel() {
  return `(${atual + 1}/${Math.max(1, fila.length)})`;
}
function updateDesignProgress() {
  if ($designProgress) $designProgress.textContent = ` ${progressLabel()}`;
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

/* ========= UI helpers ========= */
function preencherCabecalhoCom(prod) {
  if ($headline) $headline.textContent = `Pedido #${linkData?.order_number ?? "—"}`;
  if ($orderNum) $orderNum.textContent = linkData?.order_number ?? "—";
  if ($prodNome) $prodNome.textContent = prod?.nome ?? "—";
  if ($prodSKU)  $prodSKU.textContent  = prod?.sku  ?? "—";
}

function mostrarProduto(i) {
  updateDesignProgress();
  const prod = fila[i];
  if (!prod) {
    // acabou a fila
    const $panel = document.querySelector(".panel");
    const $done  = document.querySelector("#done");
    if ($panel) $panel.style.display = "none";
    if ($done)  $done.style.display  = "block";
    return;
  }
  // limpa formulário e preview
  const $logoInput  = document.querySelector("#logo");
  const $textoInput = document.querySelector("#texto");
  if ($logoInput)  $logoInput.value  = "";
  if ($textoInput) $textoInput.value = "";

  const $prev = document.querySelector("#preview-block");
  if ($prev) $prev.style.display = "none";

  state.baseId = ""; state.logoId = "";
  state.textoVal = ""; state.hasText = false;
  state.logoRot = 0; state.textRot = 0;

  preencherCabecalhoCom(prod);
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
  updateDesignProgress();
  preencherCabecalhoCom(fila[0]);

}

/* ========= Geração de prévia ========= */
function pickCor(prod) {
  // prioridade: campo "variante" que vem da tabela links_aprovacao
  const v =
    (prod?.variante ??           // <-- novo
     prod?.cor ?? 
     prod?.color ?? 
     prod?.cor_escolhida ?? 
     prod?.variacao ?? "")
    .toString()
    .trim();

  if (v) return v;

  // fallback de compatibilidade: ?cor= na URL
  const qs = new URLSearchParams(location.search);
  return (qs.get("cor") || "").trim();
}


async function gerarPrevia() {
  const file   = document.querySelector("#logo")?.files?.[0];
  const texto  = document.querySelector("#texto")?.value?.trim() || "";
  const fonte  = document.querySelector("#fonte")?.value || "Arial";
  if (!file) return alert("Envie o logo primeiro");

  const prod = fila[atual] || {};
  const SKU  = (prod.sku || "").toString().trim();
  const COR  = pickCor(prod);

  if (!SKU) return alert("Este link está sem SKU. Reenvie o link de aprovação.");
  if (!COR) return alert("Este link está sem a COR definida. Gere o link novamente com a cor selecionada.");

  busy(true);
  try {
    const fd = new FormData();
    fd.append("logo", file);
    fd.append("texto", texto);
    fd.append("fonte", fonte);
    fd.append("sku", SKU);
    fd.append("cor", COR);

    const r = await fetch(WEBHOOK_PREVIEW, { method: "POST", body: fd });
    if (!r.ok) {
      const t = await r.text();
      throw new Error(t || `HTTP ${r.status}`);
    }
    const data = await r.json();
    const preview = Array.isArray(data) ? data[0] : data;

    state.baseId   = preview?.mockup_public_id || extractBaseId(preview?.preview_url) || state.baseId;
    state.logoId   = preview?.logo_public_id   || extractLogoId(preview?.preview_url) || state.logoId;
    state.textoVal = texto;
    state.fonte    = fonte;
    state.hasText  = !!texto;

    img.onload = () => {
      state.natural = { w: img.naturalWidth, h: img.naturalHeight };
      const c = centerDefaults(img, state.natural);
      state.logo = c.logo; state.text = c.text;
      const $prev = document.querySelector("#preview-block");
      if ($prev) $prev.style.display = "block";
      positionBoxes();
    };

    refresh();
  } catch (e) {
    console.error(e);
    alert("Falha ao gerar prévia. Tente novamente.");
  } finally {
    busy(false);
  }
}

/* ========= Aprovação ========= */
async function aprovarProdutoAtual() {
  const prod = fila[atual];
  if (!prod) return;

  const payload = {
    order_id:     linkData.order_id,
    order_number: linkData.order_number,
    sku:  prod.sku,
    cor:  pickCor(prod),
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
    // próximo produto
    atual += 1;
    updateDesignProgress();
    if (atual < fila.length) {
      preencherCabecalhoCom(fila[atual]);
      mostrarProduto(atual);
    } else {
      mostrarProduto(atual); // encerra e mostra #done
    }
  } catch (e) {
    console.error(e);
    alert("Não foi possível concluir a aprovação agora.");
  } finally {
    busy(false);
  }
}

/* ========= Eventos ========= */
document.querySelector("#btn-gerar")?.addEventListener("click", gerarPrevia);
document.querySelector("#rot-logo")?.addEventListener("click", () => {
  state.logoRot = ((state.logoRot || 0) + 90) % 360; refresh();
});
document.querySelector("#rot-texto")?.addEventListener("click", () => {
  state.textRot = ((state.textRot || 0) + 90) % 360; refresh();
});
document.querySelector("#reset")?.addEventListener("click", () => {
  const c = centerDefaults(img, state.natural);
  state.logo = c.logo; state.text = c.text; refresh();
});
document.querySelector("#aprovar")?.addEventListener("click", aprovarProdutoAtual);

/* ========= Drag/Resize ========= */
enableDragAndResize(state, () => { refresh(); positionBoxes(); });

/* ========= Boot ========= */
(async () => {
  try {
    await carregarLinkCurto();
    mostrarProduto(0); // exibe o 1º item e já pinta topbar/painel
  } catch (e) {
    console.error(e);
    const err = document.querySelector("#err");
    if (err) err.textContent = e.message || "Erro ao carregar link.";
  }
})();
