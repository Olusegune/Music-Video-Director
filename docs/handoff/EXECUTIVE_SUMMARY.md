# Wheelbarrow MotionForge AI — Executive Summary

**One line:** A local Windows app that takes a creator from *idea → script → storyboard →
camera & lighting → AI image frames → AI video clips → export*, in one studio-style
workspace, using their own AI provider keys.

## Where it stands today
A **working application**, not a concept. The full pipeline runs end-to-end and has been
validated with live providers (Google Gemini for writing/direction, fal.ai for images and
video). It installs as a normal Windows app (`.msi`/`.exe`).

**Already working:** projects & autosave · AI creative direction, shot breakdown, camera
plan, lighting plan · per-shot **image** and **video** generation · upload-your-own-frame ·
project-wide **style** presets · **brand kits** · **asset library** · **export** to
PDF / Word / Markdown / JSON · light & dark themes · Windows installer.

## What it's worth
It replaces a fragmented workflow across ChatGPT + Midjourney + Runway + Figma + Notion
with one consistent workspace — targeting an **~80% cut in pre-production planning time**
and a single-session path from idea to a first storyboard with real frames.

## The next priority (this handoff's headline)
Give creators **professional control of generation**: choose the **AI model per shot**
(e.g. FLUX vs Imagen for a frame; Kling vs Veo vs Runway vs Seedance for a clip) and attach
**reference images/videos** (a starting frame, a style or character reference, etc.) — with
the interface adapting to whatever the chosen model supports. Architected as a data-driven
"model catalog," so **adding a new AI model is a configuration change, not a rebuild.**

## After that (roadmap)
Reusable **character / environment / prop libraries** for true cross-shot consistency →
**integrated audio** (voice, music, SFX) → **timeline editing** → professional **menus,
onboarding, and polish**. Detailed milestones (M1–M6) with estimates are in the dev plan.

## What it needs from here
- One experienced full-stack engineer (Rust + React) to take the milestone roadmap forward.
- The next ~2–3 weeks of work delivers the per-shot model-selection feature on top of the
  working foundation.
- Before public release: code-sign the installer and re-enable a tightened security policy
  (both noted in the plan).

## The bet
> Let creators produce complete, professional-quality films, explainers, ads, and visual
> stories from a single workspace — with consistent style, characters, environments, props,
> and audio — while staying private and local.

*Full detail: see the engineering handoff in `docs/handoff/` (PRD, architecture, data model
& API, the model-selection spec, dev plan, and setup).*
