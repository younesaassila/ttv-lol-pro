import { State } from "./types";

export default function getDefaultState() {
  return {
    disableVodRedirect: true,
    isUpdateAvailable: false,
    lastUpdateCheck: 0,
    servers: ["https://api.ttv.lol"],
    streamStatuses: {},
    whitelistedChannels: [],
  } as State;
}
