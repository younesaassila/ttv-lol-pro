/**
 * proxySettings.ts  (modified from v2.6.2)
 *
 * Changes vs upstream
 * -------------------
 * 1. `applyPacScript` extracted as a pure helper — builds and writes the PAC
 *    config from a given proxy list without any async probing work.
 * 2. `updateProxySettings` is synchronous again (no longer async).  It writes
 *    the PAC immediately using the last-known alive list from the store, then
 *    kicks off a background re-probe.  When the probe resolves, the PAC is
 *    rewritten with the fresh results — no startup delay.  [Caveat 1 fixed]
 * 3. The dead-proxy list is surfaced to the store so the UI can warn the user.
 * 4. `getProxyTimeoutMs` replaces the removed `PROXY_TIMEOUT_MS` constant.
 *    [Caveat 3 fixed — import aligned with validated getter/setter]
 * 5. Everything else is unchanged.
 */

import store from "../../store";
import { ProxyRequestType, ProxyType } from "../../types";
import isRequestTypeProxied from "./isRequestTypeProxied";
import { filterAliveProxies, getProxyTimeoutMs } from "./proxyHealthCheck";
import { getProxyInfoFromUrl, getUrlFromProxyInfo } from "./proxyInfo";
import {
  passportHostRegex,
  twitchGqlHostRegex,
  twitchTvHostRegex,
  usherHostRegex,
  videoWeaverHostRegex,
} from "./regexes";
import updateDnsResponses from "./updateDnsResponses";

/**
 * Module-level cache of the last set of proxies confirmed alive by a probe
 * cycle.  Kept here rather than in the store because it is internal
 * implementation state, not UI-facing data.  On first call (empty array),
 * updateProxySettings() falls back to the full configured proxy list.
 */
let lastKnownAliveProxies: string[] = [];

/**
 * Proxies confirmed dead by the last health-check cycle.
 * Kept as a module-level variable so State does not need to be modified.
 * The popup / options page can read this via getDeadProxies().
 */
let deadProxies: string[] = [];

/** Read-only accessor for the popup / options page. */
export function getDeadProxies(): readonly string[] {
  return deadProxies;
}

const PROXY_TYPE_MAP: Readonly<Record<ProxyType, string>> = Object.freeze({
  direct: "DIRECT",
  http: "PROXY",
  https: "HTTPS",
  socks: "SOCKS5",
  socks4: "SOCKS4",
});

/**
 * Build the PAC proxy info string from a list of proxy URLs.
 * Falls back to "DIRECT" at the end so the browser never hard-blocks.
 */
function getProxyInfoStringFromUrls(urls: string[]): string {
  return [
    ...urls.map(url => {
      const proxyInfo = getProxyInfoFromUrl(url);
      return `${PROXY_TYPE_MAP[proxyInfo.type]} ${getUrlFromProxyInfo({
        ...proxyInfo,
        // Don't include username/password in PAC script.
        username: undefined,
        password: undefined,
      })}`;
    }),
    "DIRECT",
  ].join("; ");
}

/**
 * Build and atomically write the PAC script config from `proxyList`.
 *
 * This is the single place the PAC is committed — called both for the
 * immediate write (with the cached alive list) and for the deferred rewrite
 * (with fresh probe results).
 */
