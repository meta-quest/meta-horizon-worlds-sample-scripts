// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { BehaviourFinder } from 'Behaviour';
import { Component, ParticleGizmo, PropTypes, Quaternion, Vec3 } from 'horizon/core';
import { LootItem } from 'LootItem';
import { IAllocatable, ObjectPool } from 'ObjectPool';

export class PoolLootItem extends LootItem<typeof PoolLootItem> implements IAllocatable{
  static propsDefinition = {
    ...LootItem.propsDefinition,
    parentPool: {type: PropTypes.Entity},
  }

  private originalPosition : Vec3 = Vec3.zero;

  Start()
  {
    super.Start();
    this.originalPosition = this.entity.position.get();
    this.addSelfToPool();
  }

  public onAllocate(position : Vec3, rotation : Quaternion) {
    this.entity.visible.set(true);
    this.basePosition = position;
    this.entity.rotation.set(rotation);
    this.isCollected = false;
    this.props.vfx?.as(ParticleGizmo)?.play();
  }

  public onFree() {
    this.entity.visible.set(false);
    this.basePosition = this.originalPosition;
    this.entity.position.set(this.basePosition);
  }

  private addSelfToPool() {
    var pool = BehaviourFinder.GetBehaviour<ObjectPool>(this.props.parentPool);
    pool?.addEntity(this.entity);
  }

}
Component.register(PoolLootItem);
