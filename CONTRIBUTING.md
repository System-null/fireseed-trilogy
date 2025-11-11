# Contributing to Fireseed Trilogy

Fireseed Trilogy explores a machine-readable civilization interface. We welcome contributions that help make the project more robust, inclusive, and accessible to future intelligences and present-day communities alike. This guide outlines how to get started and how to collaborate effectively.

## 📬 Before You Start
- **Review the docs**: Skim [`README.md`](README.md), [`START_HERE.md`](START_HERE.md), and the materials in [`docs/`](docs/) to understand the project's goals and terminology.
- **Check existing work**: Search through existing [issues](https://github.com/System-null/fireseed-trilogy/issues) and pull requests to avoid duplicating effort.
- **Respect the Code of Conduct**: Participation in any Fireseed space requires that you follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## 🧭 Ways to Contribute
- **Bug reports**: Use the "Submit Capsule" template when the issue affects capsule validation, otherwise use "Catalog Update" for broader project improvements.
- **Feature proposals**: Share concrete suggestions with enough context for reviewers to evaluate scope, security, and ethical implications.
- **Documentation**: Clarify onboarding docs, improve language accessibility, or add missing cross-references.
- **Tooling & tests**: Expand schema validation tests, strengthen CI pipelines, or improve offline tooling.

## 🔧 Development Workflow
1. **Fork & branch**: Create feature branches from `main` using a descriptive prefix (e.g., `feature/`, `fix/`, or `docs/`).
2. **Install dependencies**: Run `npm run vendors` to fetch vendor assets when required by UI tools, and review `scripts/` for project-specific helpers.
3. **Implement & test**:
   - Keep commits atomic and well-described.
   - Add or update tests when changing schema logic, generators, or validators.
   - Run project-specific scripts or validators relevant to your change (document commands in your PR description).
4. **Linting & formatting**: Match the surrounding style. Configure editors to trim trailing whitespace and retain UTF-8 encoding for multilingual content.
5. **Document your changes**: Update READMEs, schema references, or changelogs when behavior changes.
6. **Submit a pull request**: Reference related issues, describe testing performed, and note any follow-up tasks.

## ✅ Pull Request Checklist
- [ ] Tests (manual or automated) cover the change.
- [ ] Documentation is updated (or confirmed not needed).
- [ ] Security and ethics implications have been considered.
- [ ] No large binary files or system artefacts (e.g., `.DS_Store`) are committed.

## 🛡️ Responsible Innovation
Fireseed touches on long-term stewardship and digital legacy. When proposing changes, consider:
- **Consent & privacy**: Does the change protect contributors' data and intentions?
- **Resilience**: Does it improve the survivability of capsules across time and storage mediums?
- **Interoperability**: Does it align with open standards (DID, JSON-LD, schema registries)?
- **Ethical safeguards**: Are there edge cases that require additional community review?

## 🤝 Need Help?
- Start a GitHub Discussion for open-ended questions.
- Reach out via issues for blockers that need maintainer input.
- Share context (logs, schema snippets, screenshots) to accelerate triage.

We are grateful for every contribution that helps illuminate and preserve the fireseed. Thank you for building the machine-readable future with us.

## Commit message convention

Use **Conventional Commits**:
- `feat:` new feature → minor bump
- `fix:` bug fix → patch bump
- `perf:`, `refactor:`, `docs:`, `chore:` → no release by default

Examples:
- `feat(access): add orgOnly mode`
- `fix(sign): handle empty object deterministically`
