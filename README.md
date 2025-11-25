# Fireseed Trilogy Lab

> 🌏 This is the **English** README. For Chinese, see [中文版说明 (README.zh-CN.md)](README.zh-CN.md).

Prototype tools for personal **fireseed capsules** —  
companion project to the book trilogy:

- **System Exodus** (Vol. I)  
- **Beyond the System** (Vol. II)  
- **The Last Interface** (Vol. III)

Code & experiments by **Fireseed Trilogy Lab**.

---

## 1. What is a “Fireseed”?

In the books, a **fireseed** is not your “soul” and not a mystical backup of your consciousness.

It is a **structured bundle of evidence** about how a person saw the world, made decisions, drew boundaries, and dealt with their own illusions — written in a format that:

- A human can read as a narrative;
- A future AGI can parse as structured data;
- Even a hypothetical higher-level system could treat as a node in a larger graph.

This repository is an **engineering companion** to that idea.  
It tries to answer a narrow, technical question:

> Given limited tooling and no central authority,  
> how far can one person go in compressing their life stance  
> into a self-contained, verifiable “capsule”?

This is **not** an “upload your mind” project.  
It is a set of small, composable experiments around format, protocol, and responsibility.

---

## 2. Where the Lab Sits in the Trilogy

The Fireseed Trilogy looks roughly like this:

1. **System Exodus** — an individual waking up and stepping out of existing systems;
2. **Beyond the System** — possible paths for strong AI and new governance orders;
3. **The Last Interface** — defining the Fireseed, shaping existence and long-horizon preservation.

This repository mainly supports:

- Vol. I: **System Exodus** — by giving individuals a way to compress their own “system exit logs” into capsules;
- Vol. II: **Beyond the System** — by treating Fireseeds as inputs into future governance / protocol design;
- Vol. III: **The Last Interface** — by experimenting with multi-media, multi-replica, self-hosted preservation.

You can enjoy the books without touching the tools.  
You can also use the tools without reading the books.  
They share the same **spirit**, not the same target audience.

---

## 3. What This Repo Actually Does (Current Status)

The Lab is intentionally **high-friction** and **self-hosted**.  
There is no user login, no hosted database, and no API to upload your life.

Instead, you get a set of prototype tools you run yourself.

### 3.1 Web app routes

All routes are part of the Next.js web app in `apps/web`.

#### `/capsule/create` — One-click Fireseed Capsule Wizard

- A step-by-step wizard to draft a fireseed:
  - Title, context, audience;
  - Long-form narrative (your story, decisions, regrets, boundaries);
  - Optional hints and notes for future readers (human or machine).
- The wizard computes a **Fireseed Index** (0–100) —  
  a toy, explainable score based on:
  - Length and structure;
  - Presence of time-span markers;
  - Decision-style phrasing (“when X happened, I chose Y…”).
- When you are ready, it can generate a **capsule ZIP** with:

  ```text
  fireseed-capsule-<id>/
    ├─ capsule.json        # structured, machine-readable fireseed
    ├─ meta.json           # schema version, IDs, index, encryption info
    ├─ HUMAN_READABLE.md   # narrative view for humans
    └─ README.txt          # how to back up, what this is (human-facing)
  ```

#### Optional local encryption

* You can **enable password encryption** for the capsule:

  * All encryption happens locally in your browser using **PBKDF2 + AES-GCM**;
  * The cleartext `capsule.json` is replaced by a binary `capsule.enc`;
  * `meta.json` records:

    ```jsonc
    {
      "encryption": "aes-256-gcm",
      "encryptionParams": {
        "kdf": "PBKDF2-SHA256",
        "salt": "... base64 ...",
        "iv": "... base64 ...",
        "iterations": 210000
      }
    }
    ```

* HUMAN_READABLE.md and README.txt remain in cleartext by design:

  * This is a **threat model choice**:
    the goal is to block casual snooping, not nation-state adversaries;
  * The README inside the ZIP explains the risk model in plain language.

#### `/verify/local` — Local capsule verification & decryption

* Upload or drag-and-drop a capsule ZIP;
* Everything runs in your browser:

  * No file contents are uploaded anywhere;
  * The page:

    * Validates the folder structure;
    * Parses `meta.json` and checks schema version;
    * Detects encryption mode and Fireseed Index.
* For encrypted capsules:

  * You can enter the password;
  * The page attempts decryption using the `encryptionParams` from meta;
  * On success, it shows a small, non-sensitive subset of the capsule;
  * On failure, it tells you so — without leaking the contents.

#### `/lab` — Fireseed Lab view

Think of this as a **local dashboard** driven by a `Manifest` stored in your browser (IndexedDB):

* See a list of capsules you have generated or imported:

  * `capsuleId`, title, createdAt, primaryLanguage, encryption mode, index;
  * Basic health status based on what the Manifest knows.
* **Manifest health check**:

  * A “check all” button runs a light-weight consistency check;
  * Individual capsules have a “check” action for targeted inspection.
* **Export / import of the Manifest**:

  * Export a pretty-printed `manifest.json`;
  * Import a manifest JSON from another device or backup.
