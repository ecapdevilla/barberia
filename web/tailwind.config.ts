import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#08080d",
        surface: "#12121c",
        "surface-2": "#1a1a27",
        "surface-3": "#232336",
        border: "#262636",
        "border-2": "#34344a",
        text: "#f1f5f9",
        "text-2": "#94a3b8",
        "text-3": "#64748b",
        accent: "#8b5cf6",
        "accent-2": "#6366f1",
        "accent-3": "#ec4899",
        success: "#10b981",
        warning: "#f59e0b",
        danger: "#ef4444",
        info: "#3b82f6",
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "16px",
        md: "10px",
      },
    },
  },
  plugins: [],
} satisfies Config;