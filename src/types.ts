// From https://stackoverflow.com/a/51419293
export type KeyOfType<T, V> = keyof {
  [P in keyof T as T[P] extends V ? P : never]: any;
};

export interface StreamStatus {
  redirected: boolean;
  reason: string;
  errors: StreamStatusError[];
  proxyCountry?: string;
}

export interface StreamStatusError {
  timestamp: number;
  status: number;
}

export const enum PlaylistType {
  Playlist = "playlist",
  VOD = "vod",
}

export interface Token {
  adblock?: boolean;
  authorization: {
    forbidden: boolean;
    reason: string;
  };
  blackout_enabled?: boolean;
  channel?: string;
  channel_id?: number;
  chansub: {
    restricted_bitrates?: string[];
    view_until: number;
  };
  ci_gb?: boolean;
  geoblock_reason?: string;
  device_id?: string;
  expires: number;
  extended_history_allowed?: boolean;
  game?: string;
  hide_ads?: boolean;
  https_required: boolean;
  mature?: boolean;
  partner?: boolean;
  platform?: string;
  player_type?: string;
  private?: {
    allowed_to_view: boolean;
  };
  privileged: boolean;
  role?: string;
  server_ads?: boolean;
  show_ads?: boolean;
  subscriber?: boolean;
  turbo?: boolean;
  user_id?: number;
  user_ip?: string;
  version: number;
  vod_id?: number;
}
