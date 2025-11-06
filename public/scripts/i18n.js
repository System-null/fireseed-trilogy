// i18n.js v3 — robust mapping for zh-CN/en-US/ja-JP -> zh/en/ja
const LANG_PATH = './lang/';
function normalizeLang(l){
  if(!l) return 'zh';
  l = String(l).toLowerCase();
  if (l.startsWith('zh')) return 'zh';
  if (l.startsWith('en')) return 'en';
  if (l.startsWith('ja')) return 'ja';
  return l.slice(0,2);
}
function selectValueFor(lang){
  const map = { zh: 'zh-CN', en: 'en-US', ja: 'ja-JP' };
  return map[lang] || 'zh-CN';
}
async function loadDict(lang){
  const url = `${LANG_PATH}${lang}.json`;
  const res = await fetch(url, {cache: 'no-store'});
  if(!res.ok) throw new Error('Cannot load '+url);
  return res.json();
}
function applyDict(dict){
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const key = el.getAttribute('data-i18n');
    if (dict[key]) el.innerText = dict[key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>{
    const key = el.getAttribute('data-i18n-placeholder');
    if (dict[key]) el.setAttribute('placeholder', dict[key]);
  });
  const cnMap = dict.__cn_map || {};
  if (Object.keys(cnMap).length){
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(n=>{
      const t = n.nodeValue.trim();
      if (!t) return;
      if (cnMap[t]) n.nodeValue = n.nodeValue.replace(t, cnMap[t]);
    });
    document.querySelectorAll('[placeholder]').forEach(el=>{
      const p = el.getAttribute('placeholder');
      if (cnMap[p]) el.setAttribute('placeholder', cnMap[p]);
    });
    document.querySelectorAll('[title]').forEach(el=>{
      const p = el.getAttribute('title');
      if (cnMap[p]) el.setAttribute('title', cnMap[p]);
    });
  }
}
async function setLanguage(lang){
  const norm = normalizeLang(lang);
  try{
    const dict = await loadDict(norm);
    applyDict(dict);
    localStorage.setItem('fireseed_lang', norm);
    const sel = document.querySelector('#locale, #language');
    if (sel) sel.value = selectValueFor(norm);
  }catch(e){ console.warn('i18n load error:', e); }
}
function initI18n(){
  const sel = document.querySelector('#locale, #language');
  const saved = normalizeLang(localStorage.getItem('fireseed_lang') || navigator.language || 'zh');
  if (sel){
    sel.addEventListener('change', e => setLanguage(e.target.value));
    sel.value = selectValueFor(saved);
  }
  setLanguage(saved);
}
document.addEventListener('DOMContentLoaded', initI18n);
