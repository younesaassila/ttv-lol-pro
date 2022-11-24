import { State } from "./types";

export default function getDefaultState() {
  return {
    removeTokenFromRequests: false,
    servers: ["https://api.ttv.lol"],
    streamStatuses: {},
    whitelistedChannels: [],
  } as State;
}
