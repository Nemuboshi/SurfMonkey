// Preloaded into the @playwright/mcp process via NODE_OPTIONS=--require (see .mcp.json).
//
// The CDP relay used by --extension mode binds its WebSocket server via
// listen(0, "localhost") (playwright's httpServer defaults the host to
// "localhost"). On machines where localhost resolves to ::1 first, the relay
// URL becomes ws://[::1]:<port>/... and Chrome fails to connect, so the Bridge
// extension reports "Failed to connect to MCP relay: WebSocket error".
//
// Force ephemeral binds with no explicit host (or "localhost") onto IPv4
// loopback, so the relay URL is ws://127.0.0.1:<port>/... which every browser
// can reach. Only the (port=0, implicit/localhost host) call shape is touched;
// explicit binds are left alone.

const net = require("node:net");

const originalListen = net.Server.prototype.listen;

net.Server.prototype.listen = function (...args) {
  if (args[0] === 0 && (args[1] == null || args[1] === "localhost")) {
    args[1] = "127.0.0.1";
  }
  return originalListen.apply(this, args);
};
