import injectedScript from "url:./injected.ts";
import browser from "webextension-polyfill";
import $ from "../common/ts/$";
import log from "../common/ts/log";
import { TWITCH_URL_REGEX } from "../common/ts/regexes";
import store from "../store";
import type { Message, MidrollMessage } from "../types";

log("Content script running.");

let injectedScriptInjected = false;

// Listen for messages from background script.
browser.runtime.onMessage.addListener((message: Message, sender) => {
  if (sender.id !== browser.runtime.id) return;

  switch (message.type) {
    case "midroll":
      onMidroll(message as MidrollMessage);
      break;
  }
});

// Listen for messages from injected script.
window.addEventListener("message", event => {
  if (event.source !== window) return;
  if (!event.data) return;

  if (event.data.type === "injectedScriptInjected") {
    log("Script injected successfully.");
    injectedScriptInjected = true;
  }
});

if (store.readyState === "complete") main();
else store.addEventListener("load", main);

function main() {
  // Clear errors for stream on page load/reload.
  clearErrors();
  // Inject "Reset player" script into page.
  if (store.state.resetPlayerOnMidroll) {
    injectScript();
  }
}

function clearErrors() {
  const match = TWITCH_URL_REGEX.exec(location.href);
  if (!match) return;
  const [, streamId] = match;
  if (!streamId) return;

  if (store.state.streamStatuses.hasOwnProperty(streamId)) {
    store.state.streamStatuses[streamId].errors = [];
  }
}

async function injectScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    let timeout: number | null = null;
    timeout = setTimeout(() => {
      if (timeout) clearTimeout(timeout);
      reject(new Error("Timed out waiting for injected script to load."));
    }, 3000); // 3 seconds.

    // From https://stackoverflow.com/a/9517879
    const script = document.createElement("script");
    script.src = injectedScript;
    script.onload = () => {
      script.remove();
      if (timeout) clearTimeout(timeout);
      resolve();
    };
    document.head.append(script);
  });
}

/**
 * Reset player if midroll detected.
 * @param message
 */
function onMidroll(message: MidrollMessage) {
  const { startDateString } = message.response;

  const startDate = new Date(startDateString);
  const now = new Date();
  const diff = startDate.getTime() - now.getTime();
  const delay = Math.max(diff, 0); // Prevent negative delay.

  log(`Midroll scheduled for ${startDateString} (in ${delay} ms)`);

  setTimeout(async () => {
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
      if (!injectedScriptInjected) {
        log("Script not injected. Trying to inject again.");
        await injectScript();
      }
      window.postMessage({ type: "resetPlayer" }, "*");
      log("Sent `resetPlayer` message to injected script.");
    }
  }, delay);
}
