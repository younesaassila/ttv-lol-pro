/**
 * proxySettingsFirefox.ts
 *
 * Firefox-specific proxy rotation with active timeout-based fallback.
 *
 * Background
 * ----------
 * Firefox exposes browser.proxy.onRequest, which lets the extension return a
 * different proxy object *per request* from JavaScript.  Unlike the Chromium
 * PAC-script approach, we control the exact proxy used for every request, so
 * we can implement a true client-side timeout: if a proxy doesn't respond
 * within PROXY_TIMEOUT_MS we advance the index and try the next one.
 *
 * How it works
 * ------------
 * 1. `initFirefoxProxyRotation()` is called once at extension startup.
 * 2. A `browser.proxy.onRequest` listener is installed.  For each proxied
 *    request it returns `{ type, host, port }` for the *current* proxy index.
 * 3. A companion `browser.proxy.onError` listener fires whenever a proxy
 *    connection fails (TCP error, timeout, auth failure, etc.).  On each error
 *    we rotate to the next live proxy.
 * 4. In parallel, `scheduleTimeoutCheck()` races a HEAD probe through the
 *    current proxy.  If it doesn't resolve within PROXY_TIMEOUT_MS the index
 *    is advanced before the browser's own retry logic kicks in.
 *
 * This gives us sub-5-second fallback on both slow and dead proxies, without
 * waiting for the browser's opaque retry window.
 */

import browser from "webextension-polyfill";
import store from "../../store";
import { ProxyRequestType } from "../../types";
import isRequestTypeProxied from "./isRequestTypeProxied";
import { getProxyTimeoutMs } from "./proxyHealthCheck";
import { getProxyInfoFromUrl } from "./proxyInfo";
import {
  passportHostRegex,
  twitchGqlHostRegex,
  twitchTvHostRegex,
  usherHostRegex,
  videoWeaverHostRegex,
} from "./regexes";

// ── State ────────────────────────────────────────────────────────────────────

/** Index into the current proxy list that we're actively using. */
let currentProxyIndex = 0;

/** True while a timeout probe is in flight to avoid stacking probes. */
let probeInFlight = false;

/** AbortController for the in-flight probe, so we can cancel it on rotation. */
let probeController: AbortController | null = null;

// ── Helpers ──────────────────────────────────────────────────────────────────

function getProxies(): string[] {
  return store.state.optimizedProxiesEnabled
    ? store.state.optimizedProxies
    : store.state.normalProxies;
}

function getCurrentProxy(): string | null {
  const proxies = getProxies();
  if (proxies.length === 0) return null;
  return proxies[currentProxyIndex % proxies.length] ?? null;
}

/**
 * Advance to the next proxy in the list (wraps around).
 * Returns the new proxy URL, or null if there are none.
 */
function rotateToNextProxy(reason: string): string | null {
  const proxies = getProxies();
  if (proxies.length === 0) return null;

  const prev = proxies[currentProxyIndex % proxies.length];
  currentProxyIndex = (currentProxyIndex + 1) % proxies.length;
  const next = proxies[currentProxyIndex];

  console.warn(
    `⚙️ [Firefox proxy rotation] ${reason} — ` +
      `rotating from ${prev} → ${next}`
  );

  // Cancel any in-flight probe for the old proxy.
  probeController?.abort();
  probeInFlight = false;

  return next;
}

/**
 * Fire a HEAD request through the *current* proxy and rotate if it times out.
 * Uses a dedicated fetch with an AbortController so we can cancel it cleanly.
 */
async function scheduleTimeoutCheck(): Promise<void> {
  if (probeInFlight) return;
  probeInFlight = true;
  probeController = new AbortController();

  const timer = setTimeout(() => {
    probeController?.abort();
  }, getProxyTimeoutMs());

  try {
    // This fetch is routed through the current proxy because the
    // browser.proxy.onRequest listener (installed below) intercepts it.
    const res = await fetch("https://static.twitchsvc.net/favicon.ico", {
      method: "HEAD",
      credentials: "omit",
      cache: "no-store",
      signal: probeController.signal,
    });
    clearTimeout(timer);
    // Any HTTP response means the proxy is reachable.
    if (res.status < 600) {
      console.log(
        `⚙️ [Firefox proxy rotation] Current proxy healthy: ${getCurrentProxy()}`
      );
    }
  } catch (err: unknown) {
    clearTimeout(timer);
    const isAbort = err instanceof Error && err.name === "AbortError";
    if (isAbort) {
      rotateToNextProxy(
        `Proxy did not respond within ${getProxyTimeoutMs()} ms`
      );
    }
    // Non-abort errors (e.g. network down) are handled by onError below.
  } finally {
    probeInFlight = false;
    probeController = null;
  }
}

