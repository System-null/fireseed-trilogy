import { describe, it, expect } from "vitest";
import { computeCid, signCid } from "../scripts/sign-capsule.mjs";

const PRIV = "21a1d5b0a5b0e7b52e4b7b8c3c1f2a1a21a1d5b0a5b0e7b52e4b7b8c3c1f2a1a";
// 仅用于测试，请勿用于生产

describe("deterministic CID + signing", () => {
  it("same object with different key order -> same CID", async () => {
    const a = { a: 1, b: { x: 2, y: 3 }, c: ["z", 9] };
    const b = { c: ["z", 9], b: { y: 3, x: 2 }, a: 1 };
    const cidA = await computeCid(a);
    const cidB = await computeCid(b);
    expect(cidA.toString()).toBe(cidB.toString());

    const sigA = await signCid(cidA, PRIV);
    const sigB = await signCid(cidB, PRIV);
    expect(sigA.signatureHex).toBe(sigB.signatureHex);
    expect(sigA.pubkeyHex).toBe(sigB.pubkeyHex);
  });
});
