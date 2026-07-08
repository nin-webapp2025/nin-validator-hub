import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import App from "./App.tsx";
import "./index.css";
import { ThemeProvider } from "@/components/theme-provider";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider defaultTheme="light" storageKey="nin-portal-theme">
    <App />
    <Analytics />
    <SpeedInsights />
  </ThemeProvider>
);
