// public/src/js/main.js
import { buildURL, buildFinalURL, centerDefaults } from "./preview.js";
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

const onChange = (who) => { 
  console.log(`🔄 onChange chamado para: ${who}`, {
    logo: state.logo,
    text: state.text
  });

  // Atualizar posição das caixas imediatamente (sem rebuild da URL)
  positionBoxes();
  updatePreviews();
  
  // Debounce para rebuild da URL final
  refreshDebounced();
};

const setActive = (who) => {
  active = who;
  console.log(`🎯 Elemento ativo: ${who}`);
  
  const $logo = document.querySelector("#box-logo");
  const $text = document.querySelector("#box-texto");
  
  if ($logo) $logo.classList.toggle("active", who === "logo");
  if ($text) $text.classList.toggle("active", who === "text");
  
  // Atualizar classes nos controles também
  logoCtl?.setActiveClass(who === "logo");
  textCtl?.setActiveClass(who === "text");
};

const onSelect = (who) => setActive(who);

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
    const raw = decodeURIComponent(m[1]);
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
  
  console.log("📦 positionBoxes() chamado");
  console.log("  🖼️ Imagem natural:", state.natural);
  console.log("  📍 Logo no state:", state.logo);
  console.log("  📍 Text no state:", state.text);
  
  if (!board) return;

  const imgRect = img.getBoundingClientRect();
  const boardRect = board.getBoundingClientRect();

  const scaleX = imgRect.width / state.natural.w;
  const scaleY = imgRect.height / state.natural.h;

  const offX = imgRect.left - boardRect.left;
  const offY = imgRect.top - boardRect.top;

  const paint = (sel, obj, color, labelText, rotation = 0) => {
    const el = document.querySelector(sel);
    if (!el) return;
    if (el.parentElement !== board) board.appendChild(el);

    const st = board.style;
    if (!st.position || st.position === "static") st.position = "relative";
    if (!st.overflow) st.overflow = "hidden";

    const screenX = offX + obj.x * scaleX;
    const screenY = offY + obj.y * scaleY;
    const screenW = obj.w * scaleX;
    
    // ✅ ALTURA DINÂMICA
    let screenH;
    if (sel === "#box-texto") {
      screenH = obj.w * 0.4 * scaleY; // Texto mais retangular
    } else {
      screenH = obj.w * 0.6 * scaleY; // Logo mais quadrada
    }

    el.style.position = "absolute";
    el.style.left = `${screenX}px`;
    el.style.top = `${screenY}px`;
    el.style.width = `${screenW}px`;
    el.style.height = `${screenH}px`;
    el.style.borderColor = color;
    el.style.display = "block";
    el.style.pointerEvents = "auto";
    
    // ❌ NÃO aplicar rotação visual (confunde o usuário)
    // A rotação será aplicada apenas na URL final do Cloudinary

    const badge = el.querySelector(".badge");
    if (badge) {
      badge.textContent = `${labelText} ${rotation ? `(${rotation}°)` : ''}`.trim();
    }
  };

  // ✅ PASSAR ROTAÇÃO PARA A FUNÇÃO
  paint("#box-logo", state.logo, "#f68729", "LOGO", state.logoRot || 0);
  
  if (state.textoVal.trim() !== "") {
    paint("#box-texto", state.text, "#38bdf8", "TEXTO", state.textRot || 0);
  } else {
    const textBox = document.querySelector("#box-texto");
    if (textBox) textBox.style.display = "none";
  }
}

// Atualiza os elementos visuais DENTRO das caixas
function updatePreviews() {
  const $logoImg = document.querySelector("#logo-preview");
  const $textoDiv = document.querySelector("#texto-preview");
  
  // LOGO: mostrar a logo processada SEM fundo
  if (state.logoId && $logoImg) {
    // ✅ Forçar fundo transparente + formato PNG
    const logoUrl = `https://res.cloudinary.com/${state.cloud}/image/upload/e_bgremoval,f_png,w_300,h_300,c_fit,b_rgb:00000000/${state.logoId}`;
    $logoImg.src = logoUrl;
    $logoImg.style.display = "block";
    $logoImg.style.background = "transparent";
    
    // ✅ Adicionar classe quando carregar
    $logoImg.onload = () => {
      $logoImg.classList.add("loaded");
    };
  } else if ($logoImg) {
    $logoImg.style.display = "none";
    $logoImg.classList.remove("loaded");
  }
  
  // TEXTO: mostrar o texto
  if ($textoDiv && state.textoVal) {
    $textoDiv.textContent = state.textoVal || "";
    $textoDiv.style.fontFamily = state.fonte || "Arial";
    
    // ✅ Tamanho relativo à caixa
    const fontSize = Math.max(12, Math.min(48, Math.round(state.text.w * 0.3)));
    $textoDiv.style.fontSize = `${fontSize}px`;
    $textoDiv.style.lineHeight = "1.2";
    $textoDiv.style.whiteSpace = "normal";
    $textoDiv.style.display = "flex";
    $textoDiv.style.alignItems = "center";
    $textoDiv.style.justifyContent = "center";
    $textoDiv.style.background = "transparent";
    
    // ✅ Adicionar classe loaded
    $textoDiv.classList.add("loaded");
  } else if ($textoDiv) {
    $textoDiv.classList.remove("loaded");
  }
}

