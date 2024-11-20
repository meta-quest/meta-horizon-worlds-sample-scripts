// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { Behaviour, BehaviourFinder } from "Behaviour";
import { Component, Entity, NetworkEvent, PropTypes } from "horizon/core";
import { Events } from "Events";
import { INpcAgent, NpcAgent } from "NpcAgent";
import { EnemyWaveConfig } from "EnemyWaveConfig";
import { PlayerManager } from "PlayerManager";
import { WaveManagerNetworkEvents } from "Events";

export class EnemyWaveManager extends Behaviour<typeof EnemyWaveManager> {
  static propsDefinition = {
    activeFromStart: {type: PropTypes.Boolean, default: false},
    waveGroupName: {type: PropTypes.String},
    initialWaveTimeDelay : {type: PropTypes.Number, default: 0}, // Time in seconds before the first wave starts.
    wavePlayerMultiplier : {type: PropTypes.Number, default: 1}, // Wave size multiplier for the number players in the game

    wave1Config : {type: PropTypes.Entity},
    wave2TimeDelay : {type: PropTypes.Number, default: -1}, // Time in seconds before the next wave starts, -1 means wait for all enemies to die
    wave2Config : {type: PropTypes.Entity},
    wave3TimeDelay : {type: PropTypes.Number, default: -1},
    wave3Config : {type: PropTypes.Entity},
  };

  private currentWave: number = 0;
  private waveSpawns: Array<Set<Entity>> = [];
  private updateInterval: number = 0;

  private isActive: boolean = false;

  private waveConfigs : Array<{config: Entity, timeDelay: number}> = [];
  private waveCompleteNotified : Array<boolean> = [];

  public name : string = "";

  Start() {
    this.name = this.props.waveGroupName;
    this.connectNetworkEvent(this.entity, WaveManagerNetworkEvents.StartWaveGroup, this.activateWaveGroup.bind(this));
    this.connectNetworkEvent(this.entity, WaveManagerNetworkEvents.StopWaveGroup, this.deactivateWaveGroup.bind(this));

    this.connectNetworkBroadcastEvent(Events.monstersInRange, this.findMonstersInRange.bind(this));
    this.connectNetworkBroadcastEvent(Events.gameReset, this.resetWaveManager.bind(this))

    if (this.props.wave1Config != null) {
      this.waveConfigs.push({config: this.props.wave1Config, timeDelay: this.props.wave2TimeDelay});
    }
    if (this.props.wave2Config != null) {
      this.waveConfigs.push({config: this.props.wave2Config, timeDelay: this.props.wave3TimeDelay});
    }
    if (this.props.wave3Config != null) {
      this.waveConfigs.push({config: this.props.wave3Config, timeDelay: -1});
    }

    // SCRIPTING TIP: If you want to add more waves, you can add more wave configs to the array here

    if (this.props.activeFromStart) {
      this.activateWaveGroup({waveGroupName: this.name});
    }
  }

  private findMonstersInRange(data : {entity : Entity, range : number}) {
    var entitiesInRange : Array<Entity> = [];
    for (let i = 0; i < this.waveSpawns.length; i++) {
      this.waveSpawns[i].forEach(enemy =>
      {

        var enemyBehaviour = BehaviourFinder.GetBehaviour<INpcAgent>(enemy);
        if (enemyBehaviour == null || enemyBehaviour.isDead)
          return;

        if(data.entity.position.get().distance(enemy.position.get()) <= data.range)
        {
          entitiesInRange.push(enemy);
        }
      });
    }
    this.sendNetworkEvent(data.entity, Events.monstersInRangeResponse, {monsters : entitiesInRange});
  }

  private resetWaveManager()
  {
    this.deactivateWaveGroup({waveGroupName: this.props.waveGroupName});
    this.waveSpawns = [];
    this.waveCompleteNotified = [];
    this.currentWave = 0;
  }

  private updateState() {
    if (!this.isActive)
      return;

    // Check each active wave to see if it's complete
    for (let i = 0; i < this.waveSpawns.length; i++) {

      // Edge case where a wave has just started and is still empty. Skip it.
      if (this.waveSpawns[i].size == 0)
        continue;

      // A wave is complete if all the enemies in it are dead
      var waveComplete = true;
      this.waveSpawns[i].forEach(enemy =>
      {
        var enemyBehaviour = BehaviourFinder.GetBehaviour<INpcAgent>(enemy);

        if (enemyBehaviour){
          if (enemyBehaviour.isDead)
          {
            this.waveSpawns[i].delete(enemy);
          }
          else
          {
            waveComplete = false;
          }
        }
      });

      // If the wave is complete, and we haven't done anything about it yet, start the next wave
      if (waveComplete && !this.waveCompleteNotified[i]) {
        this.waveCompleteNotified[i] = true;
        this.sendNetworkEvent(this.entity, WaveManagerNetworkEvents.WaveComplete, {waveGroupName: this.props.waveGroupName, waveNumber: this.currentWave});

        // Start the next wave after a delay if there is one
        if (this.currentWave < this.waveConfigs.length)
        {
          var nextWaveDelay = this.waveConfigs[this.currentWave-1].timeDelay * 1000; // Convert to milliseconds from seconds
          this.async.setTimeout(() => this.nextWave(), nextWaveDelay > 0 ? nextWaveDelay : 1);
        }
        else
        {
          this.deactivateWaveGroup({waveGroupName: this.props.waveGroupName});
        }
        return;
      }
    }
  }

  private activateWaveGroup(data: {waveGroupName: string}){
    if (this.isActive || data.waveGroupName != this.props.waveGroupName)
      return;

    console.log("Activating Wave Group: ", this.props.waveGroupName);

    this.updateInterval = this.async.setInterval(this.updateState.bind(this), 1000);

    this.isActive = true;

    this.sendNetworkBroadcastEvent(WaveManagerNetworkEvents.FightStarted, {waveGroupName: this.props.waveGroupName});

    this.nextWave();
  }

  private deactivateWaveGroup(data: {waveGroupName: string}){
    if (!this.isActive || data.waveGroupName != this.props.waveGroupName)
      return;

    console.log("Deactivating Wave Group: ", this.props.waveGroupName);

    this.async.clearInterval(this.updateInterval);

    this.isActive = false;

    // Despawn everything
    this.waveSpawns.forEach((waveSpawn) => {
      waveSpawn.forEach((spawn) => {
        this.world.deleteAsset(spawn);
      })
    });

    this.sendNetworkBroadcastEvent(WaveManagerNetworkEvents.FightEnded, {waveGroupName: this.props.waveGroupName});
  }

  private nextWave() {
    if (!this.isActive || this.currentWave >= this.waveConfigs.length)
      return;

    // Get the wave config, and stop if it's invalid
    var waveConfig = BehaviourFinder.GetBehaviour<EnemyWaveConfig>(this.waveConfigs[this.currentWave].config);
    if (waveConfig == null)
    {
      console.error("Invalid wave config, next wave will not spawn");
      return;
    }

    // Housekeeping for the new wave
    var playerCount = PlayerManager.instance.gamePlayers.getPlayersInMatch().length;
    var waveMultiplier = Math.pow(this.props.wavePlayerMultiplier, playerCount-1);

    this.waveSpawns.push(waveConfig.spawnEnemyWave(waveMultiplier));
    this.waveCompleteNotified.push(false);

    // Notify that we're starting the wave
    this.currentWave++;
    this.sendNetworkBroadcastEvent(WaveManagerNetworkEvents.StartingWave, {waveGroupName: this.props.waveGroupName, waveNumber: this.currentWave});
  }
}
Component.register(EnemyWaveManager);
