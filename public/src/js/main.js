// public/src/js/main.js
import { buildURL, centerDefaults } from "./preview.js";
import { createLogoControl } from "./logo-control.js";
import { createTextControl } from "./text-control.js";

/* ========= CONFIG / DOM ========= */
const CFG = window.CONFIG || {};
const $  = (s) => document.querySelector(s);

const img       = $("#canvas");
const $orderNum = $("#order-number");
const $prodNome = $("#produto-nome");
const $prodSKU  = $("#produto-sku");
const $headline = $("#headline-order");
const $block    = $("#preview-block");
const $overlay  = $("#overlay");
const busy = (on, msg="Gerando prévia…") => {
  if (!$overlay) return;
  $overlay.hidden = !on;
  const p = $overlay.querySelector("p");
  if (p) p.textContent = msg;
};

/* ========= Estado ========= */
let linkData  = null;
let produtos  = [];
let idx       = 0;

let state = {
  cloud: CFG.CLOUDINARY_CLOUD || "dslzqtajk",
  baseId: "",
  logoId: "",
  natural: { w: 1000, h: 1000 },
  logo: { x: 0, y: 400, w: 100 },
  text: { x: 0, y: 520, w: 60 },
  fonte: "Arial",
  textoVal: "",
  hasText: false,
  logoRot: 0,
  textRot: 0,
};

let active = "logo";        // "logo" | "text"
let centeredOnce = false;
let logoCtl, textCtl;

/* ========= Utils ========= */
const debounce = (fn, ms=120) => { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; };
const refreshDebounced = debounce(()=>{ const url = buildURL(state); if (url) img.src = url; }, 120);

const getP     = () => new URL(location.href).searchParams.get("p") || "";
const pickCor  = (p) => (p?.variante ?? p?.cor ?? p?.color ?? "").toString().trim();
const lower    = (s) => (s||"").toLowerCase();

async function supaGET(qs) {
  const base = (CFG.SUPABASE_URL || "").replace(/\/+$/,"");
  const key  = CFG.SUPABASE_ANON_KEY;
  const r = await fetch(`${base}${qs}`, { headers: { apikey: key, Authorization: `Bearer ${key}` }});
  if (!r.ok) throw new Error(`Supabase ${r.status}`);
  return r.json();
}
function extractBaseId(url) {
  try {
    const u = new URL(url);
    const after = u.pathname.split("/image/upload/")[1] || "";
    const seg = after.split("/").filter(Boolean);
    while (seg.length && (seg[0].includes(",") || /^v\d+$/.test(seg[0]))) seg.shift();
    return seg.join("/").replace(/\.[a-z0-9]+$/i,"");
  } catch { return ""; }
}
function extractLogoId(url) {
  try {
    const m = /\/l_([^,]+)/.exec(url || "");
    if (!m) return "";
    const raw = decodeURIComponent(m[1]); // ex.: "Logo:logo_123" ou "Logo/logo_123"
    return raw.includes(":") ? raw.replace(/:/g, "/") : raw;
  } catch { return ""; }
}

/* ========= Cabeçalho ========= */
function writeHeader() {
  const prod = produtos[idx] || {};
  const pedido = linkData?.order_number ?? linkData?.order_id ?? "—";
  const nome   = prod?.nome || "—";
  const sku    = prod?.sku  || "—";

  if ($headline) $headline.textContent = `Pedido #${pedido}`;
  if ($orderNum) $orderNum.textContent = pedido;
  if ($prodNome) $prodNome.textContent = nome;
  if ($prodSKU)  $prodSKU.textContent  = sku;

  const total = Math.max(1, produtos.length || 1);
  const pc = $("#design-progress"); if (pc) pc.textContent = ` (${idx+1}/${total})`;
}

/* ========= Boxes (alinhadas ao contêiner) ========= */
function positionBoxes() {
  const board = img.closest(".canvas-wrap") || img.parentElement;
  if (!board) return;

  const imgRect   = img.getBoundingClientRect();
  const boardRect = board.getBoundingClientRect();

  const scaleX = imgRect.width  / state.natural.w;
  const scaleY = imgRect.height / state.natural.h;

  const offX = imgRect.left - boardRect.left;
  const offY = imgRect.top  - boardRect.top;

  const paint = (sel, obj, color) => {
    const el = document.querySelector(sel);
    if (!el) return;
    if (el.parentElement !== board) board.appendChild(el);

    const st = board.style;
    if (!st.position || st.position === "static") st.position = "relative";
    if (!st.overflow) st.overflow = "hidden";

    el.style.position   = "absolute";
    el.style.left       = `${offX + obj.x * scaleX}px`;
    el.style.top        = `${offY + obj.y * scaleY}px`;
    el.style.width      = `${obj.w * scaleX}px`;
    el.style.height     = `${obj.w * 0.6 * scaleY}px`;
    el.style.borderColor = color;
    el.style.display     = "block";
  };

  paint("#box-logo",  state.logo, "#f68729");
  if (state.textoVal.trim() !== "") paint("#box-texto", state.text, "#38bdf8");
}

function refresh() {
  const url = buildURL(state);
  if (url) { img.src = url; positionBoxes(); }
}

