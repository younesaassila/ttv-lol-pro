import injectedScript from "url:./injected.ts";
import browser from "webextension-polyfill";
import $ from "../common/ts/$";
import log from "../common/ts/log";
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

// Clear errors for stream on page load/reload.
if (store.readyState === "complete") clearErrors();
else store.addEventListener("load", clearErrors);

// Inject script into page.
if (document.readyState === "complete") injectScript();
else document.addEventListener("DOMContentLoaded", injectScript);

function clearErrors() {
  const match = TWITCH_URL_REGEX.exec(location.href);
  if (!match) return;
  const [, streamId] = match;
  if (!streamId) return;

  if (store.state.streamStatuses.hasOwnProperty(streamId)) {
    store.state.streamStatuses[streamId].errors = [];
  }
}

function injectScript() {
  // From https://stackoverflow.com/a/9517879
  const script = document.createElement("script");
  script.src = injectedScript;
  script.onload = () => script.remove();
  document.head.appendChild(script);
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

    const startDate = new Date(startDateString);
    const now = new Date();
    const diff = startDate.getTime() - now.getTime();
    const delay = Math.max(diff, 0); // Prevent negative delay.

    log(`Midroll scheduled for ${startDateString} (in ${delay} ms)`);

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
        // Otherwise, send message to injected script.
        window.postMessage({ type: "resetPlayer" }, "*");
        log("Sent resetPlayer message to injected script.");
      }
    }, delay);
  }
}
