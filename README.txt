Generator i18n Fix Kit (no-structure-change)
--------------------------------------------
This kit inserts a small init snippet into your existing public/generator.html
so i18n runs after the page loads. It does NOT change any structure, styles,
or script order.

USAGE (macOS / zsh)
1) Unzip this kit into your repo root (the folder that contains the 'public' dir):
   unzip -o ~/Downloads/generator-i18n-fixed.zip -d .

2) Run the patch:
   bash patch_i18n_init.sh

3) Commit & push:
   git add public/generator.html
   git commit -m "fix(i18n): enable language switch with initI18n() call"
   git push origin main

After 1–2 minutes, open:
https://system-null.github.io/<owner>/fireseed-trilogy/public/generator.html

If the page was cached, force refresh (Shift + Reload).
