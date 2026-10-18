import { createBridgeServer } from "./server.js";

const PORT = parseInt(process.env.BRIDGE_PORT || "3001", 10);

const { server } = createBridgeServer();

server.listen(PORT, () => {
  console.log(`[Canva Cursor Bridge] Server listening on http://localhost:${PORT}`);
  console.log(`[Canva Cursor Bridge] WebSocket active on ws://localhost:${PORT}/ws`);
});
