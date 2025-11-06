
/*! Fireseed i18n overlay v2 (baseline-safe, multi-switch)
 *  - Does NOT change layout or core scripts.
 *  - Keeps a baseline snapshot of original texts/attributes/options,
 *    so you can switch languages back and forth indefinitely.
 */
(function(){
  const LANG_KEY = "fireseed:lang";
  const ATTRS = ["placeholder","title","aria-label"];
  const SKIP = "script,style,code,pre#yaml,[data-i18n-skip]"; // never touch YAML preview or skipped nodes
  const CACHE = {}; // lang -> {map, keys, re}
  const BASELINE_TEXT = new WeakMap(); // TextNode -> original
  const BASELINE_ATTR = new WeakMap(); // Element -> {attr:value}
  const BASELINE_OPT  = new WeakMap(); // HTMLOptionElement -> original text
  let current = "zh";

  // utilities
  const $ = (s,root=document)=>root.querySelector(s);
  const $$ = (s,root=document)=>Array.from(root.querySelectorAll(s));

  function getSavedLang(){
    const v = localStorage.getItem(LANG_KEY) || document.documentElement.getAttribute("lang") || "zh";
    return (v||"").slice(0,2);
  }
  function setSavedLang(v){ localStorage.setItem(LANG_KEY, v); }

  async function loadDict(lang){
    if (CACHE[lang]) return CACHE[lang];
    try {
      const res = await fetch(`./lang/${lang}.json`, {cache:"no-store"});
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const map = await res.json();
      const keys = Object.keys(map).sort((a,b)=>b.length-a.length);
      const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = keys.length ? new RegExp(keys.map(esc).join("|"), "g") : /$^/;
      CACHE[lang] = { map, keys, re };
      return CACHE[lang];
    } catch(e){
      console.warn("i18n overlay: failed to load dict", lang, e);
      CACHE[lang] = { map:{}, keys:[], re: /$^/ };
      return CACHE[lang];
    }
  }

  // baseline capture
  function captureNodeBaseline(root){
    // text nodes
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n){
        const p = n.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        if (p.matches(SKIP) || p.closest(SKIP)) return NodeFilter.FILTER_REJECT;
        const t = n.nodeValue;
        if (!t || !t.trim()) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    while (walker.nextNode()){
      const n = walker.currentNode;
      if (!BASELINE_TEXT.has(n)) BASELINE_TEXT.set(n, n.nodeValue);
    }
    // attributes
    $$(ATTRS.map(a=>`[*|${a}], [${ATTRS.join("], [")}]`).join(",")).forEach(el=>{
      if (el.matches(SKIP) || el.closest(SKIP)) return;
      const rec = BASELINE_ATTR.get(el) || {};
      for (const a of ATTRS){
        if (el.hasAttribute(a) && rec[a] == null){
          rec[a] = el.getAttribute(a);
        }
      }
      if (Object.keys(rec).length) BASELINE_ATTR.set(el, rec);
    });
    // select options
    $$("select option").forEach(opt=>{
      if (opt.matches(SKIP) || opt.closest(SKIP)) return;
      if (!BASELINE_OPT.has(opt)) BASELINE_OPT.set(opt, opt.textContent || "");
    });
  }

  function translateFromBaseline(dict){
    // text nodes
    BASELINE_TEXT.forEach((orig, node)=>{
      if (!node || !node.parentElement) return;
      const out = (current==="zh") ? orig : orig.replace(dict.re, m => dict.map[m] ?? m);
      if (node.nodeValue !== out) node.nodeValue = out;
    });
    // attributes
    BASELINE_ATTR.forEach((rec, el)=>{
      for (const a of Object.keys(rec)){
        const orig = rec[a];
        if (typeof orig !== "string") continue;
        const out = (current==="zh") ? orig : orig.replace(dict.re, m => dict.map[m] ?? m);
        if (el.getAttribute(a) !== out) el.setAttribute(a, out);
      }
    });
    // select options
    BASELINE_OPT.forEach((orig, opt)=>{
      const out = (current==="zh") ? orig : orig.replace(dict.re, m => dict.map[m] ?? m);
      if (opt.textContent !== out) opt.textContent = out;
    });
  }

  let observer;
  function startObserver(){
    if (observer) observer.disconnect();
    observer = new MutationObserver(async (mutations)=>{
      const dict = await loadDict(current);
      for (const m of mutations){
        if (m.type === "childList"){
          m.addedNodes.forEach(n=>{
            if (n.nodeType === 1){
              captureNodeBaseline(n);
              translateFromBaseline(dict);
            }else if (n.nodeType === 3){
              if (!BASELINE_TEXT.has(n)) BASELINE_TEXT.set(n, n.nodeValue);
              translateFromBaseline(dict);
            }
          });
        }else if (m.type === "attributes"){
          if (ATTRS.includes(m.attributeName)){
            const el = m.target;
            const rec = BASELINE_ATTR.get(el) || {};
            if (rec[m.attributeName] == null) rec[m.attributeName] = el.getAttribute(m.attributeName) || "";
            BASELINE_ATTR.set(el, rec);
            const dictNow = await loadDict(current);
            translateFromBaseline(dictNow);
          }
        }
      }
    });
    observer.observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter: ATTRS });
  }

  async function apply(lang){
    current = lang;
    setSavedLang(lang);
    const dict = await loadDict(lang);
    translateFromBaseline(dict);
    document.documentElement.setAttribute("lang", lang);

    // normalize & sync selector
    const sel = document.querySelector('select[name="language"], select#language, select');
    if (sel){
      Array.from(sel.options).forEach(o=>{
        const t = (o.value || o.textContent || "").toLowerCase();
        if (t.includes("en")) o.value = "en";
        else if (t.includes("ja") || t.includes("日")) o.value = "ja";
        else o.value = "zh";
      });
      sel.value = lang;
    }
    console.log("i18n overlay v2 ->", lang);
  }

  async function init(){
    // 1) capture baseline once
    captureNodeBaseline(document.body);
    // 2) start observing
    startObserver();
    // 3) apply saved language
    await apply(getSavedLang());
    // 4) bind selector
    const sel = document.querySelector('select[name="language"], select#language, select');
    if (sel){
      sel.addEventListener("change", e => {
        const v = (e.target.value || "").toLowerCase();
        const lang = v.includes("en") ? "en" : v.includes("ja") ? "ja" : "zh";
        apply(lang);
      });
    }
    // expose API
    window.fireseedI18n = { apply };
    console.log("✅ i18n overlay v2 initialized");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once:true });
  else init();
})();
