import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const deferStylesheets = () => ({
  name: "defer-stylesheets",
  transformIndexHtml(html: string) {
    return html.replace(
      /<link rel="stylesheet" href="(\/assets\/[^"]+\.css)">/g,
      (_match, href) =>
        `<link rel="preload" as="style" href="${href}" onload="this.onload=null;this.rel='stylesheet'">` +
        `<noscript><link rel="stylesheet" href="${href}"></noscript>`,
    );
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
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
  plugins: [react(), deferStylesheets(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
