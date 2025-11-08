#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
source = ROOT / "requirements.txt"
target = ROOT / "requirements-ci.txt"

def main() -> None:
    heavy = {"faiss-cpu", "sentence-transformers"}
    lines = source.read_text(encoding="utf-8").splitlines()
    filtered = [line for line in lines if not any(line.startswith(pkg + "==") for pkg in heavy)]
    target.write_text("\n".join(filtered) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