function refresh() {
  const url = buildURL(state);
  if (!url) return;
  
  const $aviso = document.querySelector("#aviso-logo");
  if ($aviso) {
    const semLogo = !state.logoId && $block.style.display !== "none";
    $aviso.style.display = semLogo ? "block" : "none";
  }
  
  img.src = url;
  
  img.onload = () => {
    positionBoxes();
    updatePreviews();
  };
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
    y: +cfg.y_logo_media || 400,
    w: +cfg.tamanho_logo_media || 100
  };
  state.text = {
    x: +cfg.x_texto_media || 0,
    y: +cfg.y_texto_media || 520,
    w: +cfg.tamanho_texto_media || 60
  };
  
  console.log("✅ Configs do BD aplicadas:", {
    logo: state.logo,
    text: state.text
  });
  
  centeredOnce = true;
  return true;
}

/* ========= Link curto ========= */
async function loadShortLink() {
  const p = getP();
  if (!p) return;

  const rows = await supaGET(`/rest/v1/links_aprovacao?id=eq.${encodeURIComponent(p)}&select=*`);
  linkData = rows?.[0];
  if (!linkData) throw new Error("Link não encontrado");

  produtos = Array.isArray(linkData.produtos) ? linkData.produtos : [];
  idx = 0;
  writeHeader();

  const prod = produtos[idx] || {};
  state.baseId = `Mockup/${lower(prod.sku)}_${pickCor(prod).toLowerCase()}`;

  try {
    const cfg = await fetchSkuConfig(prod.sku);
    if (cfg && applyConfigDefaults(cfg)) {
      console.log("✅ Usando coordenadas do BD");
    } else {
      const defaults = centerDefaults(null, state.natural);
      state.logo = defaults.logo;
      state.text = defaults.text;
      centeredOnce = true;
      console.log("✅ Usando coordenadas padrão centralizadas");
    }
  } catch (e) {
    console.warn("⚠️ Não foi possível ler configuracoes_produtos:", e);
    const defaults = centerDefaults(null, state.natural);
    state.logo = defaults.logo;
    state.text = defaults.text;
    centeredOnce = true;
  }

  img.onload = () => {
    state.natural = { w: img.naturalWidth, h: img.naturalHeight };
    
    console.log("🖼️ Imagem base carregada:", state.natural);
    console.log("📍 Posições finais:", {
      logo: state.logo,
      text: state.text
    });
    
    $block.style.display = "block";
    positionBoxes();
    
    if (!window.__resizeObserver) {
      window.__resizeObserver = new ResizeObserver(() => {
        positionBoxes();
      });
      window.__resizeObserver.observe(img);
    }
  };

  refresh();
}