* **M-Disc / external drive export** (disc bundle):

  * Select multiple capsules and export a disk-friendly bundle:

    ```text
    fireseed-disc-YYYYMMDD/
      ├─ manifest.json
      ├─ capsules/
      │    ├─ <capsuleId1>.zip
      │    ├─ <capsuleId2>.zip
      └─ README-MDISC.txt
    ```
  * You can then burn / copy this to M-Disc, USB drives, or other media.
* **Paper “clue cards”**:

  * Generate a minimal JSON “trace” (capsuleId, hashes, known replicas);
  * Encode it as QR codes and export as PNG for printing;
  * These function as **physical civilization fragments**.
* **IPFS / Arweave adapters (self-hosted only)**:

  * Bring-your-own IPFS node / gateway:

    * Configure your HTTP API endpoint in the Lab;
    * Upload selected capsules, and record `ipfs://<cid>` as replicas.
  * Experimental Arweave flow:

    * The Lab expects you to provide key material and/or relay endpoints;
    * All signing and uploads remain on the client side if you choose so;
    * The Manifest records `ar://<txId>` style locations.

> The Lab does **not** pin, store, or host anything on your behalf.
> You bring your own infrastructure; the Lab only knows how to talk to it.

---

## 3.2 Core packages

At a high level:

* `packages/core/`
  Shared types and core logic:

  * Capsule schemas & validators;
  * StorageAdapter interfaces and storage types;
  * Manifest types (`FireseedManifest`, `FireseedManifestCapsuleEntry`, etc.).
* `apps/web/`
  The Next.js web app implementing `/capsule/create`, `/verify/local`, `/lab` and the related UI.
* `docs/`
  Architecture notes, the Phase 2.x roadmap, and protocol drafts.

Interfaces and layout are still evolving.
The goal is not a polished SaaS dashboard, but a transparent prototype you can inspect, fork, or break.

---

## 4. Self-hosted vs Hosted Service

There are **two** ways to use the Fireseed ecosystem.

### 4.1 Self-hosted (this repository)

If you enjoy doing things with your own hands, or simply want your fate in your own control:

* Clone this repo and run the web app locally;
* Generate, encrypt, and verify fireseed capsules fully on your own machine;
* Use the Lab to:

  * Export M-Disc bundles;
  * Generate QR clue cards;
  * Talk to your own IPFS / Arweave / storage infrastructure.

All keys and decisions stay with you.
You are responsible for:

* Secret management;
* Backup strategy;
* Long-term durability.

### 4.2 Hosted frontend service (optional, separate)

If you don’t have time or energy to set all this up, but still want to leave behind a serious, well-structured fireseed, the authors are also building a public-facing frontend:

* **Fireseed Frontend Service (experimental)**
  [https://www.fireseed.net](https://www.fireseed.net)

It runs on the **same open protocol and formats**, but:

* Provides lower-friction guidance for non-technical users;
* May offer paid custodial options (e.g. managed storage, guided workflows);
* Does **not** replace this repository.

Think of it as a **one-time fireseed workshop**, not a platform you must depend on forever.

You can:

* Use only the open-source tools;
* Use only the hosted service;
* Use both, or neither.

The stance of the project is simple:

> To give you more choices, not to make choices for you.

---

## 5. Status, Non-goals & Warnings

This is **prototype-level** infrastructure.

* Interfaces and implementations will keep changing as the spec evolves;
* We make **no guarantees** about:

  * Security;
  * Availability;
  * Long-term durability;
* Nothing here is a “digital afterlife” product.

### Non-goals

* No hosted user accounts in this repo;
* No centralized database of everyone’s fireseeds;
* No promise that “if you use this, you will be remembered forever”.

If you build serious workflows or products on top of Fireseed:

* Treat this repo as a **reference implementation & protocol sketch**;
* Perform your own audits, testing, and threat modeling.

---

## 6. Running Locally

A minimal, generic setup (adapt to your toolchain):

```bash
# clone
git clone https://github.com/System-null/fireseed-trilogy.git
cd fireseed-trilogy

# install dependencies (npm / yarn / pnpm — choose one)
npm install
# or: yarn
# or: pnpm install

# start the web app
npm run dev

# by default the Lab is available at:
#   http://localhost:3000/capsule/create
#   http://localhost:3000/verify/local
#   http://localhost:3000/lab
```

Check the `docs/` folder and inline comments for more detailed setup and experimental features.

---

## 7. Licensing & Credits

* Code in this repository is released under the **MIT License** (see [LICENSE](LICENSE));
* The books and textual content are © by the author(s) and may have different licensing for commercial publication.

Core roles:

* **System Null (杨帆)** — concept design, system architecture, trilogy author;
* **JiaMing Yang** — GitHub development, implementation, and repository maintenance.

Forks, experiments, and even aggressive refactors are welcome —
as long as you keep your users as informed and as free as you hope to be.

---

- Links: [Repository](https://github.com/System-null/fireseed-trilogy) · [Hosted frontend (experimental)](https://www.fireseed.net)
