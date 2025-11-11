#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import Ajv from "ajv/dist/2020.js";

const ajv = new Ajv({ allErrors: true, strict: false });
const schema = JSON.parse(fs.readFileSync(path.resolve("schemas/access.schema.json"), "utf8"));
const validate = ajv.compile(schema);

const files = process.argv.slice(2);
if (!files.length) {
  console.error("Usage: node scripts/validate-access.mjs <json1> [json2 ...]");
  process.exit(2);
}

let ok = true;
for (const f of files) {
  const data = JSON.parse(fs.readFileSync(path.resolve(f), "utf8"));
  const valid = validate(data);
  if (!valid) {
    ok = false;
    console.error(`[access] ${f} invalid:\n- ${ajv.errorsText(validate.errors, { separator: "\n- " })}\n`);
  } else {
    console.log(`[access] ${f} OK`);
  }
}
process.exit(ok ? 0 : 1);
