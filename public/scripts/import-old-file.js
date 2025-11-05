// Fireseed import-old-file addon (v3.7.1)
// 使用：在 generator.html 里 <script src="./scripts/generator.js"></script> 之后追加：
// <script src="./scripts/import-old-file.js"></script>
(function(){
  const $ = sel => document.querySelector(sel);
  let up = document.getElementById('btn-import');
  let trg = document.getElementById('btn-import-trigger');
  if(!trg){
    const c = document.createElement('div'); c.className='btns';
    const b1 = document.createElement('button'); b1.id='btn-import-trigger'; b1.textContent='上传旧文件并回填';
    const i = document.createElement('input'); i.type='file'; i.id='btn-import'; i.accept='.yml,.yaml,.txt'; i.style.display='none';
    c.appendChild(b1); c.appendChild(i);
    const panel = document.querySelector('.btns'); 
    if(panel) panel.appendChild(c); else document.body.appendChild(c);
    up = i; trg = b1;
  }
  trg.onclick = () => up.click();
  up.addEventListener('change', async (e)=>{
    const f = e.target.files[0]; if(!f) return;
    const text = await f.text();
    const grab = (k)=> (text.match(new RegExp('^'+k+':\s*(.+)$','m'))||[])[1]?.trim() || "";
    const set = (id,val)=>{ const el = $('#'+id); if(el && val) el.value = val.replace(/^"|"$/g,''); };
    set('owner', grab('owner'));
    set('locale', grab('locale'));
    set('grace_period', grab('grace_period'));
    alert('已尝试从旧文件回填。请检查后继续。');
  });
})();