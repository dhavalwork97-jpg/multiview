import { io } from "socket.io-client";

const url = process.env.SOCKET_URL;
const matchId = process.env.MATCH_ID || "load-test-match";
const target = Number(process.env.SOCKET_CONNECTIONS || 50);
const holdMs = Number(process.env.SOCKET_HOLD_MS || 120000);
const timeoutMs = Number(process.env.SOCKET_TIMEOUT_MS || 10000);

if (!url) throw new Error("SOCKET_URL is required");
if (!Number.isInteger(target) || target < 1) throw new Error("SOCKET_CONNECTIONS must be a positive integer");

const sockets = [];
let connected = 0;
let failed = 0;
let viewerCountEvents = 0;

await Promise.all(Array.from({ length: target }, (_, index) => new Promise((resolve) => {
  const socket = io(url, {
    transports: ["websocket"],
    reconnection: false,
    timeout: timeoutMs,
    forceNew: true,
  });
  sockets.push(socket);
  socket.once("connect", () => {
    connected += 1;
    socket.emit("join:match", matchId);
    socket.on("viewer:count", () => { viewerCountEvents += 1; });
    resolve();
  });
  socket.once("connect_error", () => {
    failed += 1;
    resolve();
  });
  setTimeout(() => {
    if (!socket.connected) {
      failed += 1;
      socket.close();
      resolve();
    }
  }, timeoutMs + 100);
}))); 

await new Promise((resolve) => setTimeout(resolve, holdMs));
for (const socket of sockets) socket.close();

const result = { target, connected, failed, viewerCountEvents, holdMs };
console.log(JSON.stringify(result));
if (connected !== target || failed > 0) process.exitCode = 1;
