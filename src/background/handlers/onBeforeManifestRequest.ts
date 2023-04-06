import { WebRequest } from "webextension-polyfill";
import isChrome from "../../common/ts/isChrome";
import { TWITCH_API_URL_REGEX } from "../../common/ts/regexes";
import store from "../../store";
import { PlaylistType, Token } from "../../types";

export default function onBeforeManifestRequest(
  details: WebRequest.OnBeforeRequestDetailsType
): WebRequest.BlockingResponseOrPromise {
  const match = TWITCH_API_URL_REGEX.exec(details.url);
  if (!match) return {};
  const [, _type, streamId, _params] = match;
  if (!_type || !streamId) return {};

  const playlistType =
    _type.toLowerCase() === "vod" ? PlaylistType.VOD : PlaylistType.Playlist;
  const searchParams = new URLSearchParams(_params);

  // No redirect if VOD proxying is disabled.
  if (playlistType === PlaylistType.VOD && store.state.disableVodRedirect) {
    console.log(
      `${streamId}: No redirect (VOD proxying is disabled in Options)`
    );
    setStreamStatus(streamId, false, "VOD proxying is disabled in Options");
    return {};
  }

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

  if (token) {
    // No redirect if the user is a subscriber or has Twitch Turbo.
    const isExemptFromAds = token.subscriber === true || token.turbo === true;
    const isIgnoredChannelSubscription =
      store.state.ignoredChannelSubscriptions.some(
        channel => channel.toLowerCase() === channelName
      );
    if (isExemptFromAds && !isIgnoredChannelSubscription) {
      console.log(
        `${streamId}: No redirect (User is a subscriber or has Twitch Turbo)`
      );
      setStreamStatus(
        streamId,
        false,
        "User is a subscriber or has Twitch Turbo"
      );
      return {};
    }

    if (playlistType === PlaylistType.Playlist) {
      // Remove sensitive information for live streams.
      ["token", "sig"].forEach(param => searchParams.delete(param));
    }
    // Note: TTV LOL's API requires a Twitch token for VODs, so we can't remove it.
  }

  const status = store.state.streamStatuses[streamId];
  if (status) {
    const recentErrors = status.errors.filter(
      error => Date.now() - error.timestamp <= 20000 // 20s
    );
    if (recentErrors.length >= 2) {
      console.log(`${streamId}: No redirect (Too many errors occurred)`);
      setStreamStatus(streamId, false, "Too many errors occurred");
      return {};
    }
  }

  if (isChrome) return redirectChrome(playlistType, streamId, searchParams);
  else return redirectFirefox(playlistType, streamId, searchParams);
}

function getPingUrl(server: string): string {
  return `${server}${server.endsWith("/") ? "" : "/"}ping`;
}

function getRedirectUrl(
  server: string,
  playlistType: PlaylistType,
  streamId: string,
  searchParams: URLSearchParams
): string {
  return `${server}${
    server.endsWith("/") ? "" : "/"
  }${playlistType}/${encodeURIComponent(
    `${streamId}.m3u8?${searchParams.toString()}`
  )}`;
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

function getServerStem(server: string): string {
  const match = /^https?:\/\/(.*?)\/?$/i.exec(server);
  if (!match) return server;
  const [, stem] = match;
  return stem;
}

function redirectChrome(
  playlistType: PlaylistType,
  streamId: string,
  searchParams: URLSearchParams
): WebRequest.BlockingResponse {
  const servers = store.state.servers;

  for (const server of servers) {
    const pingUrl = getPingUrl(server);
    const redirectUrl = getRedirectUrl(
      server,
      playlistType,
      streamId,
      searchParams
    );

    // Synchronous XMLHttpRequest is required for the extension to work in Chrome.
    const request = new XMLHttpRequest();
    request.open("GET", pingUrl, false);
    request.send();

    if (request.status === 200) {
      console.log(`${streamId}: Redirecting to ${server}…`);
      setStreamStatus(streamId, true, `Proxied via ${getServerStem(server)}`);
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

      const pingUrl = getPingUrl(server);
      const redirectUrl = getRedirectUrl(
        server,
        playlistType,
        streamId,
        searchParams
      );
      const fallback = () => {
        console.log(`${streamId}: Ping to ${server} failed`);
        tryRedirect(servers[++i]);
      };

      fetch(pingUrl)
        .then(response => {
          if (response.status === 200) {
            console.log(`${streamId}: Redirecting to ${server}…`);
            setStreamStatus(
              streamId,
              true,
              `Proxied via ${getServerStem(server)}`
            );
            resolve({ redirectUrl });
          } else fallback();
        })
        .catch(fallback);
    }
  });
}
