import { WebRequest } from "webextension-polyfill";
import clientIdFlag from "../../common/ts/clientIdFlag";
import isFlaggedRequest from "../../common/ts/isFlaggedRequest";

export default function onBeforeSendHeaders(
  details: WebRequest.OnBeforeSendHeadersDetailsType
): WebRequest.BlockingResponse | Promise<WebRequest.BlockingResponse> {
  if (isFlaggedRequest(details.requestHeaders)) {
    console.log("🔄 Found flagged request, removing Client-ID header...");
    return {
      requestHeaders: details.requestHeaders!.reduce((acc, curr) => {
        if (curr.name.toLowerCase() === "client-id") {
          if (curr.value === clientIdFlag) return acc; // Remove header.
          acc.push({
            name: curr.name,
            value: curr.value?.replace(clientIdFlag, ""),
          });
          return acc;
        }
        acc.push(curr);
        return acc;
      }, [] as WebRequest.HttpHeaders),
    };
  }
  return {};
}
