// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { Behaviour } from 'Behaviour';
import { AudioGizmo, Component, NetworkEvent, ParticleGizmo, Player, PropTypes, Quaternion, Vec3 } from 'horizon/core';
import { ILootTable } from 'ILootTable';

const LootPickup: NetworkEvent<{player: Player, loot: string}> = new NetworkEvent('LootPickup');

export class LootItem<T> extends Behaviour<typeof LootItem & T> {
  static propsDefinition = {
    itemType : {type: PropTypes.String},
    collectSound: {type: PropTypes.Entity},
    enableLootMagnet: {type: PropTypes.Boolean, default: false},
    lootMagnetRadius: {type: PropTypes.Number, default: 3.0},
    lootMagnetSpeed: {type: PropTypes.Number, default: 2.0},
    lootMagnetCaptureRadius: {type: PropTypes.Number, default: 1.0},
    vfx : {type: PropTypes.Entity},
    wobbleHeight: {type: PropTypes.Number, default: 0.05},
    revolutionTime: {type: PropTypes.Number, default: 2.0},
  }

  protected isCollected : boolean = true;
  private lootMagnetRadiusSquared: number = 0;
  private lootMagnetCaptureRadiusSquared: number = 0;
  private lootTable : ILootTable | null = null;

  // There's a race condition to place the item in the world, use this as a known position
  protected basePosition: Vec3 = Vec3.zero;

  Start () {
    this.lootMagnetRadiusSquared = this.props.lootMagnetRadius * this.props.lootMagnetRadius;
    this.lootMagnetCaptureRadiusSquared = this.props.lootMagnetCaptureRadius * this.props.lootMagnetCaptureRadius;
  }

  Update(deltaTime: number) {
    if (this.isCollected)
      return;

    // Loot wobble
    var wobbleVec = Vec3.up.mul(Math.sin(Date.now() / 500) * this.props.wobbleHeight);
    this.entity.rotation.set(Quaternion.fromEuler(Vec3.up.mul(Date.now() * (0.360 / this.props.revolutionTime))));

    // Loot magnet
    if (this.props.enableLootMagnet && this.world.getPlayers().length != 0)
    {
      // Find closest player
      var closestPlayer = this.world.getPlayers()[0];
      var closestPlayerVec = closestPlayer.position.get().sub(this.basePosition);
      this.world.getPlayers().forEach(player => {
        if (player.id != closestPlayer.id)
        {
          var playerVec = player.position.get().sub(this.basePosition);
          if (playerVec.magnitudeSquared() < closestPlayerVec.magnitudeSquared()) {
            closestPlayer = player;
            closestPlayerVec = playerVec;
          }
        }
      });

      if (closestPlayerVec.magnitudeSquared() < this.lootMagnetCaptureRadiusSquared) {
        this.collectItem(closestPlayer);
        return;
      }

      if (closestPlayerVec.magnitudeSquared() < this.lootMagnetRadiusSquared) {
        this.basePosition = this.basePosition.add(closestPlayerVec.normalize().mul(this.props.lootMagnetSpeed * deltaTime));
      }
    }
    this.entity.position.set(this.basePosition.add(wobbleVec));
  }

  public setBasePosition(position: Vec3) {
    this.basePosition = position;
  }

  override OnPlayerCollision(
    collidedWith: Player, collisionAt: Vec3, normal: Vec3,
    relativeVelocity: Vec3, localColliderName: string,
    otherColliderName: string) {

    // Only collect once
    if (this.isCollected)
      return;

    this.collectItem(collidedWith);
  }

  setPosition(position: Vec3) {
    this.basePosition = position;
  }

  setLootTable(lootTable : ILootTable)
  {
    this.lootTable = lootTable;
  }

  private collectItem(player : Player) {
    this.isCollected = true;
    this.props.collectSound?.as(AudioGizmo)?.play();
    this.entity.collidable.set(false);
    this.entity.visible.set(false);
    this.props.vfx?.as(ParticleGizmo)?.stop();

    // Notify the game of pickup and remove the item
    this.sendNetworkBroadcastEvent(LootPickup, {player: player, loot: this.props.itemType});
    this.async.setTimeout(() => {
      if (this.lootTable != null)
      {
        this.lootTable.clearItem(this.entity);
      }
    }, 1000);
  }
}
Component.register(LootItem);
