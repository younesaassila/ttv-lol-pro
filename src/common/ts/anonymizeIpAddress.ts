import ip from "ip";
import { getProxyInfoFromUrl } from "./proxyInfo";

/**
 * Anonymize an IP address by masking the last 2 octets of an IPv4 address
 * or the last 8 octets of an IPv6 address.
 * @param url
 * @returns
 */
export function anonymizeIpAddress(url: string): string {
  const proxyInfo = getProxyInfoFromUrl(url);

  let proxyHost = proxyInfo.host;

  const isIPv4 = ip.isV4Format(proxyHost);
  const isIPv6 = ip.isV6Format(proxyHost);
  const isIP = isIPv4 || isIPv6;
  const isPublicIP = isIP && !ip.isPrivate(proxyHost);

  if (isPublicIP) {
    if (isIPv4) {
      proxyHost = ip.mask(proxyHost, "255.255.0.0").replace(/\.0\.0$/, ".*.*");
    } else if (isIPv6) {
      proxyHost = ip.mask(proxyHost, "ffff:ffff:ffff:ffff:0000:0000:0000:0000");
    }
  }

  return proxyHost; // Also anonymizes port.
}

/**
 * Anonymize an array of IP addresses. See {@link anonymizeIpAddress}.
 * @param urls
 * @returns
 */
export function anonymizeIpAddresses(urls: string[]): string[] {
  return urls.map(url => anonymizeIpAddress(url));
}
