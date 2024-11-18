// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { Behaviour, BehaviourFinder } from 'Behaviour';
import { Events } from 'Events';
import { GamePlayers, PlayerData } from 'GameUtils';
import { HapticFeedback, HapticHand, HapticType } from 'HapticFeedback';
import { CodeBlockEvents, Component, Player, PropTypes, SpawnPointGizmo, Vec3 } from 'horizon/core';
import { ObjectPool } from 'ObjectPool';

// This script must be added to a game object in order to run
export class PlayerManager extends Behaviour<typeof PlayerManager> {
  static propsDefinition = {
    matchSpawnPoint: { type: PropTypes.Entity },
    lobbySpawnPoint: { type: PropTypes.Entity },
    playerMaxHp: { type: PropTypes.Number, default: 100 },
    respawnInvincibibilityMs: { type: PropTypes.Number, default: 3000 },
    playerStartAmmo: { type: PropTypes.Number, default: 10 },
    ammoPerBox: { type: PropTypes.Number, default: 10 },
    healthPerPotion: { type: PropTypes.Number, default: 1 },
    knockbackForceOnHit : { type: PropTypes.Number, default: 0 },
    hitScream : { type: PropTypes.Entity },
    hudPool: { type: PropTypes.Entity },
  };

  private hudPool: ObjectPool | undefined;

  // Singleton
  static instance: PlayerManager;

  // We can use our helpful Utils class to easily manage players
  public gamePlayers: GamePlayers = new GamePlayers();

  // Using preStart for broadcast listeners helps make sure bindings are in place first
  Awake() {
    PlayerManager.instance = this;

    // Player join and leave
    this.connectCodeBlockEvent(this.entity, CodeBlockEvents.OnPlayerEnterWorld, this.handleOnPlayerEnterWorld.bind(this));
    this.connectCodeBlockEvent(this.entity, CodeBlockEvents.OnPlayerExitWorld, this.handleOnPlayerExitWorld.bind(this));

    // Player actions
    this.connectNetworkBroadcastEvent(Events.lootPickup, this.handleLootPickup.bind(this));

    // Gun management
    this.connectNetworkEvent(this.entity, Events.gunRequestAmmo, (data) => {
      var pData = this.gamePlayers.get(data.player);
      var availableAmmo = 0;
      if(pData) {
        var availableAmmo = Math.min(data.ammoCount, pData.ammo);
        pData.ammo -= availableAmmo;

        // Update HUD on reload
        this.updatePlayerHUD(pData);
      }
      this.sendNetworkEvent(data.weapon, Events.gunRequestAmmoResponse, {ammoCount: availableAmmo });
    });
  }

  Start() {
    this.hudPool = BehaviourFinder.GetBehaviour<ObjectPool>(this.props.hudPool);
  }

  public hitPlayer(player: Player, damage: number, damageOrigin : Vec3) {
    if (player.deviceType.get() != 'VR') {
      var damageVector = player.position.get().sub(damageOrigin).normalize();
      player.applyForce(damageVector.mul(this.props.knockbackForceOnHit));
    }

    var playerHp = this.gamePlayers.takeDamage(player, damage);
    console.log('ARGHH, hit!!!');

    if(playerHp <= 0){
      // Set invincibility to prevent damage while in respawn
      this.gamePlayers.setInvincible(player, true);
      this.async.setTimeout(() => {
        this.gamePlayers.setInvincible(player, false);
      }, this.props.respawnInvincibibilityMs);

      // Send player death event
      this.sendNetworkBroadcastEvent(Events.playerDeath, {player: player});
      this.movePlayerFromMatchToLobby(player);
      this.gamePlayers.revive(player);
    }

    var playerData = this.gamePlayers.get(player);
    if (playerData) {
      this.updatePlayerHUD(playerData);
    }
  }

  // When a player enters the world, add that player and an initial player status to our Player Map
  private handleOnPlayerEnterWorld(player: Player): void {
    // Handle double join messages
    if(!this.gamePlayers.get(player)) {
      const pData = this.gamePlayers.addNewPlayer(new PlayerData(player, this.props.playerStartAmmo, this.props.playerMaxHp));
      pData.hud = this.hudPool?.allocate(player.position.get(), player.rotation.get(), player);
      this.updatePlayerHUD(pData);
    }
    else
    {
      console.warn("PlayerManager: Player already joined world");
    }
  }

  // When a player leaves the world, Remove that player from the PlayerMap.
  private handleOnPlayerExitWorld(player: Player): void {
    const pData = this.gamePlayers.get(player);
    this.hudPool?.free(pData?.hud);
    this.gamePlayers.removePlayer(player);
  }

  public resetAllPlayers() {
    this.moveAllMatchPlayersToLobby();
    this.gamePlayers.resetAllPlayers();
    this.resetAllPlayersHUD();
  }

  private moveAllMatchPlayersToLobby() {
    const gamePlayers = this.gamePlayers.getPlayersInMatch();
    gamePlayers.forEach((p: PlayerData) => {
      this.movePlayerFromMatchToLobby(p.player);
    });
  }

  private movePlayerFromMatchToLobby(player: Player) {
    this.props.lobbySpawnPoint?.as(SpawnPointGizmo)?.teleportPlayer(player);
    this.gamePlayers.moveToLobby(player);
  }

  private resetAllPlayersHUD() {
    this.gamePlayers.all.forEach((p: PlayerData) => {
      this.updatePlayerHUD(p);
    });
  }

  private updatePlayerHUD(p: PlayerData) {
    this.sendNetworkEvent(p.player, Events.playerDataUpdate, {ammo: p.ammo, hp: p.hp});
  }

  private handleLootPickup(data: {player: Player, loot : string}) {
    var playerData = this.gamePlayers.get(data.player);
    if (playerData) {
      if(data.loot === 'Ammo') {
        this.gamePlayers.addAmmo(data.player, this.props.ammoPerBox);
      }
      else if(data.loot === 'Potion') {
        this.gamePlayers.heal(data.player, this.props.healthPerPotion, this.props.playerMaxHp);
      }

      this.updatePlayerHUD(playerData);
    }
  }
}
Component.register(PlayerManager);
