import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-bg-quaternary text-text-primary hover:bg-[rgba(255,255,255,0.08)]",
        secondary:
          "border-transparent bg-bg-tertiary text-text-secondary hover:bg-bg-quaternary",
        success:
          "border-transparent bg-green/10 text-green hover:bg-green/20",
        destructive:
          "border-transparent bg-red/10 text-red hover:bg-red/20",
        warning:
          "border-transparent bg-orange/10 text-orange hover:bg-orange/20",
        info:
          "border-transparent bg-blue/10 text-blue hover:bg-blue/20",
        outline: "text-text-primary border-border-secondary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
