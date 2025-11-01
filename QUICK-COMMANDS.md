# Quick merge steps

```bash
# from the repository root
git add CITATION.cff docs/CITING.md .github .zenodo.json README.additions.md
git commit -m "polish(v0.2.7d): citations, CI (links+mdlint), pages deploy, templates"
git push origin main
```

Then enable **Settings → Pages → Build and deployment → GitHub Actions** (if not enabled).
