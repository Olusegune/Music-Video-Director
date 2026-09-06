import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Select } from "@/platform/components/ui/select";

function Basic({ onChange = vi.fn(), value = "b" }: { onChange?: (v: string) => void; value?: string }) {
  return (
    <Select value={value} onChange={onChange} aria-label="Pick one">
      <option value="a">Alpha</option>
      <option value="b">Beta</option>
      <option value="c">Gamma</option>
    </Select>
  );
}

describe("Select", () => {
  it("shows the selected option's label, not its value", () => {
    render(<Basic />);
    expect(screen.getByRole("combobox")).toHaveTextContent("Beta");
  });

  it("opens on click and lists every option", async () => {
    render(<Basic />);
    await userEvent.click(screen.getByRole("combobox"));

    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  it("reports the chosen value and closes", async () => {
    const onChange = vi.fn();
    render(<Basic onChange={onChange} />);

    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(screen.getByRole("option", { name: /gamma/i }));

    expect(onChange).toHaveBeenCalledWith("c");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  // The whole reason this component exists: a native select's OS popup can be
  // cropped by an ancestor's overflow. Rendering into a portal at the document
  // root is what makes that impossible.
  it("renders its list outside the scroll container that would clip it", async () => {
    render(
      <div style={{ overflow: "hidden", height: 40 }} data-testid="clipper">
        <Basic />
      </div>
    );
    await userEvent.click(screen.getByRole("combobox"));

    const clipper = screen.getByTestId("clipper");
    expect(clipper).not.toContainElement(screen.getByRole("listbox"));
    expect(document.body).toContainElement(screen.getByRole("listbox"));
  });

  it("keeps grouped options under their group heading", async () => {
    render(
      <Select value="" onChange={vi.fn()} aria-label="Styles">
        <optgroup label="Anime">
          <option value="a1">Shonen</option>
        </optgroup>
        <optgroup label="Painterly">
          <option value="p1">Arcane</option>
        </optgroup>
      </Select>
    );
    await userEvent.click(screen.getByRole("combobox"));

    expect(screen.getByText("Anime")).toBeInTheDocument();
    expect(screen.getByText("Painterly")).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(2);
  });

  it("is operable by keyboard", async () => {
    const onChange = vi.fn();
    render(<Basic onChange={onChange} value="a" />);

    const trigger = screen.getByRole("combobox");
    trigger.focus();
    await userEvent.keyboard("{ArrowDown}"); // opens
    await userEvent.keyboard("{ArrowDown}"); // a -> b
    await userEvent.keyboard("{Enter}");

    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("closes on Escape without changing the value", async () => {
    const onChange = vi.fn();
    render(<Basic onChange={onChange} />);

    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("listbox")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("closes when clicking outside", async () => {
    render(
      <div>
        <Basic />
        <button type="button">elsewhere</button>
      </div>
    );
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(screen.getByRole("button", { name: "elsewhere" }));

    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("marks the current option as selected for assistive tech", async () => {
    render(<Basic />);
    await userEvent.click(screen.getByRole("combobox"));

    expect(screen.getByRole("option", { name: /beta/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("option", { name: /alpha/i })).toHaveAttribute("aria-selected", "false");
  });

  it("will not select a disabled option", async () => {
    const onChange = vi.fn();
    render(
      <Select value="a" onChange={onChange} aria-label="Models">
        <option value="a">Available</option>
        <option value="b" disabled>
          Needs a key
        </option>
      </Select>
    );
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(screen.getByRole("option", { name: /needs a key/i }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not open when disabled", async () => {
    render(
      <Select value="a" onChange={vi.fn()} disabled aria-label="Locked">
        <option value="a">Alpha</option>
      </Select>
    );
    await userEvent.click(screen.getByRole("combobox"));

    expect(screen.queryByRole("listbox")).toBeNull();
  });
});

describe("option labels", () => {
  // String(children) joins an array with commas, so an interpolated option
  // rendered as "Intro, — ,neon hums" in the live app.
  it("flattens an option built from several children", async () => {
    const label = "Intro";
    const detail = "neon hums over an empty street";
    render(
      <Select value="a" onChange={() => {}}>
        <option value="a">
          {label} — {detail}
        </option>
      </Select>
    );
    expect(screen.getByRole("combobox")).toHaveTextContent("Intro — neon hums over an empty street");
    expect(screen.getByRole("combobox")).not.toHaveTextContent(",");
  });
});
