import * as m3u8Parser from "m3u8-parser";
import acceptFlag from "../common/ts/acceptFlag";
import findChannelFromTwitchTvUrl from "../common/ts/findChannelFromTwitchTvUrl";
import findChannelFromUsherUrl from "../common/ts/findChannelFromUsherUrl";
import generateRandomString from "../common/ts/generateRandomString";
import getHostFromUrl from "../common/ts/getHostFromUrl";
import {
  twitchGqlHostRegex,
  usherHostRegex,
  videoWeaverHostRegex,
  videoWeaverUrlRegex,
} from "../common/ts/regexes";
import { State } from "../store/types";

const NATIVE_FETCH = self.fetch;
const IS_CHROMIUM = !!self.chrome;

export interface FetchOptions {
  scope: "page" | "worker";
  shouldWaitForStore: boolean;
  state?: State;
  sendMessageToWorkers?: (message: any) => void;
}
export interface PlaybackAccessToken {
  value: string;
  signature: string;
  authorization: {
    isForbidden: boolean;
    forbiddenReasonCode: string;
  };
  __typename: string;
}
enum MessageType {
  NewPlaybackAccessToken = "TLP_NewPlaybackAccessToken",
  NewPlaybackAccessTokenResponse = "TLP_NewPlaybackAccessTokenResponse",
}

