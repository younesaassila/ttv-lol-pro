import { WebRequest } from "webextension-polyfill";
import getProxyInfoFromUrl from "../../common/ts/getProxyInfoFromUrl";
import store from "../../store";

const pendingRequests: string[] = [];

export default function onAuthRequired(
  details: WebRequest.OnAuthRequiredDetailsType
): void | WebRequest.BlockingResponseOrPromise {
  if (!details.isProxy) return;

  if (pendingRequests.includes(details.requestId)) {
    console.error(
      `🔐 Provided invalid credentials for proxy ${details.challenger.host}:${details.challenger.port}.`
    );
    // TODO: Remove the proxy from the list of online proxies.
    return;
  }
  pendingRequests.push(details.requestId);

  let predicate = (proxy: string) =>
    proxy.endsWith(`@${details.challenger.host}:${details.challenger.port}`);
  if (details.challenger.port === 3128) {
    // Default port
    predicate = (proxy: string) =>
      proxy.endsWith(
        `@${details.challenger.host}:${details.challenger.port}`
      ) || proxy.endsWith(`@${details.challenger.host}`);
  }

  const proxies = store.state.optimizedProxiesEnabled
    ? store.state.optimizedProxies
    : store.state.normalProxies;
  const proxy = proxies.find(predicate);
  if (!proxy) {
    console.error(
      `🔐 No credentials found for proxy ${details.challenger.host}:${details.challenger.port}.`
    );
    return;
  }

  console.log(`🔑 Providing credentials for proxy ${proxy}.`);
  const proxyInfo = getProxyInfoFromUrl(proxy);
  if (proxyInfo.username == null || proxyInfo.password == null) return;
  return {
    authCredentials: {
      username: proxyInfo.username,
      password: proxyInfo.password,
    },
  };
}
