import type { State } from "./types";

export default function getDefaultState() {
  return {
    checkForUpdates: false, // No need to check for updates on startup for CRX and XPI installs. The default value is set in the store initializer.
    disableVodRedirect: true, // Most ad-blockers already remove ads from VODs (VOD proxying requires a Twitch token).
    ignoredChannelSubscriptions: [], // Some channels might show ads even if you're subscribed to them.
    isUpdateAvailable: false,
    lastUpdateCheck: 0,
    resetPlayerOnMidroll: true,
    servers: ["https://api.ttv.lol"],
    streamStatuses: {},
    whitelistedChannels: [],
  } as State;
}
