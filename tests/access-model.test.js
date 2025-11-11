import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import Ajv from "ajv/dist/2020.js";

const ajv = new Ajv({ allErrors: true, strict: false });
const schema = JSON.parse(fs.readFileSync(path.resolve("schemas/access.schema.json"), "utf8"));
const validate = ajv.compile(schema);

function ok(obj) { expect(validate(obj)).toBe(true); }
function bad(obj) { expect(validate(obj)).toBe(false); }

describe("access control schema (mutually exclusive)", () => {
  it("accepts public only", () => ok({ access: "public" }));
  it("rejects public with extra fields", () => bad({ access: "public", whitelist: ["did:pkh:eip155:1:0xabc"] }));
  it("accepts orgOnly with org", () => ok({ access: "orgOnly", org: "did:web:example.org" }));
  it("rejects orgOnly without org", () => bad({ access: "orgOnly" }));
  it("accepts whitelist with DIDs", () => ok({ access: "whitelist", whitelist: ["did:pkh:eip155:1:0xabc", "did:web:example.org"] }));
  it("rejects whitelist when empty", () => bad({ access: "whitelist", whitelist: [] }));
  it("rejects mixed states", () => bad({ access: "whitelist", org: "did:web:x", whitelist: ["did:pkh:eip155:1:0xabc"] }));
});
