
(() => {
  const VERSION = '2.4';
  const ns = '[i18n-overlay v' + VERSION + ']';
  const log = (...args) => console.log(ns, ...args);
  const warn = (...args) => console.warn(ns, ...args);

  const LANG_PATH = './lang';
  const state = {
    lang: 'zh',
    dict: {},
    baselineHTML: new WeakMap(),   // element -> innerHTML
    baselinePH: new WeakMap(),     // element -> placeholder
  };

  function normalize(s) { return (s || '').replace(/\s+/g, ' ').trim(); }

  function detectLanguageSelect() {
    // typical pattern in generator.html
    return document.querySelector('select[name="language"]') ||
           document.querySelector('select[data-i18n-switch]') ||
           document.querySelector('select') ;
  }

  async function loadDict(lang) {
    if (lang === 'zh' || lang === 'zh-CN') { state.dict = {}; return; }
    const url = `${LANG_PATH}/${lang}.json?v=${Date.now()}`;
    try {
      const res = await fetch(url, {cache:'no-store'});
      const data = await res.json();
      state.dict = data || {};
      log('loaded dict', lang, Object.keys(state.dict).length + ' entries');
    } catch (e) {
      warn('failed to load dict', lang, e);
      state.dict = {};
    }
  }

  function storeBaseline(el) {
    if (!state.baselineHTML.has(el)) state.baselineHTML.set(el, el.innerHTML);
  }
  function storeBaselinePH(el) {
    if (!state.baselinePH.has(el)) state.baselinePH.set(el, el.getAttribute('placeholder'));
  }

  function mapGet(key) {
    // exact first; if not, try fallback variants
    const dict = state.dict || {};
    if (key in dict) return dict[key];
    // try remove trailing punctuation variants
    const k2 = key.replace(/[：:]\s*$/, '');
    if (k2 !== key && k2 in dict) return dict[k2];
    return null;
  }

  function replaceTextNodes(lang) {
    const selector = [
      'h1','h2','h3','h4','h5','h6',
      'label','legend','button','summary',
      'a','small','strong','em','span.badge',
      'div.card-header','div.card h3','div.card-title','p','.help-text','.note','.hint'
    ].join(',');

    document.querySelectorAll(selector).forEach(el => {
      const text = normalize(el.innerText);
      if (!text) return;
      storeBaseline(el);
      if (lang === 'zh' || lang === 'zh-CN') {
        const html = state.baselineHTML.get(el);
        if (html != null) el.innerHTML = html;
        return;
      }
      const hit = mapGet(text);
      if (hit) el.innerHTML = hit;
    });

    // Option text
    document.querySelectorAll('option').forEach(el => {
      const text = normalize(el.textContent);
      if (!text) return;
      storeBaseline(el);
      if (lang === 'zh' || lang === 'zh-CN') {
        const html = state.baselineHTML.get(el);
        if (html != null) el.innerHTML = html;
        return;
      }
      const hit = mapGet(text);
      if (hit) el.textContent = hit.replace(/<[^>]+>/g,'');
    });

    // value-based buttons
    document.querySelectorAll('input[type="button"][value],input[type="submit"][value]').forEach(el => {
      const text = normalize(el.value);
      if (!text) return;
      storeBaseline(el);
      if (lang === 'zh' || lang === 'zh-CN') {
        const html = state.baselineHTML.get(el);
        if (html != null) el.value = html;
        return;
      }
      const hit = mapGet(text);
      if (hit) el.value = hit.replace(/<[^>]+>/g,'');
    });

    // attributes
    document.querySelectorAll('[title]').forEach(el => {
      const text = normalize(el.getAttribute('title'));
      if (!text) return;
      storeBaseline(el);
      if (lang === 'zh' || lang === 'zh-CN') {
        const html = state.baselineHTML.get(el);
        if (html != null) el.setAttribute('title', html);
        return;
      }
      const hit = mapGet(text);
      if (hit) el.setAttribute('title', hit.replace(/<[^>]+>/g,''));
    });

    // placeholders
    document.querySelectorAll('input[placeholder],textarea[placeholder]').forEach(el => {
      const text = normalize(el.getAttribute('placeholder'));
      if (!text) return;
      storeBaselinePH(el);
      if (lang === 'zh' || lang === 'zh-CN') {
        const ph = state.baselinePH.get(el);
        if (ph != null) el.setAttribute('placeholder', ph);
        return;
      }
      const hit = mapGet(text);
      if (hit) el.setAttribute('placeholder', hit.replace(/<[^>]+>/g,''));
    });
  }

  function applyPatterns(lang) {
    if (!state.dict || !state.dict.__patterns) return;
    state.dict.__patterns.forEach(rule => {
      try {
        const el = document.querySelector(rule.selector);
        if (!el) return;
        storeBaseline(el);
        if (lang === 'zh' || lang === 'zh-CN') {
          const html = state.baselineHTML.get(el);
          if (html != null) el.innerHTML = html;
          return;
        }
        const from = new RegExp(rule.find, 'g');
        el.innerHTML = el.innerHTML.replace(from, rule.replace);
      } catch (e) {
        // ignore a single bad rule
      }
    });
  }

  async function switchLang(lang) {
    if (lang === 'zh' || lang === 'zh-CN') {
      replaceTextNodes('zh');
      applyPatterns('zh');
      state.lang = 'zh';
      log('switched language to zh');
      return;
    }
    const short = /^en/i.test(lang) ? 'en' : /^ja/i.test(lang) ? 'ja' : lang;
    await loadDict(short);
    replaceTextNodes(short);
    applyPatterns(short);
    state.lang = short;
    log('switched language to', short);
  }

  function wireSelect() {
    const sel = detectLanguageSelect();
    if (!sel) return;
    sel.setAttribute('data-i18n-switch', '');
    sel.addEventListener('change', (e) => {
      const v = String(e.target.value || '').toLowerCase();
      if (v.includes('en')) switchLang('en');
      else if (v.includes('ja') || v.includes('日')) switchLang('ja');
      else switchLang('zh');
    });
  }

  // public API for manual calls if needed
  window.i18nSwitchLanguage = switchLang;

  document.addEventListener('DOMContentLoaded', () => {
    try {
      wireSelect();
      log('initialized');
    } catch (e) {
      warn('init error', e);
    }
  });

})();