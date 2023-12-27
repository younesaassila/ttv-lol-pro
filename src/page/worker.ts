import { MessageType } from "../types";
import { getFetch } from "./getFetch";
import type { FetchOptions } from "./types";

console.info("[TTV LOL PRO] 🚀 Worker script running.");

const options: FetchOptions = {
  scope: "worker",
  shouldWaitForStore: true, // FIXME: Some special value for Chrome???
};

self.fetch = getFetch(options);

self.addEventListener("message", event => {
  if (event.data?.type !== MessageType.WorkerScriptMessage) return;

  const message = event.data?.message;
  if (!message) return;

  switch (message.type) {
    case MessageType.GetStoreStateResponse:
      console.log("[TTV LOL PRO] Received store state from page script.");
      const state = message.state;
      options.state = state;
      options.shouldWaitForStore = false;
      break;
  }
});
