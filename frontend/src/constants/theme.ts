export const COLORS = {
  // Backgrounds
  bg_primary: '#070708',
  bg_secondary: '#0B0B0D',
  bg_elevated: '#101014',
  bg_card: '#121216',
  bg_input: '#17171B',

  // Amber/Orange accent spectrum
  accent_primary: '#E8912D',
  accent_light: '#F0A54A',
  accent_muted: '#C47A24',
  accent_subtle: 'rgba(232, 145, 45, 0.12)',
  /** Selected pills, toggles (stronger than accent_subtle, softer than accent_primary slab) */
  accent_fill: 'rgba(232, 145, 45, 0.28)',
  accent_glow: 'rgba(232, 145, 45, 0.06)',

  // Complementary gold for achievement/status copy
  gold_primary: '#D6A84E',
  gold_light: '#E2B866',
  gold_subtle: 'rgba(214, 168, 78, 0.14)',

  // Text
  text_primary: '#F2F0ED',
  text_secondary: '#9B9A97',
  text_tertiary: '#5C5B58',
  text_on_accent: '#0C0C0E',

  // Semantic
  success: '#4ADE80',
  success_subtle: 'rgba(74, 222, 128, 0.12)',
  warning: '#FBBF24',
  warning_subtle: 'rgba(251, 191, 36, 0.12)',
  danger: '#F87171',
  danger_subtle: 'rgba(248, 113, 113, 0.12)',

  // Borders
  border: '#2B2B30',
  border_subtle: '#1A1A1E',
} as const;

export { FONT } from './fontFaces';

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;
