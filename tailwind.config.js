/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        background: "#0B0B0B",
        foreground: "#F5F5F5",
        surface: {
          secondary: "#111111",
          elevated: "#171717",
        },
        accent: {
          gold: "#D4AF37",
          silver: "#C0C0C0",
        },
        text: {
          primary: "#F5F5F5",
          secondary: "#8B8B8B",
          muted: "#666666",
        },
        glass: "rgba(255,255,255,0.04)",
        border: "rgba(255,255,255,0.06)",
        glow: "rgba(255,255,255,0.08)",
      },
      fontFamily: {
        satoshi: ["Satoshi", "sans-serif"],
        general: ["General Sans", "sans-serif"],
        montreal: ["Neue Montreal", "sans-serif"],
        inter: ["Inter", "sans-serif"],
        clash: ["Clash Display", "sans-serif"],
      },
      borderRadius: {
        '2xl': '24px',
        '3xl': '32px',
      },
      animation: {
        "glow-pulse": "glow-pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "reveal": "reveal 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards",
      },
      keyframes: {
        "glow-pulse": {
          "0%, 100%": { opacity: 0.1 },
          "50%": { opacity: 0.3 },
        },
        "reveal": {
          "0%": { opacity: 0, transform: "translateY(20px) scale(0.98)" },
          "100%": { opacity: 1, transform: "translateY(0) scale(1)" },
        },
      },
      transitionTimingFunction: {
        cinematic: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
}
