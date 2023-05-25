import clientIdFlag from "../common/ts/clientIdFlag";
import generateRandomString from "../common/ts/generateRandomString";
import getHostFromUrl from "../common/ts/getHostFromUrl";
import { twitchGqlHostRegex } from "../common/ts/regexes";

console.info("[TTV LOL PRO] 🚀 Page script running.");

namespace TTV_LOL_PRO {
  const NATIVE_FETCH = window.fetch;

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
  async function getBodyText(
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

  export async function fetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    console.debug("[TTV LOL PRO] 🥅 Caught fetch request.");
    const url = input instanceof Request ? input.url : input.toString();
    const host = getHostFromUrl(url);
    const headersMap = getHeadersMap(init?.headers);
    const body = await getBodyText(init?.body);

    // PlaybackAccessToken requests.
    const isGqlRequest = host != null && twitchGqlHostRegex.test(host);
    const isPlaybackAccessTokenRequest = body?.includes("PlaybackAccessToken");
    if (isGqlRequest && isPlaybackAccessTokenRequest) {
      console.log("[TTV LOL PRO] 🥅 Caught PlaybackAccessToken request.");
      const clientId = getHeaderFromMap(headersMap, "Client-ID");
      setHeaderToMap(headersMap, "Authorization", "undefined");
      setHeaderToMap(
        headersMap,
        "Client-ID",
        `${clientId || ""}${clientIdFlag}`
      );
      setHeaderToMap(headersMap, "Device-ID", generateRandomString(32));
      removeHeaderFromMap(headersMap, "Sec-GPC");
    }

    return NATIVE_FETCH(input, {
      ...init,
      headers: Object.fromEntries(headersMap),
    });
  }
}

window.fetch = TTV_LOL_PRO.fetch;
