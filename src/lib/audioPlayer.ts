// Global audio player — a single <audio> element + store, shared by Song Studio
// and the persistent mini-player so playback follows the user across the whole
// app and there's never more than one track playing at once.

import { create } from "zustand";

export interface LoopRange {
  start: number;
  end: number;
}

interface PlayerState {
  songId: string | null;
  name: string;
  src: string;
  playing: boolean;
  time: number;
  duration: number;
  volume: number;
  loop: LoopRange | null;
  /** Load a track (objectUrl=true means we own its lifecycle and revoke it). */
  load: (songId: string, name: string, src: string, objectUrl?: boolean) => void;
  unload: () => void;
  toggle: () => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (t: number) => void;
  skip: (delta: number) => void;
  setVolume: (v: number) => void;
  setLoop: (loop: LoopRange | null) => void;
}

let el: HTMLAudioElement | null = null;
let prevObjectUrl: string | null = null;

function ensure(set: (p: Partial<PlayerState>) => void, get: () => PlayerState): HTMLAudioElement {
  if (el) return el;
  el = new Audio();
  el.preload = "auto";
  el.addEventListener("timeupdate", () => {
    if (!el) return;
    const loop = get().loop;
    if (loop && el.currentTime >= loop.end) el.currentTime = loop.start;
    set({ time: el.currentTime });
  });
  el.addEventListener("durationchange", () => set({ duration: el?.duration || 0 }));
  el.addEventListener("play", () => set({ playing: true }));
  el.addEventListener("pause", () => set({ playing: false }));
  el.addEventListener("ended", () => set({ playing: false }));
  return el;
}

export const useAudioPlayer = create<PlayerState>((set, get) => ({
  songId: null,
  name: "",
  src: "",
  playing: false,
  time: 0,
  duration: 0,
  volume: 1,
  loop: null,

  load: (songId, name, src, objectUrl = false) => {
    const a = ensure(set, get);
    if (get().src !== src) {
      if (prevObjectUrl && prevObjectUrl !== src) {
        URL.revokeObjectURL(prevObjectUrl);
        prevObjectUrl = null;
      }
      prevObjectUrl = objectUrl ? src : null;
      a.src = src || "";
      if (src) a.load();
      set({ time: 0, duration: 0, playing: false, loop: null });
    }
    set({ songId, name, src });
  },

  unload: () => {
    const a = ensure(set, get);
    a.pause();
    a.removeAttribute("src");
    if (prevObjectUrl) {
      URL.revokeObjectURL(prevObjectUrl);
      prevObjectUrl = null;
    }
    set({ songId: null, name: "", src: "", playing: false, time: 0, duration: 0, loop: null });
  },

  toggle: () => {
    const a = ensure(set, get);
    if (!get().src) return;
    if (a.paused) void a.play().catch(() => {});
    else a.pause();
  },
  play: () => {
    const a = ensure(set, get);
    if (get().src) void a.play().catch(() => {});
  },
  pause: () => ensure(set, get).pause(),
  stop: () => {
    const a = ensure(set, get);
    a.pause();
    a.currentTime = 0;
    set({ time: 0 });
  },
  seek: (t) => {
    const a = ensure(set, get);
    const clamped = Math.max(0, Math.min(a.duration || get().duration || t, t));
    a.currentTime = clamped;
    set({ time: clamped });
  },
  skip: (delta) => {
    const a = ensure(set, get);
    const dur = a.duration || get().duration || 0;
    a.currentTime = Math.max(0, Math.min(dur, a.currentTime + delta));
    set({ time: a.currentTime });
  },
  setVolume: (v) => {
    const a = ensure(set, get);
    a.volume = Math.max(0, Math.min(1, v));
    set({ volume: a.volume });
  },
  setLoop: (loop) => set({ loop }),
}));
