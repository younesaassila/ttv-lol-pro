import { WebRequest } from "webextension-polyfill";

export default function onBeforeVodRequest(
  details: WebRequest.OnBeforeRequestDetailsType
): void {
  // TODO: Filter response data to HLS playlists.
  // TODO: Exclude HLS playlists from proxying.
}
