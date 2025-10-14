// public/js/preview.js
// Exporta as funções usadas pelo main.js (ES Modules)

export function centerDefaults(img, natural) {
  const cx = natural.w / 2;
  const cy = natural.h / 2;
  return {
    // pontos de partida “no centro” para logo e texto
    logo: { x: cx - 50, y: cy - 200, w: 100 },
    text: { x: cx - 60, y: cy + 100, w: 60 }
  };
}

export function buildURL(state) {
  const {
    cloud, baseId, logoId,
    logo, text,
    fonte, textoVal, hasText,
    logoRot = 0, textRot = 0
  } = state;

  // requisitos mínimos
  if (!cloud || !baseId || !logoId) return '';

  // Cloudinary: pasta usa ":" no overlay (l_<folder:public_id>)
  const logoLayerId = String(logoId).replace(/\//g, ':');

  const logoParts = [
    `l_${logoLayerId}`,
    'e_bgremoval',
    `w_${Math.max(10, Math.round(logo.w))}`,
    `a_${Math.round(logoRot) || 0}`,
    'g_north_west',
    `x_${Math.round(logo.x)}`,
    `y_${Math.round(logo.y)}`,
    'fl_layer_apply'
  ];

  let url = `https://res.cloudinary.com/${cloud}/image/upload/${logoParts.join(',')}`;

  if (hasText && String(textoVal).trim() !== '') {
    const enc = encodeURIComponent(textoVal);
    const textParts = [
      `l_text:${fonte}_${Math.max(8, Math.round(text.w))}:${enc}`,
      `a_${Math.round(textRot) || 0}`,
      'co_rgb:000000',
      'g_north_west',
      `x_${Math.round(text.x)}`,
      `y_${Math.round(text.y)}`,
      'fl_layer_apply'
    ];
    url += `/${textParts.join(',')}`;
  }

  return `${url}/${baseId}`;
}
