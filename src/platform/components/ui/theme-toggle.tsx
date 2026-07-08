import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/platform/store/useTheme";
import { cn } from "@/platform/lib/utils";

/** Segmented light/dark switch. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 rounded-[var(--radius-button)] border border-border bg-background p-0.5",
        className
      )}
    >
      <ToggleBtn active={theme === "light"} onClick={() => setTheme("light")} label="Light">
        <Sun className="h-3.5 w-3.5" />
      </ToggleBtn>
      <ToggleBtn active={theme === "dark"} onClick={() => setTheme("dark")} label="Dark">
        <Moon className="h-3.5 w-3.5" />
      </ToggleBtn>
    </div>
  );
}

function ToggleBtn({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-pressed={active}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-[5px] px-2 py-1 text-xs font-medium transition-colors",
        active ? "bg-elevated text-foreground" : "text-muted hover:text-foreground"
      )}
    >
      {children}
      {label}
    </button>
  );
}
