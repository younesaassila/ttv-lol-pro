import store from "../../store";
// import getDefaultState from "../../store/getDefaultState";

export default async function sendAdLog(): Promise<boolean | null> {
  // const DEFAULT_PROXIES = getDefaultState().proxies;

  const filteredAdLog = store.state.adLog
    .filter(
      entry =>
        entry.timestamp > store.state.adLogLastSent && entry.proxy != null
      // FIXME: Filter out third-party proxies.
      // && entry.proxy.split(":")[0].endsWith(".perfprod.com")
    )
    .map(entry => ({
      ...entry,
      videoWeaverUrl: undefined, // Remove the video-weaver URL from the log.
    }));
  if (filteredAdLog.length === 0) return null; // No log entries to send.

  let success = false;
  try {
    const response = await fetch("https://perfprod.com/ttvlolpro/telemetry", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(filteredAdLog),
    });
    success = response.ok;
    if (!success) console.error(`${response.status} ${response.statusText}`);
  } catch (error) {
    console.error(error);
  }

  if (success) store.state.adLogLastSent = Date.now();
  return success;
}
