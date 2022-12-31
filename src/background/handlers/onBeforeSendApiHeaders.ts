import { WebRequest } from "webextension-polyfill";
import filterResponseDataWrapper from "../../common/ts/filterResponseDataWrapper";
import { TTV_LOL_API_URL_REGEX } from "../../common/ts/regexes";
import store from "../../store";

const PROXY_COUNTRY_REGEX = /USER-COUNTRY="([A-Z]+)"/i;

export default function onBeforeSendApiHeaders(
  details: WebRequest.OnBeforeSendHeadersDetailsType
): WebRequest.BlockingResponseOrPromise {
  const requestHeaders = details.requestHeaders || [];
  requestHeaders.push({
    name: "X-Donate-To",
    value: "https://ttv.lol/donate",
  });

  const response = {
    requestHeaders: requestHeaders,
  } as WebRequest.BlockingResponse;

  filterResponseDataWrapper(details, text => {
    const streamId = getStreamIdFromUrl(details.url);
    const proxyCountry = extractProxyCountryFromManifest(text);
    if (!streamId || !proxyCountry) return text;

    setStreamStatusProxyCountry(streamId, proxyCountry);

    return text;
  });

  return response;
}

function getStreamIdFromUrl(url: string): string | undefined {
  const match = TTV_LOL_API_URL_REGEX.exec(url);
  if (!match) return;
  const [, streamId] = match;
  return streamId;
}

function extractProxyCountryFromManifest(text: string): string | undefined {
  const match = PROXY_COUNTRY_REGEX.exec(text);
  if (!match) return;
  const [, proxyCountry] = match;
  return proxyCountry;
}

function setStreamStatusProxyCountry(
  streamId: string,
  proxyCountry: string
): void {
  const status = store.state.streamStatuses[streamId];
  if (!status) return;

  store.state.streamStatuses[streamId] = {
    ...status,
    proxyCountry: proxyCountry,
  };
}
