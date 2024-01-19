import type { State } from "../store/types";

export interface PageState {
  isChromium: boolean;
  scope: "page" | "worker";
  state?: State;
  twitchWorker?: Worker;
}

export interface UsherManifest {
  channelName: string | null;
  assignedMap: Map<string, string>; // E.g. "720p60" -> "https://video-weaver.fra02.hls.ttvnw.net/v1/playlist/..."
  replacementMap: Map<string, string> | null; // Same as above, but with new URLs.
  assignedProxiedCount: number; // Used to proxy only a certain amount of requests.
  replacementProxiedCount: number; // Same as above, but with replacement URLs.
  consecutiveMidrollResponses: number; // Used to avoid infinite loops.
}

export interface PlaybackAccessToken {
  value: string;
  signature: string;
  authorization: {
    isForbidden: boolean;
    forbiddenReasonCode: string;
  };
  __typename: string;
}
