import { WebRequest } from "webextension-polyfill";
import filterResponseDataWrapper from "../../common/ts/filterResponseDataWrapper";
import {
  twitchApiChannelNameRegex,
  videoWeaverUrlRegex,
} from "../../common/ts/regexes";
import store from "../../store";
import type { StreamStatus } from "../../types";

export default function onBeforeUsherRequest(
  details: WebRequest.OnBeforeRequestDetailsType
): void | WebRequest.BlockingResponseOrPromise {
  const match = twitchApiChannelNameRegex.exec(details.url);
  if (!match) return;
  const channelName = match[1]?.toLowerCase();
  if (!channelName) return;

  filterResponseDataWrapper(details, text => {
    const videoWeaverUrls = text.match(videoWeaverUrlRegex);
    if (!videoWeaverUrls) return text;
    console.log(
      `📺 Found ${videoWeaverUrls.length} video-weaver URLs for ${channelName}.`
    );
    const existingVideoWeaverUrls =
      store.state.videoWeaverUrlsByChannel[channelName] ?? [];
    const newVideoWeaverUrls = videoWeaverUrls.filter(
      url => !existingVideoWeaverUrls.includes(url)
    );
    store.state.videoWeaverUrlsByChannel[channelName] = [
      ...existingVideoWeaverUrls,
      ...newVideoWeaverUrls,
    ];
    const streamStatus = getStreamStatus(channelName);
    setStreamStatus(channelName, {
      ...(streamStatus ?? { proxied: false, reason: "" }),
      proxyCountry: extractProxyCountryFromManifest(text),
    });
    return text;
  });
}

function getStreamStatus(channelName: string | null): StreamStatus | null {
  if (!channelName) return null;
  return store.state.streamStatuses[channelName] ?? null;
}

function setStreamStatus(
  channelName: string | null,
  streamStatus: StreamStatus
): boolean {
  if (!channelName) return false;
  store.state.streamStatuses[channelName] = streamStatus;
  return true;
}

function extractProxyCountryFromManifest(text: string): string | undefined {
  const match = /USER-COUNTRY="([A-Z]+)"/i.exec(text);
  if (!match) return;
  const [, proxyCountry] = match;
  return proxyCountry;
}
