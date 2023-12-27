import type { State } from "../store/types";

export interface FetchOptions {
  scope: "page" | "worker";
  shouldWaitForStore: boolean;
  state?: State;
  twitchWorker?: Worker;
}

// TODO: Rename to UsherManifest
// assignedMap -> assignedWeavers
// etc.
export interface VideoWeaver {
  assignedMap: Map<string, string>; // E.g. "720p60" -> "https://video-weaver.fra02.hls.ttvnw.net/v1/playlist/..."
  replacementMap: Map<string, string> | null; // Same as above, but with new URLs.
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
