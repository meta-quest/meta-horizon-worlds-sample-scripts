// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { AssetLootItem } from 'AssetLootItem';
import { Behaviour, BehaviourFinder } from 'Behaviour';
import { Asset, Component, Entity, PropTypes, Quaternion, Vec3 } from 'horizon/core';
import { ILootTable } from 'ILootTable';

// Loot table using a list of assets and their odds
export class LootTableAssets extends Behaviour<typeof LootTableAssets> implements ILootTable{
  static propsDefinition = {
    noItemOdds: {type: PropTypes.Number, default: 0},
    item1: {type: PropTypes.Asset},
    item1Odds : {type: PropTypes.Number, default: 0},
    item2: {type: PropTypes.Asset},
    item2Odds : {type: PropTypes.Number, default: 0},
    item3: {type: PropTypes.Asset},
    item3Odds : {type: PropTypes.Number, default: 0},
    item4: {type: PropTypes.Asset},
    item4Odds : {type: PropTypes.Number, default: 0},
    item5: {type: PropTypes.Asset},
    item5Odds : {type: PropTypes.Number, default: 0},
    item6: {type: PropTypes.Asset},
    item6Odds : {type: PropTypes.Number, default: 0},
    item7: {type: PropTypes.Asset},
    item7Odds : {type: PropTypes.Number, default: 0},
    item8: {type: PropTypes.Asset},
    item8Odds : {type: PropTypes.Number, default: 0},
    item9: {type: PropTypes.Asset},
    item9Odds : {type: PropTypes.Number, default: 0},
    item10: {type: PropTypes.Asset},
    item10Odds : {type: PropTypes.Number, default: 0},
  };

  private lootItems : Array<{asset: Asset, odds: number}> = [];
  private lootDrops : Set<Entity> = new Set<Entity>();

  Start() {
    // Add the items to the array
    if (this.props.item1) {
      this.lootItems.push({asset: this.props.item1, odds: this.props.item1Odds});
    }
    if (this.props.item2) {
      this.lootItems.push({asset: this.props.item2, odds: this.props.item2Odds});
    }
    if (this.props.item3) {
      this.lootItems.push({asset: this.props.item3, odds: this.props.item3Odds});
    }
    if (this.props.item4) {
      this.lootItems.push({asset: this.props.item4, odds: this.props.item4Odds});
    }
    if (this.props.item5) {
      this.lootItems.push({asset: this.props.item5, odds: this.props.item5Odds});
    }
    if (this.props.item6) {
      this.lootItems.push({asset: this.props.item6, odds: this.props.item6Odds});
    }
    if (this.props.item7) {
      this.lootItems.push({asset: this.props.item7, odds: this.props.item7Odds});
    }
    if (this.props.item8) {
      this.lootItems.push({asset: this.props.item8, odds: this.props.item8Odds});
    }
    if (this.props.item9) {
      this.lootItems.push({asset: this.props.item9, odds: this.props.item9Odds});
    }
    if (this.props.item10) {
      this.lootItems.push({asset: this.props.item10, odds: this.props.item10Odds});
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
        if (this.lootItems[i].asset != null) {
          this.world.spawnAsset(this.lootItems[i].asset, position, rotation).then((values : Entity[])=> {
            values.forEach((value : Entity) =>
            {
              if (value != null)
              {
                this.lootDrops.add(value);
                var lootItem = BehaviourFinder.GetBehaviour<AssetLootItem>(value);
                lootItem?.setLootTable(this);
              }
            });
          });
        }
      }
    }
  }

  public clearItem(item : Entity)
  {
    this.lootDrops.delete(item);
    this.world.deleteAsset(item);
  }

  public clearItems(){
    this.lootDrops.forEach((item: Entity) => {
      this.world.deleteAsset(item);
    });
    this.lootDrops.clear();
  }
}
Component.register(LootTableAssets);
