import type {
  BroadcastDestination,
  BroadcastDestinationInput,
} from "./destinations";

export type BroadcastEvent = {
  title: string;
  description?: string;
  scheduledAt?: string;
  privacy?: "public" | "unlisted" | "private";
};

export type BroadcastProviderAdapter = {
  connect(input: BroadcastDestinationInput): Promise<BroadcastDestination>;
  disconnect(destination: BroadcastDestination): Promise<BroadcastDestination>;
  prepare(destination: BroadcastDestination, event: BroadcastEvent): Promise<BroadcastDestination>;
  start(destination: BroadcastDestination): Promise<BroadcastDestination>;
  stop(destination: BroadcastDestination): Promise<BroadcastDestination>;
};

/**
 * Integration boundary for external broadcast platforms.
 * Provider SDK/API calls belong behind this contract; credentials and stream
 * keys must never be sent to browser components.
 */
export function createProviderAdapter(provider: BroadcastDestination["provider"]): BroadcastProviderAdapter {
  throw new Error(
    `Broadcast provider adapter not configured for ${provider}. Configure the provider integration before enabling live publishing.`,
  );
}
