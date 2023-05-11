import type { StreamStatus } from "../types";

export type EventType = "load" | "change";
export type ReadyState = "loading" | "complete";
export type StorageAreaName = "local" | "managed" | "sync";

export interface State {
  checkForUpdates: boolean;
  ignoredChannelSubscriptions: string[];
  isUpdateAvailable: boolean;
  lastUpdateCheck: number;
  servers: string[];
  streamStatuses: Record<string, StreamStatus>;
  videoWeaverUrlsByChannel: Record<string, string[]>;
  whitelistedChannels: string[];
}

export const enum ProxyFlags {
  IS_PROXY = "__isProxy",
  RAW = "__raw",
}
