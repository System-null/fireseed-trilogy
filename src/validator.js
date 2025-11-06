import fs from "fs";
import yaml from "yaml";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const schema = JSON.parse(fs.readFileSync("src/capsule.schema.json", "utf-8"));
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("Usage: node src/validator.js <capsule.yaml>");
  process.exit(2);
}

let failed = false;
for (const f of files) {
  const data = yaml.parse(fs.readFileSync(f, "utf-8"));
  const valid = validate(data);
  if (valid) console.log(`✅ ${f} valid`);
  else {
    console.log(`❌ ${f} invalid:`);
    console.log(validate.errors);
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
