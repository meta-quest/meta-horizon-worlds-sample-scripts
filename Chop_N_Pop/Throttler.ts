// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

export class Throttler  {
  static propsDefinition = {};

  static throttleMap = new Map<string, bigint>();

  static try(key: string, functionToThrottle: Function, delay: number) {
    const now = BigInt(Date.now());
    const lastTime = Throttler.throttleMap.get(key) ?? BigInt(0);
    if (now - lastTime < delay) {
      return;
    }
    Throttler.throttleMap.set(key, now);
    functionToThrottle();
  }
}
