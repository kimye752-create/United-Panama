import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: "#173f78",
        navy2: "#224f91",
        orange: "#f0a13a",
        orange2: "#e18e20",
        green: "#2d9870",
        blue: "#3a82f0",
        red: "#c8564d",
        warn: "#c98b28",
        text: "#1e2d45",
        muted: "#6b7d96",
        card: "#ffffff",
        inner: "#f4f6fa",
        shell: "#f2f5fa",
      },
      boxShadow: {
        sh: "0 6px 20px rgba(23,63,120,.08)",
        sh2: "0 2px 8px rgba(23,63,120,.06)",
        sh3: "0 1px 4px rgba(23,63,120,.04)",
      },
      fontFamily: {
        pretendard: [
          '"Pretendard"',
          '"Noto Sans KR"',
          '"SF Pro Text"',
          "system-ui",
          "sans-serif",
        ],
        sans: [
          '"Pretendard Variable"',
          "Pretendard",
          "system-ui",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
