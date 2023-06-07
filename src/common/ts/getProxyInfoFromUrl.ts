import type { ProxyInfo } from "../../types";

export default function getProxyInfoFromUrl(url: string): ProxyInfo {
  const lastIndexOfAt = url.lastIndexOf("@");

  const [host, port] = url.substring(lastIndexOfAt + 1, url.length).split(":");

  let username: string | undefined = undefined;
  let password: string | undefined = undefined;
  if (url.includes("@")) {
    const credentials = url.substring(0, lastIndexOfAt).split(":");
    username = credentials[0];
    password = credentials[1];
  }

  return {
    type: "http",
    host,
    port: Number(port) || 3128,
    username,
    password,
  };
}
