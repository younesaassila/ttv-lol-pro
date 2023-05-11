import type { State } from "./types";

export default function getDefaultState() {
  return {
    checkForUpdates: false, // No need to check for updates on startup for CRX and XPI installs. The default value is set in the store initializer.
    ignoredChannelSubscriptions: [], // Some channels might show ads even if you're subscribed to them.
    isUpdateAvailable: false,
    lastUpdateCheck: 0,
    servers: [],
    streamStatuses: {},
    videoWeaverUrlsByChannel: {},
    whitelistedChannels: [],
  } as State;
}
