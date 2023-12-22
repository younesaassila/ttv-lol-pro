import { FetchOptions, getFetch } from "./getFetch";

console.info("[TTV LOL PRO] 🚀 Worker script running.");

const options: FetchOptions = {
  scope: "worker",
  shouldWaitForStore: false,
};

self.addEventListener("message", event => {
  // console.log("[TTV LOL PRO] RECEIVED MESSAGE FROM PAGE", event.data);
  if (event.data?.type === "TLP_Ping") {
    self.postMessage({
      type: "PageScriptMessage",
      message: {
        type: "TLP_Pong",
      },
    });
  } else if (event.data?.type === "TLP_Pong") {
    console.log("[TTV LOL PRO] 🏓 Page responded to ping.");
  }
});

// // Ping page script every 5 seconds.
// setInterval(() => {
//   self.postMessage({
//     type: "PageScriptMessage",
//     message: {
//       type: "TLP_Ping",
//     },
//   });
// }, 5000);

self.fetch = getFetch(options);
