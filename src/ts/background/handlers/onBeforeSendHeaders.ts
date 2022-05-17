import { WebRequest } from "webextension-polyfill";

export default function (details: WebRequest.OnBeforeSendHeadersDetailsType) {
  details.requestHeaders.push({
    name: "X-Donate-To",
    value: "https://ttv.lol/donate",
  });

  return {
    requestHeaders: details.requestHeaders,
  };
}
