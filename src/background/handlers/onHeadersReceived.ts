import { WebRequest } from "webextension-polyfill";
import store from "../../store";

export default function onHeadersReceived(
  details: WebRequest.OnHeadersReceivedDetailsType
) {
  const isServerError = 500 <= details.statusCode && details.statusCode < 600;

  if (isServerError) {
    const ttvLolApiUrlRegex = /\/playlist|vod\/(.+)\.m3u8/gim;

    const match = ttvLolApiUrlRegex.exec(details.url);
    if (match == null) return {};

    const [_, streamId] = match;
    if (streamId == null) return {};

    const status = store.state.streamStatuses[streamId];
    console.log(status.errors.length);

    store.state.streamStatuses[streamId] = status
      ? {
          redirected: status.redirected,
          reason: status.reason,
          errors: status.errors.concat([
            {
              timestamp: Date.now(),
              status: details.statusCode,
            },
          ]),
        }
      : {
          redirected: true,
          reason: "",
          errors: [
            {
              timestamp: Date.now(),
              status: details.statusCode,
            },
          ],
        };

    console.log(`${streamId}: Redirect canceled (Error ${details.statusCode})`);

    return {
      cancel: true,
    };
  }
}
