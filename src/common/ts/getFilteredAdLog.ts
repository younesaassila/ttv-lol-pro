import getDefaultState from "../../store/getDefaultState";
import type { AdLogEntry, AdLogEntryFiltered } from "../../types";

export default function getFilteredAdLog(
  adLog: AdLogEntry[]
): AdLogEntryFiltered[] {
  const DEFAULT_PROXIES = getDefaultState().proxies;
  return adLog
    .filter(
      entry => entry.proxy !== null && DEFAULT_PROXIES.includes(entry.proxy)
    )
    .map(entry => ({
      ...entry,
      videoWeaverUrl: undefined,
    }));
}
