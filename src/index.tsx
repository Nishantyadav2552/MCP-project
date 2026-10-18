/**
 * src/index.tsx — App entry point
 *
 * This is the file @canva/app-scripts looks for by default (src/index.tsx).
 * It bootstraps the React app inside the Canva editor iframe.
 */

import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element not found. Make sure the HTML template includes <div id='root'>");
}

createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
