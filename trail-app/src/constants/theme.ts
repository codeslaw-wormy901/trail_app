/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

// A single warm accent, used sparingly (an active favorite star, a filter
// switch) so it reads as an intentional highlight rather than noise.
export const AccentColor = '#f59e0b';

// OSM's sac_scale, labeled by transform_region.py's SAC_SCALE_LABELS —
// deepening red for harder trails, with no color (a neutral gray dot) for
// the "not specified in OpenStreetMap" case, honest about what's unknown
// rather than implying a difficulty that isn't there.
const DifficultyColors: Record<string, string> = {
  Easy: '#16a34a',
  Moderate: '#d97706',
  Difficult: '#ea580c',
  'Very difficult': '#dc2626',
  Extreme: '#991b1b',
};

export function difficultyColor(difficulty?: string | null): string {
  return (difficulty && DifficultyColors[difficulty]) || '#9ca3af';
}

// Applied to the map's floating panels (detail sheet, pickers, filter menu)
// so they read as lifted above the map rather than flat-pasted onto it.
export const PanelShadow =
  Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
    },
    android: {
      elevation: 6,
    },
  }) ?? {};

export const PanelRadius = 18;
