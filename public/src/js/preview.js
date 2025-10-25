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

// ✅ URL PARA PREVIEW (SEM overlays - apenas mockup limpo)
export function buildURL(state) {
  const {
    cloud, baseId,
    natural = { w: 1000, h: 1000 },
  } = state;

  if (!cloud || !baseId) return "";

  console.log("🔨 buildURL() chamado - PREVIEW LIMPO");
  console.log("  🆔 baseId:", baseId);

  // ✅ APENAS retorna a imagem base SEM nenhum overlay
  const baseW = Math.max(100, Math.round(natural.w || 1000));
  
  return `https://res.cloudinary.com/${cloud}/image/upload/w_${baseW}/${baseId}`;
}

// ✅ URL FINAL (COM overlays + rotação - para aprovação/produção)
export function buildFinalURL(state) {
  const {
    cloud, baseId, logoId,
    logo, text, fonte,
    textoVal, hasText,
    logoRot = 0, textRot = 0,
    logoInverted = false, // ✅ ADICIONAR
    natural = { w: 1000, h: 1000 },
  } = state;

  if (!cloud || !baseId) return "";

  const baseW = Math.max(100, Math.round(natural.w || 1000));
  const chunks = [`w_${baseW}`];

  // LOGO com rotação E filtros de cor
  if (logoId) {
    const logoLayerId = String(logoId).replace(/\//g, ":");
    const logoW = Math.max(10, Math.round(logo.w));
    const logoX = Math.round(logo.x);
    const logoY = Math.round(logo.y);
    const logoA = Math.round(logoRot) || 0;

    const logoTransforms = [
      `l_${logoLayerId}`,
      "e_bgremoval",              // Remove fundo
      "e_grayscale",              // Converte para escala de cinza
      "e_auto_brightness",        // ✅ Auto ajuste de brilho
      "e_auto_contrast",          // ✅ Auto ajuste de contraste
      "e_improve",                // ✅ Melhora qualidade geral
    ];
    
    if (logoInverted) {
      logoTransforms.push("co_rgb:ffffff");
      logoTransforms.push("e_colorize:100");
    } else {
      logoTransforms.push("co_rgb:000000");
      logoTransforms.push("e_colorize:100");
    }

    logoTransforms.push(
      `w_${logoW}`,
      `a_${logoA}`,
      "g_north_west",
      `x_${logoX}`,
      `y_${logoY}`,
      "fl_layer_apply"
    );

    chunks.push(logoTransforms.join(","));
  }

  // TEXTO com rotação
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
