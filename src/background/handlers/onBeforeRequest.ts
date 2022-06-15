import { WebRequest } from "webextension-polyfill";
import { PlaylistType, Token } from "../../types";
import store from "../../store";

export default function onBeforeRequest(
  details: WebRequest.OnBeforeRequestDetailsType
) {
  const twitchApiUrlRegex = /\/(hls|vod)\/(.+)\.m3u8(?:\?(.*))?$/gim;

  const match = twitchApiUrlRegex.exec(details.url);
  if (match == null) return {};

  const [_, _type, filename, _params] = match;
  if (_type == null || filename == null) return {};

  const playlistType =
    _type.toLowerCase() === "vod" ? PlaylistType.VOD : PlaylistType.Playlist;
  const searchParams = new URLSearchParams(_params);

  // No redirect if the channel is whitelisted.
  const channelName = filename.toLowerCase();
  const isWhitelistedChannel = store.state.whitelistedChannels.some(
    channel => channel.toLowerCase() === channelName
  );
  if (isWhitelistedChannel) {
    console.log(`${filename}: TTV LOL disabled (Channel is whitelisted)`);
    return {};
  }

  let token: Token | undefined;
  try {
    token = JSON.parse(`${searchParams.get("token")}`);
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

    if (store.state.removeTokenFromRequests) searchParams.delete("token");
    else {
      // Remove sensitive information from the token (when possible).
      if (playlistType === PlaylistType.Playlist) {
        delete token.device_id;
        delete token.user_id;
      }
      delete token.user_ip;
      searchParams.set("token", JSON.stringify(token));
    }
  }

  // @ts-ignore
  const isChrome = !!chrome.app;
  if (isChrome) return redirectChrome(playlistType, filename, searchParams);
  else return redirectFirefox(playlistType, filename, searchParams);
}

function redirectChrome(
  playlistType: PlaylistType,
  filename: string,
  searchParams: URLSearchParams
) {
  const servers = store.state.servers;

  for (const server of servers) {
    const pingUrl = `${server}/ping`;
    const redirectUrl = `${server}/${playlistType}/${encodeURIComponent(
      `${filename}.m3u8?${searchParams.toString()}`
    )}`;

    // Synchronous XMLHttpRequest is required for the extension to work in Chrome.
    const request = new XMLHttpRequest();
    request.open("GET", pingUrl, false);
    request.send();

    if (request.status === 200) {
      console.log(`${filename}: TTV LOL enabled (Server: ${server})`);
      return { redirectUrl };
    } else {
      console.log(`${filename}: Ping to ${server} failed`);
      continue;
    }
  }

  console.log(`${filename}: TTV LOL disabled (All pings failed)`);
  return {};
}

function redirectFirefox(
  playlistType: PlaylistType,
  filename: string,
  searchParams: URLSearchParams
): Promise<WebRequest.BlockingResponse> {
  const servers = store.state.servers;

  return new Promise(resolve => {
    let i = 0;
    tryRedirect(servers[i]);

    function tryRedirect(server: string) {
      if (server == null) {
        // We've reached the end of the `servers` array.
        console.log(`${filename}: TTV LOL disabled (All pings failed)`);
        return resolve({});
      }

      const pingUrl = `${server}/ping`;
      const redirectUrl = `${server}/${playlistType}/${encodeURIComponent(
        `${filename}.m3u8?${searchParams.toString()}`
      )}`;
      const fallback = () => {
        console.log(`${filename}: Ping to ${server} failed`);
        tryRedirect(servers[++i]);
      };

      fetch(pingUrl)
        .then(response => {
          if (response.status === 200) {
            console.log(`${filename}: TTV LOL enabled (Server: ${server})`);
            resolve({ redirectUrl });
          } else fallback();
        })
        .catch(fallback);
    }
  });
}
