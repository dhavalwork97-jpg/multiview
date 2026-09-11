import { createHash, randomUUID } from "node:crypto";

const OBS_HELLO = 0;
const OBS_IDENTIFY = 1;
const OBS_IDENTIFIED = 2;
const OBS_REQUEST = 6;
const OBS_REQUEST_RESPONSE = 7;

type ObsMessage = {
  op: number;
  d?: Record<string, unknown>;
};

type ObsRequestResponse = {
  requestStatus?: { result?: boolean; code?: number; comment?: string };
  responseData?: Record<string, unknown>;
};

function sha256Base64(value: string) {
  return createHash("sha256").update(value).digest("base64");
}

function createAuthentication(password: string, salt: string, challenge: string) {
  const secret = sha256Base64(password + salt);
  return sha256Base64(secret + challenge);
}

export type ObsWebSocketConfig = {
  url: string;
  password: string;
  reconnectDelayMs?: number;
};

export type ObsScene = {
  sceneIndex: number;
  sceneName: string;
};

export class ObsWebSocketClient {
  private socket: WebSocket | null = null;
  private connectPromise: Promise<void> | null = null;
  private requestResolvers = new Map<string, { resolve: (value: ObsRequestResponse) => void; reject: (error: Error) => void }>();
  private closed = false;
  private readonly reconnectDelayMs: number;

  constructor(private readonly config: ObsWebSocketConfig) {
    this.reconnectDelayMs = Math.max(250, config.reconnectDelayMs ?? 2000);
  }

  async connect() {
    if (this.closed) throw new Error("OBS WebSocket client is closed");
    if (this.socket?.readyState === WebSocket.OPEN) return;
    if (this.connectPromise) return this.connectPromise;

    this.connectPromise = new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(this.config.url);
      this.socket = socket;
      let identified = false;

      socket.addEventListener("open", () => {
        // OBS sends Hello immediately after opening; authentication is completed
        // from the Hello message below.
      });

      socket.addEventListener("message", (event) => {
        let message: ObsMessage;
        try {
          message = JSON.parse(String(event.data)) as ObsMessage;
        } catch {
          return;
        }

        if (message.op === OBS_HELLO) {
          const auth = message.d?.authentication as { salt?: string; challenge?: string } | undefined;
          const identify: Record<string, unknown> = { rpcVersion: 1 };
          if (auth?.salt && auth.challenge) {
            identify.authentication = createAuthentication(this.config.password, auth.salt, auth.challenge);
          }
          socket.send(JSON.stringify({ op: OBS_IDENTIFY, d: identify }));
          return;
        }

        if (message.op === OBS_IDENTIFIED) {
          identified = true;
          this.connectPromise = null;
          resolve();
          return;
        }

        if (message.op === OBS_REQUEST_RESPONSE) {
          const requestId = String(message.d?.requestId ?? "");
          const resolver = this.requestResolvers.get(requestId);
          if (!resolver) return;
          this.requestResolvers.delete(requestId);
          const response = message.d as ObsRequestResponse;
          if (!response.requestStatus?.result) {
            resolver.reject(new Error(response.requestStatus?.comment || `OBS request failed (${response.requestStatus?.code ?? "unknown"})`));
            return;
          }
          resolver.resolve(response);
        }
      });

      socket.addEventListener("error", () => {
        if (!identified) {
          this.connectPromise = null;
          reject(new Error(`Unable to connect to OBS WebSocket at ${this.config.url}`));
        }
      });

      socket.addEventListener("close", () => {
        this.socket = null;
        if (!identified) {
          this.connectPromise = null;
          reject(new Error(`OBS WebSocket closed before identification at ${this.config.url}`));
        }
        for (const resolver of this.requestResolvers.values()) resolver.reject(new Error("OBS WebSocket disconnected"));
        this.requestResolvers.clear();
      });
    });

    return this.connectPromise;
  }

  async request(requestType: string, requestData: Record<string, unknown> = {}) {
    await this.connect();
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) throw new Error("OBS WebSocket is not connected");
    const requestId = randomUUID();
    const response = new Promise<ObsRequestResponse>((resolve, reject) => {
      this.requestResolvers.set(requestId, { resolve, reject });
    });
    this.socket.send(JSON.stringify({ op: OBS_REQUEST, d: { requestType, requestId, requestData } }));
    return response;
  }

  async setCurrentProgramScene(sceneName: string) {
    const name = sceneName.trim();
    if (!name) throw new Error("OBS scene name cannot be empty");
    await this.request("SetCurrentProgramScene", { sceneName: name });
  }

  async getCurrentProgramScene() {
    const response = await this.request("GetCurrentProgramScene");
    return String(response.responseData?.currentProgramSceneName ?? "");
  }

  async getSceneList() {
    const response = await this.request("GetSceneList");
    const scenes = Array.isArray(response.responseData?.scenes) ? response.responseData.scenes : [];
    return scenes.flatMap((scene) => {
      if (!scene || typeof scene !== "object") return [];
      const value = scene as Record<string, unknown>;
      const sceneName = typeof value.sceneName === "string" ? value.sceneName : "";
      const sceneIndex = typeof value.sceneIndex === "number" ? value.sceneIndex : 0;
      return sceneName ? [{ sceneName, sceneIndex }] : [];
    });
  }

  async createScene(sceneName: string) {
    const name = sceneName.trim();
    if (!name) throw new Error("OBS scene name cannot be empty");
    try {
      await this.request("CreateScene", { sceneName: name });
    } catch (error) {
      if (!String(error instanceof Error ? error.message : error).toLowerCase().includes("already exists")) throw error;
    }
  }

  async createBrowserSource(sceneName: string, inputName: string, url: string, width = 1920, height = 1080) {
    await this.request("CreateInput", {
      sceneName,
      inputName,
      inputKind: "browser_source",
      inputSettings: {
        url,
        width,
        height,
        reroute_audio: true,
        shutdown: false,
        fps: 60,
      },
      sceneItemEnabled: true,
    });
  }

  async ensureSceneWithBrowserSource(sceneName: string, sourceName: string, url: string) {
    const scenes = await this.getSceneList();
    if (!scenes.some((scene) => scene.sceneName === sceneName)) {
      await this.createScene(sceneName);
    }

    try {
      await this.createBrowserSource(sceneName, sourceName, url);
    } catch (error) {
      const message = String(error instanceof Error ? error.message : error).toLowerCase();
      if (!message.includes("already exists") && !message.includes("already has a source")) throw error;
    }
  }

  close() {
    this.closed = true;
    this.socket?.close();
    this.socket = null;
    this.connectPromise = null;
  }
}
