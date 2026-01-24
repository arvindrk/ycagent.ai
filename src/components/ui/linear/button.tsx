import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-fast ease-out focus-visible:outline-none focus-visible:shadow-focus disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[#e6e6e6] text-[#08090a] border border-[#e6e6e6] shadow-sm hover:opacity-90 hover:translate-x-1 active:scale-[0.97]",
        primary:
          "bg-bg-quaternary text-text-primary border border-border-tertiary hover:bg-[rgba(255,255,255,0.08)] active:scale-[0.97]",
        secondary:
          "bg-transparent text-text-tertiary border-2 border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.08)] hover:text-text-primary active:scale-[0.97]",
        ghost:
          "bg-transparent hover:bg-[rgba(255,255,255,0.08)] active:scale-[0.97]",
        accent:
          "bg-accent text-white hover:bg-accent-hover active:scale-[0.97] shadow-sm",
        destructive:
          "bg-red text-white hover:opacity-90 active:scale-[0.97]",
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
