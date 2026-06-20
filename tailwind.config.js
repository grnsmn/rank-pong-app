/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        dark: {
          "primary": "#3b82f6",     -- Blu brillante sportivo
          "secondary": "#10b981",   -- Smeraldo (colore del tavolo da ping pong)
          "accent": "#f59e0b",      -- Ambra per i punteggi o ranking
          "neutral": "#1e293b",     -- Slate scuro per elementi neutri
          "base-100": "#0f172a",    -- Sfondo scuro principale (slate-900)
          "info": "#3abff8",
          "success": "#36d399",
          "warning": "#fbbd23",
          "error": "#f87272",
        },
      },
      "emerald"
    ],
  },
}
