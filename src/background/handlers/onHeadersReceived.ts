import { WebRequest } from "webextension-polyfill";
import store from "../../store";

export default function onHeadersReceived(
  details: WebRequest.OnHeadersReceivedDetailsType
) {
  const ttvlolApiUrlRegex = /\/playlist|vod\/(.+)\.m3u8/gim;

  const match = ttvlolApiUrlRegex.exec(details.url);
  if (match == null) return {};
  const [_, streamId] = match;
  if (streamId == null) return {};

  const isServerError = 500 <= details.statusCode && details.statusCode < 600;
  if (isServerError) {
    const status = getStreamStatus(streamId);
    store.state.streamStatuses[streamId] = {
      redirected: status.redirected,
      reason: status.reason,
      errors: [
        ...status.errors,
        {
          timestamp: Date.now(),
          status: details.statusCode,
        },
      ],
    };
    console.log(`${streamId}: ${status.errors.length + 1} errors`);
    console.log(`${streamId}: Redirect canceled (Error ${details.statusCode})`);

    return {
      cancel: true,
    };
  } else {
    const status = getStreamStatus(streamId);
    store.state.streamStatuses[streamId] = {
      redirected: status.redirected,
      reason: status.reason,
      errors: [],
    };

    return {};
  }
}

function getStreamStatus(streamId: string) {
  return (
    store.state.streamStatuses[streamId] || {
      redirected: true,
      reason: "",
      errors: [],
    }
  );
}
