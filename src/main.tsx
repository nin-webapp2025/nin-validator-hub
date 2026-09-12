import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import App from "./App.tsx";
import "./index.css";
import { ThemeProvider } from "@/components/theme-provider";

type VercelInsightsModules = {
  Analytics: ComponentType;
  SpeedInsights: ComponentType;
};

function DeferredVercelInsights() {
  const [modules, setModules] = useState<VercelInsightsModules | null>(null);

  useEffect(() => {
    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      return;
    }

    const loadInsights = () => {
      Promise.all([
        import("@vercel/analytics/react"),
        import("@vercel/speed-insights/react"),
      ]).then(([analytics, speedInsights]) => {
        setModules({
          Analytics: analytics.Analytics,
          SpeedInsights: speedInsights.SpeedInsights,
        });
      });
    };

    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(loadInsights, { timeout: 3000 });
      return () => window.cancelIdleCallback?.(id);
    }

    const id = window.setTimeout(loadInsights, 1500);
    return () => window.clearTimeout(id);
  }, []);

  if (!modules) return null;

  const { Analytics, SpeedInsights } = modules;
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <ThemeProvider defaultTheme="light" storageKey="nin-portal-theme">
    <App />
    <DeferredVercelInsights />
  </ThemeProvider>
);
