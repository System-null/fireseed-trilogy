#!/usr/bin/env node
// Append/refresh ?v=<version> on each JSON Schema $id under /schemas
import fs from "node:fs";
import path from "node:path";
const version = process.argv[2];
if (!version) {
  console.error("Usage: node scripts/bump-schema-version.mjs <version>");
  process.exit(2);
}

const root = process.cwd();
const dir = path.join(root, "schemas");
if (!fs.existsSync(dir)) process.exit(0);

const walk = current => {
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      walk(path.join(current, entry.name));
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const filePath = path.join(current, entry.name);
    const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (json["$id"] && typeof json["$id"] === "string") {
      // 兼容无协议/相对路径写法
      let id = json["$id"];
      try {
        const hasQuery = id.includes("?");
        id = hasQuery ? id.replace(/(\?|&)v=[^&]*/g, "").replace(/\?$/, "") : id;
        id += (id.includes("?") ? "&" : "?") + "v=" + version;
      } catch {
        id = json["$id"] + (json["$id"].includes("?") ? "&" : "?") + "v=" + version;
      }
      json["$id"] = id;
      fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + "\n");
      console.log(`bumped $id in ${path.relative(dir, filePath)} -> ${id}`);
    }
  }
};

walk(dir);
