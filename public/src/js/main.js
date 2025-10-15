// public/src/js/main.js
// Liga o link curto -> dados do pedido -> webhook -> preview.
// Sem dependências externas; tudo defensivo para não quebrar o layout atual.

console.log('[main] boot');

const CFG = window.CONFIG || {};
const QS = (s) => document.querySelector(s);
const QSA = (s) => Array.from(document.querySelectorAll(s));

// ---------- utilidades -----------
const hasText = (el, t) => el && (el.textContent || '').toLowerCase().includes(t.toLowerCase());
const setText = (selectors, value) => {
  for (const s of selectors) {
    const el = QS(s);
    if (el) {
      el.textContent = value;
      return el;
    }
  }
  return null;
};

const findBtnPreview = () =>
  QS('#btnGerarPrevia') ||
  QS('[data-btn="preview"]') ||
  QSA('button, a').find((b) => hasText(b, 'gerar prévia'));

const findFileInput = () => QS('#logo-file') || QS('input[type="file"]');
const findTextInput = () =>
  QS('#texto-gravacao') ||
  QS('#textInput') ||
  QSA('input[type="text"], textarea').find(Boolean);
const findFontSelect = () => QS('#fonte') || QSA('select').find(Boolean);

const overlay = QS('#overlay');
const showOverlay = (on) => overlay && (overlay.hidden = !on);

const getParamP = () => new URL(location.href).searchParams.get('p') || '';

const normColor = (c) =>
  (c || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\w]/g, '');

const supaGET = async (pathWithQuery) => {
  const base = (CFG.SUPABASE_URL || '').replace(/\/+$/, '');
  if (!base || !CFG.SUPABASE_ANON_KEY) throw new Error('Supabase env ausente');
  const url = `${base}${pathWithQuery}`;
  const r = await fetch(url, {
    headers: {
      apikey: CFG.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${CFG.SUPABASE_ANON_KEY}`,
    },
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}`);
  return r.json();
};

// ---------- estado -----------
let __linkRow = null;
let __produtos = [];
let __idx = 0;

// ---------- carregamento do link curto -----------
async function loadShortLink() {
  const p = getParamP();
  if (!p) {
    console.warn('Sem parâmetro ?p= no link.');
    return;
  }
  try {
    const rows = await supaGET(`/rest/v1/links_aprovacao?id=eq.${encodeURIComponent(p)}&select=*`);
    const row = rows?.[0];
    if (!row) {
      alert('Link não encontrado.');
      return;
    }
    __linkRow = row;
    __produtos = Array.isArray(row.produtos) ? row.produtos : [];
    __idx = 0;

    writeHeader();
    prepareMockupBase();
  } catch (e) {
    console.error('Falha ao carregar link curto:', e);
  }
}

function writeHeader() {
  const prod = __produtos[__idx] || {};
  const pedido = __linkRow?.order_number ?? __linkRow?.order_id ?? '—';
  const nome = prod.nome || '—';
  const sku = prod.sku || '—';

  setText(['#pedido-number', '#pedido', '[data-pedido]'], String(pedido));
  setText(['#produto-nome', '#produto', '[data-produto]'], nome);
  setText(['#sku', '#sku-code', '.sku-value', '[data-sku]'], sku);

  // "(1/2)" perto do título "Aprovação de Design"
  const total = Math.max(1, __produtos.length || 1);
  const label = `(${__idx + 1}/${total})`;
  setText(
    ['#aprovacao-count', '[data-approv-idx]', '.aprov-count'],
    label
  );
}

function prepareMockupBase() {
  const prod = __produtos[__idx] || {};
  const sku = (prod.sku || '').toLowerCase();
  const cor = normColor(prod.variante || prod.cor || prod.color);
  if (!sku || !cor) return;

  // Convenção: pasta "Mockup/" no Cloudinary
  const basePublicId = `Mockup/${sku}_${cor}`;
  window.MOCKUP_PUBLIC_ID = basePublicId;
  window.__mockupPublicId = basePublicId;

  // Se houver um container com data-mockup-id no HTML, atualiza:
  const container = document.querySelector('[data-mockup-id]');
  if (container) container.setAttribute('data-mockup-id', basePublicId);

  // Garante que o preview seja inicializado (script preview.js)
  window.__initPreview?.();
  // E já desenha uma primeira imagem base
  window.__previewAPI?.updatePreview?.();
}

// ---------- botão "Gerar prévia" -----------
function buildFormData() {
  const fd = new FormData();
  const prod = __produtos[__idx] || {};
  const file = findFileInput()?.files?.[0] || null;

  if (file) fd.append('file', file);
  fd.append('sku', prod.sku || '');
  fd.append('cor', prod.variante || prod.cor || '');
  fd.append('order_id', __linkRow?.order_id ?? '');
  fd.append('order_number', __linkRow?.order_number ?? '');
  fd.append('p', getParamP() || '');
  fd.append('texto', (findTextInput()?.value || '').trim());
  fd.append('fonte', findFontSelect()?.value || 'Arial');

  return fd;
}

async function onGerarPrevia(ev) {
  ev?.preventDefault?.();
  const btn = findBtnPreview();
  try {
    if (btn) btn.disabled = true;
    showOverlay(true);

    const fd = buildFormData();
    const r = await fetch(CFG.WEBHOOK_PREVIEW, { method: 'POST', body: fd });
    const data = await r.json().catch(() => ({}));

    // Se o webhook devolver os public_ids, aplica para o preview local
    const logoId = data.logo_public_id || data.logoPublicId || data.logo || null;
    const mockupId = data.mockup_public_id || data.mockupPublicId || data.public_id || null;

    if (logoId) {
      // preview.js busca um desses nomes:
      window.__lastLogoPublicId = logoId;
      window.__uploadedLogoId = logoId;
    }
    if (mockupId) {
      window.MOCKUP_PUBLIC_ID = mockupId;
      window.__mockupPublicId = mockupId;
      const el = document.querySelector('[data-mockup-id]');
      if (el) el.setAttribute('data-mockup-id', mockupId);
    }

    // Garante inicialização e força redesenho
    window.__initPreview?.();
    window.__previewAPI?.updatePreview?.();
  } catch (e) {
    console.error('Falha ao gerar prévia:', e);
    alert('Falha ao gerar prévia. Tente novamente.');
  } finally {
    showOverlay(false);
    if (btn) btn.disabled = false;
  }
}

function bindUI() {
  // Botão
  const btn = findBtnPreview();
  if (btn && !btn.__bound) {
    btn.addEventListener('click', onGerarPrevia);
    btn.__bound = true;
  }
}

// ---------- bootstrap ----------
document.addEventListener('DOMContentLoaded', () => {
  console.log('[main] DOM ready', CFG);
  loadShortLink();   // puxa dados do pedido/itens
  bindUI();          // liga o botão
  // garante que o preview esteja pronto se o HTML já estiver montado
  setTimeout(() => window.__initPreview?.(), 0);
});
