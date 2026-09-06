import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SectionEditor } from "./SectionEditor";
import type { SongSection } from "@/apps/music-video/lib/songBrain";

const transcribeSongSection = vi.fn();
vi.mock("@/platform/lib/ipc", () => ({
  api: {
    // Returning an Error from the spy means "reject with this". The spy itself
    // never throws and never holds a rejected promise, either of which the
    // runner reports as an uncaught failure even when the component catches
    // the rejection it is actually handed.
    transcribeSongSection: async (...args: unknown[]) => {
      const result = transcribeSongSection(...args);
      if (result instanceof Error) throw result;
      return result;
    },
  },
}));

const section = (over: Partial<SongSection> = {}): SongSection =>
  ({
    id: "s1",
    kind: "Chorus",
    label: "Chorus 1",
    start: 112,
    end: 130,
    energy: 0.8,
    ...over,
  }) as SongSection;

function setup(over: Partial<SongSection> = {}) {
  const onPatch = vi.fn();
  render(
    <SectionEditor section={section(over)} onPatch={onPatch} onSeek={() => {}} songId="song-1" />
  );
  return { onPatch };
}

beforeEach(() => transcribeSongSection.mockReset());

describe("SectionEditor transcription", () => {
  it("offers nothing to transcribe with when there is no song to slice", () => {
    render(<SectionEditor section={section()} onPatch={vi.fn()} onSeek={() => {}} />);
    expect(screen.queryByRole("button", { name: /transcribe/i })).not.toBeInTheDocument();
  });

  it("transcribes the section's own time range, not the whole song", async () => {
    transcribeSongSection.mockResolvedValue("we dance until the lights go out");
    const { onPatch } = setup();
    await userEvent.click(screen.getByRole("button", { name: /^Transcribe$/i }));
    expect(transcribeSongSection).toHaveBeenCalledWith("song-1", 112, 18);
    expect(onPatch).toHaveBeenCalledWith({ lyricsText: "we dance until the lights go out" });
  });

  // The whole point is a draft the user corrects, so it must say so rather
  // than presenting a guess as finished work.
  it("tells the user to check what it wrote", async () => {
    transcribeSongSection.mockResolvedValue("some words");
    setup();
    await userEvent.click(screen.getByRole("button", { name: /^Transcribe$/i }));
    expect(await screen.findByText(/fix anything it misheard/i)).toBeInTheDocument();
  });

  // An intro or instrumental break genuinely has no words. That is an answer,
  // not a failure, and must not read like one.
  it("reports an instrumental section as empty rather than as an error", async () => {
    transcribeSongSection.mockResolvedValue("");
    const { onPatch } = setup();
    await userEvent.click(screen.getByRole("button", { name: /^Transcribe$/i }));
    expect(await screen.findByText(/No sung words heard/i)).toBeInTheDocument();
    expect(onPatch).not.toHaveBeenCalled();
  });

  it("never replaces written lyrics without asking", async () => {
    transcribeSongSection.mockResolvedValue("machine heard this");
    const { onPatch } = setup({ lyricsText: "words I typed myself" });
    await userEvent.click(screen.getByRole("button", { name: /re-transcribe/i }));
    expect(transcribeSongSection).not.toHaveBeenCalled();
    expect(onPatch).not.toHaveBeenCalled();
    expect(screen.getByText(/Replace the lyrics already written/i)).toBeInTheDocument();
  });

  it("keeps the user's lyrics when they decline the replacement", async () => {
    const { onPatch } = setup({ lyricsText: "words I typed myself" });
    await userEvent.click(screen.getByRole("button", { name: /re-transcribe/i }));
    await userEvent.click(screen.getByRole("button", { name: /keep mine/i }));
    expect(transcribeSongSection).not.toHaveBeenCalled();
    expect(onPatch).not.toHaveBeenCalled();
  });

  it("replaces them once the user confirms", async () => {
    transcribeSongSection.mockResolvedValue("machine heard this");
    const { onPatch } = setup({ lyricsText: "words I typed myself" });
    await userEvent.click(screen.getByRole("button", { name: /re-transcribe/i }));
    await userEvent.click(screen.getByRole("button", { name: /^Replace$/i }));
    expect(onPatch).toHaveBeenCalledWith({ lyricsText: "machine heard this" });
  });

  it("surfaces a provider failure instead of failing silently", async () => {
    transcribeSongSection.mockReturnValue(new Error("No Gemini API key set."));
    const { onPatch } = setup();
    await userEvent.click(screen.getByRole("button", { name: /^Transcribe$/i }));
    expect(await screen.findByText(/No Gemini API key set/i)).toBeInTheDocument();
    expect(onPatch).not.toHaveBeenCalled();
  });
});
