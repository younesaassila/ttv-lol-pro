import browser, { WebRequest } from "webextension-polyfill";

export default function filterResponseDataWrapper(
  details: WebRequest.OnBeforeRequestDetailsType,
  replacer: (
    responseText: string,
    details: WebRequest.OnBeforeRequestDetailsType
  ) => string
): void {
  if (!browser.webRequest.filterResponseData) return;

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
    responseText = replacer(responseText, details);

    filter.write(encoder.encode(responseText));
    filter.close();
  };
}
