// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { Behaviour } from 'Behaviour';
import { Component, Entity, NetworkEvent, Player, PropTypes, Quaternion, Vec3 } from 'horizon/core';

class ColliderBox extends Behaviour<typeof ColliderBox> {
  static propsDefinition = {};

  protected override OnEntityCollision(itemHit: Entity, position: Vec3, normal: Vec3, velocity: Vec3)
  {
  }
}
Component.register(ColliderBox);
