// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { Behaviour, BehaviourFinder } from 'Behaviour';
import { Events } from 'Events';
import { Component, PropTypes } from 'horizon/core';
import { ILootTable } from 'ILootTable';
import { LootSystem } from 'LootSystem';

class WorldAmmoSpawner extends Behaviour<typeof WorldAmmoSpawner> {
  static propsDefinition = {
    lootTable: {type: PropTypes.Entity},
  };

  Start() {
    this.reset();
    this.connectNetworkBroadcastEvent(Events.gameReset, (data) => {
      this.reset();
    });
  }

  reset() {
    this.async.setTimeout(() => {
      var lootTable = BehaviourFinder.GetBehaviour<ILootTable>(this.props.lootTable);
      lootTable?.clearItems();
      this.spawnAmmo();
    }, 2000);
  }

  spawnAmmo() {
    this.entity.children.get().forEach((child) => {
      if (this.props.lootTable != undefined){
        LootSystem.instance?.dropLoot(this.props.lootTable, child.position.get(), child.rotation.get(), true);
      }
    });
  }
}
Component.register(WorldAmmoSpawner);
