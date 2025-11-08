from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PYTHON = sys.executable


def run_command(args: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        args,
        cwd=ROOT,
        check=False,
        text=True,
        capture_output=True,
    )


def test_verify_vectors() -> None:
    generate = run_command([PYTHON, "scripts/generate_test_vectors.py"])
    assert generate.returncode == 0, generate.stderr

    success = run_command([PYTHON, "scripts/verify.py", "examples/vectors/pass.json"])
    assert success.returncode == 0
    assert success.stdout.strip() == "VERIFY OK"

    for name in ("missing_field", "tampered_byte", "revoked_key"):
        result = run_command([PYTHON, "scripts/verify.py", f"examples/vectors/{name}.json"])
        assert result.returncode == 1
        assert result.stdout.strip().startswith("VERIFY FAIL:"), result.stdout
