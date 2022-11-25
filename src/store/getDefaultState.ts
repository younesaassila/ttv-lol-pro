import { State } from "./types";

export default function getDefaultState() {
  return {
    disableVodRedirect: true,
    removeTokenFromRequests: false,
    servers: ["https://api.ttv.lol"],
    streamStatuses: {},
    whitelistedChannels: [],
  } as State;
}
