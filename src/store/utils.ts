import { ProxyFlags } from "./types";

export function isProxy(value: any) {
  return value && value[ProxyFlags.IS_PROXY];
}

export function toRaw(value: any) {
  if (isProxy(value)) return value[ProxyFlags.RAW];
  if (typeof value === "object" && value !== null) {
    for (let key in value) {
      value[key] = toRaw(value[key]);
    }
  }
  return value;
}
