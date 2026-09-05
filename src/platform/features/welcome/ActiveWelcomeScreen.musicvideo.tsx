// musicvideo-edition resolution of "which welcome screen does this build
// show" — see ActiveWelcomeScreen.tsx. Only ever reached via vite.config.ts's
// mode-conditional alias, never imported directly.
export { MusicVideoWelcomeScreen as ActiveWelcomeScreen } from "./MusicVideoWelcomeScreen";
