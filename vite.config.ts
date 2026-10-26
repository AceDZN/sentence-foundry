import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  server: { port: 5233, strictPort: true },
  preview: { port: 4233, strictPort: true },
});
