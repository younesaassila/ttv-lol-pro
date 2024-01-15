type RequestType =
  | "passport"
  | "usher"
  | "weaver"
  | "gqlToken"
  | "gqlIntegrity"
  | "gql"
  | "www";

type Params =
  | {
      isChromium: true;
      optimizedProxiesEnabled: boolean;
      passportLevel: number;
      fullModeEnabled?: boolean;
    }
  | {
      isChromium: false;
      optimizedProxiesEnabled: boolean;
      passportLevel: number;
      isFlagged?: boolean;
    };

export default function isRequestTypeProxied(
  requestType: RequestType,
  params: Params
): boolean {
  if (requestType === "passport") {
    return params.passportLevel >= 0;
  }

  if (requestType === "usher") {
    return params.passportLevel >= 0;
  }

  if (requestType === "weaver") {
    if (params.optimizedProxiesEnabled) {
      if (params.isChromium && params.fullModeEnabled === false) {
        return false;
      }
      if (!params.isChromium && params.isFlagged === false) {
        return false;
      }
    }
    return true;
  }

  if (requestType === "gqlToken") {
    return params.passportLevel >= 1;
  }

  if (requestType === "gqlIntegrity") {
    if (params.optimizedProxiesEnabled) {
      return params.passportLevel >= 2;
    } else {
      return params.passportLevel >= 1;
    }
  }

  if (requestType === "gql") {
    // Proxy all GQL requests when passport is unoptimized official+ (Chromium)
    // or unoptimized diplomatic (Firefox).
    if (
      params.isChromium &&
      !params.optimizedProxiesEnabled &&
      params.passportLevel >= 1
    ) {
      return true;
    }
    if (
      !params.isChromium &&
      !params.optimizedProxiesEnabled &&
      params.passportLevel >= 2
    ) {
      return true;
    }
    // Proxy flagged GQL requests when passport is official+.
    if (params.isChromium && params.fullModeEnabled === false) {
      return false;
    }
    if (!params.isChromium && params.isFlagged === false) {
      return false;
    }
    return params.passportLevel >= 1;
  }

  if (requestType === "www") {
    return params.passportLevel >= 2;
  }

  return false;
}
