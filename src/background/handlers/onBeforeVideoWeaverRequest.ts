import { WebRequest } from "webextension-polyfill";
import filterResponseDataWrapper from "../../common/ts/filterResponseDataWrapper";
import findChannelFromVideoWeaverUrl from "../../common/ts/findChannelFromVideoWeaverUrl";
import getHostFromUrl from "../../common/ts/getHostFromUrl";
import isChannelWhitelisted from "../../common/ts/isChannelWhitelisted";
import { videoWeaverHostRegex } from "../../common/ts/regexes";
import store from "../../store";
import { AdType, ProxyInfo } from "../../types";

export default function onBeforeVideoWeaverRequest(
  details: WebRequest.OnBeforeRequestDetailsType & {
    proxyInfo?: ProxyInfo;
  }
): void | WebRequest.BlockingResponseOrPromise {
  // Filter to video-weaver responses.
  const host = getHostFromUrl(details.url);
  if (!host || !videoWeaverHostRegex.test(host)) return;

  if (!store.state.adLogEnabled) return;

  filterResponseDataWrapper(details, text => {
    const adSignifier = "stitched-ad";
    const midrollSignifier = "midroll";

    const textLower = text.toLowerCase();
    const isAd = textLower.includes(adSignifier);
    const isMidroll = textLower.includes(midrollSignifier);

    if (isAd || isMidroll) {
      const adType: AdType = isMidroll ? AdType.MIDROLL : AdType.PREROLL;
      const channel = findChannelFromVideoWeaverUrl(details.url);
      const channelWhitelisted = isChannelWhitelisted(channel);
      let proxy: string | null = null;
      if (details.proxyInfo && details.proxyInfo.type !== "direct") {
        proxy = `${details.proxyInfo.host}:${details.proxyInfo.port}`;
      }
      const timestamp = Date.now();
      const videoWeaverUrl = details.url;

      const adLog = store.state.adLog.filter(
        entry => Date.now() - entry.timestamp < 1000 * 60 * 60 * 24 * 7 // 7 days
      );
      store.state.adLog = [
        ...adLog,
        {
          adType,
          channel,
          channelWhitelisted,
          proxy,
          timestamp,
          videoWeaverUrl,
        },
      ];
    }

    return text;
  });
}
