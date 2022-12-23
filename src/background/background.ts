import browser from "webextension-polyfill";
import isChrome from "../common/ts/isChrome";
import type { CurrentTabIdMessage, Message } from "../types";
import onBeforeRequest from "./handlers/onBeforeRequest";
import onBeforeSendHeaders from "./handlers/onBeforeSendHeaders";
import onBeforeVideoWeaverRequest from "./handlers/onBeforeVideoWeaverRequest";
import onHeadersReceived from "./handlers/onHeadersReceived";
import onStartup from "./handlers/onStartup";

// Check for updates on Chrome startup.
if (isChrome) browser.runtime.onStartup.addListener(onStartup);

// Redirect the HLS master manifest request to TTV LOL's API.
browser.webRequest.onBeforeRequest.addListener(
  onBeforeRequest,
  {
    urls: [
      "https://usher.ttvnw.net/api/channel/hls/*",
      "https://usher.ttvnw.net/vod/*",
    ],
  },
  ["blocking"]
);

// Detect midrolls by looking for the AD_SIGNIFIER string in the video weaver response.
browser.webRequest.onBeforeRequest.addListener(
  onBeforeVideoWeaverRequest,
  {
    urls: ["https://*.ttvnw.net/*"],
  },
  ["blocking"]
);

// Add the `X-Donate-To` header to API requests.
browser.webRequest.onBeforeSendHeaders.addListener(
  onBeforeSendHeaders,
  { urls: ["https://api.ttv.lol/playlist/*", "https://api.ttv.lol/vod/*"] },
  ["blocking", "requestHeaders"]
);

// Monitor API error responses.
browser.webRequest.onHeadersReceived.addListener(
  onHeadersReceived,
  { urls: ["https://api.ttv.lol/playlist/*", "https://api.ttv.lol/vod/*"] },
  ["blocking"]
);

// Listen for messages from content scripts.
browser.runtime.onMessage.addListener((message: Message, sender) => {
  if (sender.id !== browser.runtime.id) return;

  switch (message.type) {
    case "currentTabId":
      const tabId = sender.tab?.id;
      if (!tabId) return;
      const message = {
        type: "currentTabId",
        response: {
          tabId,
        },
      } as CurrentTabIdMessage;
      browser.tabs.sendMessage(tabId, message).catch(console.error);
      break;
  }
});
