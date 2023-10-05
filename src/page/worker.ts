import { FetchOptions, getFetch } from "./getFetch";

console.info("[TTV LOL PRO] 🚀 Worker script running.");

const options: FetchOptions = {
  scope: "worker",
  shouldWaitForStore: false,
};

self.fetch = getFetch(options);
