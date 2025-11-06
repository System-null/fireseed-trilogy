/*
 * Fireseed i18n AutoPatch (2025-11)
 * Automatically initializes i18n and replaces text content dynamically.
 * Supports zh, en, ja without requiring data-i18n attributes.
 */

let currentLang = 'zh';
let i18nData = {};

async function loadLangData(lang) {
  try {
    const res = await fetch(`./lang/${lang}.json?${Date.now()}`);
    if (!res.ok) throw new Error('Language file not found');
    i18nData = await res.json();
    console.log(`✅ Loaded language: ${lang}`);
  } catch (e) {
    console.warn('⚠️ Failed to load language:', e);
    i18nData = {};
  }
}

function applyTranslations() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
  const nodes = [];
  while (walker.nextNode()) {
    const n = walker.currentNode;
    if (n.nodeValue.trim().length > 0 && !n.parentNode.closest('script,style')) {
      nodes.push(n);
    }
  }
  for (const n of nodes) {
    const txt = n.nodeValue.trim();
    if (i18nData[txt]) {
      n.nodeValue = i18nData[txt];
    }
  }
}

async function setLanguage(lang) {
  currentLang = lang;
  await loadLangData(lang);
  applyTranslations();
  console.log(`🌐 Switched language to ${lang}`);
}

function initI18nAuto() {
  const langSelect = document.querySelector('select, [name=language]');
  if (langSelect) {
    langSelect.addEventListener('change', e => setLanguage(e.target.value));
  }
  setLanguage('zh');
}

document.addEventListener('DOMContentLoaded', () => {
  initI18nAuto();
  console.log('✅ i18n-auto initialized');
});