/* ========= FormData & Prévia ========= */
function buildFormData() {
  const fd = new FormData();
  const prod = produtos[idx] || {};
  const file = $("#logo")?.files?.[0] || null;
  if (file) fd.append("logo", file);
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
    
    console.log("📦 Resposta do webhook:", data);
    
    const previewUrl = (Array.isArray(data) ? data[0]?.preview_url : data?.preview_url) || null;

    state.baseId = data.mockup_public_id || state.baseId || (previewUrl ? extractBaseId(previewUrl) : state.baseId);
    state.logoId = data.logo_public_id   || state.logoId || (previewUrl ? extractLogoId(previewUrl) : state.logoId);

    console.log("🆔 IDs extraídos:", {
      baseId: state.baseId,
      logoId: state.logoId
    });

    if (state.logoId) {
      const $logoImg = document.querySelector("#logo-preview");
      if ($logoImg) {
        const logoUrl = `https://res.cloudinary.com/${state.cloud}/image/upload/e_bgremoval,w_300,h_300,c_fit/${state.logoId}`;
        $logoImg.src = logoUrl;
      }
    }
    
    state.textoVal = ($("#texto")?.value || "").trim();
    state.fonte    = $("#fonte")?.value || "Arial";
    state.hasText  = !!state.textoVal;

    img.onload = () => {
      state.natural = { w: img.naturalWidth, h: img.naturalHeight };
      
      console.log("📐 Dimensões naturais da imagem:", state.natural);
      
      $block.style.display = "block";
      const $boxLogo = document.querySelector("#box-logo");
      const $boxTexto = document.querySelector("#box-texto");
      if ($boxLogo) $boxLogo.style.display = "block";
      if ($boxTexto && state.hasText) $boxTexto.style.display = "block";
      
      if (!centeredOnce) {
        const prod = produtos[idx] || {};
        fetchSkuConfig(prod.sku).then(cfg => {
          if (cfg && applyConfigDefaults(cfg)) {
            console.log("✅ Configs do BD aplicadas");
          } else {
            const defaults = centerDefaults(img, state.natural);
            state.logo = defaults.logo;
            state.text = defaults.text;
            console.log("✅ Defaults centralizados aplicados");
          }
          centeredOnce = true;
          positionBoxes();
          updatePreviews();
        });
      } else {
        positionBoxes();
        updatePreviews();
      }
      
      // ✅ SEMPRE inicializar controles
      if (!window.__controlsReady) {
        console.log("🎮 Inicializando controles...");
        
        logoCtl = createLogoControl({ 
          img, 
          box: "#box-logo", 
          state, 
          onChange, 
          onSelect 
        });
        
        textCtl = createTextControl({ 
          img, 
          box: "#box-texto", 
          state, 
          onChange, 
          onSelect 
        });
        
        window.__controlsReady = true;
        setActive("logo");
        console.log("✅ Controles criados e ativos");
      } else {
        console.log("✅ Controles já existem, apenas atualizando");
        setActive("logo");
      }
    };

    if (previewUrl) { 
      console.log("🖼️ Usando preview_url do webhook");
      img.src = previewUrl; 
    } else { 
      console.log("🔨 Montando URL manualmente");
      refresh(); 
    }

  } catch (e) {
    console.error("❌ Erro ao gerar prévia:", e);
    alert("Falha ao gerar prévia. Tente novamente.");
  } finally {
    busy(false);
  }
}

/* ========= Toolbar (aponta para o selecionado) ========= */
const target = () => (active === "logo" ? logoCtl : textCtl);

// ✅ IMPORTANTE: NÃO chamar setActive aqui, apenas executar a ação
$("#btn-rot-ccw")?.addEventListener("click", () => {
  console.log(`🔄 Rotacionar CCW: ${active}`);
  target()?.rotCCW();
});

$("#btn-rot-cw")?.addEventListener("click", () => {
  console.log(`🔄 Rotacionar CW: ${active}`);
  target()?.rotCW();
});

$("#btn-inc")?.addEventListener("click", () => {
  console.log(`➕ Aumentar: ${active}`);
  target()?.inc();
});

$("#btn-dec")?.addEventListener("click", () => {
  console.log(`➖ Diminuir: ${active}`);
  target()?.dec();
});

/* ========= Botão gerar ========= */
$("#btn-gerar")?.addEventListener("click", (e)=>{ e.preventDefault(); gerarPrevia(); });

/* ========= Event listeners ========= */
$("#texto")?.addEventListener("input", (e) => {
  state.textoVal = e.target.value.trim();
  state.hasText = state.textoVal !== "";
  
  const $textoDiv = document.querySelector("#texto-preview");
  if ($textoDiv) {
    $textoDiv.textContent = state.textoVal;
  }
  
  const $boxTexto = document.querySelector("#box-texto");
  if ($boxTexto) {
    $boxTexto.style.display = state.textoVal ? "block" : "none";
  }
  
  if (state.textoVal && $block.style.display !== "none") {
    positionBoxes();
  }
  
  refreshDebounced();
});

$("#fonte")?.addEventListener("change", (e) => {
  state.fonte = e.target.value;
  
  const $textoDiv = document.querySelector("#texto-preview");
  if ($textoDiv) {
    $textoDiv.style.fontFamily = state.fonte;
  }
  
  refresh();
});

window.addEventListener("resize", () => {
  positionBoxes();
});

/* ========= Boot ========= */
document.addEventListener("DOMContentLoaded", ()=>{ loadShortLink(); });
