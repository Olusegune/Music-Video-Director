// Default (suite) resolution of "which welcome screen does this build show".
// The musicvideo edition never imports this file at all — vite.config.ts
// aliases this exact specifier to ActiveWelcomeScreen.musicvideo.tsx instead,
// so the suite's five-studio art and copy (and its hero image) never enter
// that build's module graph. Same mechanism as disabledStudioStub.tsx.
export { WelcomeScreen as ActiveWelcomeScreen } from "./WelcomeScreen";
