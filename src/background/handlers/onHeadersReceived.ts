import { WebRequest } from "webextension-polyfill";
import store from "../../store";

export default function onHeadersReceived(
  details: WebRequest.OnHeadersReceivedDetailsType
) {
  const isServerError = 500 <= details.statusCode && details.statusCode < 600;

  if (isServerError) {
    const ttvlolApiUrlRegex = /\/playlist|vod\/(.+)\.m3u8/gim;

    const match = ttvlolApiUrlRegex.exec(details.url);
    if (match == null) return {};
    const [_, streamId] = match;
    if (streamId == null) return {};

    const status = store.state.streamStatuses[streamId] || {
      redirected: true,
      reason: "",
      errors: [],
    };
    store.state.streamStatuses[streamId] = {
      redirected: status.redirected,
      reason: status.reason,
      errors: status.errors.concat([
        {
          timestamp: Date.now(),
          status: details.statusCode,
        },
      ]),
    };

    console.log(`${streamId}: ${status.errors.length + 1} errors`);
    console.log(`${streamId}: Redirect canceled (Error ${details.statusCode})`);

    return {
      cancel: true,
    };
  }
}
