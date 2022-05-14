import browser, { WebRequest } from "webextension-polyfill";
import { PlaylistType } from "../types";

function onBeforeRequest(details: WebRequest.OnBeforeRequestDetailsType) {
  const match = /(hls|vod)\/(.+?)$/gim.exec(details.url);
  if (match == null) return {};

  const [_, type, path] = match;
  if (type == null || path == null) return {};

  const playlistType =
    type.toLowerCase() === "vod" ? PlaylistType.VOD : PlaylistType.Playlist;

  // Synchronous XMLHttpRequest is required for the plugin to work in Chrome.
  const request = new XMLHttpRequest();
  request.open("GET", `https://api.ttv.lol/ping`, false);
  request.send();

  if (request.status === 200) {
    console.info("[TTV LOL] Successfully pinged TTV LOL's server.");
    return {
      redirectUrl: `https://api.ttv.lol/${playlistType}/${encodeURIComponent(
        path
      )}`,
    };
  } else {
    return {};
  }
}

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

function onBeforeSendHeaders(
  details: WebRequest.OnBeforeSendHeadersDetailsType
) {
  console.log(`[TTV LOL] ${details.method} ${details.url}`);
  details.requestHeaders.push({
    name: "X-Donate-To",
    value: "https://ttv.lol/donate",
  });
  return {
    requestHeaders: details.requestHeaders,
  };
}

browser.webRequest.onBeforeSendHeaders.addListener(
  onBeforeSendHeaders,
  { urls: ["https://api.ttv.lol/playlist/*", "https://api.ttv.lol/vod/*"] },
  ["blocking", "requestHeaders"]
);
