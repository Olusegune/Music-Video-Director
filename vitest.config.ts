import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    // .claude/worktrees holds full copies of the repo from agent sessions.
    // Without this they are collected too: the suite reported 166 files and
    // 1308 tests when the real one is 46 and 393, and the extra 915 were a
    // stale copy testing itself — green regardless of what src/ does.
    exclude: ["**/node_modules/**", "**/dist/**", ".claude/**", "src-tauri/**"],
  },
});
