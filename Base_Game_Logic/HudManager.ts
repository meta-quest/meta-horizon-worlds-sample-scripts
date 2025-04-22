// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

// CREATOR LEVEL: <<Intermediate>>
// This class uses attachable entities and dynamic spawning for player HUDs.  Using this since it works in VR and mobile
// Using this has a loading time cost, the alternative is to use object pooling if this gets to be an issue

import { Asset, AttachableEntity, AttachablePlayerAnchor, Component, Entity, NetworkEvent, Player, PlayerVisibilityMode, PropTypes } from 'horizon/core';
import { Singleton } from 'Singleton';
import { PlayerData, PlayerSaveData } from 'PlayerData';
import { BehaviourFinder } from 'Behaviour';
import { IHudInstance } from 'IHudInstance';
import { GameConfig } from 'GameConfig';
import { ObjectPool } from 'ObjectPool';

export const HudManagerEvents = {
  updateHud: new NetworkEvent<PlayerSaveData>('updateHud')
}

export class HudManager extends Singleton<typeof HudManager> {
  static propsDefinition = {
  };

  // Singleton instance of the HudManager
  static instance: HudManager;

  private assignedHuds: Map<Player, Entity>;
  private spawnedHuds: Set<Entity>;

  private spawnedHudAsset: Asset | undefined;
  private hudPool: ObjectPool | undefined;

  constructor() {
    super();
    HudManager.instance = this;
    this.assignedHuds = new Map<Player, Entity>();
    this.spawnedHuds = new Set<Entity>();
  }

  BStart() {
    // Find out if we're in spawn mode or pool mode
    const gameConfig = GameConfig.getInstance();

    if (gameConfig.props.hudPool) {
      console.log("Using object pool for HUDs");
      this.hudPool = gameConfig.props.hudPool.getComponents(ObjectPool)[0];
      // this.hudPool = BehaviourFinder.GetBehaviour<ObjectPool>(gameConfig.props.hudPool);
    } else if (gameConfig.props.spawnedHudAsset) {
      console.log("Using spawned objects for HUDs");
      this.spawnedHudAsset = gameConfig.props.spawnedHudAsset;
    }
  }

  public assignHud(pData: PlayerData) {
    const player = pData.getPlayer();

    if (this.assignedHuds.has(player)) {
      return;
    }

    if (this.hudPool){
      const hudEntity = this.hudPool.allocate(player.position.get(), player.rotation.get(), null);
      if (hudEntity) {
        this.attachHudToPlayer(player, hudEntity);
        this.updateHud(pData);
      }
    } else if (this.spawnedHudAsset) {
      this.world.spawnAsset(this.spawnedHudAsset, pData.getPlayer().position.get()).then
      (spawnedHuds => {
        if (spawnedHuds.length > 0 && spawnedHuds[0] != undefined) {
          const playerHud = spawnedHuds[0];

          this.spawnedHuds.add(playerHud);

          // Attach the hud to the player's head and make it visible to only that player
          this.attachHudToPlayer(pData.getPlayer(), playerHud);
        } else {
          console.error("Failed to spawn hud for player: " + pData.getPlayer().id);
        }

        // Update the hud with the player's data giving a chance to initialize first after spawning
        this.async.setTimeout(() => {
          this.updateHud(pData);
        }, 100);
      });
    }
  }

  public updateHud(pData: PlayerData) {
    const hudEntity = this.assignedHuds.get(pData.getPlayer());
    if (hudEntity) {
      const playerHudInstance = BehaviourFinder.GetBehaviour<IHudInstance>(hudEntity);
      if (playerHudInstance) {
        playerHudInstance.updateHud(pData.getData());
      }
    }
  }

  public releaseHud(player: Player) {
    const hudEntity = this.assignedHuds.get(player);
    if (hudEntity != undefined) {
      if (this.spawnedHuds.has(hudEntity)) {
        this.world.deleteAsset(hudEntity);
        this.spawnedHuds.delete(hudEntity);
      } else {
        this.hudPool?.free(hudEntity);
      }
    }
  }

  private attachHudToPlayer(player: Player, playerHud: Entity) {
    this.assignedHuds.set(player, playerHud);

    const attachableEnt = playerHud.as(AttachableEntity);
    attachableEnt?.detach();
    attachableEnt?.visible.set(true);
    attachableEnt?.setVisibilityForPlayers([player], PlayerVisibilityMode.VisibleTo);
    attachableEnt?.attachToPlayer(player, AttachablePlayerAnchor.Head);
  }
}
Component.register(HudManager);
