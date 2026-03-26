import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5555,
    proxy: {
      "/api": {
        target: "http://localhost:5550",
        changeOrigin: true,
      },
      "/ws": {
        target: "ws://localhost:5550",
        ws: true,
      },
    },
  },
});