export function getFetch(options: FetchOptions): typeof fetch {
  // TODO: Clear variables on navigation.
  const knownVideoWeaverUrls = new Set<string>();
  const videoWeaverUrlsToFlag = new Map<string, number>(); // Video Weaver URLs to flag -> number of times flagged.

  // TODO: Again, what happens when the user navigates to another channel?
  let cachedPlaybackTokenRequestHeaders: Map<string, string> | null = null;
  let cachedPlaybackTokenRequestBody: string | null = null;
  let cachedUsherRequestUrl: string | null = null;

  let assignedVideoWeaversMap: Map<string, string> | null = null;
  let replacementVideoWeaversMap: Map<string, string> | null = null;
  let consecutiveMidrollResponses = 0;

  if (options.shouldWaitForStore) {
    setTimeout(() => {
      options.shouldWaitForStore = false;
    }, 5000);
  }

  if (options.scope === "page") {
    self.addEventListener("message", async event => {
      if (event.data?.type === MessageType.NewPlaybackAccessToken) {
        const newPlaybackAccessToken =
          await fetchReplacementPlaybackAccessToken(
            cachedPlaybackTokenRequestHeaders,
            cachedPlaybackTokenRequestBody
          );
        const message = {
          type: MessageType.NewPlaybackAccessTokenResponse,
          newPlaybackAccessToken,
        };
        console.log("[TTV LOL PRO] 💬 Sent message to workers", message);
        options.sendMessageToWorkers?.(message);
      }
    });
  }

  async function setReplacementVideoWeaversMap() {
    try {
      console.log("[TTV LOL PRO] 🔄 Checking for new Video Weaver URLs…");
      const newUsherManifest = await fetchReplacementUsherManifest(
        cachedUsherRequestUrl
      );
      if (newUsherManifest == null) {
        console.log("[TTV LOL PRO] 🔄 No new Video Weaver URLs found.");
        return;
      }
      replacementVideoWeaversMap =
        getVideoWeaversMapFromUsherResponse(newUsherManifest);
      console.log(
        "[TTV LOL PRO] 🔄 Found new Video Weaver URLs:",
        Object.fromEntries(replacementVideoWeaversMap?.entries() ?? [])
      );
    } catch (error) {
      replacementVideoWeaversMap = null;
      console.error(
        "[TTV LOL PRO] 🔄 Failed to get new Video Weaver URLs:",
        error
      );
    }
  }

  // // TEST CODE
  // if (options.scope === "worker") {
  //   setTimeout(setReplacementVideoWeaversMap, 30000);
  // }

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
    let requestBody: string | null | undefined = undefined;
    const readRequestBody = async (): Promise<string | null> => {
      if (requestBody !== undefined) return requestBody;
      return getRequestBodyText(input, init);
    };

    //#region Requests

    // Twitch GraphQL requests.
    if (host != null && twitchGqlHostRegex.test(host)) {
      requestBody = await readRequestBody();
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
      if (
        requestBody != null &&
        requestBody.includes("PlaybackAccessToken_Template")
      ) {
        console.debug(
          "[TTV LOL PRO] 🥅 Caught GraphQL PlaybackAccessToken_Template request. Flagging…"
        );

        while (options.shouldWaitForStore) await sleep(100);
        let graphQlBody = null;
        try {
          graphQlBody = JSON.parse(requestBody);
        } catch {}
        const channelName = graphQlBody?.variables?.login as string | undefined;
        const whitelistedChannelsLower = options.state?.whitelistedChannels.map(
          channel => channel.toLowerCase()
        );
        const isWhitelisted =
          channelName != null &&
          whitelistedChannelsLower != null &&
          whitelistedChannelsLower.includes(channelName.toLowerCase());

        if (options.state?.anonymousMode === true) {
          if (!isWhitelisted) {
            console.log("[TTV LOL PRO] 🕵️ Anonymous mode is enabled.");
            setHeaderToMap(headersMap, "Authorization", "undefined");
            removeHeaderFromMap(headersMap, "Client-Session-Id");
            removeHeaderFromMap(headersMap, "Client-Version");
            setHeaderToMap(headersMap, "Device-ID", generateRandomString(32));
            removeHeaderFromMap(headersMap, "Sec-GPC");
            removeHeaderFromMap(headersMap, "X-Device-Id");
          } else {
            console.log(
              "[TTV LOL PRO] 🕵️✋ Anonymous mode is enabled but channel is whitelisted."
            );
          }
        }
        flagRequest(headersMap);
        cachedPlaybackTokenRequestHeaders = headersMap;
        cachedPlaybackTokenRequestBody = requestBody;
      } else if (
        requestBody != null &&
        requestBody.includes("PlaybackAccessToken")
      ) {
        console.debug(
          "[TTV LOL PRO] 🥅 Caught GraphQL PlaybackAccessToken request. Flagging…"
        );
        flagRequest(headersMap);
        cachedPlaybackTokenRequestHeaders = headersMap;
        cachedPlaybackTokenRequestBody = requestBody;
      }
    }

    // Usher requests.
    if (host != null && usherHostRegex.test(host)) {
      console.debug("[TTV LOL PRO] 🥅 Caught Usher request.");
      cachedUsherRequestUrl = url;
    }

    let response: Response;

    // Video Weaver requests.
    if (host != null && videoWeaverHostRegex.test(host)) {
      console.debug(`[TTV LOL PRO] 🥅 Caught Video Weaver request '${url}'.`);
      let videoWeaverUrl = url;
      if (replacementVideoWeaversMap != null) {
        const video = [...(assignedVideoWeaversMap?.entries() ?? [])].find(
          ([key, value]) => value === url
        )?.[0];
        if (video != null && replacementVideoWeaversMap.has(video)) {
          videoWeaverUrl = replacementVideoWeaversMap.get(video)!;
          console.log(
            `[TTV LOL PRO] 🔄 Replaced Video Weaver URL '${url}' with '${videoWeaverUrl}'.`
          );
        } else if (replacementVideoWeaversMap.size > 0) {
          videoWeaverUrl = [...replacementVideoWeaversMap.values()][0];
          console.log(
            `[TTV LOL PRO] 🔄 Replaced Video Weaver URL '${url}' with '${videoWeaverUrl}' (fallback).`
          );
        } else {
          console.log(
            `[TTV LOL PRO] 🔄 No replacement Video Weaver URL found for '${url}'.`
          );
        }
      }

      const isNewUrl = !knownVideoWeaverUrls.has(videoWeaverUrl);
      const isFlaggedUrl = videoWeaverUrlsToFlag.has(videoWeaverUrl);

      if (isNewUrl || isFlaggedUrl) {
        console.log(
          `[TTV LOL PRO] 🥅 Caught ${
            isNewUrl
              ? "first request to Video Weaver URL"
              : "Video Weaver request to flag"
          }. Flagging…`
        );
        flagRequest(headersMap);
        // videoWeaverUrlsToFlag.set(
        //   videoWeaverUrl,
        //   (videoWeaverUrlsToFlag.get(videoWeaverUrl) ?? 0) + 1
        // );
        if (isNewUrl) knownVideoWeaverUrls.add(videoWeaverUrl);
      }

      response = await NATIVE_FETCH(videoWeaverUrl, {
        ...init,
        headers: Object.fromEntries(headersMap),
      });
    } else {
      response = await NATIVE_FETCH(input, {
        ...init,
        headers: Object.fromEntries(headersMap),
      });
    }

    //#endregion

    // Reading the response body can be expensive, so we only do it if we need to.
    let responseBody: string | undefined = undefined;
    const readResponseBody = async (): Promise<string> => {
      if (responseBody !== undefined) return responseBody;
      const clonedResponse = response.clone();
      return clonedResponse.text();
    };

    //#region Responses

    // Usher responses.
    if (host != null && usherHostRegex.test(host)) {
      responseBody = await readResponseBody();
      console.debug("[TTV LOL PRO] 🥅 Caught Usher response.");
      assignedVideoWeaversMap =
        getVideoWeaversMapFromUsherResponse(responseBody);
      replacementVideoWeaversMap = null;
      const videoWeaverUrls = responseBody
        .split("\n")
        .filter(line => videoWeaverUrlRegex.test(line));
      // Send Video Weaver URLs to content script.
      sendMessageToContentScript(options.scope, {
        type: "UsherResponse",
        channel: findChannelFromUsherUrl(url),
        videoWeaverUrls,
        proxyCountry:
          /USER-COUNTRY="([A-Z]+)"/i.exec(responseBody)?.[1] || null,
      });
      // Remove all Video Weaver URLs from known URLs.
      videoWeaverUrls.forEach(url => knownVideoWeaverUrls.delete(url));
    }

    // Video Weaver responses.
    if (host != null && videoWeaverHostRegex.test(host)) {
      responseBody = await readResponseBody();

      // Check if response contains midroll ad.
      if (
        responseBody.includes("stitched-ad") &&
        responseBody.toLowerCase().includes("midroll")
      ) {
        console.log(
          "[TTV LOL PRO] 🥅 Caught Video Weaver response containing ad."
        );
        consecutiveMidrollResponses += 1;
        // Avoid infinite loops.
        if (consecutiveMidrollResponses <= 2) {
          await setReplacementVideoWeaversMap();
        } else {
          replacementVideoWeaversMap = null;
        }
      } else {
        // No ad, clear attempts.
        consecutiveMidrollResponses = 0;
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

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendMessageToPageScript(
  message: any,
  timeout = 5000
): Promise<any> {
  return new Promise((resolve, reject) => {
    const listener = (event: MessageEvent) => {
      if (event.data?.type === MessageType.NewPlaybackAccessTokenResponse) {
        resolve(event.data?.newPlaybackAccessToken);
      }
    };
    self.addEventListener("message", listener);
    console.log("[TTV LOL PRO] 💬 Sent message to page", message);
    self.postMessage({
      type: "PageScriptMessage",
      message,
    });
    setTimeout(() => {
      self.removeEventListener("message", listener);
      reject(new Error("Timed out."));
    }, timeout);
  });
}

async function fetchReplacementPlaybackAccessToken(
  cachedPlaybackTokenRequestHeaders: Map<string, string> | null,
  cachedPlaybackTokenRequestBody: string | null
): Promise<PlaybackAccessToken | null> {
  // FIXME: Take anonymous mode into account.
  let request: Request;
  if (
    cachedPlaybackTokenRequestHeaders != null &&
    cachedPlaybackTokenRequestBody != null
  ) {
    request = new Request("https://gql.twitch.tv/gql", {
      method: "POST",
      headers: Object.fromEntries(cachedPlaybackTokenRequestHeaders), // Headers already flagged.
      body: cachedPlaybackTokenRequestBody,
    });
  } else {
    const login = findChannelFromTwitchTvUrl(location.href);
    if (login == null) return null;
    request = new Request("https://gql.twitch.tv/gql", {
      method: "POST",
      headers: {
        // TODO: Find unnecessary headers.
        Accept: "*/*",
        "Accept-Language": "en-US",
        "Accept-Encoding": "gzip, deflate, br",
        Referer: "https://www.twitch.tv/",
        Authorization: "undefined",
        "Client-ID": "kimne78kx3ncx6brgo4mv6wki5h1ko",
        "Content-Type": "text/plain; charset=UTF-8",
        "Device-ID": "umQiGH8XN9QN2A9VyHQJv7437IbqHZLL",
        Origin: "https://www.twitch.tv",
        DNT: "1",
        Connection: "keep-alive",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-site",
      },
      body: JSON.stringify({
        operationName: "PlaybackAccessToken_Template",
        query:
          'query PlaybackAccessToken_Template($login: String!, $isLive: Boolean!, $vodID: ID!, $isVod: Boolean!, $playerType: String!) {  streamPlaybackAccessToken(channelName: $login, params: {platform: "web", playerBackend: "mediaplayer", playerType: $playerType}) @include(if: $isLive) {    value    signature   authorization { isForbidden forbiddenReasonCode }   __typename  }  videoPlaybackAccessToken(id: $vodID, params: {platform: "web", playerBackend: "mediaplayer", playerType: $playerType}) @include(if: $isVod) {    value    signature   __typename  }}',
        // TODO: Check impact on VODs.
        variables: {
          isLive: true,
          login,
          isVod: false,
          vodID: "",
          playerType: "site",
        },
      }),
    });
  }
  const response = await NATIVE_FETCH(request);
  const json = await response.json();
  const newPlaybackAccessToken = json?.data?.streamPlaybackAccessToken;
  if (newPlaybackAccessToken == null) return null;
  return newPlaybackAccessToken;
}

function getReplacementUsherUrl(
  cachedUsherRequestUrl: string | null,
  playbackAccessToken: PlaybackAccessToken | null
): string | null {
  if (cachedUsherRequestUrl == null) return null;
  if (playbackAccessToken == null) return null;
  try {
    const newUsherUrl = new URL(cachedUsherRequestUrl);
    newUsherUrl.searchParams.delete("acmb");
    newUsherUrl.searchParams.set("play_session_id", generateRandomString(32));
    newUsherUrl.searchParams.set("sig", playbackAccessToken.signature);
    newUsherUrl.searchParams.set("token", playbackAccessToken.value);
    return newUsherUrl.toString();
  } catch {
    return null;
  }
}

async function fetchReplacementUsherManifest(
  cachedUsherRequestUrl: string | null
): Promise<string | null> {
  if (cachedUsherRequestUrl == null) return null;
  try {
    const newPlaybackAccessToken = await sendMessageToPageScript({
      type: MessageType.NewPlaybackAccessToken,
    });
    if (newPlaybackAccessToken == null) {
      console.log("[TTV LOL PRO] 🔄 No new playback token found.");
      return null;
    }
    const newUsherUrl = getReplacementUsherUrl(
      cachedUsherRequestUrl,
      newPlaybackAccessToken
    );
    if (newUsherUrl == null) {
      console.log("[TTV LOL PRO] 🔄 No new Usher URL found.");
      return null;
    }
    const response = await NATIVE_FETCH(newUsherUrl);
    const text = await response.text();
    return text;
  } catch {
    return null;
  }
}

function getVideoWeaversMapFromUsherResponse(
  response: string
): Map<string, string> | null {
  const parser = new m3u8Parser.Parser();
  parser.push(response);
  parser.end();
  const parsedManifest = parser.manifest;
  if (parsedManifest.playlists == null) return null;
  return new Map(
    parsedManifest.playlists.map(playlist => [
      playlist.attributes.VIDEO,
      playlist.uri,
    ])
  );
}
