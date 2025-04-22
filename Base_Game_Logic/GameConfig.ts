// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

// CREATOR LEVEL: <Beginner>

import { Component, PropTypes } from 'horizon/core';
import { Singleton } from 'Singleton';

export class GameConfig extends Singleton<typeof GameConfig> {
  static propsDefinition = {
    matchSpawnPoint: { type: PropTypes.Entity },
    lobbySpawnPoint: { type: PropTypes.Entity },
    spawnedHudAsset : { type: PropTypes.Asset},
    hudPool : { type: PropTypes.Entity }
  };

  static instance : GameConfig;

  constructor() {
    super();
    GameConfig.instance = this;
  }
}
Component.register(GameConfig);
