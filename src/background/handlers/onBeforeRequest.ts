import { WebRequest } from "webextension-polyfill";
import filterResponseDataWrapper from "../../common/ts/filterResponseDataWrapper";
import {
  twitchApiChannelNameRegex,
  videoWeaverUrlRegex,
} from "../../common/ts/regexes";
import store from "../../store";

export default function onBeforeRequest(
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
    return text;
  });
}
