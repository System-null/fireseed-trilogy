# Contributing Guide

Thank you for considering a contribution to Fireseed Trilogy.

This document explains how to propose changes, report issues, and work with the project maintainers.

---

## 1. Ways to Contribute

You can help in many ways:

- Reporting bugs or usability problems.
- Improving documentation and examples.
- Proposing better schema designs for capsules.
- Strengthening security, determinism, and tests.
- Implementing compatible tools in other languages.

---

## 2. Before You Start

- Make sure you have a GitHub account.
- Read the main [README.md](README.md) and [ARCHITECTURE.md](docs/ARCHITECTURE.md) to understand the project goals.
- Check existing issues to avoid duplicates.

If you are unsure whether an idea fits, feel free to open a **Discussion** or a draft issue first.

---

## 3. Reporting Issues

When filing an issue:

- Use a clear, descriptive title.
- Describe the environment (OS, Node.js version, browser, etc.).
- Provide steps to reproduce the problem.
- Include logs or screenshots when helpful.

> ⚠️ For security-sensitive issues, please **do not** open a public issue. Follow the instructions in [SECURITY.md](SECURITY.md) instead.

---

## 4. Development Setup

Basic steps to get started:

```bash
git clone https://github.com/System-null/fireseed-trilogy.git
cd fireseed-trilogy
npm install
```

Useful scripts (see `package.json` for the full list):

```bash
npm run dev    # Start the Next.js app at http://localhost:3000
npm test       # Run unit tests
npm run lint   # Lint the codebase (if configured)
```

---

## 5. Pull Request Guidelines

When submitting a pull request (PR):

- Keep the scope focused when possible.
- Make sure tests pass (`npm test`) and the code builds.
- Update or add documentation if your change affects behavior or public APIs.
- Write clear commit messages (Conventional Commits style is welcome but not required).

Your PR description should include:

- What problem it solves.
- What changed and why.
- Any caveats, migration notes, or follow-up work.

---

## 6. Code Style

General guidelines:

- Prefer TypeScript for new frontend code under `app/` and `lib/`.
- Keep CLI scripts small and composable under `scripts/`.
- Avoid duplicating logic between the web app and CLI—share utilities when reasonable.
- Write tests for non-trivial logic, especially anything related to determinism or security.
- When in doubt, follow existing patterns in the codebase.

---

## 7. License

By contributing, you agree that your contributions will be licensed under the same terms as the rest of the project:

- Code: MIT
- Textual content: CC BY 4.0
