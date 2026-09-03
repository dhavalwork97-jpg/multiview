export type ObsScene = { name: string; kind?: "SCENE" | "GROUP" };
export type ObsTransition = { name: string; kind?: string };
export type ObsStreamStatus = {
  outputActive?: boolean;
  outputReconnecting?: boolean;
  outputTimecode?: string;
  outputBytes?: number;
  outputCongestion?: number;
};
export type ObsRecordStatus = {
  outputActive?: boolean;
  outputPaused?: boolean;
  outputTimecode?: string;
  outputBytes?: number;
};

type ObsMessage = { op: number; d: Record<string, unknown> };
type Pending = { resolve: (v: any) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> };

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
  private pending = new Map<string, Pending>();
  private hello: Record<string, unknown> | null = null;
  private connectPromise: Promise<void> | null = null;
  private listeners = new Set<(message: ObsMessage) => void>();

  constructor(
    private readonly url: string,
    private readonly password?: string,
    private readonly requestTimeoutMs = 8_000,
  ) {}

  onEvent(listener: (message: ObsMessage) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    if (this.connectPromise) return this.connectPromise;

    this.connectPromise = new Promise<void>((resolve, reject) => {
      let settled = false;
      const ws = new WebSocket(this.url);
      this.ws = ws;

      const fail = (error: Error) => {
        if (!settled) {
          settled = true;
          reject(error);
        }
      };

      ws.onmessage = (event) => {
        let message: ObsMessage;
        try {
          message = JSON.parse(String(event.data)) as ObsMessage;
        } catch {
          return;
        }

        if (message.op === 0) {
          this.hello = message.d;
          void this.identify().catch(fail);
          return;
        }

        if (message.op === 2) {
          if (!settled) {
            settled = true;
            resolve();
          }
          return;
        }

        if (message.op === 5) {
          for (const listener of this.listeners) listener(message);
          return;
        }

        if (message.op === 7) {
          const id = String(message.d.requestId ?? "");
          const waiter = this.pending.get(id);
          if (!waiter) return;
          clearTimeout(waiter.timer);
          this.pending.delete(id);
          const status = message.d.requestStatus as { result?: boolean; comment?: string } | undefined;
          if (status?.result === false) waiter.reject(new Error(status.comment ?? "OBS request failed"));
          else waiter.resolve(message.d.responseData ?? {});
        }
      };

      ws.onerror = () => fail(new Error("Unable to connect to OBS WebSocket"));
      ws.onclose = () => {
        this.ws = null;
        this.connectPromise = null;
        const error = new Error("OBS WebSocket disconnected");
        for (const waiter of this.pending.values()) {
          clearTimeout(waiter.timer);
          waiter.reject(error);
        }
        this.pending.clear();
        if (!settled) fail(error);
      };
    });

    try {
      await this.connectPromise;
    } finally {
      this.connectPromise = null;
    }
  }

  private async identify() {
    const authInfo = this.hello?.authentication as { challenge?: string; salt?: string } | undefined;
    let authentication: string | undefined;
    if (authInfo?.challenge && authInfo.salt) {
      if (!this.password) throw new Error("OBS requires a WebSocket password");
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
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error(`OBS request timed out: ${requestType}`));
      }, this.requestTimeoutMs);
      this.pending.set(requestId, { resolve, reject, timer });
      try {
        this.send({ op: 6, d: { requestType, requestId, requestData } });
      } catch (error) {
        clearTimeout(timer);
        this.pending.delete(requestId);
        reject(error instanceof Error ? error : new Error("OBS request failed"));
      }
    });
  }

  async getScenes() {
    const data = await this.request<{ scenes?: ObsScene[] }>("GetSceneList");
    return data.scenes ?? [];
  }

  async getTransitions() {
    const data = await this.request<{ transitions?: ObsTransition[] }>("GetSceneTransitionList");
    return data.transitions ?? [];
  }

  async getProgramScene() {
    const data = await this.request<{ currentProgramSceneName?: string }>("GetCurrentProgramScene");
    return data.currentProgramSceneName ?? "";
  }

  async getStreamStatus() {
    return this.request<ObsStreamStatus>("GetStreamStatus");
  }

  async getRecordStatus() {
    return this.request<ObsRecordStatus>("GetRecordStatus");
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
    this.connectPromise = null;
  }
}

export function mapBroadcastSceneToObsScene(
  scene: string,
  mapping: Partial<Record<string, string>>,
) {
  return mapping[scene] ?? scene;
}

export type ObsGraphicsContext = {
  tournament?: string;
  game?: string;
  stage?: string;
  match?: string;
  title?: string;
  sponsor?: string;
  message?: string;
};

export function buildObsGraphics(context: ObsGraphicsContext) {
  const scoreboard = [context.tournament, context.game, context.stage, context.match]
    .filter(Boolean)
    .join(" · ");
  const lowerThird =
  context.title ||
  context.message ||
  context.stage ||
  context.match ||
  context.game ||
  "FGC Stream";
  return {
    scoreboard: scoreboard || "FGC Stream",
    lowerThird,
    overlay: [context.sponsor, context.message].filter(Boolean).join(" · "),
  };
}
