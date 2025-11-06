// i18n.js v2 — non-intrusive i18n for legacy HTML
// Strategies:
// 1) data-i18n attributes -> innerText
// 2) data-i18n-placeholder -> placeholder
// 3) Fallback: replace known Chinese UI strings using translations.__cn_map

const LANG_PATH = './lang/';
const DEFAULT_LANG = (navigator.language || 'zh').slice(0,2);

function getSelector() {
  return document.querySelector('#locale') || document.querySelector('#language');
}

async function loadDict(lang) {
  const url = `${LANG_PATH}${lang}.json`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load ${url}`);
  return res.json();
}

function applyI18n(dict) {
  // Strategy 1: data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) el.innerText = dict[key];
  });

  // Strategy 2: data-i18n-placeholder
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (dict[key]) el.setAttribute('placeholder', dict[key]);
  });

  // Strategy 3: content-based fallback using __cn_map
  const cnMap = dict.__cn_map || {};
  if (Object.keys(cnMap).length) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const t = node.nodeValue.trim();
      if (!t) return;
      const repl = cnMap[t];
      if (repl) node.nodeValue = node.nodeValue.replace(t, repl);
    });

    // placeholders & titles
    document.querySelectorAll('[placeholder]').forEach(el => {
      const p = el.getAttribute('placeholder');
      if (cnMap[p]) el.setAttribute('placeholder', cnMap[p]);
    });
    document.querySelectorAll('[title]').forEach(el => {
      const p = el.getAttribute('title');
      if (cnMap[p]) el.setAttribute('title', cnMap[p]);
    });
  }
}

async function setLanguage(lang) {
  try {
    const dict = await loadDict(lang);
    applyI18n(dict);
    localStorage.setItem('fireseed_lang', lang);
  } catch (e) {
    console.warn('i18n load error:', e);
  }
}

function initI18n() {
  const sel = getSelector();
  const saved = localStorage.getItem('fireseed_lang') || DEFAULT_LANG;
  if (sel) {
    sel.value = saved;
    sel.addEventListener('change', e => setLanguage(e.target.value));
  }
  setLanguage(saved);
}

document.addEventListener('DOMContentLoaded', initI18n);
