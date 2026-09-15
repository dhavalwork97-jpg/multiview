import { z } from "zod";

/**
 * Broadcast destinations are deliberately provider-agnostic. The tournament
 * and Control Room should describe intent; provider adapters own credentials
 * and API-specific details.
 */
export const BROADCAST_PROVIDERS = ["youtube", "twitch", "custom-rtmp"] as const;
export type BroadcastProvider = (typeof BROADCAST_PROVIDERS)[number];

export const BROADCAST_LIFECYCLE = ["disconnected", "ready", "live", "ended", "error"] as const;
export type BroadcastLifecycle = (typeof BROADCAST_LIFECYCLE)[number];

export type BroadcastDestination = {
  id: string;
  provider: BroadcastProvider;
  label: string;
  channelId?: string | null;
  streamId?: string | null;
  ingestUrl?: string | null;
  lifecycle: BroadcastLifecycle;
  enabled: boolean;
};

export type BroadcastDestinationIntent = {
  provider: BroadcastProvider;
  label: string;
  channelId?: string | null;
  streamId?: string | null;
  ingestUrl?: string | null;
};

const destinationIntentSchema = z.object({
  provider: z.enum(BROADCAST_PROVIDERS),
  label: z.string().trim().min(1).max(120),
  channelId: z.string().trim().min(1).max(200).nullable().optional(),
  streamId: z.string().trim().min(1).max(200).nullable().optional(),
  ingestUrl: z.string().url().nullable().optional(),
});

/** Validate operator-entered destination intent without ever accepting a secret. */
export function validateBroadcastDestinationIntent(
  input: unknown,
): BroadcastDestinationIntent {
  return destinationIntentSchema.parse(input);
}

/**
 * Creates the safe, provider-neutral payload the rest of FGC Stream can use.
 * Credentials, OAuth tokens and stream keys must never enter tournament JSON
 * or be sent to the client.
 */
export function createBroadcastDestination(
  id: string,
  input: BroadcastDestinationIntent,
): BroadcastDestination {
  const intent = validateBroadcastDestinationIntent(input);
  return {
    id,
    provider: intent.provider,
    label: intent.label,
    channelId: intent.channelId ?? null,
    streamId: intent.streamId ?? null,
    ingestUrl: intent.ingestUrl ?? null,
    lifecycle: "ready",
    enabled: true,
  };
}

export type BroadcastAutomationEvent =
  | { type: "DESTINATION_READY"; destinationId: string }
  | { type: "BROADCAST_START_REQUESTED"; destinationId: string }
  | { type: "BROADCAST_LIVE"; destinationId: string; startedAt: string }
  | { type: "BROADCAST_END_REQUESTED"; destinationId: string }
  | { type: "BROADCAST_ENDED"; destinationId: string; endedAt: string }
  | { type: "BROADCAST_ERROR"; destinationId: string; message: string };

/**
 * The integration boundary used by future YouTube/Twitch adapters. Keeping
 * this interface small lets the existing Control Room remain the source of
 * operator truth while providers can be added independently.
 */
export interface BroadcastProviderAdapter {
  readonly provider: BroadcastProvider;
  prepare(destination: BroadcastDestination): Promise<BroadcastDestination>;
  start(destination: BroadcastDestination): Promise<BroadcastDestination>;
  stop(destination: BroadcastDestination): Promise<BroadcastDestination>;
}
