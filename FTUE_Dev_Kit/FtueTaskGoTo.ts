// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { FtueTask } from 'FtueTask';
import { AudioGizmo, Component, EventSubscription, ParticleGizmo, Player, PropTypes, Quaternion, Vec3, World } from 'horizon/core';

export class FtueTaskGoTo extends FtueTask<typeof FtueTaskGoTo> {
  static propsDefinition = {
    ...FtueTask.propsDefinition,
    entityGoal: {type: PropTypes.Entity},
    goalRadius: {type: PropTypes.Number},
    followArrow: {type: PropTypes.Entity},
    playerArrowOffset: {type: PropTypes.Number, default: 2},
    goalMarker: {type: PropTypes.Entity},
    goalMarkerOffset: {type: PropTypes.Vec3, default: Vec3.zero},
    arrowDisappearVfx: {type: PropTypes.Entity},
    newGoalSfx: {type: PropTypes.Entity},
    goalReachedSfx: {type: PropTypes.Entity},
  };

  updateListener: EventSubscription | null;
  player: Player | null;

  constructor() {
    super();
    this.updateListener = null;
    this.player = null;
  }

  start() {
    super.start();
    this.entity.visible.set(false);
  }

  onTaskStart(player: Player): void {
    this.player = player;
    this.setPosition();

    if (!this.props.entityGoal){
      return;
    }

    if (this.props.newGoalSfx) {
      this.props.newGoalSfx.position.set(this.player.position.get());
      this.props.newGoalSfx.as(AudioGizmo).play();
    }

    if (this.props.followArrow) {
      this.props.followArrow.visible.set(true);
    }

    if (this.props.goalMarker) {
      this.props.goalMarker.visible.set(true);
      this.props.goalMarker.position.set(this.props.entityGoal!.position.get());
    }

    this.updateListener = this.connectLocalBroadcastEvent(World.onUpdate, (data: {deltaTime: number}) => {
      this.update(data.deltaTime);
    });
  }

  onTaskComplete(player: Player): void {
    this.updateListener?.disconnect();

    if (this.props.followArrow) {

      if (this.props.arrowDisappearVfx) {
        this.props.arrowDisappearVfx.position.set(this.props.followArrow.position.get());
        this.props.arrowDisappearVfx.as(ParticleGizmo).play();
      }

      this.props.followArrow.visible.set(false);
    }

    if (this.props.goalReachedSfx) {
      this.props.goalReachedSfx.position.set(this.props.entityGoal!.position.get());
      this.props.goalReachedSfx.as(AudioGizmo).play();
    }

    if (this.props.goalMarker) {
      this.props.goalMarker.visible.set(false);
    }
  }

  update(deltaTime: number) {
    this.setPosition();
  }

  private setPosition()
  {
    const playerPos = this.player!.position.get();
    const goalPos = this.props.entityGoal!.position.get();

    // Close enough
    let playerToGoal = goalPos.sub(playerPos);
    if (playerToGoal.magnitudeSquared() < this.props.goalRadius * this.props.goalRadius) {
      this.complete(this.player!);
    }

    // Update the follow arrow
    if (this.props.followArrow)
    {
      let playerToArrow = playerToGoal.normalize();

      const arrowPos = playerPos.add(playerToArrow.mul(this.props.playerArrowOffset));
      const arrowToGoal = goalPos.sub(arrowPos);
      const arrowToGoalRight = arrowToGoal.cross(Vec3.up);
      const arrowToGoalUp = arrowToGoal.cross(arrowToGoalRight);


      this.props.followArrow.position.set(arrowPos);
      this.props.followArrow.rotation.set(Quaternion.lookRotation(arrowToGoal.normalize(), arrowToGoalUp.normalize()));
    }
  }
}
Component.register(FtueTaskGoTo);
