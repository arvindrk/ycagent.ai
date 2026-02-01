import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Background layers
        background: "var(--color-background)",
        foreground: "var(--color-foreground)",

        // Linear color system
        "bg-primary": "var(--color-bg-primary)",
        "bg-secondary": "var(--color-bg-secondary)",
        "bg-tertiary": "var(--color-bg-tertiary)",
        "bg-quaternary": "var(--color-bg-quaternary)",
        "bg-quinary": "var(--color-bg-quinary)",

        "text-primary": "var(--color-text-primary)",
        "text-secondary": "var(--color-text-secondary)",
        "text-tertiary": "var(--color-text-tertiary)",

        "border-primary": "var(--color-border-primary)",
        "border-secondary": "var(--color-border-secondary)",
        "border-tertiary": "var(--color-border-tertiary)",

        // Component colors
        card: "var(--color-card)",
        "card-foreground": "var(--color-card-foreground)",
        popover: "var(--color-popover)",
        "popover-foreground": "var(--color-popover-foreground)",
        primary: "var(--color-primary)",
        "primary-foreground": "var(--color-primary-foreground)",
        secondary: "var(--color-secondary)",
        "secondary-foreground": "var(--color-secondary-foreground)",
        muted: "var(--color-muted)",
        "muted-foreground": "var(--color-muted-foreground)",
        accent: "var(--color-accent)",
        "accent-foreground": "var(--color-accent-foreground)",
        destructive: "var(--color-destructive)",
        "destructive-foreground": "var(--color-destructive-foreground)",
        border: "var(--color-border)",
        input: "var(--color-input)",
        ring: "var(--color-ring)",

        // Status colors
        green: "var(--color-green)",
        blue: "var(--color-blue)",
        red: "var(--color-red)",
        orange: "var(--color-orange)",
        yellow: "var(--color-yellow)",
      },
      borderRadius: {
        none: "var(--radius-none)",
        xs: "var(--radius-xs)",
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
        full: "var(--radius-full)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        focus: "var(--shadow-focus)",
        "inner-glow": "var(--shadow-inner-glow)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter Variable", "SF Pro Display", "-apple-system", "system-ui", "sans-serif"],
        mono: ["var(--font-inter-mono)", "Berkeley Mono", "ui-monospace", "SF Mono", "Menlo", "monospace"],
      },
      fontWeight: {
        normal: "400",
        medium: "510",
        semibold: "538",
      },
      transitionDuration: {
        fast: "var(--transition-fast)",
        base: "var(--transition-base)",
        normal: "var(--transition-normal)",
        slow: "var(--transition-slow)",
        slower: "var(--transition-slower)",
      },
      transitionTimingFunction: {
        "in": "var(--ease-in)",
        "out": "var(--ease-out)",
        "in-out": "var(--ease-in-out)",
        "spring": "var(--ease-spring)",
      },
      keyframes: {
        "scale-in": {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "scale-in": "scale-in 150ms ease-out",
        "fade-in": "fade-in 200ms ease-out",
        "slide-up": "slide-up 200ms ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
