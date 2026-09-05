import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// Tauri expects a fixed dev port and ignores src-tauri for HMR.
const host = process.env.TAURI_DEV_HOST;

// Entry components for the four studios the Music Video Director edition
// doesn't ship (productConfig.ts). Aliasing their exact import specifiers to
// a trivial stub means Rollup's module graph never pulls in the real
// component tree (or anything only they import) for that build — this is
// what actually drops the chunk from dist/, not just hides it in the UI.
// Order matters: these specific entries must come before the general "@"
// alias below so they're matched first.
const disabledStudioAliases = {
  "@/apps/motion-studio/MotionStudio": path.resolve(
    __dirname,
    "./src/platform/lib/disabledStudioStub.tsx"
  ),
  "@/apps/glam-studio/GlamStudio": path.resolve(
    __dirname,
    "./src/platform/lib/disabledStudioStub.tsx"
  ),
  "@/apps/webstudio/WebStudio": path.resolve(
    __dirname,
    "./src/platform/lib/disabledStudioStub.tsx"
  ),
  "@/apps/campaign/CampaignStudio": path.resolve(
    __dirname,
    "./src/platform/lib/disabledStudioStub.tsx"
  ),
  // Same mechanism, different reason: this build shows its own splash
  // (MusicVideoWelcomeScreen), so the suite's five-studio welcome screen
  // — and the ~330KB hero image only it imports — should never enter this
  // build's module graph at all, not just go unrendered at runtime.
  "@/platform/features/welcome/ActiveWelcomeScreen": path.resolve(
    __dirname,
    "./src/platform/features/welcome/ActiveWelcomeScreen.musicvideo.tsx"
  ),
};

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? "1.0.0"),
  },
  resolve: {
    alias: {
      ...(mode === "musicvideo" ? disabledStudioAliases : {}),
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Vite options tailored for Tauri development.
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: false,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
