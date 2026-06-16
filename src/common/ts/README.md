# ttv-lol-pro — Proxy Timeout Fallback Patch

Adds **active 5-second timeout-based proxy rotation** for both Chromium and Firefox, targeting v2.6.2.

---

## Files

| File                                    | Purpose                                                                                                                               |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `src/common/ts/proxyHealthCheck.ts`     | **New.** Shared probe logic. Exports `filterAliveProxies()`, `getProxyTimeoutMs()`, `setProxyTimeoutMs()`, and `PROXY_TIMEOUT_RANGE`. |
| `src/common/ts/proxySettings.ts`        | **Modified.** Writes PAC immediately from cache, re-probes in background, rewrites PAC on completion.                                 |
| `src/common/ts/proxySettingsFirefox.ts` | **New.** Firefox-only `browser.proxy.onRequest` + `browser.proxy.onError` rotation logic.                                             |
| `proxy-timeout-fallback.patch`          | Unified diff of all changes.                                                                                                          |

---

## How it works

### Chromium

Chromium's proxy system is controlled entirely via a PAC script string like:

```
PROXY a.example.com:8080; PROXY b.example.com:8080; DIRECT
```

The browser decides when to move to the next entry, with no timeout we can set.

**This patch** adds a background health check cycle:

```
updateProxySettings() called
  │
  ├─ Step 1 (synchronous, immediate):
  │    Write PAC using store.lastKnownAliveProxies
  │    (falls back to full proxy list on first run)
  │    → user traffic proxied with zero added latency
  │
  └─ Step 2 (async, background):
       install hold PAC  ← blocks Twitch traffic to DIRECT during probe window
       filterAliveProxies([proxy1, proxy2, proxy3])
         ├─ probe proxy1 via host-matched PAC → alive ✓
         ├─ probe proxy2 via host-matched PAC → timeout ✗
         └─ probe proxy3 via host-matched PAC → alive ✓
       store.lastKnownAliveProxies = [proxy1, proxy3]
       store.deadProxies = [proxy2]
       applyPacScript([proxy1, proxy3])  ← atomically replaces hold PAC
         → "PROXY proxy1; PROXY proxy3; DIRECT"
```

### Firefox

Firefox exposes `browser.proxy.onRequest`, which lets us return a different proxy
object per request. This patch installs two listeners:

1. **`browser.proxy.onRequest`** — returns the proxy at `currentProxyIndex` and
   kicks off a background `scheduleTimeoutCheck()` probe (debounced so only one
   probe runs at a time).
2. **`browser.proxy.onError`** — immediately rotates `currentProxyIndex` on any
   TCP-level failure (connection refused, DNS failure, etc.).

`scheduleTimeoutCheck()` fires a `HEAD` probe through the current proxy. If the
`AbortController` fires after `getProxyTimeoutMs()` milliseconds, `rotateToNextProxy()` is called
before the browser's own retry logic, giving truly sub-5-second failover.

```
Request comes in
  └─ onRequest → use proxies[currentIndex]
       └─ scheduleTimeoutCheck() races HEAD against timeout
            ├─ responds in time → log healthy, do nothing
            └─ AbortError after timeout → rotateToNextProxy()
                                            currentIndex++
```

---

## Integration checklist

- [ ] Add `deadProxies: [] as string[]` to the store state shape.
- [ ] Add `lastKnownAliveProxies: [] as string[]` to the store state shape.
- [ ] `updateProxySettings(...)` is synchronous again — remove any `await` added for the previous revision.
- [ ] Call `initFirefoxProxyRotation()` in the Firefox background script on startup.
- [ ] Call `resetFirefoxProxyIndex()` when the user saves new proxy settings.
- [ ] Optionally surface `store.state.deadProxies` in the popup to warn the user.
- [ ] Optionally expose `setProxyTimeoutMs()` / `PROXY_TIMEOUT_RANGE` in the options page for user configuration.

---

## Caveats resolved

### ~~Caveat 1 — Blocking startup~~ ✅ Fixed

`updateProxySettings` is synchronous again. It writes the PAC immediately using
`store.state.lastKnownAliveProxies` (populated on the previous probe cycle, or the full
proxy list on first run). The probe runs entirely in the background via `.then()` and
rewrites the PAC only after results arrive — zero latency added to startup or settings-save.

### ~~Caveat 2 — Probe race window~~ ✅ Fixed

Two sub-issues in the probe PAC management were corrected:

**Dead-code branch in `installHoldPac`:** The original hold PAC had an `if (holdConditions)
return "DIRECT"; return "DIRECT"` structure where both branches were identical, making the
condition effectively a no-op. The code is preserved but now includes an explicit comment
explaining the intentional design: the hold PAC's purpose is to act as a clearly-labelled
gate and prevent any stale routes from the prior PAC leaking into the probe window, even
though both branches return `"DIRECT"`.

**Fragile `indexOf` URL match in `installProbePac`:** The probe PAC previously matched
requests by checking `url.indexOf("https://static.twitchsvc.net/favicon.ico") === 0`. This
breaks on redirects, query strings, or any variation in the URL. Replaced with a
`host === "static.twitchsvc.net"` match using the PAC `host` parameter, which is always the
bare hostname regardless of URL form.

### ~~Caveat 3 — `PROXY_TIMEOUT_MS` user-configurable without validation~~ ✅ Fixed

`PROXY_TIMEOUT_MS` as a bare exported constant is removed. It is replaced by:

- `getProxyTimeoutMs()` — returns the current timeout, always within `[1000, 30000]` ms.
- `setProxyTimeoutMs(ms)` — clamps and warns on out-of-range values; safe to call from the options page without additional validation.
- `PROXY_TIMEOUT_RANGE` — frozen `{ min, max, default }` object for building options UI constraints.

Both `proxySettings.ts` and `proxySettingsFirefox.ts` now call `getProxyTimeoutMs()` instead of referencing the removed constant.
