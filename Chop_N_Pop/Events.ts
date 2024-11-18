// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { PlayerData } from "GameUtils";
import { Entity, LocalEvent, NetworkEvent, Player, Vec3 } from "horizon/core";

export const Events = {

  gameReset: new NetworkEvent<{}>('gameReset'),

  // Gun Events
  projectileHit: new NetworkEvent<{ hitPos: Vec3, hitNormal: Vec3, fromPlayer: Player}>('projectileHit'),
  playerScoredHit: new NetworkEvent<{player : Player, entity : Entity}>('playerScoredHit'),
  gunRequestAmmo: new NetworkEvent<{player: Player, weapon: Entity, ammoCount : number}>('gunRequestAmmo'),
  gunRequestAmmoResponse: new NetworkEvent<{ammoCount : number}>('gunRequestAmmoResponse'),

  // Axe events
  axeHit: new NetworkEvent<{ hitPos: Vec3, hitNormal: Vec3, fromPlayer: Player}>('axeHit'),

  // Monster Events
  playerHit : new NetworkEvent<{player: Player, damage: number, damageOrigin : Vec3}>('PlayerHit'),

  // Monster Management
  monstersInRange: new NetworkEvent<{entity : Entity, range : number}>('monstersInRange'),
  monstersInRangeResponse: new NetworkEvent<{monsters: Entity[]}>('monstersInRangeResponse'),

  // Loot
  lootPickup: new NetworkEvent<{player: Player, loot: string}>('LootPickup'),

  // Player
  playerDeath: new NetworkEvent<{player: Player}>('PlayerDeath'),
  registerLocalPlayerController: new NetworkEvent<{ entity: Entity }>("registerLocalPlayerController"),
  playerDataUpdate: new NetworkEvent<{ammo : number, hp: number}>('playerDataUpdate'),
  playerAmmoUpdate: new NetworkEvent<{player: Player, ammo : number}>('playerAmmoUpdate'),
  playerHpUpdate: new NetworkEvent<{player: Player, hp : number}>('playerHpUpdate'),
};

export const WaveManagerNetworkEvents = {
  StartWaveGroup: new NetworkEvent<{waveGroupName : string}>('StartWaveGroup'),
  StopWaveGroup: new NetworkEvent<{waveGroupName : string}>('StopWaveGroup'),
  NextWave: new NetworkEvent<{waveGroupName : string}>('NextWave'),
  StartingWave: new NetworkEvent<{waveGroupName: string, waveNumber : number}>('StartingWave'),
  WaveComplete: new NetworkEvent<{waveGroupName: string, waveNumber : number}>('WaveComplete'),
  FightStarted: new NetworkEvent<{waveGroupName: string}>('FightStarted'),
  FightEnded: new NetworkEvent<{waveGroupName: string}>('FightEnded'),
};
