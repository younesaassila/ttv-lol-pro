import { WebRequest } from "webextension-polyfill";
import acceptFlag from "../../common/ts/acceptFlag";
import isFlaggedRequest from "../../common/ts/isFlaggedRequest";

export default function onBeforeSendHeaders(
  details: WebRequest.OnBeforeSendHeadersDetailsType
): WebRequest.BlockingResponse | Promise<WebRequest.BlockingResponse> {
  if (isFlaggedRequest(details.requestHeaders)) {
    console.log(`🔎 Found flagged request for ${details.url}, removing flag…`);
    return {
      requestHeaders: details.requestHeaders!.reduce((acc, curr) => {
        if (curr.name.toLowerCase() === "accept") {
          if (curr.value === acceptFlag) return acc; // Remove header.
          acc.push({
            name: curr.name,
            value: curr.value?.replace(acceptFlag, ""),
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
