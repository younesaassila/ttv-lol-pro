import { MessageType } from "../types";
import { getFetch } from "./getFetch";
import type { PageState } from "./types";

console.info("[TTV LOL PRO] Worker script running.");

declare var getParams: () => string;
let params;
try {
  params = JSON.parse(getParams()!);
} catch (error) {
  console.error("[TTV LOL PRO] ❌ Failed to parse params:", error);
}
getParams = undefined as any;
const pageState: PageState = {
  isChromium: params.isChromium,
  scope: "worker",
};

self.fetch = getFetch(pageState);

function sendMessageToPageScript(message: any) {
  self.postMessage({
    type: MessageType.PageScriptMessage,
    message,
  });
}

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
