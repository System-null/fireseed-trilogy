
(function(){
  function ready(fn){ if(document.readyState!=="loading"){fn()} else {document.addEventListener("DOMContentLoaded", fn)} }
  function $(sel, ctx){ return (ctx||document).querySelector(sel); }
  function $all(sel, ctx){ return Array.from((ctx||document).querySelectorAll(sel)); }
  function h(tag, props, children){
    var el=document.createElement(tag); if(props){Object.assign(el, props); if(props.style){Object.assign(el.style, props.style)}}
    (children||[]).forEach(c=>el.appendChild(typeof c==="string"?document.createTextNode(c):c)); return el;
  }
  function download(filename, text){
    var blob = new Blob([text], {type:"application/json"});
    var url = URL.createObjectURL(blob);
    var a = h("a", {href:url, download: filename}); document.body.appendChild(a); a.click();
    setTimeout(()=>{URL.revokeObjectURL(url); a.remove()}, 0);
  }
  async function fetchTemplate(){
    const paths = ["../did-fireseed-template.json","/did-fireseed-template.json","./did-fireseed-template.json"];
    for(const p of paths){
      try{
        const res = await fetch(p, {cache:"no-store"});
        if(res.ok){ return await res.text(); }
      }catch(e){/* try next */}
    }
    throw new Error("找不到 did-fireseed-template.json");
  }
  function parseYamlPreview(){
    // Try to find a <pre> block with generated YAML and sniff values
    const pres = $all("pre, code, textarea");
    let text = "";
    for(const el of pres){
      const t = el.textContent || "";
      if(/version:\s*capsule/i.test(t)){ text = t; break; }
    }
    const res = {};
    if(text){
      const m1 = text.match(/ipfs:\/\/([^\s'"]+)/i);
      if(m1) res.cid = m1[1].trim();
      const m2 = text.match(/publicKeyMultibase:\s*([^\s'"]+)/i);
      if(m2) res.pub = m2[1].trim();
      const m3 = text.match(/delegated_key:\s*([^\s'"]+)/i);
      if(m3) res.pub = res.pub || m3[1].trim();
    }
    return res;
  }
  function ensure(val, promptMsg){
    if(val && val.trim()) return val.trim();
    const v = window.prompt(promptMsg || "请输入数值");
    return (v||"").trim();
  }
  function attach(){
    let btn = document.getElementById("btn-did-export");
    if(!btn){
      // Locate an anchor button to place next to
      const candidates = $all("button, a, input[type=button], input[type=submit]");
      let anchor = candidates.find(b=>/导出\s*PDF|导出PDF|下载\s*YAML|下载YAML|保存|生成/i.test(b.textContent||b.value||""));
      if(!anchor){
        // fallback: append at bottom of body
        anchor = h("div");
        document.body.appendChild(anchor);
      }else{
        // ensure anchor is in the DOM
        anchor = anchor.parentElement || anchor;
      }
      btn = h("button", { type:"button", id:"btn-did-export" }, ["导出 W3C DID 文档（可选）"]);
      btn.className = "btn btn-secondary";
      btn.style.marginLeft = "8px";
      btn.title = "将胶囊转为 W3C DID 文档，便于钱包/链上系统直接识别（可选）";
      btn.dataset.i18n = btn.dataset.i18n || "buttons.exportDid";
      btn.dataset.i18nTitle = btn.dataset.i18nTitle || "buttons.exportDidHint";
      anchor.appendChild(btn);
      const baseline = window.__i18nState && window.__i18nState.baseline;
      if(baseline && typeof baseline.set === "function"){
        baseline.set(baseline.size, {
          el: btn,
          text: btn.textContent.trim(),
          placeholder: null,
          title: btn.title,
          key: btn.dataset.i18n,
          placeholderKey: null,
          titleKey: btn.dataset.i18nTitle
        });
      }
    }else{
      if(!btn.dataset.i18n) btn.dataset.i18n = "buttons.exportDid";
      if(!btn.dataset.i18nTitle) btn.dataset.i18nTitle = "buttons.exportDidHint";
      if(!btn.title) btn.title = "将胶囊转为 W3C DID 文档，便于钱包/链上系统直接识别（可选）";
    }
    btn.addEventListener("click", async function(){
      let tpl = "";
      try{ tpl = await fetchTemplate(); }
      catch(e){ alert("未找到模板：did-fireseed-template.json，请确认已放在仓库根目录。\n" + e.message); return; }
      const sniff = parseYamlPreview();
      const cid = ensure(sniff.cid || (window._fireseed && window._fireseed.ipfsHash), "请输入你的 IPFS CID（如 Qm... 或 baf...）");
      if(!cid){ alert("未提供 IPFS CID，无法生成 DID 文档。"); return; }
      const pub = ensure(sniff.pub || (window._fireseed && window._fireseed.ownerPubKey), "请输入你的 Ed25519 公钥（multibase，形如 z6Mk...）");
      if(!pub){ alert("未提供公钥，无法生成 DID 文档。"); return; }
      const url = "ipfs://" + cid;
      const did = tpl.replace(/{{CAPSULE_HASH}}/g, cid).replace(/{{OWNER_PUBKEY}}/g, pub).replace(/{{CAPSULE_URL_OR_IPFS}}/g, url);
      download("did-fireseed.json", did);
    });
  }
  ready(attach);
})();
