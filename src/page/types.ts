// From https://github.com/bendtherules/react-fiber-traverse/blob/fdfd267d9583163d0d53b061f20d4b505985dc81/src/mocked-types/index.ts

import type * as React from "react";

export interface FiberNodeDOMContainer extends Element {
  _reactRootContainer: {
    _internalRoot: {
      current: FiberNode | null;
    };
  };
}

export type FiberNode = FiberNodeForComponentClass; // Twitch uses component classes.

export interface FiberNodeForComponentClass {
  child: FiberNode | null;
  sibling: FiberNode | null;

  elementType: React.ComponentClass;
  type: React.ComponentClass;

  stateNode: React.Component;
}

export type Constraint = (instance: Instance) => boolean;

export type Instance = React.ReactInstance & {
  [key: string]: any;
};
