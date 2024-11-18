// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { Component, ParticleGizmo, PropTypes } from 'horizon/core';
import { LootItem } from 'LootItem';

export class AssetLootItem extends LootItem<typeof AssetLootItem> {
  static propsDefinition = {
    ...LootItem.propsDefinition,
    hackToMakeItCompile: {type: PropTypes.Entity, default: undefined}
  }

  Start()
  {
    super.Start();
    this.basePosition = this.entity.position.get();
    this.isCollected = false;
    this.props.vfx?.as(ParticleGizmo)?.play();
  }
}
Component.register(AssetLootItem);
