import react from "@vitejs/plugin-react-swc";
import path from "path";
import { defineConfig } from "vite";

const deferStylesheets = () => ({
  name: "defer-stylesheets",
  transformIndexHtml(html: string) {
    return html.replace(
      /<link\s+[^>]*rel=["']stylesheet["'][^>]*href=["'](\/assets\/[^"']+\.css)["'][^>]*>/g,
      (match, href) => {
        const crossOrigin = /crossorigin/i.test(match) ? " crossorigin" : "";
        return (
          `<link rel="preload" as="style" href="${href}"${crossOrigin} ` +
          `onload="this.onload=null;this.rel='stylesheet'">` +
          `<noscript><link rel="stylesheet" href="${href}"${crossOrigin}></noscript>`
        );
      },
    );
  },
});

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  preview: {
    allowedHosts: ["guildforce.app", "www.guildforce.app"],
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/setupTests.ts",
  },
  plugins: [react(), deferStylesheets()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
