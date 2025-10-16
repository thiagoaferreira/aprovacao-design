// public/src/js/logo-control.js
export function createLogoControl({ img, box, state, onChange, onSelect }) {
  const boxEl = typeof box === "string" ? document.querySelector(box) : box;
  if (!boxEl) {
    console.error("❌ Box de logo não encontrado:", box);
    return null;
  }

  let dragging = false;
  let resizing = false;
  let startX = 0, startY = 0;
  let startObjX = 0, startObjY = 0, startW = 0;
  let currentHandle = null;

  function select() {
    onSelect?.("logo");
  }

  function down(e) {
    console.log(`🖱️ LOGO: down event`, {
      target: e.target,
      resizing: e.target.classList?.contains("handle")
    });
    
    e.preventDefault();
    e.stopPropagation();
    
    select();
    dragging = true;
    
    // ✅ ADICIONAR classe para bloquear scroll
    boxEl.classList.add("dragging");
    
    resizing = e.target.classList?.contains("handle");
    if (resizing) {
      currentHandle = e.target.className.split(" ").find(c => ["tl","tr","bl","br"].includes(c));
    }

    const touch = e.touches?.[0] || e;
    startX = touch.clientX;
    startY = touch.clientY;
    startObjX = state.logo.x;
    startObjY = state.logo.y;
    startW = state.logo.w;
  }

  function move(e) {
    if (!dragging) return;
    e.preventDefault();

    const touch = e.touches?.[0] || e;
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;

    const imgRect = img.getBoundingClientRect();
    const scaleX = state.natural.w / imgRect.width;
    const scaleY = state.natural.h / imgRect.height;

    if (resizing) {
      const naturalDx = dx * scaleX;
      const naturalDy = dy * scaleY;
      
      if (currentHandle === "br") {
        const delta = Math.max(naturalDx, naturalDy);
        state.logo.w = Math.max(20, startW + delta);
      } else if (currentHandle === "bl") {
        state.logo.w = Math.max(20, startW - naturalDx);
      } else if (currentHandle === "tr") {
        state.logo.w = Math.max(20, startW + naturalDx);
      } else if (currentHandle === "tl") {
        const delta = Math.max(-naturalDx, -naturalDy);
        state.logo.w = Math.max(20, startW + delta);
      }
    } else {
      state.logo.x = startObjX + dx * scaleX;
      state.logo.y = startObjY + dy * scaleY;
    }

    onChange?.("logo");
  }

  function up() {
    dragging = false;
    resizing = false;
    currentHandle = null;
    
    // ✅ REMOVER classe para permitir scroll novamente
    boxEl.classList.remove("dragging");
  }

  // Event listeners
  boxEl.addEventListener("mousedown", down);
  boxEl.addEventListener("touchstart", down, { passive: false });
  
  document.addEventListener("mousemove", move);
  document.addEventListener("touchmove", move, { passive: false });
  
  document.addEventListener("mouseup", up);
  document.addEventListener("touchend", up);

  return {
    rotCCW: () => { 
      state.logoRot = (state.logoRot - 90) % 360; 
      onChange?.("logo"); 
    },
    rotCW: () => { 
      state.logoRot = (state.logoRot + 90) % 360; 
      onChange?.("logo"); 
    },
    inc: () => { 
      state.logo.w = Math.min(500, state.logo.w + 10); 
      onChange?.("logo"); 
    },
    dec: () => { 
      state.logo.w = Math.max(20, state.logo.w - 10); 
      onChange?.("logo"); 
    },
    setActiveClass: (isActive) => {
      if (isActive) {
        boxEl.classList.add("active");
      } else {
        boxEl.classList.remove("active");
      }
    }
  };
}
