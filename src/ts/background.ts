import browser, { WebRequest } from "webextension-polyfill";
import { PlaylistType, Token } from "../types";

function onBeforeRequest(details: WebRequest.OnBeforeRequestDetailsType) {
  const match = /\/(hls|vod)\/(.+)\.m3u8(?:\?(.*))?$/gim.exec(details.url);
  if (match == null) return {};

  const [_, _type, channel, _params] = match;
  if (_type == null || channel == null) return {};

  const playlistType =
    _type.toLowerCase() === "vod" ? PlaylistType.VOD : PlaylistType.Playlist;
  const searchParams = new URLSearchParams(_params);

  let token: Token;
  try {
    token = JSON.parse(searchParams.get("token"));
  } catch {}

  if (token != null) {
    if (
      token.subscriber === true ||
      token.turbo === true ||
      token.partner === true
    ) {
      return {};
    }

    // Remove sensitive information from the token (when possible).
    if (playlistType === PlaylistType.Playlist) delete token.device_id;
    if (playlistType === PlaylistType.Playlist) delete token.user_id;
    delete token.user_ip;
    searchParams.set("token", JSON.stringify(token));
  }

  // Synchronous XMLHttpRequest is required for the plugin to work in Chrome.
  const request = new XMLHttpRequest();
  request.open("GET", "https://api.ttv.lol/ping", false);
  request.send();

  if (request.status === 200) {
    console.info("[TTV LOL] Successfully pinged TTV LOL's server.");
    return {
      redirectUrl: `https://api.ttv.lol/${playlistType}/${encodeURIComponent(
        `${channel}.m3u8?${searchParams.toString()}`
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
