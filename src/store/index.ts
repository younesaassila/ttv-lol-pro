import browser from "webextension-polyfill";

type Area = "sync" | "local" | "managed";
type EventType = "load";
type State = {
  whitelistedChannels: string[];
  removeTokenFromRequests: boolean;
  servers: string[];
};

const areaName: Area = "local";
const listenersByEvent: { [type: string]: Function[] } = {};
const getDefaultState = (): State => ({
  whitelistedChannels: [],
  removeTokenFromRequests: false,
  servers: ["https://api.ttv.lol"],
});

const state = getDefaultState();
const handler: ProxyHandler<State> = {
  defineProperty: (target, key, descriptor) => {
    target[key] = descriptor;
    browser.storage[areaName].set({ [key]: descriptor });
    return true;
  },
  deleteProperty: (target, property) => {
    delete target[property];
    browser.storage[areaName].remove(property.toString());
    return true;
  },
  get: (target, property) => {
    if (typeof target[property] === "object" && target[property] !== null) {
      return new Proxy(target[property], {
        set: (propertyObj, subproperty, subpropertyValue) => {
          propertyObj[subproperty] = subpropertyValue;
          browser.storage[areaName].set({ [property]: state[property] });
          return true;
        },
      });
    } else return target[property];
  },
  set: (target, property, value) => {
    target[property] = value;
    browser.storage[areaName].set({ [property]: value });
    return true;
  },
};
const stateProxy = new Proxy(state, handler);
browser.storage.onChanged.addListener((changes, area) => {
  if (area !== areaName) return;
  for (const [key, { newValue }] of Object.entries(changes)) {
    state[key] = newValue;
  }
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
