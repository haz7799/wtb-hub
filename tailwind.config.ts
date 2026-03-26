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
        // 我們直接把專屬的韓系色調註冊到系統裡
        'ballet-pink': '#F3E0E2',
        'serene-blue': '#D1D9E6',
        'soft-gray': '#585C64',
        'light-bg': '#F9F7F7',
      },
    },
  },
  plugins: [],
};
export default config;