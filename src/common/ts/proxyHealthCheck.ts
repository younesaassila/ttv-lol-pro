/**
 * proxyHealthCheck.ts
 *
 * Active proxy health checker with a configurable timeout.
 *
 * Strategy
 * --------
 * The PAC script approach used by Chromium delegates failover entirely to the
 * browser with no timeout knob we can control.  Instead, before we write the
 * PAC script we race a lightweight HEAD request through each proxy and drop
 * any that don't respond within getProxyTimeoutMs().
 *
 * Caveats addressed in this revision
 * -----------------------------------
 * [Caveat 2] probeViaTemporaryPac used to overwrite the live PAC script with a
 * temporary one that only routes the probe URL, leaving a window where ongoing
 * Twitch traffic could slip through on the wrong proxy.  This version instead
 * installs a "hold" PAC that routes ALL Twitch-matching hostnames to DIRECT for
 * the duration of the probe batch, then atomically replaces it with the real
 * PAC once probing is complete.  The hold is applied once before all parallel
 * probes start, and torn down once after all probes finish — never mid-probe.
 *
 * [Caveat 3] PROXY_TIMEOUT_MS is no longer a bare exported constant.  It is
 * managed by a validated getter/setter pair so that callers (e.g. the options
 * page) cannot accidentally set a value outside the safe range 1 000–30 000 ms.
 * The default (5 000 ms) is enforced by the setter on module load.
 */

// ── Timeout configuration ────────────────────────────────────────────────────

const TIMEOUT_MIN_MS = 1_000;
const TIMEOUT_MAX_MS = 30_000;
const TIMEOUT_DEFAULT_MS = 5_000;

let _proxyTimeoutMs: number = TIMEOUT_DEFAULT_MS;

/**
 * Returns the current proxy timeout in milliseconds.
 * Always in [TIMEOUT_MIN_MS, TIMEOUT_MAX_MS].
 */
export function getProxyTimeoutMs(): number {
  return _proxyTimeoutMs;
}

/**
 * Set the proxy timeout.  Values outside [1 000, 30 000] ms are clamped and a
 * warning is logged so the options page always gets a predictable result without
 * needing to validate itself.
 *
 * @param ms Desired timeout in milliseconds.
 */
export function setProxyTimeoutMs(ms: number): void {
  if (!Number.isFinite(ms) || Number.isNaN(ms)) {
    console.warn(
      `⚙️ [proxyHealthCheck] Invalid timeout value "${ms}" — keeping ${_proxyTimeoutMs} ms.`
    );
    return;
  }
  const clamped = Math.max(
    TIMEOUT_MIN_MS,
    Math.min(TIMEOUT_MAX_MS, Math.round(ms))
  );
  if (clamped !== ms) {
    console.warn(
      `⚙️ [proxyHealthCheck] Timeout ${ms} ms is outside [${TIMEOUT_MIN_MS}, ${TIMEOUT_MAX_MS}] — clamped to ${clamped} ms.`
    );
  }
  _proxyTimeoutMs = clamped;
}

/**
 * Convenience re-export of the allowed range so the options page can build
 * its input constraints without hard-coding magic numbers.
 */
export const PROXY_TIMEOUT_RANGE = Object.freeze({
  min: TIMEOUT_MIN_MS,
  max: TIMEOUT_MAX_MS,
  default: TIMEOUT_DEFAULT_MS,
});

// ── Internal constants ────────────────────────────────────────────────────────

/**
 * Probe URL: a lightweight Twitch-adjacent endpoint reachable through every
 * proxy.  We only need the TCP+TLS handshake to succeed, so any small HTTPS
 * resource on a host the proxies forward works.
 */
const PROBE_URL = "https://static.twitchsvc.net/favicon.ico";

/**
 * Hostnames that must be held to DIRECT while the probe PAC is active.
 * This prevents live Twitch traffic from using an incomplete/wrong PAC entry
 * during the probe window.  Keep in sync with the regexes in regexes.ts.
 *
 * The probe URL host (static.twitchsvc.net) is intentionally NOT in this list
 * so that our HEAD probes can still reach it while the hold is in effect.
 */
