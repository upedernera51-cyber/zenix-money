import type { Config } from "tailwindcss";

const config: Config = {
  // CRÍTICO: Estas rutas deben coincidir con tus carpetas
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Aquí podrías agregar tus colores personalizados Zenix más adelante
    },
  },
  plugins: [],
};
export default config;