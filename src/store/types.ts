import type { StreamStatus } from "../types";

export type EventType = "load" | "change";
export type ReadyState = "loading" | "complete";
export type StorageAreaName = "local" | "managed" | "sync";

export interface State {
  checkForUpdates: boolean;
  disableVodRedirect: boolean;
  ignoredChannelSubscriptions: string[];
  isUpdateAvailable: boolean;
  lastUpdateCheck: number;
  resetPlayerOnMidroll: boolean;
  servers: string[];
  streamStatuses: Record<string, StreamStatus>;
  whitelistedChannels: string[];
}

export const enum ProxyFlags {
  IS_PROXY = "__isProxy",
  RAW = "__raw",
}
