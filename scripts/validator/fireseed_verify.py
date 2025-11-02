#!/usr/bin/env python3
"""Fireseed Capsule Validator (CLI) v0.2.9"""
import argparse, json, sys
try:
    import yaml
    import jsonschema
except Exception:
    print("Missing deps: pip install -r scripts/validator/requirements.txt", file=sys.stderr); sys.exit(2)

def load_yaml(p):
    with open(p, "r", encoding="utf-8") as f: return yaml.safe_load(f)
def load_json(p):
    with open(p, "r", encoding="utf-8") as f: return json.load(f)
def validate_schema(data, schema):
    jsonschema.Draft202012Validator.check_schema(schema)
    v = jsonschema.Draft202012Validator(schema)
    return sorted(v.iter_errors(data), key=lambda e: e.path)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("capsule")
    ap.add_argument("--schema", default="schemas/capsule_v0.2.9.json")
    ap.add_argument("--sig")
    ap.add_argument("--ipfs")
    args = ap.parse_args()

    data = load_yaml(args.capsule)
    schema = load_json(args.schema)
    errs = validate_schema(data, schema)
    if errs:
        print("ERROR: schema validation failed:")
        for e in errs:
            path = "/".join([str(x) for x in e.path])
            print(f" - {path or '$'} :: {e.message}")
        sys.exit(1)
    print("OK: schema valid.")
    if args.sig:
        print("NOTE: PGP verify yourself: gpg --verify capsule_v0.yaml.asc capsule_v0.yaml")
    if args.ipfs:
        print("NOTE: IPFS check manually: ipfs cat <CID> or gateway fetch.")

if __name__ == "__main__":
    main()
