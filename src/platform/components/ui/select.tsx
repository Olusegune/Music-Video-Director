import * as React from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/platform/lib/utils";

// A themed replacement for native <select>.
//
// Two reasons it exists. A native <select> renders its list as an OS-level
// popup: it can't be themed (light-grey system menus against this app's dark
// UI) and it can't be positioned, which is why a picker near the bottom of a
// panel appeared to clip inside its container. This renders the list into a
// portal at the document root with fixed positioning, so no ancestor's
// `overflow: hidden` can crop it, and it flips above the trigger when there
// isn't room below.
//
// It deliberately accepts the same <option> / <optgroup> children a native
// select does, so migrating a call site is a one-token change and the option
// lists (including grouped ones like the style catalog) carry over unedited.

interface OptionItem {
  kind: "option";
  value: string;
  label: string;
  disabled?: boolean;
}
interface GroupItem {
  kind: "group";
  label: string;
  options: OptionItem[];
}
type Item = OptionItem | GroupItem;

/**
 * Flatten an option's children to plain text.
 *
 * `String(children)` looks right until an option interpolates anything —
 * `<option>{a} — {b}</option>` gives React an array, and Array.toString joins
 * it with commas, so the label rendered as "Intro, — ,neon hums". Walk the
 * node instead.
 */
function textOf(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (React.isValidElement(node)) {
    return textOf((node.props as { children?: React.ReactNode }).children);
  }
  return "";
}

/** Read <option>/<optgroup> children into a flat model we can render ourselves. */
function parseChildren(children: React.ReactNode): Item[] {
  const items: Item[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;

    if (child.type === "option") {
      const props = child.props as {
        value?: string | number;
        children?: React.ReactNode;
        disabled?: boolean;
      };
      const label = textOf(props.children);
      items.push({
        kind: "option",
        value: String(props.value ?? label),
        label,
        disabled: props.disabled,
      });
      return;
    }

    if (child.type === "optgroup") {
      const props = child.props as { label?: string; children?: React.ReactNode };
      const nested = parseChildren(props.children).filter(
        (item): item is OptionItem => item.kind === "option"
      );
      items.push({ kind: "group", label: props.label ?? "", options: nested });
    }
  });
  return items;
}

function flatten(items: Item[]): OptionItem[] {
  return items.flatMap((item) => (item.kind === "group" ? item.options : [item]));
}

export interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  /** Native-select parity: several call sites carry a real explanatory tooltip. */
  title?: string;
  /** Needed so an associated <label htmlFor> still points at this control. */
  id?: string;
  "aria-label"?: string;
}

export function Select({
  value,
  onChange,
  children,
  disabled,
  className,
  placeholder = "Select…",
  title,
  id,
  "aria-label": ariaLabel,
}: SelectProps) {
  const items = React.useMemo(() => parseChildren(children), [children]);
  const options = React.useMemo(() => flatten(items), [items]);
  const selected = options.find((option) => option.value === value);

  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState({ top: 0, left: 0, width: 0, flipped: false });

  const place = React.useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const maxHeight = 280;
    // Flip above when the space below can't hold the list — the exact case
    // that made a picker near the bottom of a panel look cut off.
    const spaceBelow = window.innerHeight - rect.bottom;
    const flipped = spaceBelow < Math.min(maxHeight, options.length * 34 + 16) && rect.top > spaceBelow;
    setPosition({
      top: flipped ? rect.top : rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      flipped,
    });
  }, [options.length]);

  React.useLayoutEffect(() => {
    if (!open) return;
    place();
    // Re-place rather than trying to follow the trigger: scrolling a panel
    // under an open menu should keep the two attached.
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, place]);

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || listRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  React.useEffect(() => {
    if (open) {
      const current = options.findIndex((option) => option.value === value);
      setActiveIndex(current >= 0 ? current : 0);
    }
  }, [open, options, value]);

  const commit = (option: OptionItem) => {
    if (option.disabled) return;
    onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const step = (delta: number) => {
    if (options.length === 0) return;
    let next = activeIndex;
    for (let i = 0; i < options.length; i++) {
      next = (next + delta + options.length) % options.length;
      if (!options[next]?.disabled) break;
    }
    setActiveIndex(next);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        setOpen(true);
      }
      return;
    }
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        step(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        step(-1);
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (options[activeIndex]) commit(options[activeIndex]);
        break;
      case "Escape":
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  let renderIndex = -1;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        title={title}
        id={id}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onKeyDown}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-[var(--radius-input)] border border-border bg-surface px-3 text-left text-sm text-foreground transition-colors",
          "focus-visible:border-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
      >
        <span className={cn("truncate", !selected && "text-muted")}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted" />
      </button>

      {open &&
        createPortal(
          <div
            ref={listRef}
            role="listbox"
            tabIndex={-1}
            onKeyDown={onKeyDown}
            style={{
              position: "fixed",
              top: position.flipped ? undefined : position.top,
              bottom: position.flipped ? window.innerHeight - position.top + 4 : undefined,
              left: position.left,
              width: position.width,
              maxHeight: 280,
            }}
            className="z-[200] overflow-y-auto rounded-[var(--radius-input)] border border-border bg-elevated p-1 shadow-xl"
          >
            {items.map((item, i) =>
              item.kind === "group" ? (
                <div key={`g${i}`}>
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
                    {item.label}
                  </div>
                  {item.options.map((option) => {
                    renderIndex++;
                    return (
                      <Row
                        key={option.value}
                        option={option}
                        active={renderIndex === activeIndex}
                        selected={option.value === value}
                        onPick={() => commit(option)}
                      />
                    );
                  })}
                </div>
              ) : (
                (() => {
                  renderIndex++;
                  const idx = renderIndex;
                  return (
                    <Row
                      key={item.value}
                      option={item}
                      active={idx === activeIndex}
                      selected={item.value === value}
                      onPick={() => commit(item)}
                    />
                  );
                })()
              )
            )}
          </div>,
          document.body
        )}
    </>
  );
}

function Row({
  option,
  active,
  selected,
  onPick,
}: {
  option: OptionItem;
  active: boolean;
  selected: boolean;
  onPick: () => void;
}) {
  return (
    <div
      role="option"
      aria-selected={selected}
      aria-disabled={option.disabled}
      onClick={onPick}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm",
        active && "bg-primary/12 text-primary",
        !active && "text-foreground hover:bg-surface",
        option.disabled && "cursor-not-allowed opacity-40"
      )}
    >
      <span className="min-w-0 flex-1 truncate">{option.label}</span>
      {selected && <Check className="h-3.5 w-3.5 shrink-0" />}
    </div>
  );
}
