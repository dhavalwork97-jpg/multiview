export type BroadcastDestinationProvider = "youtube" | "twitch" | "rtmp";

export type BroadcastDestinationStatus =
  | "disconnected"
  | "connected"
  | "ready"
  | "live"
  | "error";

export type BroadcastDestination = {
  id: string;
  provider: BroadcastDestinationProvider;
  label: string;
  status: BroadcastDestinationStatus;
  channelName?: string | null;
  streamUrl?: string | null;
  externalBroadcastId?: string | null;
  lastError?: string | null;
};

export type BroadcastDestinationInput = {
  provider: BroadcastDestinationProvider;
  label: string;
  channelName?: string;
  streamUrl?: string;
};

const PROVIDER_LABELS: Record<BroadcastDestinationProvider, string> = {
  youtube: "YouTube",
  twitch: "Twitch",
  rtmp: "Custom RTMP",
};

export function getBroadcastProviderLabel(provider: BroadcastDestinationProvider) {
  return PROVIDER_LABELS[provider];
}

export function validateBroadcastDestination(input: BroadcastDestinationInput) {
  const errors: string[] = [];

  if (!input.label.trim()) errors.push("A destination label is required.");
  if (input.provider === "rtmp" && !input.streamUrl?.trim()) {
    errors.push("A stream URL is required for a custom RTMP destination.");
  }

  return errors;
}

export function createBroadcastDestination(
  id: string,
  input: BroadcastDestinationInput,
): BroadcastDestination {
  const errors = validateBroadcastDestination(input);
  if (errors.length) throw new Error(errors.join(" "));

  return {
    id,
    provider: input.provider,
    label: input.label.trim(),
    status: "disconnected",
    channelName: input.channelName?.trim() || null,
    streamUrl: input.provider === "rtmp" ? input.streamUrl?.trim() || null : null,
    externalBroadcastId: null,
    lastError: null,
  };
}

export function canStartBroadcast(destination: BroadcastDestination) {
  return destination.status === "ready" || destination.status === "connected";
}
