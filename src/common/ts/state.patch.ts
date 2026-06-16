/**
 * state.patch.ts
 *
 * No changes to src/store/state.ts are required.
 *
 * Both deadProxies and lastKnownAliveProxies are now module-level variables
 * inside proxySettings.ts:
 *
 *   - lastKnownAliveProxies: internal probe cache, not UI-facing
 *   - deadProxies:           exposed via getDeadProxies() export for the
 *                            popup / options page to read without touching State
 *
 * If you want to surface deadProxies reactively through the store in the
 * future, add this to the State type and initialise to []:
 *
 *   deadProxies: string[];
 *
 * …then replace the module-level variable in proxySettings.ts with
 * store.state.deadProxies and remove the getDeadProxies() export.
 */

export {}; // make this a module so tsc doesn't treat it as a global script
