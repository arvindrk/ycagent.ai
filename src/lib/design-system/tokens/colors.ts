/**
 * Linear Design System - Color Tokens
 * Extracted from linear.app production
 */

export const colors = {
  // Semantic colors
  semantic: {
    primary: '#f7f8f8',
    secondary: '#28282c',
  },

  // Background layers (dark theme - primary)
  background: {
    primary: '#08090a',
    secondary: '#1c1c1f',
    tertiary: '#232326',
    quaternary: '#28282c',
    quinary: '#282828',
    marketing: '#010102',
    level1: '#0f1011',
    level3: '#191a1b',
  },

  // Text colors
  text: {
    primary: '#f7f8f8',
    secondary: '#8a8f98',
    tertiary: '#62666d',
  },

  // Border colors
  border: {
    primary: '#23252a',
    secondary: '#34343a',
    tertiary: '#3e3e44',
  },

  // Line colors
  line: {
    primary: '#37393a',
    secondary: '#202122',
    tertiary: '#18191a',
    quaternary: '#141515',
    tint: '#141516',
  },

  // Accent colors
  accent: {
    default: '#7170ff',
    hover: '#828fff',
    tint: '#18182f',
  },

  // Brand colors
  brand: {
    bg: '#5e6ad2',
  },

  // Status colors
  status: {
    green: '#4cb782',
    blue: '#4ea7fc',
    red: '#eb5757',
    orange: '#fc7840',
    yellow: '#f2c94c',
  },

  // Linear product colors
  linear: {
    plan: '#68cc58',
    build: '#d4b144',
    security: '#7a7fad',
  },

  // Utility colors
  white: '#ffffff',
  black: '#000000',

  // Overlay
  overlay: {
    primary: 'rgba(0, 0, 0, 0.9)',
  },

  // Header
  header: {
    bg: 'rgba(11, 11, 11, 0.8)',
  },
} as const;

export type ColorToken = typeof colors;

// CSS variable mapping
export const colorVars = {
  '--color-white': colors.white,
  '--color-black': colors.black,

  // Backgrounds
  '--color-bg-primary': colors.background.primary,
  '--color-bg-secondary': colors.background.secondary,
  '--color-bg-tertiary': colors.background.tertiary,
  '--color-bg-quaternary': colors.background.quaternary,
  '--color-bg-quinary': colors.background.quinary,
  '--color-bg-marketing': colors.background.marketing,
  '--color-bg-level-1': colors.background.level1,
  '--color-bg-level-3': colors.background.level3,

  // Text
  '--color-text-primary': colors.text.primary,
  '--color-text-secondary': colors.text.secondary,
  '--color-text-tertiary': colors.text.tertiary,

  // Borders
  '--color-border-primary': colors.border.primary,
  '--color-border-secondary': colors.border.secondary,
  '--color-border-tertiary': colors.border.tertiary,

  // Lines
  '--color-line-primary': colors.line.primary,
  '--color-line-secondary': colors.line.secondary,
  '--color-line-tertiary': colors.line.tertiary,
  '--color-line-quaternary': colors.line.quaternary,
  '--color-line-tint': colors.line.tint,

  // Accent
  '--color-accent': colors.accent.default,
  '--color-accent-hover': colors.accent.hover,
  '--color-accent-tint': colors.accent.tint,

  // Brand
  '--color-brand-bg': colors.brand.bg,

  // Status
  '--color-green': colors.status.green,
  '--color-blue': colors.status.blue,
  '--color-red': colors.status.red,
  '--color-orange': colors.status.orange,
  '--color-yellow': colors.status.yellow,

  // Linear
  '--color-linear-plan': colors.linear.plan,
  '--color-linear-build': colors.linear.build,
  '--color-linear-security': colors.linear.security,

  // Overlay
  '--color-overlay-primary': colors.overlay.primary,

  // Header
  '--header-bg': colors.header.bg,
} as const;

// Light theme overrides
export const lightThemeColors = {
  '--color-bg-primary': '#ffffff',
  '--color-bg-secondary': '#f7f8f8',
  '--color-bg-tertiary': '#f0f0f0',
  '--color-bg-quaternary': '#e6e6e6',

  '--color-text-primary': '#08090a',
  '--color-text-secondary': '#62666d',
  '--color-text-tertiary': '#8a8f98',

  '--color-border-primary': '#e6e6e6',
  '--color-border-secondary': '#d0d0d0',
  '--color-border-tertiary': '#e6e6e6',
} as const;
