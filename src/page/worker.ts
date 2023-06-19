import { getFetch } from "./getFetch";

console.info("[TTV LOL PRO] 🚀 Worker script running.");

self.fetch = getFetch({ scope: "worker" });
