import { ProxyRequestParams, ProxyRequestType } from "../../types";

export default function isRequestTypeProxied(
  type: ProxyRequestType,
  params: ProxyRequestParams
): boolean {
  if (type === ProxyRequestType.Passport) {
    if (params.isChromium && !params.optimizedProxiesEnabled) {
      return params.passportLevel >= 0;
    } else {
      return params.passportLevel >= 1;
    }
  }

  if (type === ProxyRequestType.Usher) {
    if (params.optimizedProxiesEnabled) {
      if (params.isChromium && params.fullModeEnabled === false) {
        return false;
      }
      if (!params.isChromium && params.isFlagged === false) {
        return false;
      }
    }
    return params.passportLevel >= 0;
  }

  if (type === ProxyRequestType.VideoWeaver) {
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

  if (type === ProxyRequestType.GraphQLToken) {
    if (params.isChromium) {
      return params.passportLevel >= 1;
    } else {
      return params.passportLevel >= 0;
    }
  }

  if (type === ProxyRequestType.GraphQLIntegrity) {
    if (params.optimizedProxiesEnabled) {
      return params.passportLevel >= 2;
    } else {
      return params.passportLevel >= 1;
    }
  }

  if (type === ProxyRequestType.GraphQL) {
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
    if (params.isChromium) {
      return params.passportLevel >= 1;
    } else {
      return params.passportLevel >= 0;
    }
  }

  if (type === ProxyRequestType.TwitchWebpage) {
    return params.passportLevel >= 2;
  }

  return false;
}
