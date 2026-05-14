// React core
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";

// Router
import router from "@/router";

// ZaUI stylesheet
import "zmp-ui/zaui.css";
// Tailwind stylesheet
import "@/css/tailwind.scss";
// Your stylesheet
import "@/css/app.scss";

// Expose app configuration
import appConfig from "../app-config.json";

window.APP_CONFIG = {
  ...appConfig,
  ...(window.APP_CONFIG ?? {}),
  template: {
    ...appConfig.template,
    ...(window.APP_CONFIG?.template ?? {}),
  },
};

// Persist incoming affiliate referral code so it can be applied after JWT auth.
try {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref");
  if (ref) {
    localStorage.setItem("pending_ref_code", ref.toUpperCase());
  }
} catch (e) {
  // ignore — referral capture must never block app boot
}

// Mount the app
const root = createRoot(document.getElementById("app")!);
root.render(createElement(RouterProvider, { router }));
