/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/renderer/index.html",
    "./src/renderer/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#dce8f4",
          sidebar: "#edf5fc",
          card: "#f6fbff",
          cardAlt: "#e8f1fa",
          border: "rgba(255,255,255,0.72)",
        },
        light: {
          bg: "#f4f5f7",
          card: "#ffffff",
          border: "#e6e8ec",
        },
        brand: {
          50: "#eafbf4",
          100: "#cdf5e3",
          200: "#9bebc9",
          300: "#62dca8",
          400: "#34c98a",
          500: "#1fb377",
          600: "#16915f",
          700: "#13734c",
          800: "#125b3f",
          900: "#0f4b35",
        },
        accentBlue: {
          400: "#5b8def",
          500: "#3b6fe0",
          600: "#2c56c0",
        },
        skyGlass: {
          50: "#f6fbff",
          100: "#edf5fc",
          200: "#dce8f4",
          300: "#c4d6e8",
          400: "#8fb3dc",
          500: "#5d9ceb",
          600: "#4483d0",
          700: "#376cae",
          800: "#315a8d",
          900: "#2d4d73",
        },
        danger: {
          400: "#f0635f",
          500: "#e34a45",
          600: "#c43733",
        },
        warning: {
          400: "#f0a85b",
          500: "#dd8c33",
        },
        // Futuristic neon-blue accent system used for the premium chrome layer
        // (onboarding, loading screen, glow highlights). Kept separate from
        // `brand` (green) and `accentBlue` (existing muted blue) so no
        // existing success/active styling anywhere in the app is affected.
        neon: {
          50: "#eef6ff",
          100: "#d9ecff",
          200: "#aed4ff",
          300: "#7ab8ff",
          400: "#4a97ff",
          500: "#2e7dfa",
          600: "#1c5fe0",
          700: "#1648b3",
          800: "#123a8c",
          900: "#0f2e6e",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "SF Pro Text",
          "Helvetica Neue",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      borderRadius: {
        xl: "14px",
        "2xl": "20px",
        "3xl": "28px",
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(0,0,0,0.04), 0 8px 24px -8px rgba(0,0,0,0.10)",
        cardDark: "0 1px 2px 0 rgba(0,0,0,0.3), 0 12px 32px -12px rgba(0,0,0,0.55)",
        soft: "0 4px 16px -4px rgba(0,0,0,0.08)",
        glow: "0 0 0 1px rgba(93,156,235,0.25), 0 18px 42px -18px rgba(93,156,235,0.50)",
        glowLg: "0 0 0 1px rgba(93,156,235,0.3), 0 24px 70px -24px rgba(93,156,235,0.55)",
        glowSm: "0 10px 26px -18px rgba(93,156,235,0.70)",
      },
      keyframes: {
        "glow-pulse": {
          "0%, 100%": { opacity: "0.55", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.03)" },
        },
        "scan-line": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "ring-spin": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "glow-pulse": "glow-pulse 2.4s ease-in-out infinite",
        "scan-line": "scan-line 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite",
        "fade-in": "fade-in 0.4s ease-out forwards",
        "fade-in-up": "fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "scale-in": "scale-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "ring-spin": "ring-spin 1.6s linear infinite",
        shimmer: "shimmer 2.5s linear infinite",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      transitionDuration: {
        DEFAULT: "200ms",
      },
    },
  },
  plugins: [],
};
