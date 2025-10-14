// js/main.js
import { buildURL, centerDefaults } from "./preview.js";
import { enableDragAndResize } from "./drag.js";

const WEBHOOK_PREVIEW = "https://gama-laser-n8n.gtyipj.easypanel.host/webhook-test/gerar-preview-mockup";
const WEBHOOK_APROVACAO = "https://gama-laser-n8n.gtyipj.easypanel.host/webhook/aprovar-mockup";

const img = document.querySelector("#canvas");

let state = {
  cloud: "dslzqtajk",
  baseId: "",
  logoId: "",
  natural: { w: 1000, h: 1000 },
  logo: { x: 0, y: 400, w: 100 },
  text: { x: 0, y: 520, w: 50 },
  fonte: "Arial",
  textoVal: "",
  hasText: false,
  logoRot: 0,
  textRot: 0
};

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
  if (state.textoVal.trim() !== "")
    setBox("#box-texto", state.text, "#38bdf8");
}

function refresh() {
  const url = buildURL(state);
  if (!url) return;
  img.src = url;
}

// Gera preview chamando o webhook e centraliza boxes
async function gerarPrevia() {
  const file = document.querySelector("#logo").files[0];
  const texto = document.querySelector("#texto").value.trim();
  const fonteSel = document.querySelector("#fonte").value || "Arial";
  if (!file) return alert("Envie o logo primeiro");

  const fd = new FormData();
  fd.append("logo", file);
  fd.append("texto", texto);
  fd.append("fonte", fonteSel);
  fd.append("sku", "3017D");
  fd.append("cor", "Azul");

  const r = await fetch(WEBHOOK_PREVIEW, { method: "POST", body: fd });
  const data = await r.json();
  const preview = Array.isArray(data) ? data[0] : data;

  state.baseId = preview.mockup_public_id;
  state.logoId = preview.logo_public_id;
  state.textoVal = texto;
  state.fonte = fonteSel;
  state.hasText = texto !== "";

  // Quando a imagem carregar: atualiza dimensões naturais e posiciona boxes
  img.onload = () => {
    state.natural = { w: img.naturalWidth, h: img.naturalHeight };
    const c = centerDefaults(img, state.natural);
    state.logo = c.logo;
    state.text = c.text;
    positionBoxes();
    document.querySelector("#preview-block").style.display = "block";
  };

  refresh();
}

// Eventos
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

enableDragAndResize(state, () => { refresh(); positionBoxes(); });
