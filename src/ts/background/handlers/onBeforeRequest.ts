import browser, { WebRequest } from "webextension-polyfill";
import { PlaylistType, Token } from "../../../types";

let whitelistedChannels: string[] = [];
async function initWhitelistedChannels() {
  const storage = await browser.storage.local.get({
    whitelistedChannels: [],
  });
  whitelistedChannels = storage.whitelistedChannels;
}
initWhitelistedChannels();
browser.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.whitelistedChannels) {
    whitelistedChannels = changes.whitelistedChannels.newValue;
  }
});

export default function onBeforeRequest(
  details: WebRequest.OnBeforeRequestDetailsType
) {
  const twitchApiUrlRegex = /\/(hls|vod)\/(.+)\.m3u8(?:\?(.*))?$/gim;

  const match = twitchApiUrlRegex.exec(details.url);
  if (match == null) return {};

  const [_, _type, filename, _params] = match;
  if (_type == null || filename == null) return {};

  // No redirect if the channel is whitelisted.
  const isWhitelistedChannel = whitelistedChannels.some(
    channel => channel.toLowerCase() === filename.toLowerCase()
  );
  if (isWhitelistedChannel) {
    console.log(`${filename}: TTV LOL disabled (Channel is whitelisted)`);
    return {};
  }

  const playlistType =
    _type.toLowerCase() === "vod" ? PlaylistType.VOD : PlaylistType.Playlist;
  const searchParams = new URLSearchParams(_params);

  let token: Token;
  try {
    token = JSON.parse(searchParams.get("token"));
  } catch {}

  if (token != null) {
    // No redirect if the user is a subscriber, has Twitch Turbo, or is a partner.
    if (
      token.subscriber === true ||
      token.turbo === true ||
      token.partner === true
    ) {
      console.log(
        `${filename}: TTV LOL disabled (User is a subscriber, has Twitch Turbo, or is a partner)`
      );
      return {};
    }

    // Remove sensitive information from the token (when possible).
    if (playlistType === PlaylistType.Playlist) {
      delete token.device_id;
      delete token.user_id;
    }
    delete token.user_ip;
    searchParams.set("token", JSON.stringify(token));
  }

  const pingUrl = "https://api.ttv.lol/ping";
  const redirectUrl = `https://api.ttv.lol/${playlistType}/${encodeURIComponent(
    `${filename}.m3u8?${searchParams.toString()}`
  )}`;

  // @ts-ignore
  const isChrome = !!chrome.app;
  if (isChrome) {
    // Synchronous XMLHttpRequest is required for the extension to work in Chrome.
    const request = new XMLHttpRequest();
    request.open("GET", pingUrl, false);
    request.send();

    if (request.status === 200) {
      console.log(`${filename}: TTV LOL enabled`);
      return {
        redirectUrl,
      };
    } else {
      return {};
    }
  } else {
    return new Promise(resolve => {
      fetch(pingUrl)
        .then(response => {
          if (response.status === 200) {
            console.log(`${filename}: TTV LOL enabled`);
            resolve({
              redirectUrl,
            });
          } else {
            resolve({});
          }
        })
        .catch(() => resolve({}));
    });
  }
}
