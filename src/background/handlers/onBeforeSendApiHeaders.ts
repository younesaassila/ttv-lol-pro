import browser, { WebRequest } from "webextension-polyfill";
import isChrome from "../../common/ts/isChrome";
import {
  MANIFEST_PROXY_COUNTRY_REGEX,
  TTV_LOL_API_URL_REGEX,
} from "../../common/ts/regexes";
import store from "../../store";

export default function onBeforeSendApiHeaders(
  details: WebRequest.OnBeforeSendHeadersDetailsType
): WebRequest.BlockingResponse {
  if (!details.requestHeaders) {
    console.error("`details.requestHeaders` is undefined");
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
  if (!match) return response;
  const [, streamId] = match;
  if (!streamId) return response;

  const filter = browser.webRequest.filterResponseData(details.requestId);
  const decoder = new TextDecoder("utf-8");

  filter.ondata = event => {
    const data = decoder.decode(event.data, { stream: true });
    const proxyCountry = extractProxyCountry(data);
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

function extractProxyCountry(data: string) {
  const match = MANIFEST_PROXY_COUNTRY_REGEX.exec(data);
  if (!match) return;
  const [, proxyCountry] = match;
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
