import browser, { WebRequest } from "webextension-polyfill";
import filterResponseDataWrapper from "../../common/ts/filterResponseDataWrapper";
import store from "../../store";
import type { MidrollMessage } from "../../types";

const AD_SIGNIFIER = "stitched"; // From https://github.com/cleanlock/VideoAdBlockForTwitch/blob/145921a822e830da62d39e36e8aafb8ef22c7be6/firefox/content.js#L87
const START_DATE_REGEX =
  /START-DATE="(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+(?:[+-][0-2]\d:[0-5]\d|Z))"/i; // From https://stackoverflow.com/a/3143231
const VIDEO_WEAVER_URL_REGEX =
  /^https?:\/\/video-weaver\.(?:[a-z0-9-]+\.)*ttvnw\.net\//i;
const lastMidrollStartDateString = new Map<number, string>(); // Tab ID -> Start Date String.

export default function onBeforeVideoWeaverRequest(
  details: WebRequest.OnBeforeRequestDetailsType
): WebRequest.BlockingResponseOrPromise {
  if (!VIDEO_WEAVER_URL_REGEX.test(details.url)) return {};
  if (!store.state.resetPlayerOnMidroll) return {};

  filterResponseDataWrapper(details, replacer);

  return {};
}

/**
 * Detect midrolls by looking for an ad signifier in the video weaver response.
 * @param responseText
 * @returns
 */
function replacer(
  responseText: string,
  details: WebRequest.OnBeforeRequestDetailsType
) {
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
  const startDateMatch = midrollLine.match(START_DATE_REGEX);
  if (!startDateMatch) return;
  const [, startDateString] = startDateMatch;
  return startDateString;
}
