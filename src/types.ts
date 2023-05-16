// From https://stackoverflow.com/a/51419293
export type KeyOfType<T, V> = keyof {
  [P in keyof T as T[P] extends V ? P : never]: any;
};

// From https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/proxy/ProxyInfo
export interface ProxyInfo {
  type: "direct" | "http" | "https" | "socks" | "socks4";
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  proxyDNS?: boolean;
  failoverTimeout?: number;
  proxyAuthorizationHeader?: string;
  connectionIsolationKey?: string;
}

export const enum AdType {
  PREROLL = "preroll",
  MIDROLL = "midroll",
}

export interface AdLogEntry {
  adType: AdType;
  channel: string | null;
  proxy: string | null;
  proxyUsherRequests: boolean;
  timestamp: number;
  videoWeaverHost: string;
  videoWeaverUrl: string;
}

export interface StreamStatus {
  proxied: boolean;
  reason: string;
}
