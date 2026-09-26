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
        },
        status: {
          success: "#16A34A",
          warning: "#D97706",
          error: "#DC2626",
          info: "#0284C7",
        }
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
