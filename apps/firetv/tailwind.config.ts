import type { Config } from 'tailwindcss';
import nativewindPreset from 'nativewind/preset';
import { tokens } from './src/design/tokens';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [nativewindPreset],
  theme: {
    extend: {
      colors: tokens.colors,
      fontSize: tokens.fontSize,
      spacing: tokens.spacing,
      borderRadius: tokens.borderRadius,
      boxShadow: tokens.boxShadow,
      fontFamily: {
        sans: ['Inter', 'System'],
        display: ['Manrope', 'System'],
        mono: ['JetBrainsMono', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
