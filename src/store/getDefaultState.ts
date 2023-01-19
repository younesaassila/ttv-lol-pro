import type { State } from "./types";

export default function getDefaultState() {
  return {
    disableVodRedirect: true,
    ignoredChannelSubscriptions: [],
    isUpdateAvailable: false,
    lastUpdateCheck: 0,
    resetPlayerOnMidroll: false,
    servers: ["https://api.ttv.lol"],
    streamStatuses: {},
    whitelistedChannels: [],
  } as State;
}
