import { WebRequest } from "webextension-polyfill";
import store from "../../store";

const pendingRequests = [];

export default function onAuthRequired(
  details: WebRequest.OnAuthRequiredDetailsType
) {
  if (pendingRequests.includes(details.requestId)) {
    console.error(
      `🔐 Incorrect credentials provided for proxy ${details.challenger.host}:${details.challenger.port}.`
    );
    return;
  }
  pendingRequests.push(details.requestId);

  const proxies = store.state.optimizedProxiesEnabled
    ? store.state.optimizedProxies
    : store.state.normalProxies;
  const proxy = proxies.find(proxy =>
    proxy.includes(`@${details.challenger.host}`)
  );
  if (!proxy) return;
  const [username, password] = proxy
    .substring(0, proxy.lastIndexOf("@"))
    .split(":");
  console.log("Provided credentials for proxy", details.challenger.host);
  return { authCredentials: { username, password } };
}
