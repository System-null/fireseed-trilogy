\
(() => {
  const LANGS = ['zh','en','ja'];
  const htmlLang = { zh:'zh-CN', en:'en-US', ja:'ja-JP' };

  const TEXT = {
    title: {
      zh: 'Fireseed Capsule Generator · 向导版',
      en: 'Fireseed Capsule Generator · Guide Edition',
      ja: 'Fireseed カプセルジェネレーター · ガイド版',
    },
    didBtn: {
      zh: '导出 W3C DID 文档（可选）',
      en: 'Export W3C DID document (optional)',
      ja: 'W3C DID ドキュメントを書き出す（任意）',
    },
    triNote: {
      full: '生成将遵循此处的语言；切到英文会将页面整体渲染为英文。 / Generation will follow this language; switching to English renders the entire page in English. / 生成はここで選んだ言語に従います。英語に切り替えるとページ全体が英語表示になります。'
    },
    labels: {
      basic:      { zh:'1) 基本信息', en:'1) Basic information', ja:'1) 基本情報' },
      rules:      { zh:'2) 原则与底线', en:'2) Principles & Baselines', ja:'2) 原則と下限' },
      access:     { zh:'4) 权限与安全', en:'4) Access & safety', ja:'4) アクセスと安全' },
      yamlPrev:   { zh:'YAML 预览', en:'YAML preview', ja:'YAML プレビュー' },
      humanPrev:  { zh:'人类可读预览', en:'Human-readable preview', ja:'人間可読プレビュー' },
      whoami:     { zh:'我是谁', en:'Who am I', ja:'私は誰か' },
      langUse:    { zh:'我用的语言', en:'Language I use', ja:'私の使用言語' },
      refs:       { zh:'我思考的“参考书”', en:'My philosophical references', ja:'思考の「参考書」' },
    },
    placeholders: {
      name: {
        zh:'例：Alex Lin / 李明 / Mia',
        en:'e.g., Alex Lin / Li Ming / Mia',
        ja:'例：Alex Lin / 李明 / Mia',
      },
      refs: {
        zh:'例：金雁，康德，马斯克……简明一句话',
        en:'e.g., Analects, Kant, Musk … a quote from my mother',
        ja:'例：論語、カント、マスク…、母からの一言',
      },
      actionLoop: {
        zh:'例：扫描 → 评估 → 争取 → 反思…用简短句，既具体又易自检。',
        en:'e.g., scan → evaluate → strive → reflect … short, specific, self-checkable.',
        ja:'例：スキャン→評価→努力→内省… 短く具体で自己点検しやすく。',
      }
    }
  };

  function setText(el, text) {
    if (!el) return;
    if (!el.dataset.i18nBaseText) el.dataset.i18nBaseText = el.textContent;
    el.textContent = text;
  }
  function setHTML(el, html) {
    if (!el) return;
    if (!el.dataset.i18nBaseHTML) el.dataset.i18nBaseHTML = el.innerHTML;
    el.innerHTML = html;
  }
  function setPlaceholder(el, text) {
    if (!el) return;
    if (!el.dataset.i18nBasePh) el.dataset.i18nBasePh = el.getAttribute('placeholder') || '';
    el.setAttribute('placeholder', text);
  }
  function guessLangFromSelectValue(val) {
    if (!val) return 'zh';
    const v = String(val).toLowerCase();
    if (v.includes('en')) return 'en';
    if (v.includes('ja') || v.includes('日')) return 'ja';
    return 'zh';
  }

  function ensureTriLingualNote() {
    const select = document.querySelector('select');
    if (!select) return;
    let note = document.getElementById('fs-tri-lingual-note');
    if (!note) {
      note = document.createElement('div');
      note.id = 'fs-tri-lingual-note';
      note.style.cssText = 'margin-top:6px;font-size:12px;opacity:.8;';
      select.parentElement && select.parentElement.appendChild(note);
    }
    setText(note, TEXT.triNote.full);
  }

  function findDidBtn() {
    const cands = Array.from(document.querySelectorAll('button, a'));
    return cands.find(el => /DID/i.test(el.textContent) || el.dataset.did === 'export');
  }

  function findSectionByTitle(contains) {
    const titles = Array.from(document.querySelectorAll('h2,h3,div,strong'));
    return titles.find(el => (el.textContent || '').trim().includes(contains));
  }

  function applyLang(lang) {
    document.documentElement.lang = htmlLang[lang] || 'zh-CN';
    setText(document.querySelector('h1'), TEXT.title[lang]);

    const map = [
      { el: findSectionByTitle('基本信息') || findSectionByTitle('Basic information'), txt: TEXT.labels.basic[lang] },
      { el: findSectionByTitle('YAML') || findSectionByTitle('YAML preview'),       txt: TEXT.labels.yamlPrev[lang] },
      { el: findSectionByTitle('人类可读') || findSectionByTitle('Human-readable'),   txt: TEXT.labels.humanPrev[lang] },
      { el: findSectionByTitle('原则与底线') || findSectionByTitle('Principles'),     txt: TEXT.labels.rules[lang] },
      { el: findSectionByTitle('权限与安全') || findSectionByTitle('Access & safety'), txt: TEXT.labels.access[lang] },
      { el: findSectionByTitle('我是谁') || findSectionByTitle('Who am I'),          txt: TEXT.labels.whoami[lang] },
      { el: findSectionByTitle('我用的语言') || findSectionByTitle('Language I use'), txt: TEXT.labels.langUse[lang] },
      { el: findSectionByTitle('参考书') || findSectionByTitle('references'),        txt: TEXT.labels.refs[lang] },
    ];
    map.forEach(({el, txt}) => el && setText(el, txt));

    const nameInput = document.querySelector('input[placeholder*="Alex"]') || document.querySelector('input[type="text"]');
    setPlaceholder(nameInput, TEXT.placeholders.name[lang]);

    const refsInput = Array.from(document.querySelectorAll('textarea, input'))
      .find(n => n.placeholder && /参考书|references/i.test(n.placeholder));
    refsInput && setPlaceholder(refsInput, TEXT.placeholders.refs[lang]);

    const loopInput = Array.from(document.querySelectorAll('textarea, input'))
      .find(n => n.placeholder && /(loop|循环)/i.test(n.placeholder));
    loopInput && setPlaceholder(loopInput, TEXT.placeholders.actionLoop[lang]);

    const didBtn = findDidBtn();
    if (didBtn) setText(didBtn, TEXT.didBtn[lang]);

    ensureTriLingualNote();
    console.log(`[i18n overlay] switched to ${lang}`);
  }

  function init() {
    if (window.__I18N_AUTO__ === 'disabled') {
      console.log('[i18n overlay] legacy i18n-auto is disabled (stub).');
    }
    const select = document.querySelector('select');
    if (select && !select.__fs_i18n_bound) {
      select.__fs_i18n_bound = true;
      select.addEventListener('change', (e) => {
        const lang = guessLangFromSelectValue(e.target.value);
        applyLang(lang);
      });
    }
    const initLang = guessLangFromSelectValue(select && select.value);
    ensureTriLingualNote();
    applyLang(initLang || 'zh');
    console.log('[i18n overlay] v2.3 initialized');
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', init);
  else
    init();
})();
