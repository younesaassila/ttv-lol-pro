import { PlaylistType, Token } from "../../types";
import { TWITCH_API_URL_REGEX } from "../../common/ts/regexes";
import { WebRequest } from "webextension-polyfill";
import isChrome from "../../common/ts/isChrome";
import store from "../../store";

export default function onBeforeRequest(
  details: WebRequest.OnBeforeRequestDetailsType
): WebRequest.BlockingResponse | Promise<WebRequest.BlockingResponse> {
  const match = TWITCH_API_URL_REGEX.exec(details.url);
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
    setStreamStatus(streamId, false, "Channel is whitelisted");
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
      setStreamStatus(
        streamId,
        false,
        "User is a subscriber, has Twitch Turbo, or is a partner"
      );
      return {};
    }

    if (store.state.removeTokenFromRequests) {
      ["token", "sig"].forEach(param => searchParams.delete(param));
    } else if (playlistType === PlaylistType.Playlist) {
      // Remove sensitive information for live streams.
      delete token.device_id;
      delete token.user_id;
      delete token.user_ip;
      searchParams.delete("sig");
      searchParams.set("token", JSON.stringify(token));
    }
    // Token signature is checked for VODs, so we can't remove it.
  }

  const status = store.state.streamStatuses[streamId];
  if (status != null) {
    if (
      status.errors.filter(error => Date.now() - error.timestamp < 20000)
        .length >= 2
    ) {
      console.log(`${streamId}: No redirect (Too many errors occurred)`);
      setStreamStatus(streamId, false, "Too many errors occurred");
      return {};
    }
  }

  if (isChrome) return redirectChrome(playlistType, streamId, searchParams);
  else return redirectFirefox(playlistType, streamId, searchParams);
}

function setStreamStatus(
  streamId: string,
  redirected: boolean,
  reason: string
) {
  const status = store.state.streamStatuses[streamId];
  const errors = status ? status.errors : [];
  store.state.streamStatuses[streamId] = {
    redirected,
    reason,
    errors,
  };
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
      setStreamStatus(streamId, true, `Redirected to ${server}`);
      return { redirectUrl };
    } else {
      console.log(`${streamId}: Ping to ${server} failed`);
      continue;
    }
  }

  console.log(`${streamId}: No redirect (All pings failed)`);
  setStreamStatus(streamId, false, "All server pings failed");
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
        setStreamStatus(streamId, false, "All server pings failed");
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
            setStreamStatus(streamId, true, `Redirected to ${server}`);
            resolve({ redirectUrl });
          } else fallback();
        })
        .catch(fallback);
    }
  });
}
