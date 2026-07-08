import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/platform/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium",
  {
    variants: {
      variant: {
        default: "bg-elevated text-muted",
        primary: "bg-primary/15 text-primary",
        accent: "bg-accent/15 text-accent",
        success: "bg-success/15 text-success",
        warning: "bg-warning/15 text-warning",
        danger: "bg-danger/15 text-danger",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
