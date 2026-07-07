import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/platform/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-button)] text-sm font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none active:translate-y-px [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "grad-primary text-white shadow-sm shadow-primary/25 hover:brightness-110",
        accent:
          "grad-accent font-semibold text-[#06283d] shadow-sm hover:brightness-105",
        gold:
          "grad-gold font-semibold text-[var(--color-gold-foreground)] shadow-sm shadow-[var(--color-gold)]/25 hover:brightness-105",
        success: "bg-success text-white shadow-sm hover:brightness-110",
        secondary:
          "border border-border bg-elevated text-foreground hover:border-primary/40 hover:bg-elevated/70",
        ghost: "text-muted hover:bg-elevated hover:text-foreground",
        outline:
          "border border-border bg-transparent text-foreground hover:border-primary/40 hover:bg-elevated",
        danger: "bg-danger text-white shadow-sm hover:brightness-110",
      },
      size: {
        sm: "h-8 px-3",
        md: "h-9 px-4",
        lg: "h-10 px-5 text-[15px]",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
);
Button.displayName = "Button";

export { Button, buttonVariants };
