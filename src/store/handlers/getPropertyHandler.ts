import browser from "webextension-polyfill";
import { ProxyFlags, StorageAreaName } from "../types";
import { toRaw } from "../utils";

export default function getPropertyHandler<T extends object>(
  areaName: StorageAreaName,
  state: T,
  property: string | symbol
): ProxyHandler<Record<string | symbol, any>> {
  const propertyHandler: ProxyHandler<Record<string | symbol, any>> = {
    defineProperty: (propertyObj, subproperty, subpropertyDescriptor) => {
      const rawSubpropertyDescriptor = toRaw(subpropertyDescriptor);
      propertyObj[subproperty] = rawSubpropertyDescriptor;
      browser.storage[areaName]
        .set({ [property]: state[property] })
        .catch(console.error);
      return true;
    },
    deleteProperty: (propertyObj, subproperty) => {
      delete propertyObj[subproperty];
      browser.storage[areaName]
        .set({ [property]: state[property] })
        .catch(console.error);
      return true;
    },
    get: (propertyObj, subproperty) => {
      if (subproperty === ProxyFlags.IS_PROXY) return true;
      if (subproperty === ProxyFlags.RAW) return propertyObj;
      const subpropertyValue = propertyObj[subproperty];
      const containsObjects = (parent: object) =>
        Object.values(parent).some(
          childValue => typeof childValue === "object" && childValue !== null
        );
      if (
        typeof subpropertyValue === "object" &&
        subpropertyValue !== null &&
        containsObjects(subpropertyValue)
      ) {
        return new Proxy(subpropertyValue, propertyHandler);
      } else return subpropertyValue;
    },
    set: (propertyObj, subproperty, subpropertyValue) => {
      const rawSubpropertyValue = toRaw(subpropertyValue);
      propertyObj[subproperty] = rawSubpropertyValue;
      browser.storage[areaName]
        .set({ [property]: state[property] })
        .catch(console.error);
      return true;
    },
  };
  return propertyHandler;
}
