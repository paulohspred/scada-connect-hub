import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Vitest configuration
  test: {
    globals: true,
    environment: "node",
    include: ["src/test/**/*.test.ts", "src/**/*.test.ts"],
    coverage: {
      reporter: ["text", "json", "html"],
    },
  },
}));
