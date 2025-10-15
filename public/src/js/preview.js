// public/src/js/preview.js
// ES Modules — usado pelo main.js

export function centerDefaults(img, natural) {
  const cx = natural.w / 2;
  const cy = natural.h / 2;
  return {
    logo: { x: Math.max(0, cx - 50),  y: Math.max(0, cy - 200), w: 100 },
    text: { x: Math.max(0, cx - 60),  y: Math.max(0, cy + 100),  w: 60  },
  };
}

/**
 * Monta a URL Cloudinary garantindo que a BASE tenha SEMPRE a mesma largura
 * da imagem visível (state.natural.w). Assim as caixas (logo/texto) ficam
 * alinhadas e mover um não afeta visualmente o outro.
 */
export function buildURL(state) {
  const {
    cloud, baseId, logoId,
    logo, text, fonte,
    textoVal, hasText,
    logoRot = 0, textRot = 0,
    natural = { w: 1000, h: 1000 },
  } = state;

  if (!cloud || !baseId) return "";

  // 1) Trava a largura da BASE para casar com as caixas
  const baseW = Math.max(100, Math.round(natural.w || 1000));
  const baseTransforms = [`w_${baseW}`];

  // 2) Overlay do LOGO — se tiver pasta no public_id, troca "/" por ":"
  const logoLayerId = String(logoId || "").replace(/\//g, ":");
  const logoParts = [
    `l_${logoLayerId}`,
    "e_bgremoval",
    `w_${Math.max(10, Math.round(logo.w))}`,
    `a_${Math.round(logoRot) || 0}`,
    "g_north_west",
    `x_${Math.round(logo.x)}`,
    `y_${Math.round(logo.y)}`,
    "fl_layer_apply",
  ];

  // 3) Monta a URL base
  let url = `https://res.cloudinary.com/${cloud}/image/upload/${baseTransforms.join(",")}/${logoParts.join(",")}`;

  // 4) Overlay do TEXTO (quando houver)
  if (hasText && String(textoVal).trim() !== "") {
    const enc = encodeURIComponent(textoVal);
    const tParts = [
      `l_text:${fonte}_${Math.max(8, Math.round(text.w))}:${enc}`,
      "co_rgb:000000",
      `a_${Math.round(textRot) || 0}`,
      "g_north_west",
      `x_${Math.round(text.x)}`,
      `y_${Math.round(text.y)}`,
      "fl_layer_apply",
    ];
    url += `/${tParts.join(",")}`;
  }

  // 5) Public ID da base (pode ter pasta; sem extensão)
  return `${url}/${baseId}`;
}
