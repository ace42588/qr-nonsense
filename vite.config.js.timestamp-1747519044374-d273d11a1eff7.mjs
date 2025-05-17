// vite.config.js
import { defineConfig } from "file:///rbd/pnpm-volume/18921864-7cab-44f6-a895-dad8926b3c21/node_modules/vite/dist/node/index.js";
import react from "file:///rbd/pnpm-volume/18921864-7cab-44f6-a895-dad8926b3c21/node_modules/@vitejs/plugin-react/dist/index.mjs";
import path from "path";
import tailwindcss from "file:///rbd/pnpm-volume/18921864-7cab-44f6-a895-dad8926b3c21/node_modules/@tailwindcss/vite/dist/index.mjs";
var __vite_injected_original_dirname = "/app";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "watch-logger",
      handleHotUpdate({ file }) {
        console.log("[watch] change detected in:", file);
      }
    }
  ],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  build: {
    outDir: "build"
  },
  react: {
    fastRefresh: false
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: ["verbena-dear-paradox.glitch.me"],
    port: 3e3,
    strictPort: true,
    hmr: {
      clientPort: 443
      // Run the websocket server on the SSL port
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvYXBwXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvYXBwL3ZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9hcHAvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdFwiO1xuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcbmltcG9ydCB0YWlsd2luZGNzcyBmcm9tIFwiQHRhaWx3aW5kY3NzL3ZpdGVcIjtcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtcbiAgICByZWFjdCgpLFxuICAgIHRhaWx3aW5kY3NzKCksXG4gICAge1xuICAgICAgbmFtZTogXCJ3YXRjaC1sb2dnZXJcIixcbiAgICAgIGhhbmRsZUhvdFVwZGF0ZSh7IGZpbGUgfSkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlt3YXRjaF0gY2hhbmdlIGRldGVjdGVkIGluOlwiLCBmaWxlKTtcbiAgICAgIH0sXG4gICAgfSxcbiAgXSxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICBcIkBcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyY1wiKSxcbiAgICB9LFxuICB9LFxuICBidWlsZDoge1xuICAgIG91dERpcjogXCJidWlsZFwiLFxuICB9LFxuICByZWFjdDoge1xuICAgIGZhc3RSZWZyZXNoOiBmYWxzZSxcbiAgfSxcbiAgc2VydmVyOiB7XG4gICAgaG9zdDogXCIwLjAuMC4wXCIsXG4gICAgYWxsb3dlZEhvc3RzOiBbXCJ2ZXJiZW5hLWRlYXItcGFyYWRveC5nbGl0Y2gubWVcIl0sXG4gICAgcG9ydDogMzAwMCxcbiAgICBzdHJpY3RQb3J0OiB0cnVlLFxuICAgIGhtcjoge1xuICAgICAgY2xpZW50UG9ydDogNDQzLCAvLyBSdW4gdGhlIHdlYnNvY2tldCBzZXJ2ZXIgb24gdGhlIFNTTCBwb3J0XG4gICAgfSxcbiAgfSxcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUE4TCxTQUFTLG9CQUFvQjtBQUMzTixPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBQ2pCLE9BQU8saUJBQWlCO0FBSHhCLElBQU0sbUNBQW1DO0FBTXpDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLFlBQVk7QUFBQSxJQUNaO0FBQUEsTUFDRSxNQUFNO0FBQUEsTUFDTixnQkFBZ0IsRUFBRSxLQUFLLEdBQUc7QUFDeEIsZ0JBQVEsSUFBSSwrQkFBK0IsSUFBSTtBQUFBLE1BQ2pEO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssS0FBSyxRQUFRLGtDQUFXLE9BQU87QUFBQSxJQUN0QztBQUFBLEVBQ0Y7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNMLFFBQVE7QUFBQSxFQUNWO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxhQUFhO0FBQUEsRUFDZjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sY0FBYyxDQUFDLGdDQUFnQztBQUFBLElBQy9DLE1BQU07QUFBQSxJQUNOLFlBQVk7QUFBQSxJQUNaLEtBQUs7QUFBQSxNQUNILFlBQVk7QUFBQTtBQUFBLElBQ2Q7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
