#!/usr/bin/env bash
set -euo pipefail
echo "Add SPDX-License-Identifier: MIT to source files"
git ls-files | grep -E '\\.(ts|tsx|js|mjs|cjs|sh|yml|yaml)$' | while read -r f; do
  if ! grep -q "SPDX-License-Identifier:" "$f"; then
    if [[ "$f" =~ \\.sh$ ]]; then
      sed -i '1i # SPDX-License-Identifier: MIT' "$f"
    else
      sed -i '1i // SPDX-License-Identifier: MIT' "$f"
    fi
  fi
done
echo "Done."
