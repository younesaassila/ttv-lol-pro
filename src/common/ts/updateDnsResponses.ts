import ip from "ip";
import store from "../../store";
import type { DnsResponse } from "../../types";
import { getProxyInfoFromUrl } from "./proxyInfo";

export default async function updateDnsResponses() {
  const proxies = [
    ...store.state.optimizedProxies,
    ...store.state.normalProxies,
  ];
  const proxyInfoArray = proxies.map(getProxyInfoFromUrl);

  for (const proxyInfo of proxyInfoArray) {
    const { host } = proxyInfo;

    const dnsResponseIndex = store.state.dnsResponses.findIndex(
      dnsResponse => dnsResponse.host === host
    );
    const dnsResponse =
      dnsResponseIndex !== -1
        ? store.state.dnsResponses[dnsResponseIndex]
        : null;
    if (
      dnsResponse != null &&
      Date.now() - dnsResponse.timestamp < dnsResponse.ttl * 1000
    ) {
      continue;
    }

    if (ip.isV4Format(host) || ip.isV6Format(host)) {
      if (dnsResponseIndex !== -1) {
        store.state.dnsResponses.splice(dnsResponseIndex, 1);
      }
      store.state.dnsResponses.push({
        host,
        ips: [host],
        timestamp: Date.now(),
        ttl: Infinity,
      } as DnsResponse);
      continue;
    }

    try {
      const response = await fetch(`https://dns.google/resolve?name=${host}`);
      const json = await response.json();
      const { Answer } = json;
      if (!Array.isArray(Answer)) {
        console.error("Answer is not an array:", Answer);
        continue;
      }
      const ips = Answer.map((answer: any) => answer.data);
      const ttl =
        Number(response.headers.get("Cache-Control")?.split("=")[1]) || 0;
      if (dnsResponseIndex !== -1) {
        store.state.dnsResponses.splice(dnsResponseIndex, 1);
      }
      store.state.dnsResponses.push({
        host,
        ips,
        timestamp: Date.now(),
        ttl,
      } as DnsResponse);
    } catch (error) {
      console.error(error);
    }
  }

  console.log("🔍 DNS responses updated:");
  console.log(store.state.dnsResponses);
}
