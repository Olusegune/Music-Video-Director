# Wheelbarrow MotionForge — QA / Testing Checklist

Run in the **native app** (`npm run tauri dev`, or the installed build) so the real
Rust backend, SQLite, keychain, and providers are exercised.

## 0. Setup
- [ ] Launch the app; window opens, no blank screen
- [ ] Settings → add **Gemini** key (Prompt Pack), **fal.ai** key (image + video)
- [ ] (Optional) add Google Imagen / Veo keys
- [ ] Keys show "Configured"; restart app → still configured (keychain persistence)

## 1. Projects
- [ ] Create a project from a **template** chip (fields prefill)
- [ ] Create a blank project; appears in sidebar + dashboard
- [ ] Delete a project; removed everywhere
- [ ] Reopen app → projects persist (SQLite)

## 2. Prompt Pack (Gemini)
- [ ] Enter a brief, **Generate Pack** → returns structured pack < ~30s
- [ ] Creative Direction / Style / QC all populated and **editable**
- [ ] Edits autosave ("Saved" indicator); reopen project → edits persist
- [ ] **Regenerate** replaces the pack
- [ ] Error path: remove Gemini key → clear error message

## 3. Storyboard
- [ ] Add / duplicate / move / delete / **lock** shots; renumbering correct
- [ ] Locked shot disables field editing + generation
- [ ] Edits persist across navigation

## 4. Camera & Lighting Directors
- [ ] Camera tab: every shot has populated, editable camera plan
- [ ] Lighting tab: every shot has populated, editable lighting plan
- [ ] Continuity reads sensibly across shots (key direction, color)

## 5. Image generation (fal.ai / Imagen)
- [ ] **Generate frame** on a shot → image appears, persists
- [ ] **Generate Frames** (batch) processes all unlocked shots
- [ ] Image file lands in app assets dir; reload → still displays

## 6. Video generation (fal.ai / Veo)
- [ ] **Generate video** on a shot → polls, then plays inline (poster = frame)
- [ ] Video persists across navigation
- [ ] Timeout / failure surfaces a readable error

## 7. Brand Kits
- [ ] Create a brand kit (colors/fonts/voice/rules); persists
- [ ] Select it in a project; **Generate** → output reflects the brand
- [ ] Selection remembered per project

## 8. Asset Library
- [ ] Shows all generated frames/videos across projects
- [ ] "video" badge on video items; click opens the project

## 9. Exports
- [ ] Export **Markdown / JSON / PDF / DOCX** → files written to exports dir
- [ ] Open each: content correct, readable, no missing sections
- [ ] PDF paginates; DOCX opens in Word

## 10. UI / theme / a11y
- [ ] Light/Dark toggle switches instantly; both legible; persists on restart
- [ ] Keyboard: tab through controls, visible focus rings
- [ ] Icon buttons have accessible labels (screen reader / hover)
- [ ] Reduced-motion respected

## 11. Build / distribution
- [ ] `npm run tauri build` produces `.msi` and `.exe` in
      `src-tauri/target/release/bundle/`
- [ ] Installer runs; app launches from Start menu
- [ ] (Production) code-sign the installer to avoid SmartScreen warnings

## Known limitations to validate against
- fal.ai is the primary, verified media provider; **Veo/Imagen are best-effort**
  (confirm model ids) and **kie.ai is not wired**
- Video is **text-to-video** (image-to-video is a follow-up)
- Generated media display uses the Tauri asset protocol; verify images/videos load
  in the packaged build, not just dev
