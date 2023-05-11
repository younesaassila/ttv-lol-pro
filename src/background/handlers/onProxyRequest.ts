import { Proxy } from "webextension-polyfill";
import getHostFromUrl from "../../common/ts/getHostFromUrl";
import { videoWeaverHostRegex } from "../../common/ts/regexes";
import store from "../../store";
import { ProxyInfo } from "../../types";

export default function onProxyRequest(
  details: Proxy.OnRequestDetailsType
): ProxyInfo | ProxyInfo[] | Promise<ProxyInfo | ProxyInfo[]> {
  // Filter to video-weaver requests.
  const host = getHostFromUrl(details.url);
  if (!host || !videoWeaverHostRegex.test(host)) return { type: "direct" };

  const proxies = store.state.servers;
  const proxyInfoArray: ProxyInfo[] = proxies.map(host => {
    const [hostname, port] = host.split(":");
    return {
      type: "http",
      host: hostname,
      port: Number(port) ?? 3128,
    } as ProxyInfo;
  });

  console.log(
    `🔄 Proxying ${details.url} through one of: [${proxies.toString()}]`
  );

  if (proxyInfoArray.length === 0) return { type: "direct" };
  return proxyInfoArray;
}
