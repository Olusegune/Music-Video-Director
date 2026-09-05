import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmProvider, useConfirm } from "./confirm-dialog";

function Harness({ onResult }: { onResult: (ok: boolean) => void }) {
  const confirm = useConfirm();
  return (
    <button
      onClick={async () => {
        const ok = await confirm({ title: "Delete this song?", body: "This can't be undone." });
        onResult(ok);
      }}
    >
      Delete
    </button>
  );
}

const renderHarness = (onResult: (ok: boolean) => void) =>
  render(
    <ConfirmProvider>
      <Harness onResult={onResult} />
    </ConfirmProvider>
  );

describe("useConfirm", () => {
  it("resolves true only after the user confirms", async () => {
    const onResult = vi.fn();
    renderHarness(onResult);

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    // Nothing has resolved while the dialog is still open — the guarded action
    // must not run ahead of the answer.
    expect(onResult).not.toHaveBeenCalled();
    expect(screen.getByText("This can't be undone.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(true));
  });

  it("resolves false when cancelled", async () => {
    const onResult = vi.fn();
    renderHarness(onResult);
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
  });

  it("resolves false on Escape", async () => {
    const onResult = vi.fn();
    renderHarness(onResult);
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
  });

  it("closes the dialog once answered", async () => {
    renderHarness(vi.fn());
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("resolves true without a provider, so a destructive button is never a silent no-op", async () => {
    const onResult = vi.fn();
    render(<Harness onResult={onResult} />);
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(true));
  });
});