function applyPacScript(
  proxyList: string[],
  requestFilter: ProxyRequestType[] | undefined
): void {
  const { optimizedProxiesEnabled, passportLevel } = store.state;
  const proxyInfoString = getProxyInfoStringFromUrls(proxyList);

  const getRequestParams = (requestType: ProxyRequestType) => ({
    isChromium: true,
    optimizedProxiesEnabled,
    passportLevel,
    customPassport: store.state.customPassportEnabled
      ? store.state.customPassport
      : null,
    fullModeEnabled:
      !optimizedProxiesEnabled ||
      (requestFilter != null && requestFilter.includes(requestType)),
  });

  const proxyPassportRequests = isRequestTypeProxied(
    ProxyRequestType.Passport,
    getRequestParams(ProxyRequestType.Passport)
  );
  const proxyUsherRequests = isRequestTypeProxied(
    ProxyRequestType.Usher,
    getRequestParams(ProxyRequestType.Usher)
  );
  const proxyVideoWeaverRequests = isRequestTypeProxied(
    ProxyRequestType.VideoWeaver,
    getRequestParams(ProxyRequestType.VideoWeaver)
  );
  const proxyGraphQLRequests = isRequestTypeProxied(
    ProxyRequestType.GraphQL,
    getRequestParams(ProxyRequestType.GraphQL)
  );
  const proxyTwitchWebpageRequests = isRequestTypeProxied(
    ProxyRequestType.TwitchWebpage,
    getRequestParams(ProxyRequestType.TwitchWebpage)
  );

  const config: chrome.proxy.ProxyConfig = {
    mode: "pac_script",
    pacScript: {
      data: `
        function FindProxyForURL(url, host) {
          // Passport requests.
          if (${proxyPassportRequests} && ${passportHostRegex}.test(host)) {
            return "${proxyInfoString}";
          }
          // Usher requests.
          if (${proxyUsherRequests} && ${usherHostRegex}.test(host)) {
            return "${proxyInfoString}";
          }
          // Video Weaver requests.
          if (${proxyVideoWeaverRequests} && ${videoWeaverHostRegex}.test(host)) {
            return "${proxyInfoString}";
          }
          // GraphQL requests.
          if (${proxyGraphQLRequests} && ${twitchGqlHostRegex}.test(host)) {
            return "${proxyInfoString}";
          }
          // Twitch webpage requests.
          if (${proxyTwitchWebpageRequests} && ${twitchTvHostRegex}.test(host)) {
            return "${proxyInfoString}";
          }
          return "DIRECT";
        }
      `,
    },
  };

  chrome.proxy.settings.set({ value: config, scope: "regular" }, () => {
    console.log(
      `⚙️ Proxying requests through one of: ${proxyList.join(", ") || "<empty>"}`
    );
    if (deadProxies.length > 0) {
      console.warn(`⚙️ Dead proxies excluded: ${deadProxies.join(", ")}`);
    }
  });
}

/**
 * [Caveat 1 fixed] updateProxySettings is synchronous again.
 *
 * On call it immediately writes the PAC using the module-level
 * `lastKnownAliveProxies` cache (populated on the previous probe cycle,
 * or the full proxy list on first run so the user is never left without a
 * proxy). It then kicks off a background probe; when that resolves it rewrites
 * the PAC with the fresh alive list and updates the store — adding zero latency
 * to startup or settings-save.
 *
 * @param requestFilter  Optional subset of request types to (re-)proxy.
 */
export function updateProxySettings(requestFilter?: ProxyRequestType[]): void {
  const { optimizedProxiesEnabled } = store.state;
  const allProxies = optimizedProxiesEnabled
    ? store.state.optimizedProxies
    : store.state.normalProxies;

  // ── Step 1: write PAC immediately with cached alive list ──────────────────
  // On first run, lastKnownAliveProxies is empty; fall back to the full list
  // so traffic is never blocked while the first probe is in progress.
  const cachedAlive =
    lastKnownAliveProxies.length > 0 ? lastKnownAliveProxies : allProxies;

  applyPacScript(cachedAlive, requestFilter);
  store.state.chromiumProxyActive = true;
  updateDnsResponses();

  // ── Step 2: re-probe in background; rewrite PAC when done ─────────────────
  // filterAliveProxies installs the hold PAC during probing (Caveat 2), then
  // returns.  We atomically overwrite the hold PAC with the real one here.
  console.log(
    `⚙️ [proxyHealthCheck] Background probe started for ${allProxies.length} ` +
      `proxy/proxies (timeout: ${getProxyTimeoutMs()} ms)…`
  );

  filterAliveProxies(allProxies).then(aliveProxies => {
    lastKnownAliveProxies = aliveProxies;
    deadProxies = allProxies.filter(p => !aliveProxies.includes(p));

    // Rewrite PAC atomically — this also tears down the hold PAC that
    // filterAliveProxiesChromium left in place.
    applyPacScript(aliveProxies, requestFilter);

    console.log(
      `⚙️ [proxyHealthCheck] Background probe complete. ` +
        `Alive: [${aliveProxies.join(", ")}]` +
        (deadProxies.length > 0 ? `  Dead: [${deadProxies.join(", ")}]` : "")
    );
  });
}

export function clearProxySettings(): void {
  chrome.proxy.settings.clear({ scope: "regular" }, () => {
    console.log("⚙️ Proxy settings cleared");
  });
  store.state.chromiumProxyActive = false;
}
