import path from "path";
import tailwindcss from '@tailwindcss/vite';
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "build",
  },
  react: {
    fastRefresh: false,
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: ["verbena-dear-paradox.glitch.me"],
    port: 3000,
    strictPort: true,
    hmr: {
      clientPort: 443, // Run the websocket server on the SSL port
    },
  },
});
