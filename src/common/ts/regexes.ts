export const TWITCH_URL_REGEX =
  /^https?:\/\/(?:www\.)?twitch\.tv\/(?:videos\/)?([a-z0-9-_]+)/gi;
export const TWITCH_API_URL_REGEX = /\/(hls|vod)\/(.+)\.m3u8(?:\?(.*))?$/gi;
export const TTV_LOL_API_URL_REGEX = /\/(?:playlist|vod)\/(.+)\.m3u8/gi;
export const MANIFEST_PROXY_COUNTRY_REGEX = /user-country="([a-z-_]+)"/gi;
