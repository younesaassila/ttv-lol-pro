import browser, { WebRequest } from "webextension-polyfill";
import { MidrollMessage } from "../../types";

const hasTabMidroll = new Map<number, boolean>();

export default function onBeforeVideoWeaverRequest(
  details: WebRequest.OnBeforeRequestDetailsType
) {
  // TODO: Improve this check (using regex)
  if (!details.url.toLowerCase().startsWith("https://video-weaver.")) return {};

  const supportsFilterResponseData = // Chrome doesn't support `filterResponseData`.
    browser.webRequest.filterResponseData != null;
  // Detect midrolls by looking for the AD_SIGNIFIER string in the video weaver response.
  if (supportsFilterResponseData) {
    const AD_SIGNIFIER = "stitched";

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

      // From https://github.com/cleanlock/VideoAdBlockForTwitch/blob/145921a822e830da62d39e36e8aafb8ef22c7be6/firefox/content.js#L523-L527
      const hasAdTags = (text: string) => text.includes(AD_SIGNIFIER);
      const isMidroll = (text: string) =>
        text.includes('"MIDROLL"') || text.includes('"midroll"');
      if (hasAdTags(responseText) && isMidroll(responseText)) {
        // Prevent multiple midroll messages from being sent for the same midroll.
        if (hasTabMidroll.get(details.tabId) === true) return;
        hasTabMidroll.set(details.tabId, true);

        const responseTextLines = responseText.split("\n");
        const midrollLine = responseTextLines.find(
          line => hasAdTags(line) && isMidroll(line)
        );
        if (!midrollLine) return;

        // From https://stackoverflow.com/a/3143231
        const startDateRegex =
          /START-DATE="(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+(?:[+-][0-2]\d:[0-5]\d|Z))"/i;
        const startDateMatch = midrollLine.match(startDateRegex);
        if (!startDateMatch) return;
        const [, startDateString] = startDateMatch;

        console.log(
          `Tab (ID = ${details.tabId}): Detected midroll (startDateString = "${startDateString}")`
        );
        console.log(responseText); // TODO: Remove this.

        const message = {
          type: "midroll",
          response: {
            tabId: details.tabId,
            startDateString,
          },
        } as MidrollMessage;
        browser.tabs.sendMessage(details.tabId, message).catch(console.error);
      } else {
        if (hasTabMidroll.get(details.tabId) === true) {
          console.log(`Tab (ID = ${details.tabId}): No midroll detected`);
          console.log(responseText); // TODO: Remove this.
        }

        hasTabMidroll.set(details.tabId, false);
      }

      filter.write(encoder.encode(responseText));
      filter.close();
    };
  }

  return {};
}
