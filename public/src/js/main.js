// /public/js/main.js
(() => {
  'use strict';

  const CFG = window.CONFIG || {};
  const qs  = (s) => document.querySelector(s);
  const qsa = (s) => Array.from(document.querySelectorAll(s));

  const state = { p: null, link: null, productIndex: 0 };

  // ---------- utilidades ----------
  const normalizeColor = (v) =>
    (v || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^\w]/g, '');

  const lowerSku = (s) => (s || '').toLowerCase();

  const find = (...sels) => {
    for (const s of sels) {
      const el = document.querySelector(s);
      if (el) return el;
    }
    return null;
  };

  const showOverlay = (on, msg = 'Gerando prévia…') => {
    const o = qs('#overlay');        // já existe no seu index.html
    if (!o) return;
    o.hidden = !on;
    const p = o.querySelector('p');
    if (p) p.textContent = msg;
  };

  // ---------- Supabase ----------
  async function fetchLinkById(shortId) {
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = CFG;
    if (!window.supabase || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.warn('Supabase não configurado.');
      return null;
    }
    const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await sb
      .from('links_aprovacao')
      .select('*')
      .eq('id', shortId)
      .single();
    if (error) { console.error(error); return null; }
    return data;
  }

  // ---------- Webhook ----------
  async function uploadLogoViaWebhook({ file, sku, orderId, orderNumber }) {
    if (!CFG.WEBHOOK_PREVIEW) return null;
    const fd = new FormData();
    if (file) fd.append('file', file);
    fd.append('sku', sku || '');
    fd.append('order_id', String(orderId || ''));
    fd.append('order_number', String(orderNumber || ''));
    fd.append('p', state.p || '');

    const res = await fetch(CFG.WEBHOOK_PREVIEW, { method: 'POST', body: fd });
    if (!res.ok) throw new Error('Falha no upload do logo.');

    // Aceita JSON ou texto
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const j = await res.json();
      return j.logo_id || j.logo_public_id || j.public_id || null;
    } else {
      const t = await res.text();
      const m = t.match(/(logo[_-]?id|public_id)["']?\s*[:=]\s*["']?([\w\/.-]+)["']?/i);
      return m ? m[2] : null;
    }
  }

  async function notifyPreviewOpen(payload) {
    if (!CFG.WEBHOOK_PREVIEW) return;
    // não bloqueia a UI se falhar
    try {
      await fetch(CFG.WEBHOOK_PREVIEW, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ action: 'preview-open', ...payload })
      });
    } catch (e) {
      console.warn('WEBHOOK_PREVIEW (log) falhou:', e);
    }
  }

  // ---------- Abrir/Inicializar a prévia ----------
  function openPreviewModal() {
    // se houver um modal, exiba-o (ids/datasets comuns)
    const modal = find('#preview-modal', '[data-modal="preview"]', '.modal-preview');
    if (modal) {
      modal.removeAttribute('hidden');
      modal.classList.add('open');
    }
    // inicializa o módulo do preview (está no preview.js)
    if (typeof window.__initPreview === 'function') window.__initPreview();
    if (window.__previewAPI?.updatePreview) window.__previewAPI.updatePreview();  // :contentReference[oaicite:3]{index=3}
    // seleciona logo inicialmente
    find('#drag-logo', '.ov-logo', '.draggable[data-el="logo"]')?.classList?.add('is-selected');
  }

  // ---------- Clique no botão "Gerar prévia" ----------
  async function onGeneratePreview(e) {
    e?.preventDefault?.();

    try {
      showOverlay(true, 'Gerando prévia…');

      // 1) carrega o link curto (se preciso)
      if (!state.link) {
        state.link = await fetchLinkById(state.p);
        if (!state.link) throw new Error('Link curto não encontrado.');
      }

      // 2) escolhe produto atual
      const produtos = Array.isArray(state.link.produtos) ? state.link.produtos : [];
      const produto  = produtos[state.productIndex] || produtos[0];
      if (!produto) throw new Error('Nenhum produto neste link.');

      const sku = String(produto.sku || '').trim();
      const cor = normalizeColor(produto.variante || produto.cor || '');

      // 3) campos da tela
      const textoEl = find('#texto-gravacao', '#textInput', 'input[name="texto"]', 'input[data-texto]');
      const fonteEl = find('#fonte', '#fontSelect', 'select[name="fonte"]');
      const fileEl  = find('#logoUpload', '#logo-upload', 'input[type="file"]');

      const texto = (textoEl?.value || '').trim().slice(0, 40);
      const fonte = (fonteEl?.value || 'Arial').trim();

      // 4) prepara variáveis globais usadas pelo preview.js
      window.__previewText   = texto;             // texto do overlay
      window.__corTextoHex   = '000000';          // cor do texto (pode trocar depois)
      window.__mockupPublicId = `Mockup/${lowerSku(sku)}_${cor}`; // base do mockup

      // 5) sobe o logo via webhook (se tiver arquivo)
      let logoId = null;
      if (fileEl?.files?.[0]) {
        try {
          logoId = await uploadLogoViaWebhook({
            file: fileEl.files[0],
            sku,
            orderId: state.link.order_id,
            orderNumber: state.link.order_number,
          });
          if (logoId) {
            window.__uploadedLogoId  = logoId;
            window.__lastLogoPublicId = logoId;    // lido pelo preview.js  :contentReference[oaicite:4]{index=4}
          }
        } catch (err) {
          console.warn('Upload do logo falhou, seguindo sem logo:', err);
        }
      }

      // 6) abre o modal de prévia e atualiza a imagem
      openPreviewModal();

      // 7) notifica o webhook (log/registro), sem travar a UI
      notifyPreviewOpen({
        p: state.p,
        order_id: state.link.order_id,
        order_number: state.link.order_number,
        sku, cor, texto, fonte, logo_id: logoId
      });

    } catch (err) {
      console.error(err);
      alert(err.message || 'Falha ao gerar prévia.');
    } finally {
      showOverlay(false);
    }
  }

  function bindButton() {
    const btn = find('#btn-preview', '#btnGerarPreview', '[data-btn="preview"]', 'button.btn-preview');
    if (!btn) {
      console.warn('Botão "Gerar prévia" não encontrado.');
      return;
    }
    btn.addEventListener('click', onGeneratePreview);
  }

  // ---------- bootstrap ----------
  document.addEventListener('DOMContentLoaded', () => {
    state.p = new URLSearchParams(location.search).get('p') || '';
    bindButton();
  });
})();
