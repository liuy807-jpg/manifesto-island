/**
 * Tiny WebSocket relay for the optional TouchDesigner / presence link.
 *
 *   npm run relay
 *
 * Default port 8081. Open the site with ?live=ws://127.0.0.1:8081
 * (or ?live=1). Every JSON message is broadcast to the other clients.
 *
 * The public site does not need this process — it only connects when
 * the query string is present.
 */
import { WebSocketServer } from "ws";
import { createServer } from "node:http";

const PORT = Number(process.env.PORT || 8081);
const server = createServer((_req, res) => {
  res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
  res.end("Approach live relay. Connect with WebSocket.\n");
});
const wss = new WebSocketServer({ server });

function broadcast(from, data) {
  for (const client of wss.clients) {
    if (client !== from && client.readyState === 1) client.send(data);
  }
}

wss.on("connection", (ws) => {
  ws.on("message", (buf, isBinary) => {
    if (isBinary) return;
    const text = buf.toString();
    try {
      JSON.parse(text);
    } catch {
      return;
    }
    broadcast(ws, text);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Approach relay on ws://127.0.0.1:${PORT}`);
  console.log(`Open the site with ?live=ws://127.0.0.1:${PORT}`);
});
