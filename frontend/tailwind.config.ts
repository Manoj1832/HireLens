import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: "#05070B",
          900: "#080C14",
          850: "#0D131F",
          800: "#131C2E",
          700: "#1E2A42",
          600: "#2B3C5E",
        },
        cyber: {
          cyan: "#00F2FE",
          blue: "#4FACFE",
          purple: "#8B5CF6",
          emerald: "#10B981",
          amber: "#F59E0B",
          rose: "#F43F5E",
        },
        brand: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          500: "#3B82F6",
          600: "#2563EB", // Primary Brand Blue
          700: "#1D4ED8",
          800: "#1E40AF",
          900: "#1E3A8A",
        },
        navy: {
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A", // Dark Navy Text
        },
        surface: {
          DEFAULT: "#FFFFFF",
          subtle: "#F8FAFC",
          accent: "#F0F7FF",
          border: "#E2E8F0",
          dark: "#0D131F",
          "dark-subtle": "#131C2E",
          "dark-border": "rgba(255, 255, 255, 0.08)",
        },
        status: {
          success: "#16A34A",
          warning: "#D97706",
          error: "#DC2626",
          info: "#0284C7",
        }
      },
      boxShadow: {
        "cyber-glow": "0 0 25px -5px rgba(6, 182, 212, 0.25)",
        "purple-glow": "0 0 25px -5px rgba(139, 92, 246, 0.25)",
        "glass": "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "Oxygen",
          "Ubuntu",
          "Cantarell",
          '"Open Sans"',
          '"Helvetica Neue"',
          "sans-serif"
        ],
      },
    },
  },
  plugins: [],
};

export default config;
