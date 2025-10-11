import { buildURL } from "./preview.js";

export function enableDragAndResize(state, refresh) {
  const img = document.querySelector("#canvas");
  const $logo = document.querySelector("#box-logo");
  const $texto = document.querySelector("#box-texto");

  let active = null, resizing = false, start = {};

  function box(el) {
    if (el.id === "box-logo") return "logo";
    if (el.id === "box-texto") return "texto";
    return el.closest(".layer-box")?.id === "box-logo" ? "logo" : "texto";
  }

  function toImage(dx, dy) {
    const rect = img.getBoundingClientRect();
    const sx = state.natural.w / rect.width;
    const sy = state.natural.h / rect.height;
    return { dx: dx * sx, dy: dy * sy };
  }

  function down(e) {
    const which = box(e.target);
    if (!which) return;
    e.preventDefault();
    active = which;
    resizing = e.target.classList.contains("handle");
    start = {
      x: e.clientX, y: e.clientY,
      w: which === "logo" ? state.logo.w : state.text.w,
      X: which === "logo" ? state.logo.x : state.text.x,
      Y: which === "logo" ? state.logo.y : state.text.y
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
  }

  function move(e) {
    if (!active) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const { dx: ix, dy: iy } = toImage(dx, dy);

    const obj = state[active];
    if (resizing) {
      obj.w = Math.max(20, start.w + dx);
    } else {
      obj.x = Math.max(0, Math.min(state.natural.w - 40, start.X + ix));
      obj.y = Math.max(0, Math.min(state.natural.h - 40, start.Y + iy));
    }
    refresh();
  }

  function up() {
    active = null;
    document.removeEventListener("pointermove", move);
    document.removeEventListener("pointerup", up);
  }

  [$logo, $texto].forEach(el => el.addEventListener("pointerdown", down));
}

