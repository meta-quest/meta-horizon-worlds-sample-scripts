// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

/**
 * Moves players between match states, based on that match state, teleports them around as needed
 */
import * as hz from 'horizon/core';
import { GameState, PlayerGameStatus } from 'GameUtils';
import { Events } from "Events";

export interface PlayerData {
  player: hz.Player;
  playerGameStatus: PlayerGameStatus;
}

export class MatchManager extends hz.Component<typeof MatchManager> {
  static propsDefinition = {
    lobbySpawnPoint: { type: hz.PropTypes.Entity },
    matchSpawnPoint: { type: hz.PropTypes.Entity },
  };
  private lastKnownGameState = GameState.ReadyForMatch;
  private playerMap: Map<number, PlayerData> = new Map<number, PlayerData>();
  private static s_instance: MatchManager
  public static getInstance(): MatchManager {
    return MatchManager.s_instance;
  }

  constructor() {
    super();
    if (MatchManager.s_instance === undefined) {
      MatchManager.s_instance = this;
    }
    else {
      console.error(`There are two ${this.constructor.name} in the world!`)
      return;
    }
  }

  subscriptions: Array<hz.EventSubscription> = [];

  preStart() {
    this.connectCodeBlockEvent(this.entity, hz.CodeBlockEvents.OnPlayerEnterWorld, (player: hz.Player) => {
      this.handleOnPlayerEnterWorld(player);
    });

    this.connectCodeBlockEvent(this.entity, hz.CodeBlockEvents.OnPlayerExitWorld, (player: hz.Player) => {
      this.handleOnPlayerExitWorld(player);
    });

    this.connectLocalBroadcastEvent(Events.onGameStateChanged, (data) => {
      this.handleGameStateTransit(data.fromState, data.toState);
    });

    this.connectLocalBroadcastEvent(Events.onRegisterPlayerForMatch, (data) => {
      this.handlePlayerRegisterStandby(data.player);
    });

    this.connectLocalBroadcastEvent(Events.onDeregisterPlayerForMatch, (data) => {
      this.handlePlayerDeregisterStandby(data.player);
    });

    this.connectNetworkBroadcastEvent(Events.onResetWorld, (data) => {
      this.reset();
      this.playerMap.forEach((pd) => {
        this.sendNetworkEvent(pd.player, Events.onResetLocalObjects, {})
      });
    });

  }

  start() { }

  public getPlayersWithStatus(playerGameStatus: PlayerGameStatus): Array<hz.Player> {
    return Array.from(this.playerMap.values()).filter(value => value.playerGameStatus === playerGameStatus).map(value => value.player);
  }

  private handleGameStateTransit(fromState: GameState, toState: GameState) {

    this.lastKnownGameState = toState;

    //Game is starting
    if (fromState === GameState.StartingMatch && toState === GameState.PlayingMatch) {
      const matchSpawnPointGiz = this.props.matchSpawnPoint!.as(hz.SpawnPointGizmo)

      if (matchSpawnPointGiz) {
        //players in standby already should not be teleported.
        this.teleportPlayersWithStatusToSpawnPoint(PlayerGameStatus.Lobby, matchSpawnPointGiz);

        this.transferAllPlayersWithStatus(PlayerGameStatus.Standby, PlayerGameStatus.Playing);
        this.transferAllPlayersWithStatus(PlayerGameStatus.Lobby, PlayerGameStatus.Playing);
      }

    }
    //Game has ended
    else if (toState === GameState.CompletedMatch) {

      const lobbySpawnPointGiz = this.props.lobbySpawnPoint!.as(hz.SpawnPointGizmo)
      if (lobbySpawnPointGiz) {
        this.playerMap.forEach((playerD: PlayerData) => {
          lobbySpawnPointGiz.teleportPlayer(playerD.player);
          playerD.playerGameStatus = PlayerGameStatus.Lobby;
        });
      }
    } else if (toState === GameState.ReadyForMatch) {
      this.playerMap.forEach((pd) => {
        this.sendNetworkEvent(pd.player, Events.onResetLocalObjects, {})
      });
    }
  }

  private handleOnPlayerExitWorld(player: hz.Player): void {
    const playerData = this.playerMap.get(player.id);
    if (!playerData) {
      console.error(`player ${player.name.get()} not found in playerMap`);
      return;
    }
    this.playerMap.delete(player.id);

    switch (playerData.playerGameStatus) {
      case PlayerGameStatus.Standby:
        this.sendLocalBroadcastEvent(Events.onPlayerLeftStandby, { player });
        break;
      case PlayerGameStatus.Playing:
        this.sendLocalBroadcastEvent(Events.onPlayerLeftMatch, { player });
        break;
      case PlayerGameStatus.Lobby:
        break;
    }
  };

  private handleOnPlayerEnterWorld(player: hz.Player): void {
    this.playerMap.set(
      player.id,{
        player,
        playerGameStatus: PlayerGameStatus.Lobby,
      }
    );
  };

  private handlePlayerRegisterStandby(player: hz.Player): void {
    if (this.lastKnownGameState === GameState.StartingMatch || this.lastKnownGameState === GameState.ReadyForMatch) {
      this.transferPlayerWithStatus(player, PlayerGameStatus.Lobby, PlayerGameStatus.Standby);
      this.sendLocalBroadcastEvent(Events.onPlayerJoinedStandby, { player });
    }
  }

  private handlePlayerDeregisterStandby(player: hz.Player): void {
    if (this.lastKnownGameState === GameState.StartingMatch || this.lastKnownGameState === GameState.ReadyForMatch) {
      this.transferPlayerWithStatus(player, PlayerGameStatus.Standby, PlayerGameStatus.Lobby);
    }
  }

  private transferAllPlayersWithStatus(fromState: PlayerGameStatus, toState: PlayerGameStatus) {
    this.playerMap.forEach((playerData: PlayerData) => {
      if (playerData.playerGameStatus === fromState) {
        playerData.playerGameStatus = toState;
      }
    });
  }

  private transferPlayerWithStatus(player: hz.Player, fromState: PlayerGameStatus, toState: PlayerGameStatus): void {
    if (fromState === toState) {
      console.warn(`You are trying to move player ${player.name.get()} into the same state ${PlayerGameStatus[fromState]}. Skipping`);
      return;
    }

    const playerData = this.playerMap.get(player.id);
    if (!playerData) {
      console.error(`player ${player.name.get()} not found in playerMap`);
      return;
    }

    if (playerData.playerGameStatus !== fromState) {
      console.warn(`You are trying to move player ${player.name.get()} into the same state ${fromState}. Skipping`);
    }
    playerData.playerGameStatus = toState;
  }

  //While you can move players by moving their location, it is better to move them using spawnpoint as it provides
  //+ Fading in and out on VR
  //+ Solves having multiple players spawn in the same location
  private teleportPlayersWithStatusToSpawnPoint(status: PlayerGameStatus, spawnPoint: hz.SpawnPointGizmo) {
    this.playerMap.forEach((playerD: PlayerData) => {

      if (playerD.playerGameStatus === status) {
        spawnPoint.teleportPlayer(playerD.player);
      }
    });
  }

  private reset() {
    this.lastKnownGameState = GameState.ReadyForMatch;
    this.playerMap.clear();
  }

  dispose() { this.reset(); }

}
hz.Component.register(MatchManager);
