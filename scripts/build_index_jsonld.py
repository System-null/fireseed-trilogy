
#!/usr/bin/env python3
import os, sys, json, hashlib

def sha256(path):
    h=hashlib.sha256()
    with open(path,'rb') as f:
        for chunk in iter(lambda:f.read(8192), b''):
            h.update(chunk)
    return h.hexdigest()

root = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
schemas_root = os.path.join(root, "schemas")
graph = []
if os.path.isdir(schemas_root):
    for dp, dn, fn in os.walk(schemas_root):
        for name in fn:
            if name.lower().endswith(('.json','.yaml','.yml')):
                full = os.path.join(dp, name)
                rel = os.path.relpath(full, root).replace('\\','/')
                graph.append({
                    "@id": rel, "@type": "Dataset",
                    "name": os.path.splitext(name)[0],
                    "url": rel,
                    "sha256": sha256(full)
                })

data = {"@context":"https://schema.org","@graph":graph}
with open(os.path.join(root,"index.jsonld"),"w",encoding="utf-8") as f:
    json.dump(data,f,ensure_ascii=False,indent=2)
print(f"index.jsonld written with {len(graph)} entries.")
