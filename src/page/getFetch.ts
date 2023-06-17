import acceptFlag from "../common/ts/acceptFlag";
import findChannelFromUsherUrl from "../common/ts/findChannelFromUsherUrl";
import getHostFromUrl from "../common/ts/getHostFromUrl";
import {
  twitchGqlHostRegex,
  usherHostRegex,
  videoWeaverHostRegex,
  videoWeaverUrlRegex,
} from "../common/ts/regexes";

const NATIVE_FETCH = self.fetch;
const IS_CHROMIUM = !!self.chrome;

export interface FetchOptions {
  scope: "page" | "worker";
}

export function getFetch(options: FetchOptions): typeof fetch {
  const knownVideoWeaverUrls = new Set<string>();
  const videoWeaverUrlsToFlag = new Map<string, number>(); // Video Weaver URLs to flag -> number of times flagged.
  const videoWeaverUrlsToIgnore = new Set<string>(); // No response check.

  return async function fetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const url = input instanceof Request ? input.url : input.toString();
    // Firefox doesn't support relative URLs in content scripts (workers too!).
    // See https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Chrome_incompatibilities#content_script_https_requests
    if (url.startsWith("//")) {
      // Missing protocol.
      const newUrl = `${location.protocol}${url}`;
      if (input instanceof Request) input = new Request(newUrl, input);
      else input = newUrl;
    } else if (url.startsWith("/")) {
      // Missing origin.
      const newUrl = `${location.origin}${url}`;
      if (input instanceof Request) input = new Request(newUrl, input);
      else input = newUrl;
    }
    const host = getHostFromUrl(url);
    const headersMap = getHeadersMap(input, init);

    // Reading the request body can be expensive, so we only do it if we need to.
    let requestBody: string | undefined = undefined;
    const readRequestBody = async () => {
      if (requestBody != null) return;
      requestBody = await getRequestBodyText(input, init);
    };

    //#region Requests

    // Twitch GraphQL requests.
    if (host != null && twitchGqlHostRegex.test(host)) {
      await readRequestBody();
      // Integrity requests.
      if (url === "https://gql.twitch.tv/integrity") {
        console.debug(
          "[TTV LOL PRO] 🥅 Caught GraphQL integrity request. Flagging…"
        );
        flagRequest(headersMap);
      }
      // Requests with Client-Integrity header.
      const integrityHeader = getHeaderFromMap(headersMap, "Client-Integrity");
      if (integrityHeader != null) {
        console.debug(
          "[TTV LOL PRO] 🥅 Caught GraphQL request with Client-Integrity header. Flagging…"
        );
        flagRequest(headersMap);
      }
      // PlaybackAccessToken requests.
      if (requestBody != null && requestBody.includes("PlaybackAccessToken")) {
        console.debug(
          "[TTV LOL PRO] 🥅 Caught GraphQL PlaybackAccessToken request. Flagging…"
        );
        flagRequest(headersMap);
      }
    }

    // Usher requests.
    if (host != null && usherHostRegex.test(host)) {
      console.debug("[TTV LOL PRO] 🥅 Caught Usher request.");
    }

    // Video Weaver requests.
    if (host != null && videoWeaverHostRegex.test(host)) {
      const isIgnoredUrl = videoWeaverUrlsToIgnore.has(url);
      const isNewUrl = !knownVideoWeaverUrls.has(url);
      const isFlaggedUrl = videoWeaverUrlsToFlag.has(url);

      if (!isIgnoredUrl && (isNewUrl || isFlaggedUrl)) {
        console.log(
          `[TTV LOL PRO] 🥅 Caught ${
            isNewUrl
              ? "first request to Video Weaver URL"
              : "Video Weaver request to flag"
          }. Flagging…`
        );
        flagRequest(headersMap);
        videoWeaverUrlsToFlag.set(
          url,
          (videoWeaverUrlsToFlag.get(url) ?? 0) + 1
        );
        if (isNewUrl) knownVideoWeaverUrls.add(url);
      }
    }

    //#endregion

    const response = await NATIVE_FETCH(input, {
      ...init,
      headers: Object.fromEntries(headersMap),
    });

    // Reading the response body can be expensive, so we only do it if we need to.
    let responseBody: string | undefined = undefined;
    const readResponseBody = async () => {
      if (responseBody != null) return;
      const clonedResponse = response.clone();
      responseBody = await clonedResponse.text();
    };

    //#region Responses

    // Usher responses.
    if (host != null && usherHostRegex.test(host)) {
      await readResponseBody();
      console.debug("[TTV LOL PRO] 🥅 Caught Usher response.");
      const videoWeaverUrls = responseBody
        .split("\n")
        .filter(line => videoWeaverUrlRegex.test(line));
      // Send Video Weaver URLs to content script.
      sendMessageToContentScript(
        options.scope,
        JSON.parse(
          JSON.stringify({
            type: "UsherResponse",
            channel: findChannelFromUsherUrl(url),
            videoWeaverUrls,
            proxyCountry:
              /USER-COUNTRY="([A-Z]+)"/i.exec(responseBody)?.[1] ?? null,
          })
        )
      );
      // Remove all Video Weaver URLs from known URLs.
      videoWeaverUrls.forEach(url => knownVideoWeaverUrls.delete(url));
    }

    // Video Weaver responses.
    if (host != null && videoWeaverHostRegex.test(host)) {
      await readResponseBody();
      // Check if response contains ad.
      if (responseBody.includes("stitched-ad")) {
        console.log(
          "[TTV LOL PRO] 🥅 Caught Video Weaver response containing ad."
        );
        if (videoWeaverUrlsToIgnore.has(url)) return response;
        if (!videoWeaverUrlsToFlag.has(url)) {
          // Let's proxy the next request for this URL, 2 attempts left.
          videoWeaverUrlsToFlag.set(url, 0);
          cancelRequest();
        }
        // FIXME: This workaround doesn't work. Let's find another way.
        // 0: First attempt, not proxied, cancelled.
        // 1: Second attempt, proxied, cancelled.
        // 2: Third attempt, proxied, last attempt by Twitch client.
        // If the third attempt contains an ad, we have to let it through.
        const isCancellable = videoWeaverUrlsToFlag.get(url) < 2;
        if (isCancellable) {
          cancelRequest();
        } else {
          console.error(
            "[TTV LOL PRO] ❌ Could not cancel Video Weaver response containing ad. All attempts used."
          );
          videoWeaverUrlsToFlag.delete(url); // Clear attempts.
          videoWeaverUrlsToIgnore.add(url); // Ignore this URL, there's nothing we can do.
        }
      } else {
        // No ad, remove from flagged list.
        videoWeaverUrlsToFlag.delete(url);
        videoWeaverUrlsToIgnore.delete(url);
      }
    }

    //#endregion

    return response;
  };
}

