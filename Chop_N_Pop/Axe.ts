// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { Behaviour } from 'Behaviour';
import { Events } from 'Events';
import { HapticFeedback, HapticHand, HapticType } from 'HapticFeedback';
import { VFXParticleGizmo } from 'horizon/2p';
import { AudioGizmo, AvatarGripPoseAnimationNames, CodeBlockEvents, Component, Entity, EventSubscription, Player, PlayerDeviceType, PropTypes, Vec3 } from 'horizon/core';
import { StageHand } from 'StageHand';
import { Throttler } from 'Throttler';

class Axe extends Behaviour<typeof Axe> {
  static propsDefinition = {
   swingCooldown: {type: PropTypes.Number, default: 200},
   threatRange: {type: PropTypes.Number, default: 2.0},
   threatAngle: {type: PropTypes.Number, default: 45.0},
   hitSound : {type: PropTypes.Entity},
   hitVfx : {type: PropTypes.Entity}
  };

  private hand : HapticHand = HapticHand.Right;
  private triggerSub : EventSubscription | null = null;
  private inRangeSub : EventSubscription | null = null;

  Start()
  {
    super.Start();
    if (this.entity.owner.get() == this.world.getServerPlayer()) {
      StageHand.instance.addCuePosition(this.entity, this.entity.position.get(), this.entity.rotation.get());
    }
  }

  protected override OnGrabStart(isRightHand: boolean, player: Player) {
    this.entity.owner.set(player);
    if (isRightHand) {
      this.hand = HapticHand.Right;
    } else {
      this.hand = HapticHand.Left;
    }

    if (player.deviceType.get() != PlayerDeviceType.VR)
    {
      this.triggerSub = this.connectCodeBlockEvent(this.entity, CodeBlockEvents.OnIndexTriggerDown, (triggerPlayer) => {
        Throttler.try("AxeHit", () => {
          this.entity.owner.get().playAvatarGripPoseAnimationByName(AvatarGripPoseAnimationNames.Fire);
          this.sendNetworkBroadcastEvent(Events.monstersInRange, {entity: this.entity, range: this.props.threatRange})
        }, this.props.swingCooldown)
      });

      this.inRangeSub = this.connectNetworkEvent(this.entity, Events.monstersInRangeResponse, this.hitMonsters.bind(this));
    }
  }

  protected override OnGrabEnd() {
    this.entity.owner.set(this.world.getServerPlayer());
    this.triggerSub?.disconnect();
    this.inRangeSub?.disconnect();
  }

  protected override OnEntityCollision(itemHit: Entity, position: Vec3, normal: Vec3, velocity: Vec3)
  {
    if (this.entity.owner.get() != this.world.getServerPlayer() && this.entity.owner.get().deviceType.get() == PlayerDeviceType.VR) {
      Throttler.try("AxeHit", () => {
        this.props.hitSound?.as(AudioGizmo)?.play();
        this.props.hitVfx?.position.set(position);
        this.props.hitVfx?.as(VFXParticleGizmo)?.play();
        HapticFeedback.playPattern(this.entity.owner.get(), HapticType.hitPlayerBody, this.hand, this);
        this.sendNetworkEvent(itemHit, Events.axeHit, {hitPos : position, hitNormal : normal, fromPlayer : this.entity.owner.get()});
      }, this.props.swingCooldown)
    }
  }

  private hitMonsters(data : {monsters : Entity[]})
  {
    data.monsters.forEach((monster) => {
      var monsterVec = monster.position.get().sub(this.entity.position.get()).normalize();
      var angle = Math.acos(monsterVec.dot(this.entity.forward.get()));

      // Use half the angle because it could be left or right
      if (angle < (this.props.threatAngle/2)) {
        this.props.hitSound?.as(AudioGizmo)?.play();
        HapticFeedback.playPattern(this.entity.owner.get(), HapticType.hitPlayerBody, this.hand, this);
        this.sendNetworkEvent(monster, Events.axeHit, {hitPos : monster.position.get().add(new Vec3(0, 1, 0)), hitNormal : this.entity.forward.get(), fromPlayer : this.entity.owner.get()});
      }
    });
  }
}
Component.register(Axe);
