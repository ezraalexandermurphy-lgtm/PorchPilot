/**
 * PorchPilot Theme
 *
 * Brand colors, typography, and spacing constants
 * used throughout the app for a consistent look and feel.
 *
 * Brand personality: Trustworthy, warm, modern, helpful.
 */

export const colors = {
  // Primary palette — deep navy blue (trust, reliability)
  primary: {
    50: '#E8F0FE',
    100: '#C5D9F7',
    200: '#9EBAF0',
    300: '#6F9AE6',
    400: '#4A7FD9',
    500: '#2C5FBF', // Main brand blue
    600: '#1E4A9E',
    700: '#1A3A5C', // Dark navy — splash bg
    800: '#0F2A44',
    900: '#081B2E',
  },

  // Accent palette — warm amber/orange (porch light, warmth)
  accent: {
    50: '#FFF8E7',
    100: '#FEEDC3',
    200: '#FDE09B',
    300: '#FCD26E',
    400: '#FBC542',
    500: '#F5B122', // Main accent — delivery alert
    600: '#D99417',
    700: '#B07612',
    800: '#87590D',
    900: '#5E3D08',
  },

  // Semantic colors
  success: '#2E7D32',
  warning: '#E67E22',
  error: '#C0392B',
  info: '#2980B9',

  // Neutrals
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },

  // Background colors
  background: {
    primary: '#FFFFFF',
    secondary: '#F8F9FC',
    tertiary: '#F0F2F8',
    card: '#FFFFFF',
    elevated: '#FFFFFF',
  },

  // Text colors
  text: {
    primary: '#1A1A2E',
    secondary: '#5A5A72',
    tertiary: '#9E9EB0',
    inverse: '#FFFFFF',
    link: '#2C5FBF',
    accent: '#F5B122',
    success: '#2E7D32',
    warning: '#E67E22',
    error: '#C0392B',
  },

  // Border colors
  border: {
    light: '#E8E8F0',
    medium: '#D0D0E0',
    focus: '#2C5FBF',
  },
} as const;

export const typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
    mono: 'monospace',
  },

  fontSize: {
    xs: 10,
    sm: 12,
    base: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
    '5xl': 40,
  },

  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },

  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 56,
  '7xl': 64,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
} as const;

const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} as const;

export type Theme = typeof theme;
export default theme;
