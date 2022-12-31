import { WebRequest } from "webextension-polyfill";
import { TTV_LOL_API_URL_REGEX } from "../../common/ts/regexes";
import store from "../../store";
import type { StreamStatus } from "../../types";

export default function onApiHeadersReceived(
  details: WebRequest.OnHeadersReceivedDetailsType
): WebRequest.BlockingResponseOrPromise {
  const streamId = getStreamIdFromUrl(details.url);
  if (!streamId) return {};

  const isServerError = 500 <= details.statusCode && details.statusCode < 600;
  if (isServerError) {
    // Add error to stream status.
    const status = getStreamStatusFromStreamId(streamId);
    const errors = status.errors || [];
    errors.push({
      timestamp: Date.now(),
      status: details.statusCode,
    });

    store.state.streamStatuses[streamId] = {
      ...status,
      errors: errors,
      proxyCountry: undefined, // Reset proxy country on error.
    };
    console.log(`${streamId}: ${status.errors.length + 1} errors`);
    console.log(`${streamId}: Redirect canceled (Error ${details.statusCode})`);

    return {
      cancel: true, // This forces Twitch to retry the request (up to 2 times).
    };
  } else {
    // Clear errors if server is not returning 5xx.
    const status = getStreamStatusFromStreamId(streamId);
    store.state.streamStatuses[streamId] = {
      ...status,
      errors: [],
    };

    return {};
  }
}

function getStreamIdFromUrl(url: string): string | undefined {
  const match = TTV_LOL_API_URL_REGEX.exec(url);
  if (!match) return;
  const [, streamId] = match;
  return streamId;
}

function getStreamStatusFromStreamId(streamId: string): StreamStatus {
  const status = store.state.streamStatuses[streamId];
  const defaultStatus = {
    redirected: true,
    reason: "",
    errors: [],
  } as StreamStatus;

  return status || defaultStatus;
}
