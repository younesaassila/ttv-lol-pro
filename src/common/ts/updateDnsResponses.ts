import { Address4, Address6 } from "ip-address";
import store from "../../store";
import type { DnsResponse, DnsResponseJson } from "../../types";
import { getProxyInfoFromUrl } from "./proxyInfo";

const MIN_TTL = 300;
const INFINITE_TTL = -1;

export default async function updateDnsResponses() {
  const proxies = Array.from(
    new Set([...store.state.optimizedProxies, ...store.state.normalProxies])
  );
  const proxyInfoArray = proxies.map(getProxyInfoFromUrl);

  for (const proxyInfo of proxyInfoArray) {
    const { host } = proxyInfo;

    // If we already have a valid DNS response for this host, skip it.
    const existingIndex = store.state.dnsResponses.findIndex(
      dnsResponse => dnsResponse.host === host
    );
    const existing =
      existingIndex !== -1 ? store.state.dnsResponses[existingIndex] : null;
    const isDnsResponseValid =
      existing &&
      (existing.ttl === INFINITE_TTL ||
        Date.now() - existing.timestamp < existing.ttl * 1000);
    if (isDnsResponseValid) {
      continue;
    }

    // If the host is an IP address, use it directly.
    const isIp = Address4.isValid(host) || Address6.isValid(host);
    if (isIp) {
      upsertDnsResponse(existingIndex, {
        host,
        ips: [host],
        timestamp: Date.now(),
        ttl: INFINITE_TTL,
      });
      continue;
    }

    // Otherwise, fetch DNS records from the DNS-over-HTTPS API.
    try {
      const dnsServer = store.state.dnsServer;
      const requests = [
        fetch(`${dnsServer}?name=${encodeURIComponent(host)}&type=A`, {
          headers: { Accept: "application/dns-json" },
        }),
        fetch(`${dnsServer}?name=${encodeURIComponent(host)}&type=AAAA`, {
          headers: { Accept: "application/dns-json" },
        }),
      ];
      const responses = await Promise.all(requests);

      let ips: string[] = [];
      let ttl: number | null = null;
      for (const response of responses) {
        if (!response.ok) {
          console.error(
            `Failed to fetch DNS for ${host}: HTTP ${response.status}`
          );
          continue;
        }
        const data: DnsResponseJson = await response.json();
        if (data.Status !== 0) {
          console.error(`DNS query for ${host} returned status ${data.Status}`);
          continue;
        }
        const { Answer } = data;
        if (Answer) {
          ips.push(...Answer.map(answer => answer.data));
          const answerTtl = Math.min(...Answer.map(answer => answer.TTL));
          if (ttl == null || answerTtl < ttl) {
            ttl = answerTtl;
          }
        }
      }
      if (ips.length === 0) {
        console.error(`No DNS answers found for ${host}`);
        continue;
      }

      upsertDnsResponse(existingIndex, {
        host,
        ips: Array.from(new Set(ips)), // Remove duplicates
        timestamp: Date.now(),
        ttl: ttl ? Math.max(ttl, MIN_TTL) : MIN_TTL, // Enforce minimum TTL
      });
    } catch (error) {
      console.error(error);
    }
  }

  console.log("🔍 DNS responses updated:");
  console.log(store.state.dnsResponses);
}

/**
 * Upsert a DNS response into the store.
 * @param existingIndex Index of existing DNS response, or -1 if not found.
 * @param dnsResponse The DNS response to upsert.
 */
function upsertDnsResponse(existingIndex: number, dnsResponse: DnsResponse) {
  if (existingIndex !== -1) {
    store.state.dnsResponses.splice(existingIndex, 1, dnsResponse);
  } else {
    store.state.dnsResponses.push(dnsResponse);
  }
}
