/**
 * src/index.tsx — App entry point
 *
 * This is the file @canva/app-scripts looks for by default (src/index.tsx).
 * It bootstraps the React app inside the Canva editor iframe.
 */

import "@canva/app-ui-kit/styles.css";
import "styles/components.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppUiProvider, TestAppUiProvider } from "@canva/app-ui-kit";
import { App } from "./app";

// Ensure root container exists inside the Canva iframe
let container = document.getElementById("root");
if (!container) {
  container = document.createElement("div");
  container.id = "root";
  document.body.appendChild(container);
}

// Reset margins and ensure full height in Canva panel
document.documentElement.style.height = "100%";
document.documentElement.style.margin = "0";
document.body.style.height = "100%";
document.body.style.margin = "0";
container.style.height = "100%";
container.style.display = "flex";
container.style.flexDirection = "column";

// Use official AppUiProvider when inside Canva, fallback to TestAppUiProvider outside Canva
const isInsideCanva = typeof window !== "undefined" && Boolean((window as unknown as { __canva__?: { uiKit?: unknown } }).__canva__?.uiKit);
const Provider = isInsideCanva ? AppUiProvider : TestAppUiProvider;

createRoot(container).render(
  <StrictMode>
    <Provider>
      <App />
    </Provider>
  </StrictMode>
);
