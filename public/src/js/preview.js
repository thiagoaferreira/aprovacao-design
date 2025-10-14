// public/js/preview.js
// Lazy-init: só inicializa quando o DOM do preview (board) existe.
// Corrige: posicionamento relativo ao board, drag com limites, seleção LOGO/TEXTO,
// e monta a URL Cloudinary usando coordenadas do board.

(() => {
  // API "stub" para não quebrar nada antes da inicialização
  if (!window.__previewAPI) {
    window.__previewAPI = { updatePreview: () => {}, select: () => {}, ready: false };
  }

  const SELECTED_CLASS = 'is-selected';
  let inited = false;
  let cleanupObserver = null;

  // Utilidades
  const $first = (arr) => arr.find(Boolean) || null;
  const Q = (sels) => $first(sels.map((s) => document.querySelector(s)));
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const num = (v, fb) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fb;
  };

  function resolveEls() {
    const board = Q(['#editorBoard', '.editor-board', '#previewBoard', '#preview-area']);
    const mockupImg =
      Q(['#mockupImg', '#mockup-image', '#preview-area img.mockup', '#preview-area img']) || null;
    const ovLogo = Q(['#drag-logo', '.ov-logo', '.draggable[data-el="logo"]', '.draggable.logo']);
    const ovText = Q(['#drag-text', '.ov-text', '.draggable[data-el="text"]', '.draggable.text']);

    return { board, mockupImg, ovLogo, ovText };
  }

  function ensureRelativeBoard(board) {
    if (!board) return;
    const style = board.style;
    if (!style.position || style.position === 'static') style.position = 'relative';
    if (!style.overflow) style.overflow = 'hidden';
  }

  function makeDraggable(board, el, onMove) {
    if (!el) return;

    let startX = 0, startY = 0, startLeft = 0, startTop = 0, dragging = false;

    el.style.position = 'absolute';
    el.style.touchAction = 'none';

    // posição inicial se vazia
    if (!el.style.left) {
      const l = (board.clientWidth - el.offsetWidth) / 2;
      const t = (board.clientHeight - el.offsetHeight) / 2;
      el.style.left = `${Math.max(0, l)}px`;
      el.style.top = `${Math.max(0, t)}px`;
    }

    el.addEventListener('pointerdown', (e) => {
      dragging = true;
      el.setPointerCapture?.(e.pointerId);
      const rEl = el.getBoundingClientRect();
      const rBd = board.getBoundingClientRect();
      startLeft = rEl.left - rBd.left;
      startTop  = rEl.top  - rBd.top;
      startX = e.clientX;
      startY = e.clientY;
      e.preventDefault();
    });

    el.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const newLeft = clamp(startLeft + dx, 0, board.clientWidth  - el.offsetWidth);
      const newTop  = clamp(startTop  + dy, 0, board.clientHeight - el.offsetHeight);
      el.style.left = `${newLeft}px`;
      el.style.top  = `${newTop}px`;
      onMove?.();
    });

    const finish = (e) => {
      if (!dragging) return;
      dragging = false;
      el.releasePointerCapture?.(e.pointerId);
      onMove?.();
    };
    el.addEventListener('pointerup', finish);
    el.addEventListener('pointercancel', finish);
  }

  function init() {
    if (inited) return true;

    const { board, mockupImg, ovLogo, ovText } = resolveEls();
    if (!board || !mockupImg || !ovLogo || !ovText) return false; // ainda não está no DOM

    inited = true;

    // Garante hierarquia correta
    ensureRelativeBoard(board);
    for (const el of [ovLogo, ovText]) {
      if (el && el.parentElement !== board) board.appendChild(el);
    }

    // Seleção atual (para os botões agirem no item certo)
    let selected = ovLogo;
    const select = (el) => {
      if (!el) return;
      selected?.classList?.remove(SELECTED_CLASS);
      selected = el;
      el.classList?.add(SELECTED_CLASS);
    };
    select(selected);
    ovLogo.addEventListener('pointerdown', () => select(ovLogo));
    ovText.addEventListener('pointerdown', () => select(ovText));

    // Drag com limites
    let updateTimer;
    const schedulePreview = () => {
      clearTimeout(updateTimer);
      updateTimer = setTimeout(updatePreview, 100);
    };
    makeDraggable(board, ovLogo, schedulePreview);
    makeDraggable(board, ovText, schedulePreview);

    // Botões rápidos (↺ ↻ − +)
    const btnRotL  = document.querySelector('[data-act="rotL"]');
    const btnRotR  = document.querySelector('[data-act="rotR"]');
    const btnMinus = document.querySelector('[data-act="minus"]');
    const btnPlus  = document.querySelector('[data-act="plus"]');

    function applyAction(act) {
      if (!selected) return;
      const isLogo = selected === ovLogo;
      const baseSize = isLogo ? 100 : 60;
      let size = num(selected.dataset.size, baseSize);
      let rot  = num(selected.dataset.rot, 0);

      if (act === 'rotL')  rot = (rot - 90 + 360) % 360;
      if (act === 'rotR')  rot = (rot + 90) % 360;
      if (act === 'minus') size = Math.max(10, size - 8);
      if (act === 'plus')  size = Math.min(600, size + 8);

      selected.dataset.size = String(size);
      selected.dataset.rot  = String(rot);
      schedulePreview();
    }

    btnRotL?.addEventListener('click',  () => applyAction('rotL'));
    btnRotR?.addEventListener('click',  () => applyAction('rotR'));
    btnMinus?.addEventListener('click', () => applyAction('minus'));
    btnPlus?.addEventListener('click',  () => applyAction('plus'));

    // Monta URL do Cloudinary a partir do board
    function updatePreview() {
      try {
        const cloud = window.CONFIG?.CLOUDINARY_CLOUD;
        const basePublicId =
          window.MOCKUP_PUBLIC_ID ||
          window.__mockupPublicId ||
          document.querySelector('[data-mockup-id]')?.getAttribute('data-mockup-id');

        if (!cloud || !basePublicId) return;

        const W = 1000;
        const k = W / board.clientWidth;
        const parts = [`w_${W}`];

        // LOGO
        if (ovLogo) {
          const x = Math.round(parseFloat(ovLogo.style.left || '0') * k);
          const y = Math.round(parseFloat(ovLogo.style.top  || '0') * k);
          const w = Math.round(num(ovLogo.dataset.size, 100) * k);
          const a = num(ovLogo.dataset.rot, 0);

          const logoId =
            window.__lastLogoPublicId ||
            window.lastUploadId ||
            window.lastTempLogoId ||
            window.__uploadedLogoId;

          if (logoId) {
            parts.push(
              `l_Logo:logo_${logoId},e_bgremoval,w_${w},a_${a},g_north_west,x_${x},y_${y},fl_layer_apply`
            );
          }
        }

        // TEXTO
        if (ovText) {
          const x = Math.round(parseFloat(ovText.style.left || '0') * k);
          const y = Math.round(parseFloat(ovText.style.top  || '0') * k);
          const fs = Math.round(num(ovText.dataset.size, 60) * k);
          const a  = num(ovText.dataset.rot, 0);

          const txt =
            window.__previewText ||
            document.querySelector('#texto-gravacao, #textInput, [data-texto]')?.value ||
            '';

          if (txt) {
            const enc = encodeURIComponent(txt.slice(0, 40));
            const hex = (window.__corTextoHex || '000000').replace('#', '');
            parts.push(
              `l_text:Arial_${fs}:${enc},co_rgb:${hex},a_${a},g_north_west,x_${x},y_${y},fl_layer_apply`
            );
          }
        }

        const url = `https://res.cloudinary.com/${cloud}/image/upload/${parts.join('/')}/${basePublicId}`;
        const img = mockupImg;
        if (img && img.src !== url) img.src = url;
      } catch (e) {
        console.warn('Preview update skipped:', e);
      }
    }

    // Expõe API real
    window.__previewAPI.updatePreview = updatePreview;
    window.__previewAPI.select = (which) => (which === 'text' ? ovText : ovLogo) && which === 'text'
      ? ovText && ovText.classList.add(SELECTED_CLASS)
      : ovLogo && ovLogo.classList.add(SELECTED_CLASS);
    window.__previewAPI.ready = true;

    // Primeira atualização
    updatePreview();

    return true;
  }

  // Tenta inicializar agora (caso o preview já esteja no DOM)
  init();

  // Observa DOM para inicializar assim que a caixa do preview entrar no DOM
  if (!inited) {
    const obs = new MutationObserver(() => {
      if (init()) {
        obs.disconnect();
        cleanupObserver = null;
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    cleanupObserver = () => obs.disconnect();
  }

  // Opcional: permitir inicialização manual após montar o modal
  window.__initPreview = () => init();

  // Cleanup se sair da página SPA (defensivo)
  window.addEventListener('beforeunload', () => {
    if (cleanupObserver) cleanupObserver();
  });
})();
