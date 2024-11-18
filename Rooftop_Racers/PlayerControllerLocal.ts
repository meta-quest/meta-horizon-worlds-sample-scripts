// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

/**
 * Local Script that takes the Players input and allows for doublejump and boost jumping.
 * Additionally, for responsiveness of game effects, it also plays SFX and VFX for players.
 */
import { Events } from "Events";
import * as hz from "horizon/core";
import * as MathUtils from "MathUtils";

export class PlayerControllerLocal extends hz.Component<
  typeof PlayerControllerLocal
> {
  static propsDefinition = {
    doubleJumpSFX: { type: hz.PropTypes.Entity },
    boostUsedSFX: { type: hz.PropTypes.Entity },
    boostReceivedSFX: { type: hz.PropTypes.Entity },
    respawnSFX: { type: hz.PropTypes.Entity },

    boostUsedParticleVFX: { type: hz.PropTypes.Entity },
  };

  private doubleJumpSFX!: hz.AudioGizmo;
  private boostUsedSFX!: hz.AudioGizmo;
  private boostReceivedSFX!: hz.AudioGizmo;
  private respawnSFX!: hz.AudioGizmo;
  private localSFXSettings!: hz.AudioOptions;

  private boostUsedParticleVFX: hz.ParticleGizmo | null = null;

  private owner!: hz.Player;
  private hasJumped: boolean = false;

  // Double Jump vars
  private jump1: boolean = false;
  private jump2: boolean = false;

  // Boosted Jump vars
  private isBoosted: boolean = false;
  private canBoost: boolean = false;
  private boostJumpAmount = 12;
  private boostJumpRadians = 1.5;
  private doubleJumpAmount = 5;

  private connectedJumpInput: hz.PlayerInput | null = null;
  private connectedBoostInput: hz.PlayerInput | null = null;
  private connectLocalControlX: hz.PlayerInput | null = null;
  private connectLocalControlY: hz.PlayerInput | null = null;

  private onUpdateSub: hz.EventSubscription | null = null;
  private setJumpCtrlDataSub: hz.EventSubscription | null = null;
  private onPlayerOOBSub: hz.EventSubscription | null = null;
  private stopRacePosUpdatesSub: hz.EventSubscription | null = null;
  private playerGotBoostSub: hz.EventSubscription | null = null;

  preStart() {
    this.owner = this.entity.owner.get(); //set owner
    if (this.owner !== this.world.getServerPlayer()) {
      this.localPreStart();
    }
  }

  start() {
    if (this.owner === this.world.getServerPlayer()) {
      this.serverStart();
    } else {
      this.localStart();
    }
  }

  private serverStart() {
    this.cleanup();
    this.sendLocalBroadcastEvent(Events.onRegisterPlyrCtrl, {
      caller: this.entity,
    });
  }

  private localPreStart() {
    this.connectDoubleJumpInputs();
    this.connectBoostJumpInputs();
    this.doubleJumpSFX = this.props.doubleJumpSFX?.as(hz.AudioGizmo)!;
    this.boostUsedSFX = this.props.boostUsedSFX?.as(hz.AudioGizmo)!;
    this.boostReceivedSFX = this.props.boostReceivedSFX?.as(hz.AudioGizmo)!;
    this.respawnSFX = this.props.respawnSFX?.as(hz.AudioGizmo)!;
    this.localSFXSettings = { fade: 0, players: [this.owner] }  //optimization to create the a local only sound setting

    this.boostUsedParticleVFX = this.props.boostUsedParticleVFX?.as(hz.ParticleGizmo)!;

    this.onUpdateSub = this.connectLocalBroadcastEvent(
      hz.World.onUpdate,
      () => {
        //reset ability to double jump or boost when player is grounded
        if (this.hasJumped && this.owner.isGrounded.get()) {
          this.hasJumped = false;
          this.jump1 = false;
          this.jump2 = false;
          this.isBoosted = false;
        }
      }
    );

    this.playerGotBoostSub = this.connectNetworkEvent(
      this.owner,
      Events.onPlayerGotBoost,
      () => {
        this.canBoost = true;
        this.boostReceivedSFX?.play(this.localSFXSettings!);
      }
    );

    this.setJumpCtrlDataSub = this.connectNetworkEvent(
      this.owner,
      Events.onSetPlyrCtrlData,
      (data) => {
        this.boostJumpAmount = data.boostJumpAmount;
        this.boostJumpRadians = data.boostJumpAngle * MathUtils.Deg2Rad;
        this.doubleJumpAmount = data.doubleJumpAmount;
      }
    );

    this.onPlayerOOBSub = this.connectNetworkEvent(
      this.owner,
      Events.onPlayerOutOfBounds,
      () => {
        this.respawnSFX?.play(this.localSFXSettings!);
      }
    );

    this.connectLocalEvent(
      this.owner,
      Events.onResetLocalObjects,
      () => {
        this.reset();
      }
    );
  }

  private localStart() {
    this.sendNetworkBroadcastEvent(Events.onGetPlyrCtrlData, {
      caller: this.owner,
    });
  }

  private connectDoubleJumpInputs() {
    this.connectedJumpInput = hz.PlayerControls.connectLocalInput(
      hz.PlayerInputAction.Jump,
      hz.ButtonIcon.Jump,
      this
    );
    this.connectedJumpInput.registerCallback((input, pressed) => {
      if (!pressed) {
        return;
      }
      this.hasJumped = true;

      if (!this.jump1 && !this.jump2) {
        this.jump1 = true;
      } else if (this.jump1 && !this.jump2) {
        this.jump2 = true;
        let ownerVel = this.owner.velocity.get();
        this.owner.velocity.set(
          new hz.Vec3(ownerVel.x, this.doubleJumpAmount, ownerVel.z)
        );

        this.doubleJumpSFX?.play(this.localSFXSettings!);
        this.sendNetworkEvent(this.owner, Events.onPlayerUsedDoubleJump, {});
      }
    });
  }

  private connectBoostJumpInputs() {
    this.connectedBoostInput = hz.PlayerControls.connectLocalInput(
      hz.PlayerInputAction.RightSecondary,
      hz.ButtonIcon.RocketJump,
      this,
      { preferredButtonPlacement: hz.ButtonPlacement.Default }
    );
    this.connectLocalControlX = hz.PlayerControls.connectLocalInput(
      hz.PlayerInputAction.LeftXAxis,
      hz.ButtonIcon.RocketJump,
      this,
    );
    this.connectLocalControlY = hz.PlayerControls.connectLocalInput(
      hz.PlayerInputAction.LeftYAxis,
      hz.ButtonIcon.RocketJump,
      this,
    );

    this.connectedBoostInput.registerCallback((input, pressed) => {
      if (!pressed) {
        return;
      }
      this.hasJumped = true;

      if (!this.isBoosted && this.canBoost) {
        this.canBoost = false;
        let XAxis = this.connectLocalControlX?.axisValue.get();
        let YAxis = this.connectLocalControlY?.axisValue.get();

        //If there is no player movement, default to boosting forward by taking the Y axis
        if (
          XAxis === undefined ||
          YAxis === undefined ||
          (XAxis === 0 && YAxis === 0)
        ) {
          XAxis = 0;
          YAxis = 1;
        }

        //Get the boost XZ vector, then rotate it by the provided angle
        const boostJump = this.getBoostVectorBasedOnInput(
          XAxis,
          YAxis,
          this.owner.forward.get(),
          this.boostJumpRadians,
          this.boostJumpAmount
        );

        //instead of adding, we just set the velocity to the boost jump vector so as to be more responsive
        this.owner.velocity.set(boostJump);
        this.isBoosted = true;

        this.boostUsedSFX?.play(this.localSFXSettings!);
        this.entity.position.set(this.owner.position.get());
        this.boostUsedParticleVFX?.play();
        this.sendLocalEvent(this.owner, Events.onPlayerUsedBoost, {});
      }
    });
  }

  private getBoostVectorBasedOnInput(
    XaxisInput: number,
    YaxisInput: number,
    ownerfacing: hz.Vec3,
    boostAngle: number,
    boostForce: number
  ) {
    const facingXZ = new hz.Vec3(ownerfacing.x, 0, ownerfacing.z).normalizeInPlace();

    //based on the player's XZ facing, rotate the input to their facing, Yaxis being equal to their forward
    const angleRads = MathUtils.getClockwiseAngle(hz.Vec3.forward, facingXZ);
    const quartForControl = hz.Quaternion.fromAxisAngle(hz.Vec3.up, angleRads);

    const movementDir = new hz.Vec3(
      XaxisInput,
      0,
      YaxisInput
    ).normalizeInPlace();
    //Get the final XZ direction for the boost vector
    const boostFlatDir = hz.Quaternion.mulVec3(quartForControl, movementDir);

    //Rotate the boost direction by the angle in the direction of facing
    const rotation = hz.Quaternion.fromAxisAngle(
      boostFlatDir.cross(hz.Vec3.up),
      boostAngle
    );
    const boostJump = hz.Quaternion.mulVec3(rotation, boostFlatDir).mulInPlace(boostForce);
    return boostJump;
  }

  private reset() {
    this.hasJumped = false;
    this.jump1 = false;
    this.jump2 = false;
    this.isBoosted = false;
    this.canBoost = false;
  }

  private cleanup() {
    this.connectedJumpInput?.unregisterCallback();
    this.connectedJumpInput?.disconnect();
    this.connectedJumpInput = null;

    this.connectedBoostInput?.unregisterCallback();
    this.connectedBoostInput?.disconnect();
    this.connectedBoostInput = null;

    this.connectLocalControlX?.unregisterCallback();
    this.connectLocalControlX?.disconnect();
    this.connectLocalControlX = null;

    this.connectLocalControlY?.unregisterCallback();
    this.connectLocalControlY?.disconnect();
    this.connectLocalControlY = null;

    this.onUpdateSub?.disconnect();
    this.onUpdateSub = null;

    this.playerGotBoostSub?.disconnect();
    this.playerGotBoostSub = null;

    this.setJumpCtrlDataSub?.disconnect();
    this.setJumpCtrlDataSub = null;

    this.onPlayerOOBSub?.disconnect();
    this.onPlayerOOBSub = null;

    this.stopRacePosUpdatesSub?.disconnect();
    this.stopRacePosUpdatesSub = null;
  }
}
hz.Component.register(PlayerControllerLocal);
