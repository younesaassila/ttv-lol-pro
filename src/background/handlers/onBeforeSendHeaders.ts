import { MANIFEST_PROXY_COUNTRY_REGEX } from "../../common/ts/regexes";
import { TTV_LOL_API_URL_REGEX } from "../../common/ts/regexes";
import { WebRequest } from "webextension-polyfill";
import browser from "webextension-polyfill";
import isChrome from "../../common/ts/isChrome";
import store from "../../store";

function extractProxyCountry(string: string) {
  const match = MANIFEST_PROXY_COUNTRY_REGEX.exec(string);
  if (match == null) return;
  const [_, proxyCountry] = match;
  return proxyCountry;
}

function setStreamStatusProxyCountry(
  streamId: string,
  proxyCountry: string | undefined = undefined
) {
  if (!proxyCountry) return;
  const status = store.state.streamStatuses[streamId];
  store.state.streamStatuses[streamId] = {
    ...status,
    proxyCountry: proxyCountry,
  };
}

export default function onBeforeSendHeaders(
  details: WebRequest.OnBeforeSendHeadersDetailsType
): WebRequest.BlockingResponse {
  if (!details.requestHeaders) {
    console.error("details.requestHeaders is undefined");
    return {};
  }
  details.requestHeaders.push({
    name: "X-Donate-To",
    value: "https://ttv.lol/donate",
  });

  const response: WebRequest.BlockingResponse = {
    requestHeaders: details.requestHeaders,
  };

  if (isChrome) return response;

  const match = TTV_LOL_API_URL_REGEX.exec(details.url);
  if (match == null) return response;
  const [_, streamId] = match;
  if (streamId == null) return response;

  const filter = browser.webRequest.filterResponseData(details.requestId);
  const decoder = new TextDecoder("utf-8");

  filter.ondata = event => {
    const string = decoder.decode(event.data, { stream: true });
    const proxyCountry = extractProxyCountry(string);
    if (proxyCountry) {
      setStreamStatusProxyCountry(streamId, proxyCountry);
    }
    filter.write(event.data);
  };
  filter.onerror = () => {
    console.log(`Error: ${filter.error} for ${details.requestId}`);
  };
  filter.onstop = () => filter.disconnect();

  return response;
}
