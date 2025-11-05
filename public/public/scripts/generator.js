const $ = sel => document.querySelector(sel);

function linesToArray(str){
  if(!str) return [];
  return str.split(/\n+/).map(s=>s.trim()).filter(Boolean);
}

function toYAML(obj, indent=0){
  const sp = '  '.repeat(indent);
  if (obj === null) return 'null';
  if (Array.isArray(obj)){
    if(obj.length===0) return '[]';
    return obj.map(v=> sp + '- ' + toYAML(v, indent+1).replace(/^\s+/, '')).join('\n');
  }
  if (typeof obj === 'object'){
    const keys = Object.keys(obj);
    if(keys.length===0) return '{}';
    return keys.map(k => {
      const v = obj[k];
      if (v === undefined) return null;
      if (typeof v === 'object' && v !== null && !Array.isArray(v)){
        return `${sp}${k}:\n` + toYAML(v, indent+1);
      } else {
        return `${sp}${k}: ` + toYAML(v, indent+1).replace(/^\s+/, '');
      }
    }).filter(Boolean).join('\n');
  }
  if (typeof obj === 'string'){
    if (/[:\-#\n]/.test(obj)) {
      if (obj.includes('\n')){
        return '|\n' + obj.split('\n').map(l=>'  '+l).join('\n');
      }
      return JSON.stringify(obj);
    }
    return obj;
  }
  return String(obj);
}

async function sha256Hex(text){
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(text));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

function humanPreview(model){
  const principles = (model.principles||[]).map((p,i)=>`${i+1}. ${p}`).join('；');
  const nn = (model.non_negotiables||[]).join('；');
  return `我叫 ${model.owner||'（未填写）'}。\n\n`+
  `我做人做事的三条原则：${principles||'（未填写）'}。\n`+
  `我的底线：${nn||'（未填写）'}。\n`+
  `当遇到冲突时，我的行动循环：${model.loop?.execute||model.loop||'（未填写）'}。\n\n`+
  `给未来的留言：\n${(model.narrative?.message||'（未填写）')}`;
}

async function buildModel(){
  const now = new Date().toISOString();
  const owner = $('#owner').value.trim();
  const locale = $('#locale').value;
  const principles = linesToArray($('#principles').value);
  const non_negotiables = linesToArray($('#non_negotiables').value);
  const loopRaw = $('#loop').value.trim();
  const message = $('#message').value.trim();
  const access_terms = $('#access_terms').value;
  const custom_terms = $('#custom_terms').value.trim();
  const whitelist = $('#whitelist').value.trim();
  const blacklist = $('#blacklist').value.trim();
  const grace = $('#grace_period').value.trim() || 'P30D';
  const delegated_key = $('#delegated_key').value.trim();

  const dates = $('#dates').value.trim();
  const likes = $('#likes').value.trim();
  const dislikes = $('#dislikes').value.trim();
  const passphrase = $('#update_passphrase').value.trim();
  const philosophy_refs = $('#philosophy_refs').value.trim();

  const loop = loopRaw
    ? { trigger: "请求解释结构", judgment: "是否违背底线", execute: loopRaw, correct: "若仍误解则终止解释" }
    : {};

  const permissions = {
    terms: access_terms==='custom' ? custom_terms || 'custom' : access_terms,
    whitelist: whitelist || undefined,
    blacklist: blacklist || undefined,
    grace_period: grace,
    delegated_key: delegated_key || undefined
  };

  const storage = { media: ["local","pdf"], format: ["yaml","pdf"], redundancy: 1 };
  const proofs = { checksum_algo: "SHA-256" };

  const model = {
    version: "capsule_v0",
    owner, locale,
    philosophy_refs: philosophy_refs ? philosophy_refs.split(/[,，；;\n]+/).map(s=>s.trim()).filter(Boolean) : undefined,
    principles, non_negotiables, loop,
    narrative: { message },
    permissions, storage, proofs,
    meta: { generated_at: now, generator: "fireseed-generator v3.7", format_version: "v0.3.x" },
    optional: {
      celebration_dates: dates || undefined,
      likes: likes || undefined,
      dislikes: dislikes || undefined,
      update_passphrase: passphrase || undefined
    }
  };
  function prune(o){
    if (Array.isArray(o)) return o.map(prune);
    if (o && typeof o === 'object'){
      for (const k of Object.keys(o)){
        if (o[k] && typeof o[k] === 'object') o[k] = prune(o[k]);
        if (o[k] === undefined || (typeof o[k]==='object' && o[k]!==null && !Array.isArray(o[k]) && Object.keys(o[k]).length===0)) {
          delete o[k];
        }
      }
    }
    return o;
  }
  return prune(model);
}

async function generate(){
  const model = await buildModel();
  let yaml = toYAML(model);
  const hash = await sha256Hex(yaml);
  model.proofs.hash = hash;
  yaml = toYAML(model);
  $('#yaml').textContent = yaml;
  $('#human').textContent = humanPreview(model);
  localStorage.setItem('fireseed_last_yaml', yaml);
  localStorage.setItem('fireseed_last_human', $('#human').textContent);
  return yaml;
}

function download(filename, text){
  const blob = new Blob([text], {type:'text/yaml;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 0);
}

document.getElementById('btn-generate').addEventListener('click', async()=>{
  await generate();
  alert('已生成预览（右侧）。可下载 YAML / 导出 PDF / 查看人类快照。');
});

document.getElementById('btn-download').addEventListener('click', async()=>{
  const yaml = await generate();
  download('capsule.yaml', yaml);
});

document.getElementById('btn-pdf').addEventListener('click', async()=>{
  await generate();
  window.print();
});

document.getElementById('btn-snapshot').addEventListener('click', async()=>{
  await generate();
  window.location.href = './snapshot.html';
});
