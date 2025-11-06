
/*! Fireseed i18n overlay v2.2
 * - Based on v2.1 (Map baseline, multi-switch).
 * - Plus: (a) force-localize DID export button, (b) inject tri-lingual note under language selector.
 */
(function(){
  const LANG_KEY = "fireseed:lang";
  const ATTRS = ["placeholder","title","aria-label"];
  const SKIP = "script,style,code,pre#yaml,[data-i18n-skip]";
  const CACHE = {};
  const BASELINE_TEXT = new Map();
  const BASELINE_ATTR = new Map();
  const BASELINE_OPT  = new Map();
  let current = "zh";

  const $ = (s,root=document)=>root.querySelector(s);
  const $$ = (s,root=document)=>Array.from(root.querySelectorAll(s));

  function getSavedLang(){
    const v = localStorage.getItem(LANG_KEY) || document.documentElement.getAttribute("lang") || "zh";
    return (v||"").slice(0,2);
  }
  function setSavedLang(v){ try{ localStorage.setItem(LANG_KEY, v); }catch(_){} }

  async function loadDict(lang){
    if (CACHE[lang]) return CACHE[lang];
    try{
      const res = await fetch(`./lang/${lang}.json`, {cache:"no-store"});
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const map = await res.json();
      const keys = Object.keys(map).sort((a,b)=>b.length-a.length);
      const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = keys.length ? new RegExp(keys.map(esc).join("|"), "g") : /$^/;
      CACHE[lang] = { map, keys, re };
      return CACHE[lang];
    }catch(e){
      console.warn("i18n overlay: load dict failed", lang, e);
      CACHE[lang] = { map:{}, keys:[], re:/$^/ };
      return CACHE[lang];
    }
  }

  function captureNodeBaseline(root){
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
    const selector = ATTRS.map(a=>`[${a}]`).join(",");
    $$(selector).forEach(el=>{
      if (el.matches(SKIP) || el.closest(SKIP)) return;
      const rec = BASELINE_ATTR.get(el) || {};
      for (const a of ATTRS){
        if (el.hasAttribute(a) && rec[a] == null){
          rec[a] = el.getAttribute(a);
        }
      }
      if (Object.keys(rec).length) BASELINE_ATTR.set(el, rec);
    });
    $$("select option").forEach(opt=>{
      if (opt.matches(SKIP) || opt.closest(SKIP)) return;
      if (!BASELINE_OPT.has(opt)) BASELINE_OPT.set(opt, opt.textContent || "");
    });
  }

  function translateFromBaseline(dict){
    for (const [node, orig] of BASELINE_TEXT.entries()){
      if (!node || !node.parentElement) continue;
      const out = (current==="zh") ? orig : orig.replace(dict.re, m => dict.map[m] ?? m);
      if (node.nodeValue !== out) node.nodeValue = out;
    }
    for (const [el, rec] of BASELINE_ATTR.entries()){
      for (const a of Object.keys(rec)){
        const orig = rec[a];
        if (typeof orig !== "string") continue;
        const out = (current==="zh") ? orig : orig.replace(dict.re, m => dict.map[m] ?? m);
        if (el.getAttribute(a) !== out) el.setAttribute(a, out);
      }
    }
    for (const [opt, orig] of BASELINE_OPT.entries()){
      const out = (current==="zh") ? orig : orig.replace(dict.re, m => dict.map[m] ?? m);
      if (opt.textContent !== out) opt.textContent = out;
    }
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
              patchSpecials(); // also fix special UI
            }else if (n.nodeType === 3){
              if (!BASELINE_TEXT.has(n)) BASELINE_TEXT.set(n, n.nodeValue);
              translateFromBaseline(dict);
              patchSpecials();
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
            patchSpecials();
          }
        }
      }
    });
    observer.observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter: ATTRS });
  }

  // ---- Specials -------------------------------------------------------------
  const DID_LABEL = {
    zh: "导出 W3C DID 文档（可选）",
    en: "Export W3C DID document (optional)",
    ja: "W3C DID ドキュメントを書き出す（任意）"
  };
  const LANG_NOTE = [
    "生成将遵循此处的语言；切到英文会将页面整体渲染为英文。",
    "Generation will follow this language; switching to English renders the entire page in English.",
    "生成はここで選んだ言語に従います。英語に切り替えるとページ全体が英語表示になります。"
  ].join(" / ");

  function patchSpecials(){
    // 1) Language note: ensure a tri-lingual note exists right below the language <select>
    const sel = document.querySelector('select[name="language"], select#language, select');
    if (sel){
      let note = sel.closest("div")?.querySelector(".lang-note");
      if (!note){
        note = document.createElement("div");
        note.className = "lang-note";
        note.style.cssText = "margin-top:6px;color:#666;font-size:12px;";
        // insert after select
        sel.parentElement.insertBefore(note, sel.nextSibling);
      }
      note.textContent = LANG_NOTE;
    }

    // 2) DID export button/anchor: find by text hint or by DID keyword
    const cand = Array.from(document.querySelectorAll("a,button"))
      .filter(el => /DID|导出 W3C DID|W3C DID/.test(el.textContent || ""));
    cand.forEach(el=>{
      el.textContent = DID_LABEL[current] || DID_LABEL.zh;
      el.setAttribute("data-i18n-did", current);
    });
  }
  // --------------------------------------------------------------------------

  async function apply(lang){
    current = lang;
    setSavedLang(lang);
    const dict = await loadDict(lang);
    translateFromBaseline(dict);
    document.documentElement.setAttribute("lang", lang);

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
    patchSpecials();
    console.log("i18n overlay v2.2 ->", lang);
  }

  async function init(){
    try{
      captureNodeBaseline(document.body);
      startObserver();
      await apply(getSavedLang());
      const sel = document.querySelector('select[name="language"], select#language, select');
      if (sel){
        sel.addEventListener("change", e => {
          const v = (e.target.value || "").toLowerCase();
          const lang = v.includes("en") ? "en" : v.includes("ja") ? "ja" : "zh";
          apply(lang);
        });
      }
      window.fireseedI18n = { apply };
      console.log("✅ i18n overlay v2.2 initialized");
    }catch(e){
      console.error("i18n overlay init error", e);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once:true });
  else init();
})();
