// public/js/drag.js
export function enableDragAndResize(state, refresh) {
  const img   = document.querySelector("#canvas");
  const $logo = document.querySelector("#box-logo");
  const $text = document.querySelector("#box-texto");

  let active = null;     // "logo" | "text"
  let resizing = false;
  let start = {};        // { x, y, w, X, Y }

  function whichBox(el) {
    // Mapeia corretamente: TEXTO -> "text"
    return el.id === "box-logo" ? "logo" : "text";
  }

  function toImage(dx, dy) {
    const rect = img.getBoundingClientRect();
    const sx = state.natural.w / rect.width;
    const sy = state.natural.h / rect.height;
    return { ix: dx * sx, iy: dy * sy };
  }

  function down(e) {
    const box = e.target.closest(".layer-box");
    if (!box) return;

    active   = whichBox(box);
    resizing = e.target.classList.contains("handle");
    start = {
      x: e.clientX, y: e.clientY,
      w: state[active].w,
      X: state[active].x,
      Y: state[active].y
    };

    box.setPointerCapture?.(e.pointerId);
    e.preventDefault();
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup",   up);
  }

  function move(e) {
    if (!active) return;

    const { ix, iy } = toImage(e.clientX - start.x, e.clientY - start.y);
    const obj = state[active];

    if (resizing) {
      // usa delta em coordenadas da IMAGEM
      obj.w = Math.max(20, start.w + ix);
    } else {
      obj.x = Math.max(0, Math.min(state.natural.w - 40, start.X + ix));
      obj.y = Math.max(0, Math.min(state.natural.h - 40, start.Y + iy));
    }

    refresh(); // no seu main.js já está “debounced”
  }

  function up() {
    active = null;
    document.removeEventListener("pointermove", move);
    document.removeEventListener("pointerup",   up);
  }

  [$logo, $text].forEach(el => el?.addEventListener("pointerdown", down));
}
