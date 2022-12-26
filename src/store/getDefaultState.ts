import { State } from "./types";

export default function getDefaultState() {
  return {
    disableVodRedirect: true,
    ignoredChannelSubscriptions: [],
    isUpdateAvailable: false,
    lastUpdateCheck: 0,
    resetPlayerOnMidroll: true,
    servers: ["https://api.ttv.lol"],
    streamStatuses: {},
    whitelistedChannels: [],
  } as State;
}
