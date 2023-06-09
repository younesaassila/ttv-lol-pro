import acceptFlag from "../common/ts/acceptFlag";
import getHostFromUrl from "../common/ts/getHostFromUrl";
import {
  twitchGqlHostRegex,
  usherHostRegex,
  videoWeaverHostRegex,
} from "../common/ts/regexes";

export interface FetchOptions {}

export function getFetch(options: FetchOptions = {}): typeof fetch {
  const NATIVE_FETCH = self.fetch;

  const knownVideoWeaverUrls = new Set<string>(); // Known Video Weaver URLs.
  const videoWeaverUrlsToFlag = new Map<string, number>(); // Video Weaver URLs to flag -> number of times flagged.
  const videoWeaverUrlsToIgnore = new Set<string>(); // No response check.

  return async function fetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const url = input instanceof Request ? input.url : input.toString();
    const host = getHostFromUrl(url);
    const headersMap = getHeadersMap(init?.headers);
    const requestBody = await getRequestBodyText(init?.body);

    //#region Requests

    // Twitch GraphQL requests.
    if (host != null && twitchGqlHostRegex.test(host)) {
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
    const clonedResponse = response.clone();

    // Reading the response body can be expensive, so we only do it if we need to.
    let responseBody: string | undefined = undefined;
    const readResponseBody = async () => {
      if (responseBody != null) return;
      responseBody = await clonedResponse.text();
    };

    //#region Responses

    // Usher responses.
    if (host != null && usherHostRegex.test(host)) {
      await readResponseBody();
      console.debug("[TTV LOL PRO] 🥅 Caught Usher response.");
      // Remove all Video Weaver URLs from known URLs.
      responseBody.split("\n").forEach(line => {
        if (line.includes("video-weaver.")) {
          knownVideoWeaverUrls.delete(line.trim());
        }
      });
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
  headers: Headers | HeadersInit | undefined
): Map<string, string> {
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
  body: BodyInit | null | undefined
): Promise<string | null> {
  if (!body) return null;
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

function flagRequest(headersMap: Map<string, string>) {
  const accept = getHeaderFromMap(headersMap, "Accept");
  setHeaderToMap(headersMap, "Accept", `${accept || ""}${acceptFlag}`);
}

function cancelRequest(): never {
  throw new Error();
}
