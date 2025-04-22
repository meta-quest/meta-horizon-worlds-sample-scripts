// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

// CREATOR LEVEL: <<Intermediate>>

import { Behaviour, BehaviourFinder } from 'Behaviour';
import { Player, PropTypes, Quaternion, Vec3 } from 'horizon/core';
import { ObjectPool } from 'ObjectPool';

export class PooledEntity<T> extends Behaviour<typeof PooledEntity & T> {
  static propsDefinition = {
    ParentPool: { type: PropTypes.Entity },
  };

  private hiddenLocation : Vec3 = new Vec3(0, 0, 0);

  BStart() {
    const parentPool = BehaviourFinder.GetBehaviour<ObjectPool>(this.props.ParentPool);
    if (parentPool) {
      parentPool.addEntity(this.entity);
      this.hiddenLocation = this.props.ParentPool!.position.get();
      this.reset();
    } else {
      console.warn("PooledEntity: ParentPool not found");
    }
  }

  onAllocate(position : Vec3, rotation : Quaternion, owner : Player | null) : void
  {
    this.entity.visible.set(true);
    this.entity.position.set(position);
    this.entity.rotation.set(rotation);
    if (owner) {
      this.entity.owner.set(owner);
    }
  }

  onFree() : void
  {
    this.reset();
  }

  private reset() : void
  {
    this.entity.visible.set(false);
    this.entity.position.set(this.hiddenLocation);
    this.entity.rotation.set(new Quaternion(0, 0, 0, 1));
    if (this.entity.owner.get() != this.world.getServerPlayer())
    {
      this.entity.owner.set(this.world.getServerPlayer());
    }
  }
}
