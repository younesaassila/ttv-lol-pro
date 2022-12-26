import browser, { WebRequest } from "webextension-polyfill";
import type { MidrollMessage } from "../../types";

const AD_SIGNIFIER = "stitched"; // From https://github.com/cleanlock/VideoAdBlockForTwitch/blob/145921a822e830da62d39e36e8aafb8ef22c7be6/firefox/content.js#L87
const URL_REGEX = /^https?:\/\/video-weaver\.(?:[a-z0-9-]+\.)*ttvnw\.net\//i;
const lastMidrollStartDateString = new Map<number, string>(); // Tab ID -> Start Date String.

export default function onBeforeVideoWeaverRequest(
  details: WebRequest.OnBeforeRequestDetailsType
): WebRequest.BlockingResponseOrPromise {
  if (!URL_REGEX.test(details.url)) return {};
  if (!browser.webRequest.filterResponseData) return {};

  const filter = browser.webRequest.filterResponseData(details.requestId);
  const decoder = new TextDecoder("utf-8");
  const encoder = new TextEncoder();

  const buffers = [] as ArrayBuffer[];
  filter.ondata = event => buffers.push(event.data);
  filter.onstop = () => {
    let responseText = "";
    for (const [i, buffer] of buffers.entries()) {
      const stream = i !== buffers.length - 1;
      responseText += decoder.decode(buffer, { stream });
    }
    responseText = filterResponseText(details, responseText);

    filter.write(encoder.encode(responseText));
    filter.close();
  };

  return {};
}

/**
 * Detect midrolls by looking for an ad signifier in the video weaver response.
 * @param details
 * @param responseText
 * @returns
 */
function filterResponseText(
  details: WebRequest.OnBeforeRequestDetailsType,
  responseText: string
): string {
  // From https://github.com/cleanlock/VideoAdBlockForTwitch/blob/145921a822e830da62d39e36e8aafb8ef22c7be6/firefox/content.js#L523-L527
  const hasAdTags = (text: string) => text.includes(AD_SIGNIFIER);
  const isMidroll = (text: string) =>
    text.includes('"MIDROLL"') || text.includes('"midroll"');

  const responseTextLines = responseText.split("\n");
  const midrollLine = responseTextLines.find(
    line => hasAdTags(line) && isMidroll(line)
  );
  if (!midrollLine) return responseText;

  const startDateString = getStartDateStringFromMidrollLine(midrollLine);
  if (!startDateString) return responseText;

  // Prevent multiple midroll messages from being sent for the same midroll.
  const lastStartDateString = lastMidrollStartDateString.get(details.tabId);
  const isSameMidroll = startDateString === lastStartDateString;
  if (!isSameMidroll) {
    console.log(
      `Tab (ID = ${details.tabId}): Detected midroll (Scheduled for ${startDateString})`
    );

    const message = {
      type: "midroll",
      response: {
        tabId: details.tabId,
        startDateString,
      },
    } as MidrollMessage;
    browser.tabs.sendMessage(details.tabId, message).catch(console.error);

    lastMidrollStartDateString.set(details.tabId, startDateString);
  }

  return responseText;
}

function getStartDateStringFromMidrollLine(
  midrollLine: string
): string | undefined {
  // From https://stackoverflow.com/a/3143231
  const startDateRegex =
    /START-DATE="(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+(?:[+-][0-2]\d:[0-5]\d|Z))"/i;
  const startDateMatch = midrollLine.match(startDateRegex);
  if (!startDateMatch) return;
  const [, startDateString] = startDateMatch;
  return startDateString;
}
