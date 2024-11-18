// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import {
  AudioGizmo,
  CodeBlockEvents,
  Component,
  Entity,
  ParticleGizmo,
  Player,
  PhysicalEntity,
  PhysicsForceMode,
  PropTypes,
  Vec3,
} from 'horizon/core';

class Projectile extends Component<typeof Projectile> {
  static propsDefinition = {
    projectileLauncher: { type: PropTypes.Entity },
    objHitForceMultipler: { type: PropTypes.Number, default: 100 },
    objHitSFX: { type: PropTypes.Entity },
    objHitVFX: { type: PropTypes.Entity },
  };

  start() {
    this.connectCodeBlockEvent(this.entity, CodeBlockEvents.OnProjectileHitObject, this.onProjectileHitObject.bind(this));
    this.connectCodeBlockEvent(this.entity, CodeBlockEvents.OnProjectileHitWorld, this.onProjectileHitWorld.bind(this));
    this.connectCodeBlockEvent(this.entity, CodeBlockEvents.OnProjectileHitPlayer, this.onProjectileHitPlayer.bind(this));
  }

  private onProjectileHitObject(objectHit: Entity, position: Vec3, normal: Vec3) {
    //When the projectiles hits an object, we apply a multiplied force
    //based on the normal to the object to push it away from the projectile.
    console.log("projectile hit object");
    objectHit.as(PhysicalEntity)?.applyForceAtPosition(
      normal.mulInPlace(-1 * this.props.objHitForceMultipler),
      position,
      PhysicsForceMode.Impulse);

    this.onHitGeneric(position, normal);
  }

  private onProjectileHitWorld(position: Vec3, normal: Vec3) {
    console.log("projectile hit world");
    this.onHitGeneric(position, normal);
  }

  private onProjectileHitPlayer(player: Player, position: Vec3, normal: Vec3, headshot: boolean) {
    console.log("projectile hit player");
    this.onHitGeneric(position, normal);
  }

  private onHitGeneric(position: Vec3, normal: Vec3) {
    var hitSound = this.props.objHitSFX?.as(AudioGizmo);
    var hitParticles = this.props.objHitVFX?.as(ParticleGizmo);

    if (hitSound) {
      hitSound.position.set(position);
      hitSound.play();
    }

    if (hitParticles) {
      hitParticles.position.set(position);
      hitParticles.play();
    }
  }
}

Component.register(Projectile);
