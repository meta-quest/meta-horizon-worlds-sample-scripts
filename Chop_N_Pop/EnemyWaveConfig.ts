// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { Behaviour } from 'Behaviour';
import { Asset, Component, Entity, PropTypes } from 'horizon/core';

// Loot table using a list of assets and their odds
export class EnemyWaveConfig extends Behaviour<typeof EnemyWaveConfig>{
  static propsDefinition = {
    spawnPoints: {type: PropTypes.Entity},                 // An object with children that are set spawn point coordinates
    spawnSquareSize: {type: PropTypes.Number, default: 0}, // How far to spawn from the center can enemies spawn
    waveSize: {type: PropTypes.Number, default: 5},        // How many enemies to spawn in this wave
    enemy1: {type: PropTypes.Asset},
    enemy1Odds : {type: PropTypes.Number, default: 0},
    enemy2: {type: PropTypes.Asset},
    enemy2Odds : {type: PropTypes.Number, default: 0},
    enemy3: {type: PropTypes.Asset},
    enemy3Odds : {type: PropTypes.Number, default: 0},
    enemy4: {type: PropTypes.Asset},
    enemy4Odds : {type: PropTypes.Number, default: 0},
  };

  private enemies : Array<{asset: Asset, odds: number}> = [];

  Start() {
    // Add the enemys to the array
    if (this.props.enemy1) {
      this.enemies.push({asset: this.props.enemy1, odds: this.props.enemy1Odds});
    }
    if (this.props.enemy2) {
      this.enemies.push({asset: this.props.enemy2, odds: this.props.enemy2Odds});
    }
    if (this.props.enemy3) {
      this.enemies.push({asset: this.props.enemy3, odds: this.props.enemy3Odds});
    }
    if (this.props.enemy4) {
      this.enemies.push({asset: this.props.enemy4, odds: this.props.enemy4Odds});
    }

    // Normalize the odds
    let totalOdds = 0;
    for (let i = 0; i < this.enemies.length; i++) {
      totalOdds += this.enemies[i].odds;
    }
    for (let i = 0; i < this.enemies.length; i++) {
      this.enemies[i].odds /= totalOdds;
    }
  }

  public spawnEnemyWave(waveMultiplier : number) : Set<Entity> {
    var waveSpawns: Set<Entity> = new Set<Entity>();

    var enemyCount = Math.min(Math.round(waveMultiplier * this.props.waveSize), 20); // Limit the number of enemies to 20
    for (let i = 0; i < enemyCount; i++) {
      var randomEnemyChosen = Math.random();
      const spawnPointIndex = Math.floor(Math.random() * (this.props.spawnPoints?.children.get().length ?? 0));
      const spawnPoint = this.props.spawnPoints?.children.get()[spawnPointIndex];

      // Randomly offset the spawn point
      const offsetValueX = Math.random() * this.props.spawnSquareSize - this.props.spawnSquareSize / 2;
      const offsetValueZ = Math.random() * this.props.spawnSquareSize - this.props.spawnSquareSize / 2;
      const spawnOffset = this.entity.forward.get().mul(offsetValueZ).add(this.entity.right.get().mul(offsetValueX));
      const spawnPosition = spawnPoint!.position.get().add(spawnOffset);

      var currentOdds = 0;
      for (let i = 0; i < this.enemies.length; i++) {
        currentOdds += this.enemies[i].odds;
        if (randomEnemyChosen <= currentOdds && this.enemies[i].asset != null) {

          // Trick to always spawn the latest version of the asset
          var currentAsset = new Asset(this.enemies[i].asset.id, BigInt(0));

          this.world.spawnAsset(currentAsset, spawnPosition, spawnPoint!.rotation.get()).then((entities) => {
          entities.forEach((entity) => {waveSpawns.add(entity);})
          });
          break;
        }
      }
    }

    return waveSpawns;
  }
}
Component.register(EnemyWaveConfig);