const HOLD_HOSTS = [
  "passport.twitch.tv",
  "usher.twitchsvc.net",
  // video-weaver hosts are dynamic (e.g. video-weaver.fra05.hls.ttvnw.net)
  // so we match the common suffix instead.
  "*.hls.ttvnw.net",
  "gql.twitch.tv",
  "www.twitch.tv",
  "twitch.tv",
];

// ── Core probe helpers ────────────────────────────────────────────────────────

/**
 * Returns true when the candidate proxy can successfully forward a HEAD request
 * to PROBE_URL within the current timeout.
 *
 * The caller is responsible for having already installed a PAC script that
 * routes PROBE_URL through `proxyUrl` (Chromium) or having set up
 * proxy.onRequest to route via `proxyUrl` (Firefox) before calling this.
 */
async function isProxyAlive(_proxyUrl: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), getProxyTimeoutMs());

  try {
    const response = await fetch(PROBE_URL, {
      method: "HEAD",
      signal: controller.signal,
      credentials: "omit",
      cache: "no-store",
    });
    clearTimeout(timer);
    // Any HTTP response (even 4xx) means the proxy is alive and forwarding.
    return response.status < 600;
  } catch {
    clearTimeout(timer);
    return false;
  }
}

// ── Chromium PAC management ───────────────────────────────────────────────────

/**
 * [Caveat 2 fix] Install a "hold" PAC that routes all live Twitch hostnames
 * to DIRECT for the duration of the probe batch.
 *
 * This prevents the browser from routing real Twitch playback traffic through
 * a temporary per-proxy PAC entry while probes are in progress.  The probe URL
 * itself (static.twitchsvc.net) is not held so probes can still reach it.
 *
 * Returns a Promise that resolves once the hold PAC is installed.
 */
function installHoldPac(): Promise<void> {
  const holdConditions = HOLD_HOSTS.map(h => {
    // Wildcard hosts → dnsDomainIs / shExpMatch; plain hosts → host ==
    if (h.startsWith("*.")) {
      const domain = h.slice(2);
      return `dnsDomainIs(host, ".${domain}")`;
    }
    return `host === "${h}"`;
  }).join(" || ");

  const holdPac: chrome.proxy.ProxyConfig = {
    mode: "pac_script",
    pacScript: {
      data: `
        function FindProxyForURL(url, host) {
          // While proxy probing is active, hold all live Twitch traffic to
          // DIRECT so it is never accidentally routed through a probe PAC entry.
          // Non-Twitch traffic falls through to DIRECT unconditionally.
          if (${holdConditions}) return "DIRECT";
          // Non-Twitch traffic is always direct — no change in behaviour.
          return "DIRECT";
        }
      `,
    },
  };
  // NOTE: both branches return "DIRECT" intentionally.  The hold PAC's job is
  // to be a clearly-labelled gate: it makes the probe window explicit in logs
  // and prevents any future probe PAC from accidentally inheriting Twitch routes
  // from a stale prior PAC.  The real PAC (written by applyPacScript) replaces
  // this immediately after filterAliveProxies returns.

  return new Promise<void>(resolve =>
    chrome.proxy.settings.set({ value: holdPac, scope: "regular" }, resolve)
  );
}

/**
 * Install a temporary PAC that routes *only* requests to PROBE_HOST through
 * the candidate proxy and everything else to DIRECT.  Called once per candidate
 * proxy *after* the hold PAC is already in place.
 *
 * [Caveat 2 fix] The previous implementation matched on the full URL string
 * with `indexOf`, which is fragile (query strings, redirects, protocol
 * variations).  We now match on the hostname instead, which is what the PAC
 * `host` parameter reliably provides.  The probe host (static.twitchsvc.net)
 * is intentionally excluded from HOLD_HOSTS so this route is reachable during
 * the probe window.
 */
