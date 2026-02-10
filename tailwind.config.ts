import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Override default gray with warm stone palette
        gray: colors.stone,
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Warm sand scale (replaces space theme)
        sand: {
          900: '#1A1816',
          800: '#2C2722',
          700: '#3D3630',
          600: '#5C534B',
          500: '#8C8279',
          400: '#ADA398',
          300: '#CFC6BB',
          200: '#E8E0D8',
          100: '#F5F0EB',
          50: '#FAF9F6',
        },
        // Warm accent colors (replaces cosmic)
        warm: {
          sienna: '#C2703E',
          terracotta: '#BF6A39',
          clay: '#A05A32',
          copper: '#D4956A',
          sage: '#6B8F71',
        },
      },
      backgroundImage: {
        'sand-gradient': 'linear-gradient(135deg, #1A1816 0%, #2C2722 50%, #3D3630 100%)',
        'warm-gradient': 'linear-gradient(135deg, #C2703E 0%, #BF6A39 50%, #D4956A 100%)',
        'glow-gradient': 'linear-gradient(180deg, rgba(194, 112, 62, 0.06) 0%, transparent 100%)',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(194, 112, 62, 0.15)',
        'glow-sm': '0 0 10px rgba(194, 112, 62, 0.10)',
        'glow-lg': '0 0 40px rgba(194, 112, 62, 0.20)',
      },
    },
  },
  plugins: [],
};
export default config;
