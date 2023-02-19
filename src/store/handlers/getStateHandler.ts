import browser from "webextension-polyfill";
import { ProxyFlags, StorageAreaName } from "../types";
import { toRaw } from "../utils";
import getPropertyHandler from "./getPropertyHandler";

export default function getStateHandler<T extends object>(
  areaName: StorageAreaName,
  state: T
): ProxyHandler<T> {
  const stateHandler: ProxyHandler<T> = {
    defineProperty: (target, key, descriptor) => {
      const rawDescriptor = toRaw(descriptor);
      target[key] = rawDescriptor;
      browser.storage[areaName]
        .set({ [key]: rawDescriptor })
        .catch(console.error);
      return true;
    },
    deleteProperty: (target, property) => {
      delete target[property];
      browser.storage[areaName]
        .remove(property.toString())
        .catch(console.error);
      return true;
    },
    get: (target, property) => {
      if (property === ProxyFlags.IS_PROXY) return true;
      if (property === ProxyFlags.RAW) return target;
      if (typeof target[property] === "object" && target[property] !== null) {
        const propertyHandler = getPropertyHandler(areaName, state, property);
        return new Proxy(target[property], propertyHandler);
      } else return target[property];
    },
    set: (target, property, value) => {
      const rawValue = toRaw(value);
      target[property] = rawValue;
      browser.storage[areaName]
        .set({ [property]: rawValue })
        .catch(console.error);
      return true;
    },
  };
  return stateHandler;
}
