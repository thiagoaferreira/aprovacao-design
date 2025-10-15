// public/src/js/drag.js
// Controla arrastar/redimensionar das caixas de LOGO e TEXTO dentro da área do preview.

export function enableDragAndResize(state, onChange) {
  const img   = document.querySelector("#canvas");
  const $logo = document.querySelector("#box-logo");
  const $text = document.querySelector("#box-texto");

  let active = null;        // "logo" | "text"
  let resizing = false;
  let start = null;

  // Descobre qual caixa foi clicada
  function which(el) {
    if (!el) return null;
    if (el.id === "box-logo"  || el.closest("#box-logo"))  return "logo";
    if (el.id === "box-texto" || el.closest("#box-texto")) return "text"; // <- nome certo
    return null;
  }

  // Converte delta de ponteiro (px na tela) para px da imagem
  function toImage(dx, dy) {
    const r  = img.getBoundingClientRect();
    const sx = state.natural.w / r.width;
    const sy = state.natural.h / r.height;
    return { dx: dx * sx, dy: dy * sy };
  }

  // Mantém caixa dentro da imagem + limites mínimos
  function clamp(o) {
    o.w = Math.max(20, Math.min(state.natural.w, o.w));
    o.x = Math.max(0, Math.min(state.natural.w - 40, o.x));
    o.y = Math.max(0, Math.min(state.natural.h - 40, o.y));
  }

  function down(e) {
    const w = which(e.target);
    if (!w) return;
    e.preventDefault();
    active   = w;
    resizing = e.target.classList.contains("handle");
    start = {
      x: e.clientX, y: e.clientY,
      w: state[w].w, X: state[w].x, Y: state[w].y
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
  }

  function move(e) {
    if (!active) return;
    const { dx, dy } = toImage(e.clientX - start.x, e.clientY - start.y);
    const o = state[active];

    if (resizing) {
      o.w = start.w + dx;              // usa delta em coordenada da IMAGEM
    } else {
      o.x = start.X + dx;
      o.y = start.Y + dy;
    }
    clamp(o);
    onChange?.();                       // redesenha boxes + URL da prévia
  }

  function up() {
    active = null; resizing = false;
    document.removeEventListener("pointermove", move);
    document.removeEventListener("pointerup", up);
  }

  [$logo, $text].forEach(el => el?.addEventListener("pointerdown", down));
}
