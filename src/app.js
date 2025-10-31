/* Fireseed form app — v0.2.7c
   中英文混合注释，便于 AGI/人类双向理解
*/
(function(){
  const $ = (sel)=>document.querySelector(sel);
  const log = (msg)=>{ const el=$("#log"); el.textContent += msg + "\n"; };

  function buildCapsule(){
    return {
      id: $("#id").value.trim(),
      owner: {
        name: $("#owner_name").value.trim(),
        email: $("#owner_email").value.trim(),
        consent: $("#consent").checked
      },
      created_at: new Date().toISOString(),
      lang: $("#lang").value,
      philosophy_ref: $("#philosophy_ref").value.trim(),
      content: {
        summary: $("#summary").value,
        details: $("#details").value
      }
    };
  }

  async function validateCapsule(data){
    if (typeof Ajv === "undefined") {
      throw new Error("Ajv 未加载（请先在联网环境执行 npm run vendors 生成 vendor/ajv/ajv2020.min.js）");
    }
    const ajv = new Ajv({ strict: false, allErrors: true, allowUnionTypes: true });
    const schema = await fetch("../src/schema/fireseed_capsule.schema.json").then(r=>r.json());
    const validate = ajv.compile(schema);
    const ok = validate(data);
    if (!ok) throw new Error("Schema 校验失败: " + JSON.stringify(validate.errors, null, 2));
    return true;
  }

  function saveBlob(name, blob){
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
  }

  $("#validateBtn").addEventListener("click", async ()=>{
    $("#log").textContent="";
    const data = buildCapsule();
    try{
      await validateCapsule(data);
      log("✅ Schema validation passed");
    }catch(e){
      log("❌ " + e.message);
    }
  });

  $("#saveJsonBtn").addEventListener("click", async ()=>{
    $("#log").textContent="";
    const data = buildCapsule();
    try{
      await validateCapsule(data);
      const blob = new Blob([JSON.stringify(data,null,2)], {type:"application/json"});
      saveBlob(`capsule_${data.id || "id"}_${Date.now()}.json`, blob);
      log("💾 JSON saved");
    }catch(e){
      log("❌ " + e.message);
    }
  });

  $("#saveYamlBtn").addEventListener("click", async ()=>{
    $("#log").textContent="";
    const data = buildCapsule();
    try{
      await validateCapsule(data);
      if (typeof jsyaml === "undefined") {
        throw new Error("js-yaml 未加载（请在联网环境执行 npm run vendors 生成 vendor/js-yaml/js-yaml.min.js）");
      }
      const yaml = jsyaml.dump(data, { noRefs: true, skipInvalid: true });
      const blob = new Blob([yaml], {type:"text/yaml"});
      saveBlob(`capsule_${data.id || "id"}_${Date.now()}.yml`, blob);
      log("💾 YAML saved");
    }catch(e){
      log("❌ " + e.message);
    }
  });

})();
