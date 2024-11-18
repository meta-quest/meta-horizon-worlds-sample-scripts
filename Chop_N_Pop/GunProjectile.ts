// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

// Original code by SketeDavidson: https://horizon.meta.com/profile/10158917081718438

import { Behaviour } from "Behaviour";
import { Events } from "Events";
import { AudioGizmo, CodeBlockEvents, Component, Entity, Player, PropTypes, Vec3 } from "horizon/core";
import { Throttler } from "Throttler";

export class GunProjectile extends Behaviour<typeof GunProjectile> {
  static propsDefinition = {
    hitSFX: {type: PropTypes.Entity},
    missSFX: {type: PropTypes.Entity},
  };

  sfxDelayTimeMs = 1000;
  private sfxDelays = new Map<Entity, boolean>();

  Awake(){
    this.connectCodeBlockEvent(
      this.entity,
      CodeBlockEvents.OnProjectileHitObject,
      this.handleHit.bind(this)
    );
    this.connectCodeBlockEvent(
      this.entity,
      CodeBlockEvents.OnProjectileHitWorld,
      (position: Vec3, normal: Vec3) => {
        Throttler.try("GunMissSFX", () => {
          this.props.missSFX?.position.set(position);
          this.props.missSFX?.as(AudioGizmo)?.play();
        } , this.sfxDelayTimeMs);
      }
    );

    if (this.props.hitSFX)
        this.sfxDelays.set(this.props.hitSFX, false);
    if (this.props.missSFX)
      this.sfxDelays.set(this.props.missSFX, false);
  }

  handleHit(itemHit: Entity, position: Vec3, normal: Vec3, headshot: boolean = false) {
    if (itemHit instanceof Entity && !(itemHit instanceof Player)) {
      Throttler.try("GunProjectileSFX", () => {
        this.props.hitSFX?.position.set(position);
        this.props.hitSFX?.as(AudioGizmo)?.play();
      } , this.sfxDelayTimeMs)
      this.sendNetworkEvent(itemHit, Events.projectileHit, {hitPos : position, hitNormal : normal, fromPlayer : this.entity.parent.get()!.owner.get()});
      console.log("Hit! -> " + itemHit);
    }
  }
}

Component.register(GunProjectile);
