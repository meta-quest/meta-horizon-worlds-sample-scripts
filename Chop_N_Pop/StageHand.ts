// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { Behaviour } from 'Behaviour';
import { Events } from 'Events';
import { Component, Entity, Quaternion, Vec3 } from 'horizon/core';

class CuePosition{
  entity: Entity;
  position: Vec3;
  rotation: Quaternion;
  disabled: boolean = false;

  constructor(entity: Entity, position: Vec3, rotation: Quaternion) {
    this.entity = entity;
    this.position = position;
    this.rotation = rotation;
  }
}

export class StageHand extends Behaviour<typeof StageHand> {
  static propsDefinition = {};

  private cuePositions : Map<string, CuePosition> = new Map<string, CuePosition>;
  static instance : StageHand;

  Awake() {
    StageHand.instance = this;
  }

  Start() {
    this.connectNetworkBroadcastEvent(Events.gameReset, this.resetToCuePosition.bind(this));
  }

  addCuePosition(entity: Entity, position: Vec3, rotation: Quaternion) {
    if (!this.cuePositions.has(entity.id.toString())) {
      this.cuePositions.set(entity.id.toString(), new CuePosition(entity, position, rotation));
    }
    else
    {
      this.cuePositions.get(entity.id.toString())!.disabled = false;
    }
  }

  disableCueReset(entity: Entity) {
    // Manually disable the reset for an entity if we don't want it to reset while on the server
    if (this.cuePositions.has(entity.id.toString())) {
      this.cuePositions.get(entity.id.toString())!.disabled = true;
    }
  }

  private resetToCuePosition() {
    // Only acts on the server, so if an entity is owned by a client, it will not be reset
    this.cuePositions.forEach((cuePosition) => {
      if (!cuePosition.disabled) {
        cuePosition.entity.position.set(cuePosition.position);
        cuePosition.entity.rotation.set(cuePosition.rotation);
      }
    });
  }
}
Component.register(StageHand);
