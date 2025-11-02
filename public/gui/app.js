(function(){
  const $ = (s)=>document.querySelector(s);
  const out = $('#out');
  function log(msg){ out.textContent = (msg instanceof Object) ? JSON.stringify(msg,null,2) : String(msg); }

  async function loadSchema(){ const r = await fetch('../../schemas/capsule_v0.2.9.json'); return r.json(); }
  function buildData(){
    return {
      id: "urn:uuid:REPLACE-WITH-UUID",
      owner: $('#owner').value.trim(),
      language: $('#language').value,
      philosophy_ref: $('#philosophy_ref').value.trim(),
      ethical_flag: $('#ethical_flag').value === 'true',
      summary: $('#summary').value.trim(),
      details: $('#details').value,
      schema_version: "0.2.9",
      created_at: new Date().toISOString()
    };
  }
  async function validateData(d){
    const schema = await loadSchema();
    const ajv = new Ajv({allErrors:true, strict:false});
    const validate = ajv.compile(schema);
    const ok = validate(d);
    return {ok, errors: validate.errors || []};
  }
  function saveText(name, text){
    const blob = new Blob([text], {type:'text/plain;charset=utf-8'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download=name; a.click();
  }
  $('#btn-validate').addEventListener('click', async ()=>{ const d=buildData(); const r=await validateData(d); log(r.ok? 'VALID' : r.errors); });
  $('#btn-yaml').addEventListener('click', async ()=>{ const d=buildData(); const r=await validateData(d); if(!r.ok){log(r.errors);return;} saveText('capsule_v0.yaml', jsyaml.dump(d,{lineWidth:100})); log('saved capsule_v0.yaml'); });
  $('#btn-json').addEventListener('click', async ()=>{ const d=buildData(); const r=await validateData(d); if(!r.ok){log(r.errors);return;} saveText('capsule_v0.json', JSON.stringify(d,null,2)); log('saved capsule_v0.json'); });
  $('#btn-card').addEventListener('click', ()=>{ const d=buildData(); const u=new URL('card.html', location.href); u.searchParams.set('owner', d.owner); u.searchParams.set('summary', d.summary); u.searchParams.set('ref', d.philosophy_ref); window.open(u.toString(), '_blank'); });
})();