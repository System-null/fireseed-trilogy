import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(__dirname, "..");
const script = path.join(repo, "scripts", "verify-keychain.mjs");
const fx = (p) => path.join(repo, "tests", "fixtures", p);

describe("key timeline verification", () => {
  it("passes with valid chain", () => {
    execFileSync("node", [
      script,
      "--timeline", fx("timeline.valid.json"),
      "--revocations", fx("revocations.empty.json"),
    ], { stdio: "inherit" });
  });

  it("fails when prev_cid points to nowhere", () => {
    let failed = false;
    try {
      execFileSync("node", [
        script,
        "--timeline", fx("timeline.bad-prev.json"),
        "--revocations", fx("revocations.empty.json"),
      ], { stdio: "pipe" });
    } catch (_) { failed = true; }
    expect(failed).toBe(true);
  });
});
