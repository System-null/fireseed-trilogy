/*! fireseed-i18n overlay v3.0 (non-intrusive) */
(function () {
  const W = window;
  const S = W.__i18nState = W.__i18nState || {};
  const I18N = W.I18N = W.I18N || {};
  let DICTS = { zh:null, en:null, ja:null };

  function guessLangFromOptionText(t) {
    const s = (t||'').toLowerCase();
    if (s.includes('en')) return 'en';
    if (s.includes('ja') || s.includes('日')) return 'ja';
    if (s.includes('zh') || s.includes('中')) return 'zh';
    return null;
  }
  function findLangSelect() {
    const sels = document.querySelectorAll('select');
    for (const sel of sels) {
      const joined = Array.from(sel.options).map(o => (o.textContent||'').toLowerCase()).join(',');
      if (/(zh|中)/.test(joined) && /(en|english)/.test(joined) && /(ja|日)/.test(joined)) return sel;
    }
    return null;
  }
  function langPath(code){
    const pageBase = new URL('.', location.href);
    return new URL('./lang/'+code+'.json', pageBase).toString();
  }
  async function loadDict(code){
    if (DICTS[code]) return DICTS[code];
    const url = langPath(code);
    const res = await fetch(url, {cache:'no-cache'});
    if (!res.ok) throw new Error('dict fetch failed: '+url);
    const data = await res.json();
    DICTS[code] = data;
    return data;
  }
  function translateText(dict, orig){
    if (!orig) return orig;
    if (dict[orig] != null) return dict[orig];
    const norm = orig.replace(/\s+/g,' ').trim();
    if (dict[norm] != null) return dict[norm];
    return orig;
  }
  function applyToElement(dict, entry){
    const el = entry.el;
    if (!el || (el.closest && (el.closest('pre,code'))) ) return;
    if (entry.title) {
      const t = translateText(dict, entry.title);
      if (t !== entry.title) el.setAttribute('title', t);
    }
    if (entry.placeholder) {
      const p = translateText(dict, entry.placeholder);
      if (p !== entry.placeholder) el.setAttribute('placeholder', p);
    }
    const isForm = ['INPUT','TEXTAREA','SELECT'].includes(el.tagName);
    if (!isForm) {
      const txt = translateText(dict, entry.text);
      if (txt !== entry.text && txt !== '') {
        if (el.childElementCount === 0) {
          el.textContent = txt;
        } else if (el.dataset && el.dataset.i18n) {
          el.textContent = txt;
        } else {
          const tn = Array.from(el.childNodes).find(n=>n.nodeType===Node.TEXT_NODE);
          if (tn) tn.nodeValue = txt;
        }
      }
    } else if (el.tagName === 'SELECT') {
      Array.from(el.options).forEach(opt=>{
        const t = translateText(dict, (opt.textContent||'').trim());
        if (t && t !== opt.textContent) opt.textContent = t;
      });
    }
  }
  async function switchLang(code){
    try {
      if (!S.baseline || typeof S.baseline.keys !== 'function') return;
      const dict = await loadDict(code);
      for (const [,entry] of S.baseline.entries()) applyToElement(dict, entry);
      console.log('[i18n-overlay] switched to', code);
    } catch (e) { console.error('[i18n-overlay] switch failed:', e); }
  }
  async function boot(){
    try {
      await Promise.all([loadDict('zh'), loadDict('en'), loadDict('ja')]);
      const sel = findLangSelect();
      if (sel) {
        sel.addEventListener('change', ()=>{
          const opt = sel.options[sel.selectedIndex];
          const code = guessLangFromOptionText(opt ? opt.textContent : sel.value) || 'zh';
          switchLang(code);
        }, {passive:true});
        const initOpt = sel.options[sel.selectedIndex];
        const initCode = guessLangFromOptionText(initOpt ? initOpt.textContent : sel.value) || 'zh';
        switchLang(initCode);
      }
    } catch (e) { console.error('[i18n-overlay] init failed:', e); }
  }
  I18N.switch = switchLang;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();