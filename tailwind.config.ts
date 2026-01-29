import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Space theme colors
        space: {
          900: '#0f0a1a',
          800: '#130d1f',
          700: '#1a1229',
          600: '#231a38',
          500: '#2d2440',
          400: '#3d3356',
          300: '#6b5b8a',
          200: '#9d8fc4',
          100: '#c9c0e8',
          50: '#f4f0ff',
        },
        cosmic: {
          purple: '#a855f7',
          violet: '#8b5cf6',
          indigo: '#6366f1',
          pink: '#ec4899',
          blue: '#3b82f6',
        },
      },
      backgroundImage: {
        'space-gradient': 'linear-gradient(135deg, #0f0a1a 0%, #1a1229 50%, #130d1f 100%)',
        'cosmic-gradient': 'linear-gradient(135deg, #a855f7 0%, #6366f1 50%, #8b5cf6 100%)',
        'nebula-gradient': 'linear-gradient(180deg, rgba(168, 85, 247, 0.1) 0%, transparent 100%)',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(168, 85, 247, 0.3)',
        'glow-sm': '0 0 10px rgba(168, 85, 247, 0.2)',
        'glow-lg': '0 0 40px rgba(168, 85, 247, 0.4)',
      },
    },
  },
  plugins: [],
};
export default config;
