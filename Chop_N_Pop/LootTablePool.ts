// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { Behaviour, BehaviourFinder } from 'Behaviour';
import { Component, Entity, PropTypes, Quaternion, Vec3 } from 'horizon/core';
import { ILootTable } from 'ILootTable';
import { ObjectPool } from 'ObjectPool';
import { PoolLootItem } from 'PoolLootItem';

// Loot table using pools of entities and their odds
export class LootTablePool extends Behaviour<typeof LootTablePool> implements ILootTable{
  static propsDefinition = {
    noItemOdds: {type: PropTypes.Number, default: 0},
    item1: {type: PropTypes.Entity},
    item1Odds : {type: PropTypes.Number, default: 0},
    item2: {type: PropTypes.Entity},
    item2Odds : {type: PropTypes.Number, default: 0},
    item3: {type: PropTypes.Entity},
    item3Odds : {type: PropTypes.Number, default: 0},
    item4: {type: PropTypes.Entity},
    item4Odds : {type: PropTypes.Number, default: 0},
    item5: {type: PropTypes.Entity},
    item5Odds : {type: PropTypes.Number, default: 0},
    item6: {type: PropTypes.Entity},
    item6Odds : {type: PropTypes.Number, default: 0},
    item7: {type: PropTypes.Entity},
    item7Odds : {type: PropTypes.Number, default: 0},
    item8: {type: PropTypes.Entity},
    item8Odds : {type: PropTypes.Number, default: 0},
    item9: {type: PropTypes.Entity},
    item9Odds : {type: PropTypes.Number, default: 0},
    item10: {type: PropTypes.Entity},
    item10Odds : {type: PropTypes.Number, default: 0},
  };

  private lootItems : Array<{pool: ObjectPool, odds: number}> = [];
  private lootDrops : Set<{pool: ObjectPool, entity: Entity}> = new Set<{pool: ObjectPool, entity: Entity}>();

  Start() {
    // Add the items to the array
    if (this.props.item1) {
      var objPool1 = BehaviourFinder.GetBehaviour<ObjectPool>(this.props.item1);
      this.lootItems.push({pool: objPool1!, odds: this.props.item1Odds});
    }
    if (this.props.item2) {
      var objPool2 = BehaviourFinder.GetBehaviour<ObjectPool>(this.props.item2);
      this.lootItems.push({pool: objPool2!, odds: this.props.item2Odds});
    }
    if (this.props.item3) {
      var objPool3 = BehaviourFinder.GetBehaviour<ObjectPool>(this.props.item3);
      this.lootItems.push({pool: objPool3!, odds: this.props.item3Odds});
    }
    if (this.props.item4) {
      var objPool4 = BehaviourFinder.GetBehaviour<ObjectPool>(this.props.item4);
      this.lootItems.push({pool: objPool4!, odds: this.props.item4Odds});
    }
    if (this.props.item5) {
      var objPool5 = BehaviourFinder.GetBehaviour<ObjectPool>(this.props.item5);
      this.lootItems.push({pool: objPool5!, odds: this.props.item5Odds});
    }
    if (this.props.item6) {
      var objPool6 = BehaviourFinder.GetBehaviour<ObjectPool>(this.props.item6);
      this.lootItems.push({pool: objPool6!, odds: this.props.item6Odds});
    }
    if (this.props.item7) {
      var objPool7 = BehaviourFinder.GetBehaviour<ObjectPool>(this.props.item7);
      this.lootItems.push({pool: objPool7!, odds: this.props.item7Odds});
    }
    if (this.props.item8) {
      var objPool8 = BehaviourFinder.GetBehaviour<ObjectPool>(this.props.item8);
      this.lootItems.push({pool: objPool8!, odds: this.props.item8Odds});
    }
    if (this.props.item9) {
      var objPool9 = BehaviourFinder.GetBehaviour<ObjectPool>(this.props.item9);
      this.lootItems.push({pool: objPool9!, odds: this.props.item9Odds});
    }
    if (this.props.item10) {
      var objPool10 = BehaviourFinder.GetBehaviour<ObjectPool>(this.props.item10);
      this.lootItems.push({pool: objPool10!, odds: this.props.item10Odds});
    }

    // Normalize the odds
    let totalOdds = 0;
    for (let i = 0; i < this.lootItems.length; i++) {
      totalOdds += this.lootItems[i].odds;
    }
    for (let i = 0; i < this.lootItems.length; i++) {
      this.lootItems[i].odds /= totalOdds;
    }
  }

  public shouldDropItem() : boolean {
    // If the noItemOdds is 1, we should never drop an item
    return Math.random() > this.props.noItemOdds;
  }

  public dropRandomItem(position : Vec3, rotation : Quaternion) {
    var randomItemChosen = Math.random();

    // Find the item that was chosen by adding up the odds until we reach or pass the random number
    var currentOdds = 0;
    for (let i = 0; i < this.lootItems.length; i++) {
      currentOdds += this.lootItems[i].odds;
      if (randomItemChosen <= currentOdds) {
        var droppedLoot = this.lootItems[i].pool.allocate(position, rotation, null);
        if (droppedLoot != null)
        {
          this.lootDrops.add({pool: this.lootItems[i].pool, entity: droppedLoot});
          var lootItem = BehaviourFinder.GetBehaviour<PoolLootItem>(droppedLoot);
          lootItem?.setLootTable(this);
        }
        break;
      }
    }
  }

  public clearItem(item : Entity)
  {
    this.lootDrops.forEach(element => {
      if (element.entity.id == item.id)
      {
        element.pool.free(element.entity);
        this.lootDrops.delete(element);
      }
    });
  }

  public clearItems(){
    this.lootDrops.forEach(element => {
      element.pool.free(element.entity);
    });
    this.lootDrops.clear();
  }
}
Component.register(LootTablePool);
