// scripts/fetch-vendors.mjs
// One-time fetch of official builds, then lock with SHA256.
// 连接官方来源（cdnjs + GitHub raw），写入 vendor/ 并生成 lock-manifest.json

import fs from "node:fs/promises";
import path from "node:path";
import https from "node:https";
import crypto from "node:crypto";

const targets = [
  {
    name: "ajv",
    version: "8.17.1",
    files: [
      {
        url: "https://cdnjs.cloudflare.com/ajax/libs/ajv/8.17.1/ajv2020.min.js",
        dest: "vendor/ajv/ajv2020.min.js"
      }
    ],
    licenses: [
      {
        url: "https://raw.githubusercontent.com/ajv-validator/ajv/master/LICENSE",
        dest: "vendor/LICENSES/ajv.LICENSE"
      }
    ]
  },
  {
    name: "js-yaml",
    version: "4.1.0",
    files: [
      {
        url: "https://cdnjs.cloudflare.com/ajax/libs/js-yaml/4.1.0/js-yaml.min.js",
        dest: "vendor/js-yaml/js-yaml.min.js"
      }
    ],
    licenses: [
      {
        url: "https://raw.githubusercontent.com/nodeca/js-yaml/master/LICENSE",
        dest: "vendor/LICENSES/js-yaml.LICENSE"
      }
    ]
  }
];

async function fetchBinary(url){
  console.log("Downloading", url);
  return await new Promise((resolve, reject)=>{
    https.get(url, (res)=>{
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      const chunks = [];
      res.on("data", (c)=>chunks.push(c));
      res.on("end", ()=>resolve(Buffer.concat(chunks)));
    }).on("error", reject);
  });
}

function sha256(buf){
  return crypto.createHash("sha256").update(buf).digest("hex");
}

async function ensureDir(filePath){
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

const lock = { created_at: new Date().toISOString(), items: [] };

for (const lib of targets){
  for (const item of lib.files){
    const buf = await fetchBinary(item.url);
    await ensureDir(item.dest);
    await fs.writeFile(item.dest, buf);
    lock.items.push({
      name: lib.name,
      version: lib.version,
      url: item.url,
      dest: item.dest,
      sha256: sha256(buf)
    });
    console.log("Wrote", item.dest);
  }
  for (const lic of lib.licenses){
    const buf = await fetchBinary(lic.url);
    await ensureDir(lic.dest);
    await fs.writeFile(lic.dest, buf);
    console.log("Wrote", lic.dest);
  }
}

await fs.writeFile("vendor/lock-manifest.json", JSON.stringify(lock, null, 2));
console.log("Lock manifest written to vendor/lock-manifest.json");

