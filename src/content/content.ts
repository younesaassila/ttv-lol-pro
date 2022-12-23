import browser from "webextension-polyfill";
import $ from "../common/ts/$";
import { TWITCH_URL_REGEX } from "../common/ts/regexes";
import store from "../store";
import type { CurrentTabIdMessage, Message, MidrollMessage } from "../types";

let currentTabId: number | undefined = undefined;

if (store.readyState === "complete") main();
else store.addEventListener("load", main);

console.log("[TTV LOL PRO] Content script loaded.");

async function main() {
  console.log("[TTV LOL PRO] Content script running.");

  const match = TWITCH_URL_REGEX.exec(location.href);
  if (!match) return;
  const [, streamId] = match;
  if (!streamId) return;

  if (store.state.streamStatuses.hasOwnProperty(streamId)) {
    // Clear errors for stream on page load/reload.
    store.state.streamStatuses[streamId].errors = [];
  }

  const message = {
    type: "currentTabId",
  } as CurrentTabIdMessage;
  browser.runtime.sendMessage(message).catch(console.error);
}

browser.runtime.onMessage.addListener((message: Message, sender) => {
  console.log("[Content Script] Message received:", message);

  if (sender.id !== browser.runtime.id) return;

  switch (message.type) {
    case "currentTabId":
      currentTabId = (message as CurrentTabIdMessage).response.tabId;
      break;
    case "midroll":
      const { tabId, startDateString } = (message as MidrollMessage).response;
      if (tabId !== currentTabId) break;
      const startDate = new Date(startDateString);
      const now = new Date();
      setTimeout(() => {
        // Check if FrankerFaceZ's reset player button exists.
        const ffzResetPlayerButton = $(
          'button[data-a-target="ffz-player-reset-button"]'
        );
        if (ffzResetPlayerButton) {
          ffzResetPlayerButton.dispatchEvent(
            new MouseEvent("dblclick", { bubbles: true })
          );
          console.log("Clicked FFZ reset player button.");
        } else {
          // TODO: Notify injected script to reset player or reload page.
        }
      }, now.getTime() - startDate.getTime()); // TODO: Check if this is precise enough.
      break;
  }
});
