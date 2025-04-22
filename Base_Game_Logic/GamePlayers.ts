// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

// CREATOR LEVEL: <<Beginner>>

import { Player } from "horizon/core";

export class GamePlayers {
  all = new Set<Player>;
  inLobby = new Set<number>;
  inMatch = new Set<number>;


  public isInLobby(p: Player): boolean {
    return this.inLobby.has(p.id);
  }

  public isInMatch(p: Player): boolean {
    return this.inMatch.has(p.id);
  }

  public playersInLobby(): number {
    return this.inLobby.size;
  }

  public playersInMatch(): number {
    return this.inMatch.size;
  }

  public playersInWorld(): number {
    return this.inLobby.size + this.inMatch.size;
  }

  public getPlayersInLobby(): Player[] {
    let playerList: Player[] = [];
    this.all.forEach(element => {
      if (this.inLobby.has(element.id)) {
        playerList.push(element);
      }
    });
    return playerList;
  }

  public getPlayersInMatch(): Player[] {
    let playerList: Player[] = [];
    this.all.forEach(element => {
      if (this.inMatch.has(element.id)) {
        playerList.push(element);
      }
    });
    return playerList;
  }

  public moveToLobby(p: Player): void {
    if (this.inMatch.has(p.id)) {
      this.inMatch.delete(p.id);
      this.inLobby.add(p.id);
    }
  }

  public moveToMatch(p: Player): void {
    if (this.inLobby.has(p.id)) {
      this.inLobby.delete(p.id);
      this.inMatch.add(p.id);
    }
  }

  public addNewPlayer(p: Player){
    this.all.add(p);
    this.inLobby.add(p.id);
  }

  public removePlayer(p: Player): void {
    this.inLobby.delete(p.id);
    this.inMatch.delete(p.id);
    this.all.delete(p);
  }
}
