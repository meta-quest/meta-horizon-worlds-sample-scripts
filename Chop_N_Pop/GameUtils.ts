// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { Asset, Entity, Player } from 'horizon/core';
import { Image, ImageSource, ImageStyle } from 'horizon/ui';

export class PlayerData{
  player: Player;
  isInvincible: boolean;

  ammo: number;
  hp: number;

  initialHp : number;
  initialAmmo : number;

  hud : Entity | null | undefined;

  constructor(player: Player, ammo : number, hp : number) {
    this.player = player;
    this.hp = this.initialHp = hp;
    this.ammo = this.initialAmmo = ammo;
    this.hud = null;
    this.isInvincible = false;
  }

  public reset() {
    this.hp = this.initialHp;
    this.ammo = this.initialAmmo;
    this.isInvincible = false;
  }
}

export class GamePlayers {
  all = new Map<Player, PlayerData>;
  inLobby = new Set<number>;
  inMatch = new Set<number>;

  get(p: Player): PlayerData | undefined {
    return this.all.get(p);
  }

  addAmmo(p: Player, amount: number): void {
    var playerData = this.get(p);
    if (playerData) {
      playerData.ammo += amount;
    }
  }

  takeDamage(p: Player, amount: number): number {
    var playerData = this.get(p);
    if (playerData && !playerData.isInvincible) {
      playerData.hp -= amount;
      return playerData.hp > 0 ? playerData.hp : 0;
    }

    // Non-existent player, can't take damage
    return 1;
  }

  setInvincible(p: Player, isInvincible: boolean): boolean {
    var playerData = this.get(p);
    if (playerData) {
      playerData.isInvincible = isInvincible;

      return isInvincible;
    }

    return false;
  }

  heal(p: Player, amount: number, max: number): number {
    var playerData = this.get(p);
    if (playerData) {
      playerData.hp = playerData.hp + amount;
      return playerData.hp;
    }

    // Non-existent player, can't heal
    return 0;
  }

  revive(p: Player) {
    var playerData = this.get(p);
    if (playerData) {
      playerData.hp = playerData.initialHp;
    }
  }

  isInLobby(p: Player): boolean {
    return this.inLobby.has(p.id);
  }

  isInMatch(p: Player): boolean {
    return this.inMatch.has(p.id);
  }

  playersInLobby(): number {
    return this.inLobby.size;
  }

  playersInMatch(): number {
    return this.inMatch.size;
  }

  playersInWorld(): number {
    return this.inLobby.size + this.inMatch.size;
  }

  getPlayersInLobby(): PlayerData[] {
    var playerList : PlayerData[] = [];
    this.all.forEach(element => {
      if (this.inLobby.has(element.player.id)) {
        playerList.push(element);
      }
    });
    return playerList;
  }

  getPlayersInMatch(): PlayerData[]  {
    var playerList : PlayerData[] = [];
    this.all.forEach(element => {
      if (this.inMatch.has(element.player.id)) {
        playerList.push(element);
      }
    });
    return playerList;
  }

  moveToLobby(p: Player): void {
    if (this.inMatch.has(p.id)) {
      this.inMatch.delete(p.id);
      this.inLobby.add(p.id);
    }
  }

  moveToMatch(p: Player): void {
    if (this.inLobby.has(p.id)) {
      this.inLobby.delete(p.id);
      this.inMatch.add(p.id);
    }
  }

  addNewPlayer(p: PlayerData): PlayerData {
    this.all.set(p.player, p);
    this.inLobby.add(p.player.id);

    return p;
  }

  removePlayer(p: Player): void {
    this.inLobby.delete(p.id);
    this.inMatch.delete(p.id);
    this.all.delete(p);
  }

  resetAllPlayers(): void {
    this.all.forEach(element => {
      element.reset();
    });
  }
}

export function loadImageFromTexture(asset: Asset, style: ImageStyle) {
  return Image({
    source: ImageSource.fromTextureAsset(asset),
    style: style,
  });
}

export type UITextureProps = {
  textureAsset: Asset;
};
