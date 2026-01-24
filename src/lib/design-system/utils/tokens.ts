/**
 * Design Token Utility Functions
 */

import { spacing, radius, shadows } from '../tokens';

/**
 * Get spacing value by key
 */
export function getSpacing(key: keyof typeof spacing): string {
  return spacing[key];
}

/**
 * Get radius value by key
 */
export function getRadius(key: keyof typeof radius): string {
  return radius[key];
}

/**
 * Get shadow value by key
 */
export function getShadow(key: keyof typeof shadows): string {
  return shadows[key];
}

/**
 * Create CSS variable reference
 */
export function cssVar(name: string): string {
  return `var(${name})`;
}

/**
 * Create alpha variant of a color
 */
export function withAlpha(color: string, alpha: number): string {
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}
