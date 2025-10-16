// public/src/js/preview.js
// ES Modules – usado pelo main.js

export function centerDefaults(img, natural) {
  const cx = natural.w / 2;
  const cy = natural.h / 2;
  return {
    logo: { x: Math.max(0, cx - 50),  y: Math.max(0, cy - 200), w: 100 },
    text: { x: Math.max(0, cx - 60),  y: Math.max(0, cy + 100),  w: 60  },
  };
}

export function buildURL(state) {
  console.log("🔨 buildURL() chamado");
  
  const {
    cloud, baseId,
    natural = { w: 1000, h: 1000 },
  } = state;

  console.log("  🆔 baseId:", baseId);
  console.log("  📐 natural:", natural);

  if (!cloud || !baseId) return "";

  // Apenas retorna a imagem base sem overlays (overlays ficam só nas caixas)
  const baseW = Math.max(100, Math.round(natural.w || 1000));
  console.log("  ⚙️ baseW calculado:", baseW);
  
  const finalUrl = `https://res.cloudinary.com/${cloud}/image/upload/w_${baseW}/${baseId}`;
  
  console.log("🔗 URL final:", finalUrl);
  
  return finalUrl;
}
// Gera URL FINAL com todos os overlays aplicados (para aprovação/produção)

export function buildFinalURL(state) {
  const {
    cloud, baseId, logoId,
    logo, text, fonte,
    textoVal, hasText,
    logoRot = 0, textRot = 0,
    natural = { w: 1000, h: 1000 },
  } = state;

  if (!cloud || !baseId) return "";

  const baseW = Math.max(100, Math.round(natural.w || 1000));
  const chunks = [`w_${baseW}`];

  // LOGO
  if (logoId) {
    const logoLayerId = String(logoId).replace(/\//g, ":");
    const logoW = Math.max(10, Math.round(logo.w));
    const logoX = Math.round(logo.x);
    const logoY = Math.round(logo.y);
    const logoA = Math.round(logoRot) || 0;

    chunks.push(
      [
        `l_${logoLayerId}`,
        "e_bgremoval",
        `w_${logoW}`,
        `a_${logoA}`,
        "g_north_west",
        `x_${logoX}`,
        `y_${logoY}`,
        "fl_layer_apply",
      ].join(",")
    );
  }

  // TEXTO
  if (hasText && String(textoVal).trim() !== "") {
    const enc = encodeURIComponent(textoVal);
    const textW = Math.max(8, Math.round(text.w));
    const textX = Math.round(text.x);
    const textY = Math.round(text.y);
    const textA = Math.round(textRot) || 0;

    chunks.push(
      [
        `l_text:${fonte}_${textW}:${enc}`,
        "co_rgb:000000",
        `a_${textA}`,
        "g_north_west",
        `x_${textX}`,
        `y_${textY}`,
        "fl_layer_apply",
      ].join(",")
    );
  }

  return `https://res.cloudinary.com/${cloud}/image/upload/${chunks.join("/")}/${baseId}`;
}
