export enum PlaylistType {
  Playlist = "playlist",
  VOD = "vod",
}

export interface Token {
  adblock: boolean;
  authorization: {
    forbidden: boolean;
    reason: string;
  };
  blackout_enabled: boolean;
  channel: string;
  channel_id: number;
  chansub: {
    restricted_bitrates?: number[];
    view_until: number;
  };
  ci_gb: boolean;
  geoblock_reason: string;
  device_id: string;
  expires: number;
  extended_history_allowed: boolean;
  game: string;
  hide_ads: boolean;
  https_required: boolean;
  mature: boolean;
  partner: boolean;
  platform: string;
  player_type: string;
  private: {
    allowed_to_view: boolean;
  };
  privileged: boolean;
  role: string;
  server_ads: boolean;
  show_ads: boolean;
  subscriber: boolean;
  turbo: boolean;
  user_id?: number;
  user_ip: string;
  version: number;
}
