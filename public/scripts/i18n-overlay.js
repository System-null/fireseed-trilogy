
/*! Fireseed i18n overlay (non-intrusive)
 *  - No DOM structure change; only covers visible texts/placeholders/options.
 *  - Works alongside existing generator.js / pdf / did scripts.
 */
(function () {
  const LANG_KEY = "fireseed:lang";
  const SKIP_SELECTORS = [
    "script", "style", "code", "kbd",
    "pre#yaml" // YAML preview is dynamic; translate its placeholder only
  ];
  const ATTRS = ["placeholder","title","aria-label"];
  const LOCALES = ["zh","en","ja"];
  const dictCache = {};

  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  function currentLang() {
    return localStorage.getItem(LANG_KEY) || document.documentElement.lang?.slice(0,2) || "zh";
  }

  async function loadDict(lang) {
    if (dictCache[lang]) return dictCache[lang];
    try {
      const res = await fetch(`./lang/${lang}.json`, {cache:"no-store"});
      if (!res.ok) throw new Error(res.statusText);
      const data = await res.json();
      // sort keys by length (desc) for longest-first replacement
      const keys = Object.keys(data).sort((a,b)=>b.length - a.length);
      const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(keys.map(esc).join("|"), "g");
      dictCache[lang] = { map: data, keys, re };
      return dictCache[lang];
    } catch (e) {
      console.warn("i18n overlay: failed to load dict:", lang, e);
      dictCache[lang] = { map: {}, keys: [], re: /$^/ };
      return dictCache[lang];
    }
  }

  function shouldSkip(node) {
    if (!node) return true;
    if (node.nodeType === Node.ELEMENT_NODE) {
      for (const sel of SKIP_SELECTORS) {
        if (node.matches?.(sel)) return true;
        if (node.closest?.(sel)) return true;
      }
      if (node.hasAttribute?.("data-i18n-skip")) return true;
    }
    return false;
  }

  function translateTextContent(node, dict) {
    if (!node || node.nodeType !== Node.TEXT_NODE) return;
    const original = node.nodeValue;
    if (!original || !original.trim()) return;
    const replaced = original.replace(dict.re, m => dict.map[m] ?? m);
    if (replaced !== original) node.nodeValue = replaced;
  }

  function walkAndTranslate(root, dict) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        if (!n.parentElement) return NodeFilter.FILTER_REJECT;
        if (shouldSkip(n.parentElement)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const to = [];
    while (walker.nextNode()) to.push(walker.currentNode);
    to.forEach(n => translateTextContent(n, dict));

    // attributes
    $$(ATTRS.map(a=>`[*|${a}], [${ATTRS.join("], [")}]`).join(",")).forEach(el => {
      if (shouldSkip(el)) return;
      for (const a of ATTRS) {
        const val = el.getAttribute(a);
        if (!val) continue;
        const newVal = val.replace(dict.re, m => dict.map[m] ?? m);
        if (newVal !== val) el.setAttribute(a, newVal);
      }
    });

    // options
    $$("select option").forEach(opt => {
      if (shouldSkip(opt)) return;
      const txt = opt.textContent;
      const newTxt = txt.replace(dict.re, m => dict.map[m] ?? m);
      if (newTxt !== txt) opt.textContent = newTxt;
    });
  }

  async function apply(lang) {
    localStorage.setItem(LANG_KEY, lang);
    const dict = await loadDict(lang);
    const root = $(".container") || document.body;
    walkAndTranslate(root, dict);
    document.documentElement.lang = lang;

    // update language selector to reflect current lang if present
    const langSelect = document.querySelector('select[name="language"]');
    if (langSelect) {
      // normalize values to zh/en/ja
      Array.from(langSelect.options).forEach(o => {
        const t = (o.value || o.textContent || "").toLowerCase();
        if (t.includes("en")) o.value = "en";
        else if (t.includes("ja") || t.includes("日")) o.value = "ja";
        else o.value = "zh";
      });
      langSelect.value = lang;
    }

    console.log("i18n overlay: switched to", lang);
  }

  // re-translate on future dynamic renders
  let observer;
  function startObserver(lang) {
    if (observer) observer.disconnect();
    observer = new MutationObserver(async (list) => {
      const dict = await loadDict(lang);
      for (const m of list) {
        if (m.type === "childList") {
          m.addedNodes.forEach(n => {
            if (n.nodeType === 1 && !shouldSkip(n)) walkAndTranslate(n, dict);
          });
        } else if (m.type === "attributes") {
          if (ATTRS.includes(m.attributeName)) {
            const el = m.target;
            const val = el.getAttribute(m.attributeName);
            if (val) el.setAttribute(m.attributeName, val.replace(dict.re, x=>dict.map[x]??x));
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ATTRS });
  }

  async function init() {
    // language from LS > html[lang] > zh
    let lang = currentLang();
    if (!LOCALES.includes(lang)) lang = "zh";
    await apply(lang);
    startObserver(lang);

    // hook language dropdown if exists
    const langSelect = document.querySelector('select[name="language"]');
    if (langSelect) {
      langSelect.addEventListener("change", async e => {
        const next = (e.target.value || "").toLowerCase().includes("ja") ? "ja" :
                     (e.target.value || "").toLowerCase().includes("en") ? "en" : "zh";
        await apply(next);
        startObserver(next);
      });
    }

    // expose for manual switching
    window.fireseedI18n = { apply };
  }

  document.addEventListener("DOMContentLoaded", init, { once: true });
})();
