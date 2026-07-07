# Wheelbarrow MotionForge — Engineering Handoff

This folder is the developer handoff package for **Wheelbarrow Studios MotionForge AI**,
a local-first Windows desktop app that turns an idea into a complete motion-graphics
production package (creative direction → camera → lighting → image frames → video
clips → export), using the user's own AI provider keys.

Read in this order:

| # | Doc | What it covers |
|---|-----|----------------|
| 1 | [PRD.md](PRD.md) | Product vision, users, scope, requirements, success metrics, non-goals |
| 2 | [ARCHITECTURE.md](ARCHITECTURE.md) | Stack, repo structure, provider layer, data flow, security |
| 3 | [DATA_MODEL_AND_API.md](DATA_MODEL_AND_API.md) | SQLite schema, TypeScript types, Tauri command (IPC) reference |
| 4 | [FEATURE_MODEL_SELECTION.md](FEATURE_MODEL_SELECTION.md) | **Per-shot model selection + reference images/videos** (priority feature) |
| 5 | [DEV_PLAN.md](DEV_PLAN.md) | What's built, what remains, prioritized roadmap, estimates, risks |
| 6 | [SETUP.md](SETUP.md) | Prerequisites, run, build, and packaging instructions |

## TL;DR for the engineer

- **It already runs.** Phases 0–6 are built and the full pipeline works end-to-end
  against real providers (Gemini text, fal.ai image + video). A signed-able Windows
  installer is produced by `npm run tauri build`.
- **Stack:** Tauri 2 (Rust) + Vite + React 19 + TypeScript + Tailwind v4. SQLite for
  storage, OS keychain for API keys. **All provider calls go through Rust** — the
  frontend never holds a key.
- **Your headline task:** replace today's "one default provider" generation with a
  **capability-driven model catalog** where the user picks the image/video **model per
  shot** and attaches **reference images/videos** whose available slots are determined
  by the chosen model. See [FEATURE_MODEL_SELECTION.md](FEATURE_MODEL_SELECTION.md).
- **Source of truth for the broader product vision** lives in the repo root
  `MOTIONFORGE_PLAN.md`; this handoff supersedes it where they differ.

## Current state callout

Project files / versioning (Save As, Open, Duplicate, version history) is **partially
implemented** at handoff (Rust commands largely done; frontend wiring in progress). It
is marked accordingly in [DEV_PLAN.md](DEV_PLAN.md). Everything else listed as "Built"
is functional.
