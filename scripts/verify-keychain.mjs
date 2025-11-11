#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  const k = process.argv[i];
  const v = process.argv[i + 1];
  if (k && v && k.startsWith("--")) args.set(k.slice(2), v);
}

const root = process.cwd();
const timelinePath = path.resolve(root, args.get("timeline") || "keys/key-timeline.json");
const revokePath = path.resolve(root, args.get("revocations") || "keys/revocations.json");

function loadJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); }
  catch (e) { throw new Error(`Failed to read JSON: ${p}\n${e.message}`); }
}

function loadSchema(p) {
  try { return JSON.parse(fs.readFileSync(path.resolve(root, p), "utf8")); }
  catch (e) { throw new Error(`Failed to read schema: ${p}\n${e.message}`); }
}

function validateWithSchema(schema, data, name) {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const ok = validate(data);
  if (!ok) {
    const msg = ajv.errorsText(validate.errors, { separator: "\n- " });
    throw new Error(`[${name}] schema validation failed:\n- ${msg}`);
  }
}

function verifyChain(timeline) {
  // 1) record_cid 唯一
  const seen = new Set();
  for (const r of timeline) {
    if (seen.has(r.record_cid)) throw new Error(`Duplicate record_cid: ${r.record_cid}`);
    seen.add(r.record_cid);
  }
  // 2) prev_cid 必须指向已存在的 record_cid（或为 null）
  const cidSet = new Set(timeline.map((r) => r.record_cid));
  for (const r of timeline) {
    if (r.prev_cid && !cidSet.has(r.prev_cid)) {
      throw new Error(`prev_cid ${r.prev_cid} not found for record ${r.record_cid}`);
    }
  }
  // 3) 无环：深度最多等于条目数
  for (const r of timeline) {
    let step = 0;
    let cur = r;
    const byCid = new Map(timeline.map((x) => [x.record_cid, x]));
    while (cur && cur.prev_cid) {
      step++;
      if (step > timeline.length) throw new Error(`Cycle detected from ${r.record_cid}`);
      cur = byCid.get(cur.prev_cid);
    }
  }
}

try {
  const timeline = loadJSON(timelinePath);
  const revocations = loadJSON(revokePath);

  const timelineSchema = loadSchema("schemas/key-timeline.json");
  const revokeSchema = loadSchema("schemas/revocation.json");

  validateWithSchema(timelineSchema, timeline, "key-timeline");
  validateWithSchema(revokeSchema, revocations, "revocation");

  verifyChain(timeline);

  // 附加提示：列出已吊销但仍在时间线出现的 key_id（不强制失败，交由上层策略决定）
  const revokedIds = new Set((revocations.revoked || []).map((r) => r.key_id));
  const intersection = [...new Set(timeline.map((r) => r.key_id))].filter((id) => revokedIds.has(id));
  if (intersection.length) {
    console.warn(`[warn] revoked keys still present in timeline: ${intersection.join(", ")}`);
  }

  console.log("Keychain verification: OK");
  process.exit(0);
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
