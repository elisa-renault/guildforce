import "@fontsource/faculty-glyphic/latin-400.css";
import "@fontsource/noto-sans-kr/korean-300.css";
import "@fontsource/noto-sans-kr/korean-400.css";
import "@fontsource/noto-sans-kr/korean-500.css";
import "@fontsource/noto-sans-kr/korean-700.css";
import "@fontsource/noto-sans-tc/chinese-traditional-300.css";
import "@fontsource/noto-sans-tc/chinese-traditional-400.css";
import "@fontsource/noto-sans-tc/chinese-traditional-500.css";
import "@fontsource/noto-sans-tc/chinese-traditional-700.css";
import "@fontsource/noto-serif-kr/korean-400.css";
import "@fontsource/noto-serif-tc/chinese-traditional-400.css";
import "@fontsource/roboto/latin-300.css";
import "@fontsource/roboto/latin-400.css";
import "@fontsource/roboto/latin-500.css";
import "@fontsource/roboto/latin-700.css";
import facultyGlyphic400 from "@fontsource/faculty-glyphic/files/faculty-glyphic-latin-400-normal.woff2?url";
import roboto400 from "@fontsource/roboto/files/roboto-latin-400-normal.woff2?url";
import roboto500 from "@fontsource/roboto/files/roboto-latin-500-normal.woff2?url";
import { PostHogProvider } from "@posthog/react";
import { createRoot } from "react-dom/client";

import App from "./App.tsx";

import "./index.css";

import { initializePostHog } from "@/lib/posthogClient";

const preloadFont = (href: string) => {
  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "font";
  link.type = "font/woff2";
  link.crossOrigin = "anonymous";
  link.href = href;
  document.head.appendChild(link);
};

preloadFont(facultyGlyphic400);
preloadFont(roboto400);
preloadFont(roboto500);

const posthogClient = initializePostHog();

createRoot(document.getElementById("root")!).render(
  posthogClient ? (
    <PostHogProvider client={posthogClient}>
      <App />
    </PostHogProvider>
  ) : (
    <App />
  ),
);
