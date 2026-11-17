"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger" | "success";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:brightness-110",
  secondary: "bg-muted text-foreground hover:bg-muted/70",
  ghost: "bg-transparent hover:bg-muted text-foreground",
  outline: "border border-border bg-card hover:bg-muted text-foreground",
  danger: "bg-danger text-white hover:brightness-110 dark:text-red-950",
  success: "bg-success text-white hover:brightness-110 dark:text-emerald-950",
};

const sizes: Record<Size, string> = {
  sm: "min-h-11 px-3.5 py-2 text-sm rounded-xl gap-1.5",
  md: "min-h-11 px-5 py-2.5 text-sm rounded-xl gap-2",
  lg: "min-h-13 px-6 py-3.5 text-base rounded-xl gap-2.5 font-semibold",
  icon: "h-11 w-11 shrink-0 rounded-xl",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex max-w-full items-center justify-center text-center font-semibold leading-snug transition-[background-color,color,filter,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-45 disabled:pointer-events-none select-none motion-reduce:transform-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
