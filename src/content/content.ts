import browser from "webextension-polyfill";
import $ from "../common/ts/$";
import { TWITCH_URL_REGEX } from "../common/ts/regexes";
import store from "../store";
import type { CurrentTabIdMessage, Message, MidrollMessage } from "../types";

log("Content script running.");

let currentTabId: number | undefined = undefined;

// Query current tab ID.
const message = {
  type: "currentTabId",
} as CurrentTabIdMessage;
browser.runtime.sendMessage(message).catch(console.error);

if (store.readyState === "complete") main();
else store.addEventListener("load", main);

function main() {
  const match = TWITCH_URL_REGEX.exec(location.href);
  if (!match) return;
  const [, streamId] = match;
  if (!streamId) return;

  if (store.state.streamStatuses.hasOwnProperty(streamId)) {
    // Clear errors for stream on page load/reload.
    store.state.streamStatuses[streamId].errors = [];
  }
}

browser.runtime.onMessage.addListener(onMessage);

function onMessage(message: Message, sender: browser.Runtime.MessageSender) {
  if (sender.id !== browser.runtime.id) return;

  if (message.type === "currentTabId") {
    // Store current tab ID.
    const { tabId } = (message as CurrentTabIdMessage).response;
    currentTabId = tabId;
  } else if (message.type === "midroll") {
    // Reset player if midroll detected.
    const { tabId, startDateString } = (message as MidrollMessage).response;
    if (currentTabId == null || tabId !== currentTabId) return;

    const now = new Date();
    const startDate = new Date(startDateString);
    const delay = startDate.getTime() - now.getTime();
    log(`Midroll scheduled for ${startDateString} (in ${delay} ms)`);
    if (delay < 0) return;

    setTimeout(() => {
      // Check if FrankerFaceZ's reset player button exists.
      const ffzResetPlayerButton = $(
        'button[data-a-target="ffz-player-reset-button"]'
      );
      if (ffzResetPlayerButton) {
        ffzResetPlayerButton.dispatchEvent(
          new MouseEvent("dblclick", { bubbles: true })
        );
        log("Clicked FrankerFaceZ's reset player button.");
      } else {
        // TODO: Notify injected script to reset player or reload page.
      }
    }, delay);
  }
}

function log(...args: any[]) {
  console.log("[TTV LOL PRO]", ...args);
}
