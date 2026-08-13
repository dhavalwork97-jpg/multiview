// Direct OBS -> YouTube RTMP has no server-side encoder heartbeat in this
// deployment. Never poll YouTube from the socket service: status updates are
// produced by explicit Start/End actions and broadcast through Socket.IO.
export function startStationHeartbeat() {
  console.log("[station heartbeat] YouTube polling disabled; status is event-driven");
}
