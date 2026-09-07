// Patches the compiled Windows exe's own PE icon resource before Tauri
// bundles it into installers.
//
// Why this exists: `tauri_build::build()` (src-tauri/build.rs) did not
// embed the Music Video edition's icon (icons-mv/icon.ico) into
// director-studio.exe on Windows, even though it's listed first in
// `bundle.icon` in tauri.mv.conf.json and every other config-merge-driven
// value (window title, product name) *does* pick up the `--config`
// override correctly. Root cause not fully chased down under time
// pressure — the practical fix is to patch the exe directly with rcedit
// (the same tool Electron's tooling uses for this) as a `beforeBundleCommand`
// hook, which runs after `cargo build` compiles the exe but before NSIS/MSI
// bundle it, so the installers embed the corrected exe too.
//
// If a future Tauri/tauri-build upgrade fixes the underlying embedding, this
// script becomes a no-op safety net, not a bug — rcedit setting an icon that
// already matches doesn't change anything observable.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const rcedit = path.join(root, "tools", "rcedit.exe");
const exe = path.join(root, "src-tauri", "target", "release", "director-studio.exe");
const icon = path.join(root, "src-tauri", "icons-mv", "icon.ico");

if (process.platform !== "win32") {
  console.log("[fix-windows-icon] non-Windows platform, skipping.");
  process.exit(0);
}
for (const [label, p] of [
  ["rcedit", rcedit],
  ["exe", exe],
  ["icon", icon],
]) {
  if (!existsSync(p)) {
    console.error(`[fix-windows-icon] missing ${label}: ${p}`);
    process.exit(1);
  }
}

execFileSync(rcedit, [exe, "--set-icon", icon], { stdio: "inherit" });
console.log("[fix-windows-icon] patched", exe, "with", icon);
