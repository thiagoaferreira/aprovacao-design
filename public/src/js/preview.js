// public/js/preview.js
// Corrige: (1) posicionamento relativo ao board, (2) drag com limites,
// (3) troca de seleção entre LOGO e TEXTO, (4) cálculo correto para Cloudinary.

(() => {
  // Pequena ajudante para achar elementos com fallback (não quebra seu HTML atual)
  const $ = (sels) => {
    for (const s of sels) {
      const el = document.querySelector(s);
      if (el) return el;
    }
    return null;
  };

  // Seletores tolerantes a variações do seu HTML
  const board = $([
    '#editorBoard', '.editor-board', '#previewBoard', '#preview-area .board', '#preview-area'
  ]);
  const mockupImg = $([
    '#mockupImg', '#mockup-image', '#preview-area img.mockup', '#preview-area img'
  ]);
  const ovLogo = $([
    '#drag-logo', '.ov-logo', '.draggable[data-el="logo"]', '.draggable.logo'
  ]);
  const ovText = $([
    '#drag-text', '.ov-text', '.draggable[data-el="text"]', '.draggable.text'
  ]);

  if (!board || !mockupImg) return; // nada a fazer se a prévia ainda não foi montada

  // Garante que os overlays são filhos do board e ficam dentro dele
  board.style.position = board.style.position || 'relative';
  board.style.overflow = board.style.overflow || 'hidden';

  const overlays = [ovLogo, ovText].filter(Boolean);
  overlays.forEach((el) => {
    if (el.parentElement !== board) board.appendChild(el);
    el.style.position = 'absolute';
    el.style.touchAction = 'none';
    // Se nunca recebeu posição, joga para perto do centro
    if (!el.style.left) {
      const left = (board.clientWidth - el.offsetWidth) / 2;
      const top = (board.clientHeight - el.offsetHeight) / 2;
      el.style.left = `${Math.max(0, left)}px`;
      el.style.top  = `${Math.max(0, top)}px`;
    }
  });

  // Estado de seleção (para os botões agirem no item certo)
  let selected = ovLogo || ovText;
  const SELECTED_CLASS = 'is-selected';
  function select(el) {
    if (!el) return;
    selected?.classList?.remove(SELECTED_CLASS);
    selected = el;
    el.classList?.add(SELECTED_CLASS);
  }
  ovLogo?.addEventListener('pointerdown', () => select(ovLogo));
  ovText?.addEventListener('pointerdown', () => select(ovText));

  // Drag com limites do board
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function makeDraggable(el) {
    if (!el) return;

    let startX = 0, startY = 0, startLeft = 0, startTop = 0, dragging = false;

    el.addEventListener('pointerdown', (e) => {
      select(el);
      dragging = true;
      el.setPointerCapture?.(e.pointerId);
      const rectEl = el.getBoundingClientRect();
      const rectBd = board.getBoundingClientRect();
      startLeft = rectEl.left - rectBd.left;
      startTop  = rectEl.top  - rectBd.top;
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

      schedulePreview(); // atualiza a URL da composição (debounced)
    });

    const finish = (e) => {
      if (!dragging) return;
      dragging = false;
      el.releasePointerCapture?.(e.pointerId);
      schedulePreview();
    };
    el.addEventListener('pointerup', finish);
    el.addEventListener('pointercancel', finish);
  }

  makeDraggable(ovLogo);
  makeDraggable(ovText);

  // Botões rápidos (↺ ↻ − +) — agem no "selected"
  const btnRotL  = document.querySelector('[data-act="rotL"]');
  const btnRotR  = document.querySelector('[data-act="rotR"]');
  const btnMinus = document.querySelector('[data-act="minus"]');
  const btnPlus  = document.querySelector('[data-act="plus"]');

  function ensureNumber(val, fallback) {
    const n = Number(val);
    return Number.isFinite(n) ? n : fallback;
    }

  function applyAction(act) {
    if (!selected) return;
    const isLogo = selected === ovLogo;
    const isText = selected === ovText;
    const KEY_SIZE = 'size';
    const KEY_ROT  = 'rot';

    // Tamanho “lógico”: para logo = largura em px; para texto = font-size em px
    const baseSize = isLogo ? 100 : 60;
    let size = ensureNumber(selected.dataset[KEY_SIZE], baseSize);
    let rot  = ensureNumber(selected.dataset[KEY_ROT], 0);

    if (act === 'rotL')  rot = (rot - 90 + 360) % 360;
    if (act === 'rotR')  rot = (rot + 90) % 360;
    if (act === 'minus') size = Math.max(10, size - 8);
    if (act === 'plus')  size = Math.min(600, size + 8);

    selected.dataset[KEY_SIZE] = String(size);
    selected.dataset[KEY_ROT]  = String(rot);

    schedulePreview();
  }

  btnRotL?.addEventListener('click',  () => applyAction('rotL'));
  btnRotR?.addEventListener('click',  () => applyAction('rotR'));
  btnMinus?.addEventListener('click', () => applyAction('minus'));
  btnPlus?.addEventListener('click',  () => applyAction('plus'));

  // Debounce da atualização da imagem Cloudinary
  let t;
  function schedulePreview() {
    clearTimeout(t);
    t = setTimeout(updatePreview, 120);
  }

  // Monta URL de composição do Cloudinary respeitando o board
  function updatePreview() {
    try {
      const W = 1000; // largura “padrão” do canvas na Cloudinary
      const k = W / board.clientWidth; // fator de escala px->Cloudinary

      // Base (mockup) – ex: 'Mockup/3017d_azul'
      const basePublicId =
        window.MOCKUP_PUBLIC_ID ||
        window.__mockupPublicId ||
        document.querySelector('[data-mockup-id]')?.getAttribute('data-mockup-id');

      if (!basePublicId || !window.CONFIG?.CLOUDINARY_CLOUD) return;

      const parts = [`w_${W}`];

      // LOGO
      if (ovLogo) {
        const x = Math.round(parseFloat(ovLogo.style.left || '0') * k);
        const y = Math.round(parseFloat(ovLogo.style.top  || '0') * k);
        const w = Math.round(ensureNumber(ovLogo.dataset.size, 100) * k);
        const a = ensureNumber(ovLogo.dataset.rot, 0);

        // ID da logo enviada (ex.: 3017D_1760...) – você já injeta isso no main.js
        const logoId =
          window.__lastLogoPublicId ||
          window.lastUploadId ||
          window.lastTempLogoId ||
          window.__uploadedLogoId; // vários fallbacks

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
        const fs = Math.round(ensureNumber(ovText.dataset.size, 60) * k);
        const a  = ensureNumber(ovText.dataset.rot, 0);

        const txt =
          window.__previewText ||
          document.querySelector('#texto-gravacao, #textInput, [data-texto]')?.value ||
          '';

        if (txt) {
          const enc = encodeURIComponent(txt.slice(0, 40));
          // cor padrão vem de CONFIG.cor_gravacao se existir
          const hex = (window.__corTextoHex || '000000').replace('#', '');
          parts.push(
            `l_text:Arial_${fs}:${enc},co_rgb:${hex},a_${a},g_north_west,x_${x},y_${y},fl_layer_apply`
          );
        }
      }

      const url = `https://res.cloudinary.com/${window.CONFIG.CLOUDINARY_CLOUD}/image/upload/${parts.join('/')}/${basePublicId}`;

      // Troca o src da imagem de prévia (sem recriar overlays!)
      const img = mockupImg || document.querySelector('#preview-img, #mockupPreview, .js-preview-img');
      if (img && img.src !== url) img.src = url;
    } catch (e) {
      // Evita quebrar a UI em caso de algo inesperado
      console.warn('Preview update skipped:', e);
    }
  }

  // Exponho só para o main.js chamar se precisar
  window.__previewAPI = { updatePreview, select };

  // Gera uma primeira prévia
  updatePreview();
})();
