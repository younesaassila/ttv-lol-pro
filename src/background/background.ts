import browser from "webextension-polyfill";
import onBeforeRequest from "./handlers/onBeforeRequest";
import onBeforeSendHeaders from "./handlers/onBeforeSendHeaders";
import onHeadersReceived from "./handlers/onHeadersReceived";

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

// Update browser action icon.
browser.tabs.onActivated.addListener(async () => {
  const icon = await getBrowserActionIcon();
  browser.browserAction.setIcon(icon);
});

async function getBrowserActionIcon(): Promise<browser.Action.SetIconDetailsType> {
  const ICON_GRAY_PATH = new URL("../assets/icon-gray.png", import.meta.url);
  const ICON_PATH = new URL("../assets/icon.png", import.meta.url);

  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs[0];
  if (!activeTab || !activeTab.url) return { path: ICON_GRAY_PATH.href };
  try {
    const url = new URL(activeTab.url);
    if (url.hostname === "www.twitch.tv") {
      return { path: ICON_PATH.href };
    }
  } catch {}
  return { path: ICON_GRAY_PATH.href };
}
