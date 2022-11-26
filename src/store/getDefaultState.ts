import { State } from "./types";

export default function getDefaultState() {
  return {
    disableVodRedirect: true,
    servers: ["https://api.ttv.lol"],
    streamStatuses: {},
    whitelistedChannels: [],
  } as State;
}
