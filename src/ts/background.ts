import browser, { WebRequest } from "webextension-polyfill";
import { PlaylistType, Token } from "../types";

function stripUnusedParams(path: string, params = ["token", "sig"]) {
  let tempUrl = new URL("https://localhost/" + path);
  for (const param of params) {
    tempUrl.searchParams.delete(param);
  }
  return tempUrl.pathname.substring(1) + tempUrl.search;
}

function onBeforeRequest(details: WebRequest.OnBeforeRequestDetailsType) {
  const match = /(hls|vod)\/(.+?)$/gim.exec(details.url);
  if (match == null) return {};

  const [_, type, path] = match;
  if (type == null || path == null) return {};

  const playlistType =
    type.toLowerCase() === "vod" ? PlaylistType.VOD : PlaylistType.Playlist;
  const searchParams = new URLSearchParams(path);

  let token: Token;
  try {
    token = JSON.parse(searchParams.get("token"));
  } catch {}

  if (token != null) {
    // Note: When watching a VOD, `subscriber` always returns `false`, even if
    // the user is a subscriber.
    const isSubscriber =
      playlistType === PlaylistType.Playlist && token.subscriber === true;

    if (isSubscriber) {
      console.info("[TTV LOL] User is a subscriber; plugin disabled.");
      return {};
    } else {
      console.info("[TTV LOL] User is NOT a subscriber; plugin enabled.");
    }
  }

  // Synchronous XMLHttpRequest is required for the plugin to work in Chrome.
  const request = new XMLHttpRequest();
  request.open("GET", `https://api.ttv.lol/ping`, false);
  request.send();

  if (request.status === 200) {
    console.info("[TTV LOL] Successfully pinged TTV LOL's server.");
    return {
      redirectUrl: `https://api.ttv.lol/${playlistType}/${encodeURIComponent(
        stripUnusedParams(path)
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