/**
 * Converts a HeadersInit to a map.
 * @param headers
 * @returns
 */
function getHeadersMap(
  input: RequestInfo | URL,
  init?: RequestInit
): Map<string, string> {
  const headers = input instanceof Request ? input.headers : init?.headers;
  if (!headers) return new Map();
  if (headers instanceof Headers) {
    return new Map(headers.entries());
  }
  if (Array.isArray(headers)) {
    return new Map(headers);
  }
  return new Map(Object.entries(headers));
}

/**
 * Converts a BodyInit to a string.
 * @param body
 * @returns
 */
async function getRequestBodyText(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<string | null> {
  if (input instanceof Request) {
    const clonedRequest = input.clone();
    return clonedRequest.text();
  }
  const body = init?.body;
  if (body == null) return null;
  if (body instanceof Blob) {
    return body.text();
  }
  if (body instanceof ArrayBuffer) {
    return new TextDecoder().decode(body);
  }
  if (body instanceof FormData) {
    const entries = [...body.entries()];
    return entries.map(e => `${e[0]}=${e[1]}`).join("&");
  }
  return body.toString();
}

function findHeaderFromMap(
  headersMap: Map<string, string>,
  name: string
): string | undefined {
  return [...headersMap.keys()].find(
    header => header.toLowerCase() === name.toLowerCase()
  );
}

function getHeaderFromMap(
  headersMap: Map<string, string>,
  name: string
): string | null {
  const header = findHeaderFromMap(headersMap, name);
  return header != null ? headersMap.get(header)! : null;
}

function setHeaderToMap(
  headersMap: Map<string, string>,
  name: string,
  value: string
) {
  const header = findHeaderFromMap(headersMap, name);
  headersMap.set(header ?? name, value);
}

function removeHeaderFromMap(headersMap: Map<string, string>, name: string) {
  const header = findHeaderFromMap(headersMap, name);
  if (header != null) {
    headersMap.delete(header);
  }
}

function sendMessageToContentScript(scope: "page" | "worker", message: any) {
  if (scope === "page") {
    self.postMessage(message);
  } else {
    self.postMessage({
      type: "ContentScriptMessage",
      message,
    });
  }
}

function flagRequest(headersMap: Map<string, string>) {
  if (IS_CHROMIUM) {
    console.debug(
      "[TTV LOL PRO] 🚩 Request flagging is not supported on Chromium. Ignoring…"
    );
    return;
  }
  const accept = getHeaderFromMap(headersMap, "Accept");
  setHeaderToMap(headersMap, "Accept", `${accept || ""}${acceptFlag}`);
}

function cancelRequest(): never {
  throw new Error();
}
