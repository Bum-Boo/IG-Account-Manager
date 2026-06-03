import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const allowedHosts = (process.env.WEB_ALLOWED_HOSTS ?? process.env.__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS ?? "")
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);

export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.WEB_PORT ?? 5173),
    allowedHosts,
    proxy: {
      "/api": {
        target: process.env.API_PROXY_TARGET ?? "http://localhost:3001",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, "")
      }
    }
  }
});
