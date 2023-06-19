import store from "../../store";
import type { StreamStatus } from "../../types";

/**
 * Safely get the stream status for a channel.
 * @param channelName
 * @returns
 */
export function getStreamStatus(
  channelName: string | null
): StreamStatus | null {
  if (!channelName) return null;
  return store.state.streamStatuses[channelName] ?? null;
}

/**
 * Safely set the stream status for a channel.
 * @param channelName
 * @param streamStatus
 * @returns
 */
export function setStreamStatus(
  channelName: string | null,
  streamStatus: StreamStatus
): boolean {
  if (!channelName) return false;
  store.state.streamStatuses[channelName] = streamStatus;
  return true;
}
