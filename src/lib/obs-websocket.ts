export type ObsScene = { name: string; kind?: "SCENE" | "GROUP" };

type ObsMessage = { op: number; d: Record<string, unknown> };

async function sha256Base64(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  let binary = "";
  for (const byte of new Uint8Array(digest)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export class ObsWebSocketClient {
  private ws: WebSocket | null = null;
  private requestId = 0;
  private pending = new Map<string, { resolve: (v: any) => void; reject: (e: Error) => void }>();
  private hello: Record<string, unknown> | null = null;

  constructor(private readonly url: string, private readonly password?: string) {}

  async connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(this.url);
      this.ws = ws;
      ws.onmessage = (event) => {
        const message = JSON.parse(String(event.data)) as ObsMessage;
        if (message.op === 0) {
          this.hello = message.d;
          void this.identify();
          return;
        }
        if (message.op === 2) {
          resolve();
          return;
        }
        if (message.op === 5) return;
        if (message.op === 7) {
          const id = String(message.d.requestId ?? "");
          const waiter = this.pending.get(id);
          if (!waiter) return;
          this.pending.delete(id);
          const status = message.d.requestStatus as { result?: boolean; comment?: string } | undefined;
          if (status?.result === false) waiter.reject(new Error(status.comment ?? "OBS request failed"));
          else waiter.resolve(message.d.responseData ?? {});
        }
      };
      ws.onerror = () => reject(new Error("Unable to connect to OBS WebSocket"));
      ws.onclose = () => { this.ws = null; };
    });
  }
  private async identify() {
    const authInfo = this.hello?.authentication as { challenge: string; salt: string } | undefined;
    let authentication: string | undefined;
    if (authInfo && this.password) {
      const secret = await sha256Base64(this.password + authInfo.salt);
      authentication = await sha256Base64(secret + authInfo.challenge);
    }
    const d: Record<string, unknown> = { rpcVersion: 1 };
    if (authentication) d.authentication = authentication;
    this.send({ op: 1, d });
  }

  private send(message: ObsMessage) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) throw new Error("OBS is not connected");
    this.ws.send(JSON.stringify(message));
  }

  async request<T = Record<string, unknown>>(requestType: string, requestData: Record<string, unknown> = {}) {
    await this.connect();
    const requestId = `fgc-${++this.requestId}`;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject });
      this.send({ op: 6, d: { requestType, requestId, requestData } });
    });
  }

  disconnect() { this.ws?.close(); this.ws = null; }
}
