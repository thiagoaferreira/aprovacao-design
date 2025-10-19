// public/src/js/text-control.js
export function createTextControl({ img, box, state, onChange, onSelect }) {
  const el = typeof box === "string" ? document.querySelector(box) : box;
  if (!el) throw new Error("[text] #box-texto não encontrado");

  function select() { onSelect?.("text"); }

  function toImage(dx, dy) {
    const r = img.getBoundingClientRect();
    const sx = state.natural.w / r.width;
    const sy = state.natural.h / r.height;
    return { ix: dx * sx, iy: dy * sy };
  }

  let dragging = false, resizing = false, start = {};
  
  function down(e) {
  // ✅ Verificar se clicou na badge OU no corpo da caixa (mas não nas alças)
  const isHandle = e.target.classList?.contains("handle");
  const isBadge = e.target.classList?.contains("badge") || e.target.closest(".badge");
  const isBox = e.target === el || e.target.closest(".layer-box") === el;
  
  // ✅ Permitir arrastar se: clicou na badge OU (clicou na caixa E não é alça)
  const canDrag = isBadge || (isBox && !isHandle);
  
  if (!canDrag && !isHandle) return; // Ignorar cliques fora
  
  console.log("🖱️ TEXT: down event", {
    target: e.target,
    isBadge: isBadge,
    isHandle: isHandle,
    canDrag: canDrag
  });
  
  select();
  dragging = true;
  
  el.classList.add("dragging");
  
  resizing = isHandle;
  start = { x: e.clientX, y: e.clientY, X: state.text.x, Y: state.text.y, W: state.text.w };
  el.setPointerCapture?.(e.pointerId);
  
  document.addEventListener("pointermove", move);
  document.addEventListener("pointerup", up);
}
  
  function move(e) {
    if (!dragging) return;

    e.preventDefault();
    
    const { ix, iy } = toImage(e.clientX - start.x, e.clientY - start.y);
    if (resizing) {
      state.text.w = Math.max(20, Math.min(state.natural.w, start.W + ix));
    } else {
      state.text.x = Math.max(0, Math.min(state.natural.w - 40, start.X + ix));
      state.text.y = Math.max(0, Math.min(state.natural.h - 40, start.Y + iy));
    }
    onChange?.("text");
  }
  
  function up(e) {
    dragging = false;

      // ✅ Avisar que começou a editar
  if (window.__setEditing) window.__setEditing(true);
    
    // ✅ CORRIGIDO: usar `el` em vez de `box` e DENTRO da função up
    el.classList.remove("dragging");
    
    el.releasePointerCapture?.(e.pointerId);
    document.removeEventListener("pointermove", move);
    document.removeEventListener("pointerup", up);
  }
  
  el.addEventListener("pointerdown", down);

  function inc() { state.text.w = Math.min(state.natural.w, state.text.w + Math.round(state.natural.w*0.04)); onChange?.("text"); }
  function dec() { state.text.w = Math.max(20, state.text.w - Math.round(state.natural.w*0.04));             onChange?.("text"); }
  function rotCW()  { state.textRot = ((state.textRot||0)+90)%360;  onChange?.("text"); }
  function rotCCW() { state.textRot = ((state.textRot||0)+270)%360; onChange?.("text"); }

  return {
    select,
    setActiveClass(is){ el.classList.toggle("active", !!is); },
    inc, dec, rotCW, rotCCW
  };
}
