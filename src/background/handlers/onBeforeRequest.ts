import { WebRequest } from "webextension-polyfill";
import { PlaylistType, Token } from "../../types";
import store from "../../store";

export default function onBeforeRequest(
  details: WebRequest.OnBeforeRequestDetailsType
) {
  const twitchApiUrlRegex = /\/(hls|vod)\/(.+)\.m3u8(?:\?(.*))?$/gim;

  const match = twitchApiUrlRegex.exec(details.url);
  if (match == null) return {};

  const [_, _type, streamId, _params] = match;
  if (_type == null || streamId == null) return {};

  const playlistType =
    _type.toLowerCase() === "vod" ? PlaylistType.VOD : PlaylistType.Playlist;
  const searchParams = new URLSearchParams(_params);

  // No redirect if the channel is whitelisted.
  const channelName = streamId.toLowerCase();
  const isWhitelistedChannel = store.state.whitelistedChannels.some(
    channel => channel.toLowerCase() === channelName
  );
  if (isWhitelistedChannel) {
    console.log(`${streamId}: No redirect (Channel is whitelisted)`);
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
        `${streamId}: No redirect (User is a subscriber, has Twitch Turbo, or is a partner)`
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

  const status = store.state.streamStatuses[streamId];
  if (status != null) {
    if (
      status.errors.filter(error => Date.now() - error.timestamp < 20000)
        .length >= 2
    ) {
      console.log(`${streamId}: No redirect (Too many errors occurred)`);
      return {};
    }
  }

  // @ts-ignore
  const isChrome = !!chrome.app;
  if (isChrome) return redirectChrome(playlistType, streamId, searchParams);
  else return redirectFirefox(playlistType, streamId, searchParams);
}

function redirectChrome(
  playlistType: PlaylistType,
  streamId: string,
  searchParams: URLSearchParams
) {
  const servers = store.state.servers;

  for (const server of servers) {
    const pingUrl = `${server}/ping`;
    const redirectUrl = `${server}/${playlistType}/${encodeURIComponent(
      `${streamId}.m3u8?${searchParams.toString()}`
    )}`;

    // Synchronous XMLHttpRequest is required for the extension to work in Chrome.
    const request = new XMLHttpRequest();
    request.open("GET", pingUrl, false);
    request.send();

    if (request.status === 200) {
      console.log(`${streamId}: Redirecting to ${server}…`);
      const status = store.state.streamStatuses[streamId];
      store.state.streamStatuses[streamId] = status
        ? {
            redirected: true,
            reason: "",
            errors: status.errors,
          }
        : {
            redirected: true,
            reason: "",
            errors: [],
          };
      return { redirectUrl };
    } else {
      console.log(`${streamId}: Ping to ${server} failed`);
      continue;
    }
  }

  console.log(`${streamId}: No redirect (All pings failed)`);
  const status = store.state.streamStatuses[streamId];
  store.state.streamStatuses[streamId] = status
    ? {
        redirected: false,
        reason: "All server pings failed",
        errors: status.errors,
      }
    : {
        redirected: false,
        reason: "All server pings failed",
        errors: [],
      };
  return {};
}

function redirectFirefox(
  playlistType: PlaylistType,
  streamId: string,
  searchParams: URLSearchParams
): Promise<WebRequest.BlockingResponse> {
  const servers = store.state.servers;

  return new Promise(resolve => {
    let i = 0;
    tryRedirect(servers[i]);

    function tryRedirect(server: string) {
      if (server == null) {
        // We've reached the end of the `servers` array.
        console.log(`${streamId}: No redirect (All pings failed)`);
        const status = store.state.streamStatuses[streamId];
        store.state.streamStatuses[streamId] = status
          ? {
              redirected: false,
              reason: "All server pings failed",
              errors: status.errors,
            }
          : {
              redirected: false,
              reason: "All server pings failed",
              errors: [],
            };
        return resolve({});
      }

      const pingUrl = `${server}/ping`;
      const redirectUrl = `${server}/${playlistType}/${encodeURIComponent(
        `${streamId}.m3u8?${searchParams.toString()}`
      )}`;
      const fallback = () => {
        console.log(`${streamId}: Ping to ${server} failed`);
        tryRedirect(servers[++i]);
      };

      fetch(pingUrl)
        .then(response => {
          if (response.status === 200) {
            console.log(`${streamId}: Redirecting to ${server}…`);
            const status = store.state.streamStatuses[streamId];
            store.state.streamStatuses[streamId] = status
              ? {
                  redirected: true,
                  reason: "",
                  errors: status.errors,
                }
              : {
                  redirected: true,
                  reason: "",
                  errors: [],
                };
            resolve({ redirectUrl });
          } else fallback();
        })
        .catch(fallback);
    }
  });
}
