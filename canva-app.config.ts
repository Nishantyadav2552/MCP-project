/**
 * canva-app.config.ts
 *
 * Configuration for @canva/app-scripts (used by `canva apps start` and `canva apps build`).
 *
 * The default entry point is src/index.tsx — no override needed.
 * The backend entry wires `backend/server.ts` into the dev server so you only
 * need one terminal: `canva apps start` starts both the frontend (port 8080)
 * and the backend (port 3001, via ts-node-dev with nodemon).
 */

import { defineConfig } from "@canva/app-scripts";

export default defineConfig({
  backend: {
    entry: "./backend/server.ts",
  },
});
