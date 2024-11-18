// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { Behaviour } from 'Behaviour';
import { Component, Quaternion, TextGizmo, Vec3 } from 'horizon/core';

export class FloatingText extends Behaviour<typeof FloatingText> {
  static propsDefinition = {};

  private floatSpeed: number = 1;
  private rotateSpeed: number = 360;
  private currentTime = 0;
  private maxTime: number = 2;
  private rotationEuler = new Vec3(0, 0, 0);
  private deleted = false;

  setText(text: string, floatSpeed: number, rotateSpeed : number, maxTime : number) {
    this.entity.as(TextGizmo).text.set(text);
    this.floatSpeed = floatSpeed;
    this.rotateSpeed = rotateSpeed;
    this.maxTime = maxTime;
  }

  protected override Update(deltaTime: number) {
    if (this.deleted)
      return;

    this.currentTime += deltaTime;

    if (this.currentTime > this.maxTime)
    {
      this.world.deleteAsset(this.entity);
      this.deleted = true;
    }

    this.entity.position.set(this.entity.position.get().add(new Vec3(0, this.floatSpeed * deltaTime, 0)));

    this.rotationEuler.y += this.rotateSpeed * deltaTime % 360;
    this.entity.rotation.set(Quaternion.fromEuler(this.rotationEuler));

  }
}
Component.register(FloatingText);