// ── Host → request-type helpers ───────────────────────────────────────────────

function getProxyRequestTypeForHost(host: string): ProxyRequestType | null {
  if (passportHostRegex.test(host)) return ProxyRequestType.Passport;
  if (usherHostRegex.test(host)) return ProxyRequestType.Usher;
  if (videoWeaverHostRegex.test(host)) return ProxyRequestType.VideoWeaver;
  if (twitchGqlHostRegex.test(host)) return ProxyRequestType.GraphQL;
  if (twitchTvHostRegex.test(host)) return ProxyRequestType.TwitchWebpage;
  return null;
}

function shouldProxyRequest(host: string): boolean {
  const requestType = getProxyRequestTypeForHost(host);
  if (requestType == null) return false;

  const { optimizedProxiesEnabled, passportLevel } = store.state;
  return isRequestTypeProxied(requestType, {
    isChromium: false,
    optimizedProxiesEnabled,
    passportLevel,
    customPassport: store.state.customPassportEnabled
      ? store.state.customPassport
      : null,
    // Firefox path: isFlagged drives per-request proxy decisions.
    // fullModeEnabled does not exist on the Firefox overload of
    // isRequestTypeProxied — it is a Chromium-only PAC-script concept.
    isFlagged: undefined,
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Install the Firefox proxy.onRequest + proxy.onError listeners.
 * Call once from the background script on startup.
 */
export function initFirefoxProxyRotation(): void {
  if (typeof browser?.proxy?.onRequest?.addListener !== "function") {
    console.warn(
      "⚙️ [Firefox proxy rotation] browser.proxy.onRequest not available — " +
        "falling back to PAC-script mode."
    );
    return;
  }

  // Reset rotation state on (re-)init.
  currentProxyIndex = 0;
  probeInFlight = false;
  probeController?.abort();
  probeController = null;

  // ── onRequest: return proxy info for each matching request ────────────────
  browser.proxy.onRequest.addListener(
    details => {
      if (!shouldProxyRequest(details.documentUrl ?? details.url)) {
        return { type: "direct" };
      }

      const proxies = getProxies();
      if (proxies.length === 0) return { type: "direct" };

      const proxyUrl = proxies[currentProxyIndex % proxies.length];
      const info = getProxyInfoFromUrl(proxyUrl);

      // Kick off a background timeout probe on every proxied request (debounced
      // by the probeInFlight flag so we don't flood the proxy).
      scheduleTimeoutCheck();

      return {
        type: info.type === "http" ? "http" : info.type,
        host: info.host,
        port: info.port,
        username: info.username,
        password: info.password,
        // failoverTimeout is not a standard WebExtension API field — we manage
        // rotation ourselves via onError + the timeout probe above.
      };
    },
    // Filter: only intercept requests that *could* be Twitch-related.
    { urls: ["<all_urls>"] }
  );

  // ── onError: rotate immediately on any proxy connection failure ───────────
  browser.proxy.onError.addListener(error => {
    console.warn(`⚙️ [Firefox proxy rotation] Proxy error: ${error.details}`);
    rotateToNextProxy("Connection error");
  });

  console.log("⚙️ [Firefox proxy rotation] Listeners installed.");
}

/**
 * Reset the proxy index to 0 (e.g. when the user saves new proxy settings).
 */
export function resetFirefoxProxyIndex(): void {
  currentProxyIndex = 0;
  probeController?.abort();
  probeInFlight = false;
  console.log("⚙️ [Firefox proxy rotation] Index reset to 0.");
}
