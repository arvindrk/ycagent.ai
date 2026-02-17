import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-fast ease-out focus-visible:outline-none focus-visible:shadow-focus disabled:pointer-events-none disabled:opacity-50 cursor-pointer [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "dark:bg-bg-quaternary text-text-primary border border-border-secondary shadow-sm hover:opacity-90",
        primary:
          "bg-bg-quaternary text-text-primary border border-border-tertiary hover:bg-bg-tertiary",
        secondary:
          "bg-transparent text-text-tertiary border border-border-primary hover:bg-bg-tertiary hover:text-text-primary",
        ghost:
          "bg-transparent hover:bg-bg-tertiary",
        accent:
          "bg-accent text-white hover:bg-accent-hover shadow-sm",
        "yc-accent":
          "bg-yc-accent/80 text-white hover:bg-yc-accent-hover active:bg-yc-accent-active shadow-sm",
        destructive:
          "bg-red text-white hover:opacity-90",
      },
      size: {
        default: "h-10 px-4 py-2 text-[15px] rounded-lg",
        sm: "h-8 px-3 text-[13px] rounded-md",
        lg: "h-12 px-6 text-[17px] rounded-lg",
        icon: "h-10 w-10 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
