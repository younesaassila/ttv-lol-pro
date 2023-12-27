import type { Tabs } from "webextension-polyfill";
import type { AdLogEntry, DnsResponse, StreamStatus } from "../types";

export type EventType = "load" | "change";
export type ReadyState = "loading" | "complete";
export type StorageAreaName = "local" | "managed" | "sync";

export interface State {
  adLog: AdLogEntry[];
  adLogEnabled: boolean;
  adLogLastSent: number;
  anonymousMode: boolean;
  chromiumProxyActive: boolean;
  dnsResponses: DnsResponse[];
  normalProxies: string[];
  openedTwitchTabs: Tabs.Tab[];
  optimizedProxies: string[];
  optimizedProxiesEnabled: boolean;
  passportLevel: number;
  proxyTwitchWebpage: boolean;
  proxyUsherRequests: boolean;
  streamStatuses: Record<string, StreamStatus>;
  videoWeaverUrlsByChannel: Record<string, string[]>;
  whitelistedChannels: string[];
}

export const enum ProxyFlags {
  IS_PROXY = "__isProxy",
  RAW = "__raw",
}