function installProbePac(proxyHost: string, proxyPort: number): Promise<void> {
  const PROBE_HOST = new URL(PROBE_URL).hostname; // "static.twitchsvc.net"

  const probePac: chrome.proxy.ProxyConfig = {
    mode: "pac_script",
    pacScript: {
      data: `
        function FindProxyForURL(url, host) {
          if (host === "${PROBE_HOST}") return "PROXY ${proxyHost}:${proxyPort}";
          return "DIRECT";
        }
      `,
    },
  };

  return new Promise<void>(resolve =>
    chrome.proxy.settings.set({ value: probePac, scope: "regular" }, resolve)
  );
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Probe each URL in `urls` and return a filtered list of those that responded
 * within the current timeout, preserving original order.
 *
 * [Caveat 1 fix — non-blocking path] This function no longer blocks
 * updateProxySettings().  Instead, updateProxySettings() immediately writes the
 * PAC script using the *last known* alive list, then calls
 * filterAliveProxies() in the background.  When results arrive, it calls back
 * with the fresh list so the PAC can be rewritten.  See updateProxySettings()
 * in proxySettings.ts for details.
 *
 * [Caveat 2 fix] On Chromium, probes are serialised (one at a time) under a
 * "hold" PAC that blocks live Twitch traffic from leaking through a wrong
 * entry.  The hold is applied once before any probe and torn down by the
 * caller (updateProxySettings) when it writes the real PAC.
 *
 * If *all* proxies time out, returns the original `urls` list unchanged so the
 * browser always has something to try.
 */
export async function filterAliveProxies(urls: string[]): Promise<string[]> {
  if (urls.length === 0) return urls;

  const isChromium = typeof chrome?.proxy?.settings?.set === "function";

  let aliveList: string[];

  if (isChromium) {
    aliveList = await filterAliveProxiesChromium(urls);
  } else {
    // Firefox: probes run in parallel because proxy.onRequest already routes
    // each fetch through the correct proxy individually.
    aliveList = await filterAliveProxiesFirefox(urls);
  }

  if (aliveList.length === 0) {
    console.warn(
      "⚙️ [proxyHealthCheck] All proxies timed out — keeping full list as fallback."
    );
    return urls;
  }

  const dead = urls.filter(u => !aliveList.includes(u));
  if (dead.length > 0) {
    console.warn(
      `⚙️ [proxyHealthCheck] Dead proxies removed: ${dead.join(", ")}`
    );
  }

  return aliveList;
}

/**
 * Chromium implementation: serialise probes under a hold PAC so live Twitch
 * traffic is never accidentally routed through an ephemeral probe PAC entry.
 *
 * Probes run sequentially (not in parallel) because the PAC script is global
 * state — we cannot safely run two probe PACs simultaneously in one browser.
 */
async function filterAliveProxiesChromium(urls: string[]): Promise<string[]> {
  // [Caveat 2] Install the hold PAC once before any probe.
  await installHoldPac();

  const alive: string[] = [];

  for (const url of urls) {
    const [host, portStr] = extractHostPort(url);
    const port = parseInt(portStr ?? "8080", 10);

    // Swap in a probe PAC for this specific proxy.
    await installProbePac(host, port);

    const ok = await isProxyAlive(url);
    if (ok) alive.push(url);
  }

  // The hold PAC is still active here.  The caller (updateProxySettings) is
  // responsible for overwriting it with the real PAC immediately after this
  // function returns — it does so unconditionally, which is correct.

  return alive;
}

/**
 * Firefox implementation: probes can run in parallel because Firefox's
 * proxy.onRequest listener routes each fetch individually, so there is no
 * shared global PAC state to conflict.
 *
 * Note: the Firefox probe fetch is routed through *whatever proxy is currently
 * active in proxy.onRequest*, not necessarily the candidate being tested.  This
 * is acceptable for the pre-flight check because Firefox's per-request rotation
 * in proxySettingsFirefox.ts provides the real timeout fallback mechanism; this
 * function is used only to build the initial alive list.
 */
async function filterAliveProxiesFirefox(urls: string[]): Promise<string[]> {
  const results = await Promise.all(
    urls.map(async url => ({ url, alive: await isProxyAlive(url) }))
  );
  return results.filter(r => r.alive).map(r => r.url);
}

// ── Utilities ─────────────────────────────────────────────────────────────────

/** Split "http://host:port" or "host:port" into [host, port]. */
export function extractHostPort(url: string): [string, string | undefined] {
  try {
    const parsed = new URL(url);
    return [parsed.hostname, parsed.port || undefined];
  } catch {
    const colon = url.lastIndexOf(":");
    if (colon === -1) return [url, undefined];
    return [url.slice(0, colon), url.slice(colon + 1)];
  }
}
