(function(){
  const S = { lang:'zh', dicts:{}, baseline:new WeakMap(), inited:false };
  const t = s => (s||'').replace(/\s+/g,' ').trim();
  const log = (...a)=>console.log('[i18n]', ...a);

  async function load(lang){
    if(S.dicts[lang]) return S.dicts[lang];
    const res = await fetch(`./lang/${lang}.json`, {cache:'no-store'});
    if(!res.ok) throw new Error('load failed: '+lang);
    S.dicts[lang] = await res.json();
    return S.dicts[lang];
  }

  function* nodes(){
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(n){
        if(!n.nodeValue) return NodeFilter.FILTER_REJECT;
        const s = t(n.nodeValue);
        if(!s) return NodeFilter.FILTER_REJECT;
        const p = n.parentElement; if(!p) return NodeFilter.FILTER_REJECT;
        const tag = p.tagName; if(tag==='SCRIPT'||tag==='STYLE') return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let n; while(n=w.nextNode()) yield n;
  }

  function ensureBaseline(){
    for(const n of nodes()){
      if(!S.baseline.has(n)) S.baseline.set(n, n.nodeValue);
    }
    document.querySelectorAll('input[placeholder],textarea[placeholder]').forEach(el=>{
      if(!el.dataset.i18nPh) el.dataset.i18nPh = el.getAttribute('placeholder')||'';
    });
  }

  function apply(lang){
    const dict = S.dicts[lang];
    const zh = S.dicts['zh'];
    if(!dict || !zh) return;

    const tmap = dict.text || {}; 
    const pmap = dict.placeholder || {};

    for(const n of S.baseline.keys()){
      const origFull = S.baseline.get(n);
      const key = t(origFull);
      if(key && tmap[key]!==undefined){
        // replace only the trimmed segment, keep surrounding spaces
        n.nodeValue = origFull.replace(key, tmap[key]);
      }else{
        n.nodeValue = origFull;
      }
    }

    document.querySelectorAll('input[placeholder],textarea[placeholder]').forEach(el=>{
      const o = t(el.dataset.i18nPh || '');
      const v = (o && pmap[o]) ? pmap[o] : (el.dataset.i18nPh||'');
      el.setAttribute('placeholder', v);
    });

    // Update DID button text if present
    const did = document.getElementById('did-export');
    if(did){
      did.textContent = (lang==='ja') ? 'W3C DID 文書をエクスポート（任意）' :
                      (lang==='en') ? 'Export W3C DID document (optional)' :
                                       '导出 W3C DID 文档（可选）';
    }
    S.lang = lang;
    localStorage.setItem('fireseed.lang', lang);
    log('switched', lang);
  }

  function ensureDID(){
    const exists = Array.from(document.querySelectorAll('button,a')).some(el=>/DID/i.test(el.textContent||''));
    if(exists) return;
    const anchor = Array.from(document.querySelectorAll('button,a')).find(el=>/(生成胶囊|Generate capsule|下载 YAML|YAML|PDF)/i.test(el.textContent||''));
    if(!anchor) return;
    const btn = document.createElement('button');
    btn.id = 'did-export';
    btn.type = 'button';
    btn.textContent = '导出 W3C DID 文档（可选）';
    btn.addEventListener('click', ()=>{
      if(typeof window.exportDID === 'function'){ window.exportDID(); }
      else alert('DID export handler not found.');
    });
    anchor.parentElement.appendChild(btn);
  }

  async function init(){
    await Promise.all(['zh','en','ja'].map(load));
    ensureBaseline();
    ensureDID();

    // hook language select
    const sel = Array.from(document.querySelectorAll('select')).find(s=>/中文|English|日本語|zh|en|ja/i.test(s.textContent||''));
    if(sel){
      sel.addEventListener('change', ()=>{
        const v = (sel.value||'').toLowerCase();
        apply(/ja/.test(v)?'ja':/en/.test(v)?'en':'zh');
      }, {passive:true});
    }
    apply(localStorage.getItem('fireseed.lang') || 'zh');
    log('overlay ready');
  }
  document.addEventListener('DOMContentLoaded', init);
})();