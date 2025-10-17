// public/src/js/logo-control.js
export function createLogoControl({ img, box, state, onChange, onSelect }) {
  const el = typeof box === "string" ? document.querySelector(box) : box;
  if (!el) throw new Error("[logo] #box-logo não encontrado");

  function select() { onSelect?.("logo"); }

  function toImage(dx, dy) {
    const r = img.getBoundingClientRect();
    const sx = state.natural.w / r.width;
    const sy = state.natural.h / r.height;
    return { ix: dx * sx, iy: dy * sy };
  }

  let dragging = false, resizing = false, start = {};
  
  function down(e) {
    console.log("🖱️ LOGO: down event", {
      target: e.target,
      resizing: e.target.classList?.contains("handle")
    });
    select();
    dragging  = true;
    
    // ✅ ADICIONAR classe para bloquear scroll
    el.classList.add("dragging");
    
    resizing  = e.target.classList?.contains("handle");
    start = { x: e.clientX, y: e.clientY, X: state.logo.x, Y: state.logo.y, W: state.logo.w };
    el.setPointerCapture?.(e.pointerId);
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup",   up);
  }
  
  function move(e) {
    if (!dragging) return;

     e.preventDefault();
    
    const { ix, iy } = toImage(e.clientX - start.x, e.clientY - start.y);
    if (resizing) {
      state.logo.w = Math.max(20, Math.min(state.natural.w, start.W + ix));
    } else {
      state.logo.x = Math.max(0, Math.min(state.natural.w - 40, start.X + ix));
      state.logo.y = Math.max(0, Math.min(state.natural.h - 40, start.Y + iy));
    }
    onChange?.("logo");
  }
  
  function up(e) {
    dragging = false;
    
    // ✅ REMOVER classe para permitir scroll
    el.classList.remove("dragging");
    
    el.releasePointerCapture?.(e.pointerId);
    document.removeEventListener("pointermove", move);
    document.removeEventListener("pointerup",   up);
  }
  
  el.addEventListener("pointerdown", down);

  function inc() { state.logo.w = Math.min(state.natural.w, state.logo.w + Math.round(state.natural.w*0.04)); onChange?.("logo"); }
  function dec() { state.logo.w = Math.max(20, state.logo.w - Math.round(state.natural.w*0.04));             onChange?.("logo"); }
  function rotCW()  { state.logoRot = ((state.logoRot||0)+90)%360;  onChange?.("logo"); }
  function rotCCW() { state.logoRot = ((state.logoRot||0)+270)%360; onChange?.("logo"); }

  return {
    select,
    setActiveClass(is){ el.classList.toggle("active", !!is); },
    inc, dec, rotCW, rotCCW
  };
}
