import { MessageType } from "../types";
import { getFetch } from "./getFetch";
import {
  getSendMessageToContentScript,
  getSendMessageToContentScriptAndWaitForResponse,
  getSendMessageToPageScript,
  getSendMessageToPageScriptAndWaitForResponse,
  getSendMessageToWorkerScript,
  getSendMessageToWorkerScriptAndWaitForResponse,
} from "./sendMessage";
import type { PageState } from "./types";

console.info("[TTV LOL PRO] Worker script running.");

declare var getParams: () => string;
let params;
try {
  params = JSON.parse(getParams()!);
} catch (error) {
  console.error("[TTV LOL PRO] Failed to parse params:", error);
}
getParams = undefined as any;

const sendMessageToContentScript = getSendMessageToContentScript();
const sendMessageToContentScriptAndWaitForResponse =
  getSendMessageToContentScriptAndWaitForResponse();
const sendMessageToPageScript = getSendMessageToPageScript();
const sendMessageToPageScriptAndWaitForResponse =
  getSendMessageToPageScriptAndWaitForResponse();
const sendMessageToWorkerScript = getSendMessageToWorkerScript();
const sendMessageToWorkerScriptAndWaitForResponse =
  getSendMessageToWorkerScriptAndWaitForResponse();

const pageState: PageState = {
  isChromium: params.isChromium,
  scope: "worker",
  state: undefined,
  twitchWorker: undefined, // Can't get the worker instance from inside the worker.
  sendMessageToContentScript,
  sendMessageToContentScriptAndWaitForResponse,
  sendMessageToPageScript,
  sendMessageToPageScriptAndWaitForResponse,
  sendMessageToWorkerScript,
  sendMessageToWorkerScriptAndWaitForResponse,
};

self.fetch = getFetch(pageState);

self.addEventListener("message", event => {
  if (event.data?.type !== MessageType.WorkerScriptMessage) return;

  const message = event.data?.message;
  if (!message) return;

  switch (message.type) {
    case MessageType.GetStoreStateResponse: // From Page
      if (pageState.state == null) {
        console.log("[TTV LOL PRO] Received store state from page script.");
      } else {
        console.debug("[TTV LOL PRO] Received store state from page script.");
      }
      const state = message.state;
      pageState.state = state;
      break;
  }
});

sendMessageToPageScript({ type: MessageType.GetStoreState });
