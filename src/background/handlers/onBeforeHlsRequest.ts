import { WebRequest } from "webextension-polyfill";

export default function onBeforeHlsRequest(
  details: WebRequest.OnBeforeRequestDetailsType
): void {
  // TODO: Get channel name from URL.
  // TODO: Filter response data to HLS playlists.
  // TODO: Map channel name to HLS playlists.
}
