import type { ProxyInfo } from "../../types";

export default function getProxyInfoFromUrl(url: string): ProxyInfo {
  const lastIndexOfAt = url.lastIndexOf("@");
  const hostname = url.substring(lastIndexOfAt + 1, url.length);
  const lastIndexOfColon = getLastIndexOfColon(hostname);

  let host: string | undefined = undefined;
  let port: number | undefined = undefined;
  if (lastIndexOfColon === -1) {
    host = hostname;
    port = 3128; // Default port
  } else {
    host = hostname.substring(0, lastIndexOfColon);
    port = Number(hostname.substring(lastIndexOfColon + 1, hostname.length));
  }

  let username: string | undefined = undefined;
  let password: string | undefined = undefined;
  if (lastIndexOfAt !== -1) {
    const credentials = url.substring(0, lastIndexOfAt);
    const indexOfColon = credentials.indexOf(":");
    username = credentials.substring(0, indexOfColon);
    password = credentials.substring(indexOfColon + 1, credentials.length);
  }

  return {
    type: "http",
    host,
    port,
    username,
    password,
  };
}

/**
 * Returns the last index of a colon in a hostname, ignoring colons inside brackets.
 * Supports IPv6 addresses.
 * @param hostname
 * @returns Returns -1 if no colon is found.
 */
function getLastIndexOfColon(hostname: string): number {
  let lastIndexOfColon = -1;
  let bracketDepth = 0;
  for (let i = hostname.length - 1; i >= 0; i--) {
    const char = hostname[i];
    if (char === "]") {
      bracketDepth++;
    } else if (char === "[") {
      bracketDepth--;
    } else if (char === ":" && bracketDepth === 0) {
      lastIndexOfColon = i;
      break;
    }
  }
  return lastIndexOfColon;
}
