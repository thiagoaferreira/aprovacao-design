// js/preview.js
export function centerDefaults(img, natural) {
  const baseCenterX = natural.w / 2;
  const baseCenterY = natural.h / 2;
  return {
    logo: { x: baseCenterX - 50, y: baseCenterY - 200, w: 100 },
    text: { x: baseCenterX - 60, y: baseCenterY + 100, w: 60 }
  };
}

export function buildURL({ cloud, baseId, logoId, logo, text, fonte, textoVal, hasText, logoRot = 0, textRot = 0 }) {
  if (!cloud || !baseId) return '';

// antes de montar logoParts:
const logoLayerId = (logoId || "").replace(/\//g, ":"); // pasta -> ":" para Cloudinary

const logoParts = [
  `l_${logoLayerId}`,
  "e_bgremoval",
  `w_${Math.max(10, Math.round(logo.w))}`,
  `a_${Math.round(logoRot) || 0}`,
  "g_north_west",
  `x_${Math.round(logo.x)}`,
  `y_${Math.round(logo.y)}`,
  "fl_layer_apply"
];


  let url = `https://res.cloudinary.com/${cloud}/image/upload/${logoParts.join(',')}`;

  if (hasText && textoVal.trim() !== '') {
    const enc = encodeURIComponent(textoVal);
    const tParts = [
      `l_text:${fonte}_${Math.max(8, Math.round(text.w))}:${enc}`,
      'co_rgb:000000',
      `a_${Math.round(textRot) || 0}`,
      'g_north_west', `x_${Math.round(text.x)}`, `y_${Math.round(text.y)}`,
      'fl_layer_apply'
    ];
    url += `/${tParts.join(',')}`;
  }

  return `${url}/${baseId}`;
}
