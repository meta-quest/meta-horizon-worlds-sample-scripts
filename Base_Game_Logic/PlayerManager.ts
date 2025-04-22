// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

// CREATOR LEVEL: <<Intermediate>>

import { Asset, CodeBlockEvents, Component, Entity, Player, SpawnPointGizmo } from 'horizon/core';
import { Singleton } from 'Singleton';
import { GamePlayers } from 'GamePlayers';
import { PlayerData, PlayerSaveData } from 'PlayerData';
import { HudManager } from 'HudManager';
import { GameConfig } from 'GameConfig';

export class PlayerManager extends Singleton<typeof PlayerManager> {
  static propsDefinition = {};

  // Singleton instance of the PlayerManager
  static instance: PlayerManager;

  public gamePlayers: GamePlayers;
  public playerDataSet: Map<Player, PlayerData>;

  private spawnedHudAsset: Asset | undefined;
  private lobbySpawnPoint: Entity | undefined;
  private matchSpawnPoint: Entity | undefined;

  constructor() {
    super();

    // Create the instance on construction so it's ready for Awake() / preStart()
    PlayerManager.instance = this;
    this.gamePlayers = new GamePlayers();
    this.playerDataSet = new Map<Player, PlayerData>();
  }

  public Awake() {

    this.spawnedHudAsset = GameConfig.getInstance().props.spawnedHudAsset;
    this.lobbySpawnPoint = GameConfig.getInstance().props.lobbySpawnPoint;
    this.matchSpawnPoint = GameConfig.getInstance().props.matchSpawnPoint;

    // Player join and leave
    this.connectCodeBlockEvent(this.entity, CodeBlockEvents.OnPlayerEnterWorld, this.handleOnPlayerEnterWorld.bind(this));
    this.connectCodeBlockEvent(this.entity, CodeBlockEvents.OnPlayerExitWorld, this.handleOnPlayerExitWorld.bind(this));
  }

  public getPlayerData(player: Player): PlayerData | undefined {
    return this.playerDataSet.get(player);
  }

  public setPlayerData(player: Player, data: PlayerData): boolean {
    if (this.gamePlayers.all.has(player)) {
      this.playerDataSet.set(player, data);
      return true;
    }

    return false;
  }

  public loadPlayerData(player: Player): PlayerSaveData | null {
    return this.world.persistentStorage.getPlayerVariable<PlayerSaveData>(
      player,
      PlayerData.varName
    );
  }

  public savePlayerData(player: Player, data: PlayerSaveData) {
    if (player) {
      this.world.persistentStorage.setPlayerVariable(player, PlayerData.varName, data);
    } else {
      console.warn("PlayerManager::savePlayerData: player is not set");
    }
  }

  // When a player enters the world, add that player and an initial player status to our Player Map
  private handleOnPlayerEnterWorld(player: Player): void {
    // Handle double join messages
    if (!this.gamePlayers.all.has(player)) {
      PlayerManager.getInstance().awardAchievement(player, "Achievement1");
      const playerDataState = this.loadPlayerData(player);

      if (playerDataState) {
        // Perform a check to make sure the data is up to date and initialize / delete parameters
        if (PlayerData.checkAndUpgradeData(playerDataState)) {
          // Data has changed, update it
          this.savePlayerData(player, playerDataState);
        }
      }

      console.log("PlayerManager: Player joined world: " + player.name.get() + " data: " + playerDataState);

      const pData = new PlayerData(player, playerDataState)
      this.gamePlayers.addNewPlayer(player);
      this.playerDataSet.set(player, pData);

      if (this.spawnedHudAsset) {
        HudManager.getInstance()?.assignHud(pData);
      }
    }
    else {
      console.warn("PlayerManager: Player already joined world");
    }
  }

  // When a player leaves the world, Remove that player from the PlayerMap.
  private handleOnPlayerExitWorld(player: Player): void {
    if (this.gamePlayers.all.has(player)) {
      HudManager.getInstance()?.releaseHud(player);
    }
    this.playerDataSet.delete(player);
    this.gamePlayers.removePlayer(player);
  }

  public resetAllPlayers() {
    this.moveAllMatchPlayersToLobby();
    this.playerDataSet.forEach((pData: PlayerData) => {
      pData.reset();
      this.updatePlayerHUD(pData);
    });
  }

  // This is one way to update the leaderboard if you set up the player to get the leaderboard value from the PlayerData
  public updateLeaderboard(leaderboardName: string) {
    const overrideScore = true;
    this.playerDataSet.forEach((p: PlayerData) => {
      this.world.leaderboards.setScoreForPlayer(leaderboardName, p.getPlayer(), p.getLeaderboardValue(), overrideScore);
    });
  }

  // "Quests" are achievements that you can award manually or track automatically (look at the documentation for more info)
  public awardAchievement(player: Player, achievementId: string) {
    player.setAchievementComplete(achievementId, true);
  }

  private moveAllMatchPlayersToLobby() {
    const gamePlayers = this.gamePlayers.getPlayersInMatch();
    gamePlayers.forEach((player: Player) => {
      this.movePlayerFromMatchToLobby(player);
    });
  }

  private moveAllLobbyPlayersToMatch() {
    const gamePlayers = this.gamePlayers.getPlayersInLobby();
    gamePlayers.forEach((player: Player) => {
      this.movePlayerFromLobbyToMatch(player);
    });
  }

  private movePlayerFromLobbyToMatch(player: Player) {
    this.matchSpawnPoint?.as(SpawnPointGizmo)?.teleportPlayer(player);
    this.gamePlayers.moveToMatch(player);
  }

  private movePlayerFromMatchToLobby(player: Player) {
    this.lobbySpawnPoint?.as(SpawnPointGizmo)?.teleportPlayer(player);
    this.gamePlayers.moveToLobby(player);
  }

  private updatePlayerHUD(p: PlayerData) {
    console.log("HudManager: updatePlayerHUD", HudManager.getInstance());
    HudManager.getInstance().updateHud(p);
  }

}
Component.register(PlayerManager);
