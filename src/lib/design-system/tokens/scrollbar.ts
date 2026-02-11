export const scrollbar = {
  width: '6px',
  thumb: {
    base: 'rgba(255, 255, 255, 0.1)',
    hover: 'rgba(255, 255, 255, 0.2)',
  },
  blur: '8px',
} as const;

export type ScrollbarToken = typeof scrollbar;

export const scrollbarVars = {
  '--scrollbar-width': scrollbar.width,
  '--scrollbar-thumb-base': scrollbar.thumb.base,
  '--scrollbar-thumb-hover': scrollbar.thumb.hover,
  '--scrollbar-blur': scrollbar.blur,
} as const;
