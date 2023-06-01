import acceptFlag from "../common/ts/acceptFlag";
import getHostFromUrl from "../common/ts/getHostFromUrl";
import {
  twitchGqlHostRegex,
  usherHostRegex,
  videoWeaverHostRegex,
} from "../common/ts/regexes";

const NATIVE_FETCH = self.fetch;

const knownVideoWeaverUrls = new Set<string>();
const videoWeaverUrlsToFlag = new Map<string, number>(); // URL -> No. of times flagged.

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

export interface FetchOptions {
  proxyTwitchWebpage: boolean;
}

export function getFetch(
  options?: Partial<FetchOptions>
): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
  return async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const url = input instanceof Request ? input.url : input.toString();
    const host = getHostFromUrl(url);
    const headersMap = getHeadersMap(init?.headers);
    const requestBody = await getRequestBodyText(init?.body);

    // Twitch GraphQL requests.
    if (
      options?.proxyTwitchWebpage &&
      host != null &&
      twitchGqlHostRegex.test(host)
    ) {
      if (url === "https://gql.twitch.tv/integrity") {
        console.log("[TTV LOL PRO] 🥅 Caught integrity request. Flagging…");
        flagRequest(headersMap);
      }
      const clientIntegrityHeader = getHeaderFromMap(
        headersMap,
        "Client-Integrity"
      );
      if (clientIntegrityHeader != null) {
        console.log(
          "[TTV LOL PRO] 🥅 Caught request with Client-Integrity header. Flagging…"
        );
        flagRequest(headersMap);
      }
      if (requestBody != null && requestBody.includes("PlaybackAccessToken")) {
        console.log(
          "[TTV LOL PRO] 🥅 Caught PlaybackAccessToken request. Flagging…"
        );
        flagRequest(headersMap);
      }
    }

    // Usher requests.
    if (host != null && usherHostRegex.test(host)) {
      console.log("[TTV LOL PRO] 🥅 Caught Usher request.");
    }

    // Video Weaver requests.
    if (host != null && videoWeaverHostRegex.test(host)) {
      const isNewUrl = !knownVideoWeaverUrls.has(url);
      const isFlaggedUrl = videoWeaverUrlsToFlag.has(url);
      if (isNewUrl || isFlaggedUrl) {
        console.log(
          "[TTV LOL PRO] 🥅 Caught new or ad-containing Video Weaver request. Flagging…"
        );
        flagRequest(headersMap);
        if (isNewUrl) knownVideoWeaverUrls.add(url);
        videoWeaverUrlsToFlag.set(
          url,
          (videoWeaverUrlsToFlag.get(url) ?? 0) + 1
        );
      }
    }

    const response = await NATIVE_FETCH(input, {
      ...init,
      headers: Object.fromEntries(headersMap),
    });
    const clonedResponse = response.clone();

    // Usher responses.
    if (host != null && usherHostRegex.test(host)) {
      console.log("[TTV LOL PRO] 🥅 Caught Usher response.");
      const responseBody = await clonedResponse.text();
      responseBody.split("\n").forEach(line => {
        if (line.includes("video-weaver.")) {
          knownVideoWeaverUrls.delete(line.trim());
        }
      });
    }

    // Video Weaver responses.
    if (host != null && videoWeaverHostRegex.test(host)) {
      const responseBody = await clonedResponse.text();

      if (responseBody.includes("stitched")) {
        console.log(
          "[TTV LOL PRO] 🥅 Caught Video Weaver response containing ad."
        );
        if (!videoWeaverUrlsToFlag.has(url)) {
          // Let's proxy the next request for this URL, 2 attempts left.
          videoWeaverUrlsToFlag.set(url, 0);
          cancelRequest();
        }
        // 0: First attempt, not proxied, cancelled.
        // 1: Second attempt, proxied, cancelled?
        // 2: Third attempt, proxied, last attempt by Twitch.
        // If the third attempt contains an ad, we have to let it through.
        const isCancellable = videoWeaverUrlsToFlag.get(url) < 2;
        if (isCancellable) {
          cancelRequest();
        } else {
          console.error(
            "[TTV LOL PRO] ❌ Could not cancel Video Weaver response containing ad. All attempts used."
          );
          videoWeaverUrlsToFlag.delete(url); // Reset attempts.
        }
      } else {
        // No ad, remove from flagged list.
        videoWeaverUrlsToFlag.delete(url);
      }
    }

    return response;
  };
}
