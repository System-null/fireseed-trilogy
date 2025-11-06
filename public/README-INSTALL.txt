Fireseed i18n overlay v2.3 (safe, multi-switch, no structure change)
===================================================================

Files:
- scripts/i18n-auto.js              (safe stub; disables legacy auto-i18n)
- scripts/i18n-overlay.v2.3.js      (new overlay, supports zh/en/ja, DID button, tri-lingual note)

Install (from repository root):
1) Unzip into ./public
   unzip ~/Downloads/fireseed-i18n-overlay-v2.3.zip -d ./public

2) Ensure generator.html loads the overlay AFTER other scripts, near the bottom:
   <script src="./scripts/i18n-overlay.v2.3.js?v=2301"></script>

3) Commit & push
   git add public/scripts/i18n-auto.js public/scripts/i18n-overlay.v2.3.js public/generator.html
   git commit -m "i18n: add overlay v2.3 and disable legacy auto"
   git push origin main

If the old console message "i18n-auto is initialized" still appears, hard-bust cache by renaming the overlay file and updating the script tag (e.g., v2.3.1).
