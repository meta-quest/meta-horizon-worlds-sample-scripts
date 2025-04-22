// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

// CREATOR LEVEL: <<<Advanced>>>

import { Singleton } from "Singleton";
import { Asset } from "horizon/core";
import { RuntimeConfig } from "RuntimeConfig";

export class RuntimeConfigStore extends Singleton<typeof RuntimeConfigStore>{
  public static instance: RuntimeConfigStore;

  private runtimeConfigs: Map<Asset, RuntimeConfig>;

  constructor() {
    super();
    RuntimeConfigStore.instance = this;
    this.runtimeConfigs = new Map<Asset, RuntimeConfig>();
  }

  public addRuntimeConfig(asset: Asset, config: RuntimeConfig) {
    this.runtimeConfigs.set(asset, config);
  }

  public getAssetConfig(asset: Asset) : RuntimeConfig | undefined{
    return this.runtimeConfigs.get(asset);
  }
}
