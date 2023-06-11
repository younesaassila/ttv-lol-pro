import { WebRequest } from "webextension-polyfill";
import getProxyInfoFromUrl from "../../common/ts/getProxyInfoFromUrl";
import store from "../../store";

const pendingRequests = [];

export default function onAuthRequired(
  details: WebRequest.OnAuthRequiredDetailsType
): void | WebRequest.BlockingResponseOrPromise {
  if (pendingRequests.includes(details.requestId)) {
    console.error(
      `🔐 Provided invalid credentials for proxy ${details.challenger.host}:${details.challenger.port}.`
    );
    return;
  }
  pendingRequests.push(details.requestId);

  const proxies = store.state.optimizedProxiesEnabled
    ? store.state.optimizedProxies
    : store.state.normalProxies;
  let proxy = proxies.find(proxy =>
    proxy.endsWith(`@${details.challenger.host}:${details.challenger.port}`)
  );
  if (!proxy) {
    // Port number might be implicit? (Depending on the browser?)
    proxy = proxies.find(proxy =>
      proxy.includes(`@${details.challenger.host}`)
    );
  }
  if (!proxy) return;

  console.log(`🔑 Providing credentials for proxy ${proxy}.`);
  const proxyInfo = getProxyInfoFromUrl(proxy);
  return {
    authCredentials: {
      username: proxyInfo.username,
      password: proxyInfo.password,
    },
  };
}
