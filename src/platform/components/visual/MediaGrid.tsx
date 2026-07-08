import type { ReactNode } from "react";
import { cn } from "@/platform/lib/utils";

export function MediaGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("columns-1 gap-4 sm:columns-2 xl:columns-3", className)}>{children}</div>
  );
}

export function MediaGridItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("mb-4 break-inside-avoid", className)}>{children}</div>;
}
