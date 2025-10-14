// public/js/preview.js

// Posições iniciais “no centro” caso não haja defaults no BD
export function centerDefaults(img, natural) {
  const cx = natural.w / 2;
  const cy = natural.h / 2;
  return {
    logo: { x: cx - 50, y: cy - 200, w: 100 },
    text: { x: cx - 60, y: cy + 100, w: 60 },
  };
}

/**
 * Monta a URL de preview no Cloudinary mantendo SEMPRE o mesmo tamanho da base.
 * - fixa w_<larguraDaBase> logo no início (usa state.natural.w)
 * - troca "/" por ":" no public_id do logo para o overlay (l_pasta:arquivo)
 * - aplica rotação do logo/texto (a_<graus>)
 */
export function buildURL({
  cloud,
  baseId,
  logoId,
  logo,
  text,
  fonte,
  textoVal,
  hasText,
  logoRot = 0,
  textRot = 0,
  natural = { w: 1000, h: 1000 },
}) {
  if (!cloud || !baseId) return "";

  // 1) Transforma da BASE: trava a largura para casar com as caixas
  const baseW = Math.max(100, Math.round(natural.w || 1000));
  const baseTransforms = [`w_${baseW}`];

  // 2) Overlay do LOGO (respeita pasta -> ":" e rotação)
  const logoLayerId = (logoId || "").replace(/\//g, ":");
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

  let url = `https://res.cloudinary.com/${cloud}/image/upload/${baseTransforms.join(",")}/${logoParts.join(",")}`;

  // 3) Overlay do TEXTO (quando houver)
  if (hasText && (textoVal || "").trim() !== "") {
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

  // 4) Public ID da base (com pasta, sem extensão)
  return `${url}/${baseId}`;
}
