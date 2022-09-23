// TODO: Refactor to use a Store class with exported instances for each area.

import browser from "webextension-polyfill";
import { ProxyFlags, State } from "../types";

type StorageArea = "local" | "managed" | "session" | "sync";
type EventType = "load" | "change";

const areaName: StorageArea = "local";
const listenersByEvent: { [type: string]: Function[] } = {};
const getDefaultState = (): State => ({
  removeTokenFromRequests: false,
  servers: ["https://api.ttv.lol"],
  streamStatuses: {},
  whitelistedChannels: [],
});

function isProxy(value: any) {
  return value != null && value[ProxyFlags.IS_PROXY];
}
function toRaw(value: any) {
  if (isProxy(value)) return value[ProxyFlags.RAW];
  if (typeof value === "object" && value !== null) {
    for (let key in value) {
      value[key] = toRaw(value[key]);
    }
    return value;
  } else return value;
}

const state = getDefaultState();
const handler: ProxyHandler<State> = {
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
    browser.storage[areaName].remove(property.toString()).catch(console.error);
    return true;
  },
  get: (target, property) => {
    if (property === ProxyFlags.IS_PROXY) return true;
    if (property === ProxyFlags.RAW) return target;
    if (typeof target[property] === "object" && target[property] !== null) {
      const propertyHandler: ProxyHandler<{ [key: string | symbol]: any }> = {
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
              childValue =>
                typeof childValue === "object" && childValue !== null
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
const stateProxy = new Proxy(state, handler);
browser.storage.onChanged.addListener((changes, area) => {
  if (area !== areaName) return;
  for (const [key, { newValue }] of Object.entries(changes)) {
    state[key] = newValue;
  }
  dispatchEvent("change");
});

function addEventListener(type: EventType, listener: Function) {
  if (!listenersByEvent[type]) listenersByEvent[type] = [];
  listenersByEvent[type].push(listener);
}
function removeEventListener(type: EventType, listener: Function) {
  if (!listenersByEvent[type]) return;
  const index = listenersByEvent[type].findIndex(x => x === listener);
  if (index !== -1) listenersByEvent[type].splice(index, 1);
}
function dispatchEvent(type: EventType) {
  const listeners = listenersByEvent[type] || [];
  listeners.forEach(listener => listener());
}

async function init() {
  // Retrieve the entire storage contents.
  // See https://stackoverflow.com/questions/18150774/get-all-keys-from-chrome-storage
  const storage = await browser.storage[areaName].get(null);
  // Set default values for undefined properties.
  for (const [key, value] of Object.entries(getDefaultState())) {
    if (storage[key] == null) storage[key] = value;
  }
  // Update state.
  for (const [key, value] of Object.entries(storage)) {
    state[key] = value;
  }
}
init().then(() => dispatchEvent("load"));

export default { state: stateProxy, addEventListener, removeEventListener };
