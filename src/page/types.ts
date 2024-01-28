import type { State } from "../store/types";
import { MessageType } from "../types";

export type SendMessageFn = (message: any) => void;
export type SendMessageWorkerFn = (
  worker: Worker | undefined,
  message: any
) => void;
export type SendMessageAndWaitForResponseFn = (
  scope: "page" | "worker",
  message: any,
  responseMessageType: MessageType,
  responseTimeout?: number
) => Promise<any>;
export type SendMessageAndWaitForResponseWorkerFn = (
  worker: Worker | undefined,
  message: any,
  responseMessageType: MessageType,
  scope: "page" | "worker",
  responseTimeout?: number
) => Promise<any>;

export interface PageState {
  isChromium: boolean;
  scope: "page" | "worker";
  state?: State;
  twitchWorker?: Worker;
  sendMessageToContentScript: SendMessageFn;
  sendMessageToContentScriptAndWaitForResponse: SendMessageAndWaitForResponseFn;
  sendMessageToPageScript: SendMessageFn;
  sendMessageToPageScriptAndWaitForResponse: SendMessageAndWaitForResponseFn;
  sendMessageToWorkerScript: SendMessageWorkerFn;
  sendMessageToWorkerScriptAndWaitForResponse: SendMessageAndWaitForResponseWorkerFn;
}

export interface UsherManifest {
  channelName: string | null;
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
