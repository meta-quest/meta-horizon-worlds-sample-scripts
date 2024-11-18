// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { Behaviour, BehaviourFinder } from 'Behaviour';
import { Component, Entity, Player, Quaternion, Vec3 } from 'horizon/core';

export interface IAllocatable
{
  onAllocate(position : Vec3, rotation : Quaternion, owner : Player | null) : void;
  onFree() : void;
}

export class ObjectPool extends Behaviour<typeof ObjectPool> {
  static propsDefinition = {};

  private allocatedEntities : Set<Entity> = new Set<Entity>();
  private freeEntities : Set<Entity> = new Set<Entity>();

  public addEntity(entity : Entity){
    this.freeEntities.add(entity);
  }

  public allocate(position : Vec3, rotation : Quaternion, owner : Player | null) : Entity | null{

    if (this.freeEntities.size == 0) {
      console.error("ObjectPool: no free entities");
      return null;
    }

    const entity = this.freeEntities.values().next().value;
    this.freeEntities.delete(entity);
    this.allocatedEntities.add(entity);

    var allocatable = BehaviourFinder.GetBehaviour(entity) as unknown as IAllocatable;
    allocatable?.onAllocate(position, rotation, owner);

    return entity;
  }

  public free(entity : Entity | undefined | null){
    if (!entity) {
      return;
    }

    if (!this.allocatedEntities.has(entity)) {
      console.warn("ObjectPool: entity is not allocated");
      return;
    }

    this.allocatedEntities.delete(entity);
    this.freeEntities.add(entity);

    var allocatable = BehaviourFinder.GetBehaviour(entity) as unknown as IAllocatable;
    allocatable?.onFree();
  }

  public has(entity : Entity) {
    return !!this.allocatedEntities.has(entity) || !!this.freeEntities.has(entity);
  }
}
Component.register(ObjectPool);