/* ========= Defaults do SKU ========= */
async function fetchSkuConfig(sku) {
  const qs = `/rest/v1/configuracoes_produtos?sku=eq.${encodeURIComponent(sku)}&select=` +
             `x_logo_media,y_logo_media,tamanho_logo_media,` +
             `x_texto_media,y_texto_media,tamanho_texto_media`;
  const rows = await supaGET(qs);
  return rows?.[0] || null;
}
function applyConfigDefaults(cfg) {
  if (!cfg) return false;
  state.logo = {
    x: +cfg.x_logo_media || 0,
    y: +cfg.y_logo_media || 0,
    w: +cfg.tamanho_logo_media || 100
  };
  state.text = {
    x: +cfg.x_texto_media || 0,
    y: +cfg.y_texto_media || 0,
    w: +cfg.tamanho_texto_media || 60
  };
  centeredOnce = true; // não recentralizar
  return true;
}

/* ========= Seleção & Change hooks (para módulos) ========= */
const onChange = () => { refreshDebounced(); positionBoxes(); };
const setActive = (who) => {
  active = who;
  document.querySelector("#box-logo") ?.classList.toggle("active", who === "logo");
  document.querySelector("#box-texto")?.classList.toggle("active", who === "text");
};
const onSelect = (who) => setActive(who);

/* ========= Link curto ========= */
async function loadShortLink() {
  const p = getP();
  if (!p) return;

  // 1) link do Supabase
  const rows = await supaGET(`/rest/v1/links_aprovacao?id=eq.${encodeURIComponent(p)}&select=*`);
  linkData = rows?.[0];
  if (!linkData) throw new Error("Link não encontrado");

  // 2) produtos + cabeçalho
  produtos = Array.isArray(linkData.produtos) ? linkData.produtos : [];
  idx = 0;
  writeHeader();

  // 3) base inicial (mockup)
  const prod = produtos[idx] || {};
  state.baseId = `Mockup/${lower(prod.sku)}_${pickCor(prod).toLowerCase()}`;

  // 4) aplicar defaults do BD (as mesmas coordenadas que o webhook usa)
  try {
    const cfg = await fetchSkuConfig(prod.sku);
    applyConfigDefaults(cfg);
  } catch (e) {
    console.warn("Não foi possível ler configuracoes_produtos:", e);
  }

  // 5) quando a base carregar, desenhar caixas
  img.onload = () => {
    state.natural = { w: img.naturalWidth, h: img.naturalHeight };
    $block.style.display = "block";
    positionBoxes();
  };

  // 6) desenha base
  refresh();
}

/* ========= FormData & Prévia ========= */
function buildFormData() {
  const fd = new FormData();
  const prod = produtos[idx] || {};
  const file = $("#logo")?.files?.[0] || null;
  if (file) fd.append("logo", file); // n8n espera "logo"
  fd.append("sku", prod.sku || "");
  fd.append("cor", pickCor(prod) || "");
  fd.append("order_id",     linkData?.order_id     ?? "");
  fd.append("order_number", linkData?.order_number ?? "");
  fd.append("p", getP() || "");
  fd.append("texto", ($("#texto")?.value || "").trim());
  fd.append("fonte", $("#fonte")?.value || "Arial");
  return fd;
}

async function gerarPrevia() {
  try {
    busy(true);
    const r = await fetch(CFG.WEBHOOK_PREVIEW, { method:"POST", body: buildFormData() });
    const data = await r.json().catch(()=> ({}));
    const previewUrl = (Array.isArray(data) ? data[0]?.preview_url : data?.preview_url) || null;

    // ids vindos do webhook OU extraídos da preview_url
    state.baseId = data.mockup_public_id || state.baseId || (previewUrl ? extractBaseId(previewUrl) : state.baseId);
    state.logoId = data.logo_public_id   || state.logoId || (previewUrl ? extractLogoId(previewUrl) : state.logoId);

    state.textoVal = ($("#texto")?.value || "").trim();
    state.fonte    = $("#fonte")?.value || "Arial";
    state.hasText  = !!state.textoVal;

    img.onload = () => {
      state.natural = { w: img.naturalWidth, h: img.naturalHeight };
      $block.style.display = "block";
      positionBoxes();
    };

    if (previewUrl) { img.src = previewUrl; } else { refresh(); }

    // Instanciar controles uma vez
    if (!window.__controlsReady) {
      logoCtl = createLogoControl({ img, box: "#box-logo",  state, onChange, onSelect });
      textCtl = createTextControl({ img, box: "#box-texto", state, onChange, onSelect });
      window.__controlsReady = true;
      setActive("logo");
    } else {
      setActive(active);
    }
  } catch (e) {
    console.error(e);
    alert("Falha ao gerar prévia. Tente novamente.");
  } finally {
    busy(false);
  }
}

/* ========= Toolbar (aponta para o selecionado) ========= */
const target = () => (active === "logo" ? logoCtl : textCtl);
$("#btn-rot-ccw")?.addEventListener("click", () => target()?.rotCCW());
$("#btn-rot-cw") ?.addEventListener("click", () => target()?.rotCW());
$("#btn-inc")    ?.addEventListener("click", () => target()?.inc());
$("#btn-dec")    ?.addEventListener("click", () => target()?.dec());

/* ========= Botão gerar ========= */
$("#btn-gerar")?.addEventListener("click", (e)=>{ e.preventDefault(); gerarPrevia(); });

/* ========= Boot ========= */
document.addEventListener("DOMContentLoaded", ()=>{ loadShortLink(); });
