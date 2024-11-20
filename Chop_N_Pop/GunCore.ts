// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

// Original code by SketeDavidson: https://horizon.meta.com/profile/10158917081718438

import { AnimationParams, OverTimeLocal } from "AnimUtils";
import { Behaviour } from "Behaviour";
import { Events } from "Events";
import { HapticFeedback, HapticHand, HapticType } from "HapticFeedback";
import { AudioGizmo, AvatarGripPoseAnimationNames, CodeBlockEvents, Color, Component, degreesToRadians, EventSubscription, LaunchProjectileOptions, Player, ProjectileLauncherGizmo, PropTypes, Quaternion, TextGizmo, Vec3 } from "horizon/core";
import { StageHand } from "StageHand";


enum AnimationState {
  open = "open",
  closed = "closed",
}

type GunConfig = {
  fireRate: number,
  fireSpeed: number,
  maxAmmo: number,
  burstCount: number,
  reloadTime: number,
  upwardsRecoilVel: number,
  upwardsRecoilAcc: number,
  backwardsRecoilVel: number,
  backwardsRecoilAcc: number,
}

const pistolConfig = {
  fireRate: 100,
  fireSpeed: 500,
  maxAmmo: 10,
  burstCount: 1,
  reloadTime: 200,
  upwardsRecoilVel: 30,
  upwardsRecoilAcc: 350,
  backwardsRecoilVel: 0.5,
  backwardsRecoilAcc: 7,
};

const burstPistolConfig = {
  fireRate: 100,
  fireSpeed: 500,
  maxAmmo: 15,
  burstCount: 3,
  reloadTime: 200,
  upwardsRecoilVel: 30,
  upwardsRecoilAcc: 350,
  backwardsRecoilVel: 0.5,
  backwardsRecoilAcc: 7,
};

const machineGunConfig = {
  fireRate: 100,
  fireSpeed: 500,
  maxAmmo: 30,
  burstCount: 0,
  reloadTime: 200,
  upwardsRecoilVel: 30,
  upwardsRecoilAcc: 350,
  backwardsRecoilVel: 0.5,
  backwardsRecoilAcc: 7,
};

const gunMode = {
  semiAuto: 0,
  burst: 1,
  fullAuto: 2,
};

export class GunCore extends Behaviour<typeof GunCore> {
  static propsDefinition = {
    projectileLauncher: { type: PropTypes.Entity },
    mode : { type: PropTypes.Number, default: 0 },
    slide: { type: PropTypes.Entity },
    slidePosition: { type: PropTypes.Vec3 },
    slideRotation: { type: PropTypes.Quaternion },
    ammoDisplay: { type: PropTypes.Entity },
    fireSFX: { type: PropTypes.Entity },
    reloadSFX: { type: PropTypes.Entity },
    grabSFX: { type: PropTypes.Entity },
    dryFireSFX: { type: PropTypes.Entity },
    dropShellSFX: { type: PropTypes.Entity },
    dropShellMinDelay: {type: PropTypes.Number, default: 200},
    dropShellRandomDelay: {type: PropTypes.Number, default: 200},
    clip: { type: PropTypes.Entity },
    muzzleFlash: { type: PropTypes.Entity },
    playerManager : {type: PropTypes.Entity},
  };

  gunConfig!: GunConfig;

  AnimateTo = new OverTimeLocal(this);

  currentAmmo = 0;
  currentOwner?: Player;
  slideOriginalPosition = Vec3.zero;
  clipOriginalPosition = Vec3.zero;
  triggerHeld = false;
  fireWait = false;
  fireQueue = false;
  isHeld = false;
  isReloading = false;
  inCooldown = false;
  reloadAvailable = true;
  isOnVr = false;
  state = { isAmmoOpen: false };

  upwardsRecoilDis = 0;
  backwardsRecoilDis = 0;
  upwardsRecoilVel = 0;
  backwardsRecoilVel = 0;
  upwardsRecoilAcc = 0;
  backwardsRecoilAcc = 0;

  slidePosition = AnimationState.closed;
  clipPositionState = AnimationState.closed;
  playerHand?: HapticHand;

  triggerDownSubscription?: EventSubscription;
  triggerReleasedSubscription?: EventSubscription;
  reloadSubscription?: EventSubscription;

  private currentBurstCount = 0;

  Awake(): void {
    super.Awake();
    this.initializeGunConfig();
    this.connectNetworkEvent(this.entity, Events.gunRequestAmmoResponse, (data) => {
      this.refillAmmo(data.ammoCount);
    });
  }

  Start() {
    super.Start();
    if (this.entity.owner.get() === this.world.getServerPlayer()) {
      StageHand.instance.addCuePosition(this.entity, this.entity.position.get(), this.entity.rotation.get());
    }
    this.slideOriginalPosition = this.props.slide?.transform.localPosition.get()!;
    this.clipOriginalPosition = this.props.clip?.transform.localPosition.get()!;
  }

  OnGrabStart(isRight: boolean, player: Player) {
    this.reload();

    this.isHeld = true;
    this.entity.owner.set(player);
    this.props.projectileLauncher?.owner.set(player);

    this.triggerDownSubscription = this.connectCodeBlockEvent(
      this.entity,
      CodeBlockEvents.OnIndexTriggerDown,
      this.triggerDown.bind(this)
    );

    this.triggerReleasedSubscription = this.connectCodeBlockEvent(
      this.entity,
      CodeBlockEvents.OnIndexTriggerUp,
      this.triggerReleased.bind(this)
    );

    this.reloadSubscription = this.connectCodeBlockEvent(
      this.entity,
      CodeBlockEvents.OnButton1Down,
      this.reload.bind(this)
    );

    if (player.deviceType.get() === 'VR') {
      this.reloadSubscription = this.connectCodeBlockEvent(
        this.entity,
        CodeBlockEvents.OnButton2Down,
        this.reload.bind(this)
      );
    }

    this.playerHand = isRight ? HapticHand.Right : HapticHand.Left;

    HapticFeedback.playPattern(player, HapticType.pickup, this.playerHand, this);

    this.props.grabSFX?.as(AudioGizmo)?.play();


    this.updateAmmoDisplay();
  }

  OnGrabEnd(player: Player) {
    this.entity.owner.set(this.world.getServerPlayer());
    this.props.projectileLauncher?.owner.set(this.world.getServerPlayer());

    this.isHeld = false;
    this.triggerDownSubscription?.disconnect();
    this.triggerReleasedSubscription?.disconnect();
    this.reloadSubscription?.disconnect();
    this.triggerHeld = false;
    this.fireQueue = false;
    this.isReloading = false;
    this.inCooldown = false;
    this.reloadAvailable = true;

    this.updateSlidePosition(AnimationState.closed);
    this.updateclipPosition(AnimationState.closed);
  }

  private initializeGunConfig(): void {
    switch (this.props.mode) {
      case gunMode.semiAuto:
        this.gunConfig = pistolConfig;
        break;
      case gunMode.burst:
        this.gunConfig = burstPistolConfig;
        break;
      case gunMode.fullAuto:
        this.gunConfig = machineGunConfig;
        break;
    }
  }

  private fireWeapon() {
    if (this.currentAmmo <= 0 || this.isReloading || this.inCooldown) {
        HapticFeedback.playPattern(this.entity.owner.get()!, HapticType.empty, this.playerHand!, this);
        this.props.dryFireSFX?.as(AudioGizmo)?.play();
      return;
    }

    const options: LaunchProjectileOptions = {speed: pistolConfig.fireSpeed || 200};

    if (this.isOnVr) {
      this.async.setTimeout(() => {
        this.kickbackEffect();
      }, 50);
    } else {
      this.entity.owner.get().playAvatarGripPoseAnimationByName(AvatarGripPoseAnimationNames.Fire);
    }

    this.props.projectileLauncher!.as(ProjectileLauncherGizmo)?.launch(options);

    this.inCooldown = true;
    this.triggerHeld = true;
    this.props.muzzleFlash?.visible.set(true);

    this.async.setTimeout(() => {
      this.props.muzzleFlash?.visible.set(false);
    }, 60);

    this.updateSlidePosition(AnimationState.open);
    this.props.fireSFX?.as(AudioGizmo)?.play();
    this.async.setTimeout(() => {
      this.props.dropShellSFX?.as(AudioGizmo)?.play();
    }, this.props.dropShellMinDelay + (Math.random() * this.props.dropShellRandomDelay));
    this.currentAmmo--;
    this.updateAmmoDisplay();

    HapticFeedback.playPattern(this.entity.owner.get()!, HapticType.gunShot, this.playerHand!, this);

    this.fireQueue = (this.shouldFireMore() && this.triggerHeld);

    this.async.setTimeout(() => this.endFireWait(), this.gunConfig.fireRate);
  }

  private shouldFireMore(){
   if (this.gunConfig.burstCount > 0 && this.currentBurstCount >= this.gunConfig.burstCount) {
      return false;
    }
    return true;
  }

  Update(deltaTime: number) {
    if (!this.isHeld || !this.isOnVr)
      return;

    this.upwardsRecoilDis += this.upwardsRecoilVel * deltaTime;
    this.upwardsRecoilVel -= this.upwardsRecoilAcc * deltaTime;
    this.backwardsRecoilDis += this.backwardsRecoilVel * deltaTime;
    this.backwardsRecoilVel -= this.backwardsRecoilAcc * deltaTime;

    this.upwardsRecoilDis = Math.max(this.upwardsRecoilDis, 0);
    this.upwardsRecoilVel = this.upwardsRecoilDis > 0 ? this.upwardsRecoilVel : 0;
    this.backwardsRecoilDis = Math.max(this.backwardsRecoilDis, 0);
    this.backwardsRecoilVel = this.backwardsRecoilDis > 0 ? this.backwardsRecoilVel : 0;

    const forward = this.entity.forward.get();
    const up = this.entity.up.get();
    const upwardsRecoil = Quaternion.fromAxisAngle(Vec3.cross(forward, up), degreesToRadians(this.upwardsRecoilDis));
    const backwardsRecoil = Vec3.mul(forward, this.backwardsRecoilDis * -1);

    let pos = Vec3.zero;
    let rot = Quaternion.zero;

    if (this.isHeld && this.entity.owner.get()) {
      const hand = this.playerHand == HapticHand.Right ? this.entity.owner.get().rightHand : this.entity.owner.get().leftHand;

      pos = Vec3.add(hand.position.get(), backwardsRecoil);
      rot = hand.rotation.get();
      const rotationAxis = Vec3.cross(Quaternion.mulVec3(rot, Vec3.forward), Quaternion.mulVec3(rot, Vec3.up));
      rot = Quaternion.mul(Quaternion.fromAxisAngle(rotationAxis, degreesToRadians(0)), Quaternion.mul(upwardsRecoil, rot));
      this.entity.position.set(pos);
      this.entity.rotation.set(rot);
    }
  }

  private endFireWait() {
    this.inCooldown = false;
    this.props.muzzleFlash?.visible.set(false);
    this.updateclipPosition(this.currentAmmo > 0 ? AnimationState.closed : AnimationState.open);
    this.async.setTimeout(() => {
      this.updateSlidePosition(this.currentAmmo > 0 ? AnimationState.closed : AnimationState.open);
    }, 50);

    if (this.fireQueue && this.triggerHeld) {
      this.currentBurstCount++;
      this.fireWeapon();
    }
  }

  private reload() {
    if (this.isReloading || !this.reloadAvailable) {
      this.ammoOutFX();
      return;
    }

    if (this.clipPositionState === AnimationState.closed) {
      this.updateclipPosition(AnimationState.open);
    }

    this.isReloading = true;
    this.reloadAvailable = false;

    const reloadTime = this.gunConfig.reloadTime;
    const ammoNeeded = this.gunConfig.maxAmmo - this.currentAmmo;

    this.async.setTimeout(() => {
      this.sendNetworkEvent(this.props.playerManager!, Events.gunRequestAmmo,
        {player: this.entity.owner.get()!, weapon :this.entity, ammoCount: ammoNeeded});
    }, reloadTime);
  }

  private ammoOutFX() {
    this.props.dryFireSFX?.as(AudioGizmo)?.play();
  }

  private refillAmmo(ammoToFill: number) {
    const ammoNeeded = this.gunConfig.maxAmmo - this.currentAmmo;
    const ammoToRefill = Math.min(ammoNeeded, ammoToFill);
    this.currentAmmo += ammoToRefill;

    this.isReloading = false;
    this.reloadAvailable = true;

    if (this.currentAmmo > 0) {
      if (this.isHeld) {
        HapticFeedback.playPattern(this.entity.owner.get()!, HapticType.reload, this.playerHand!, this);
      }

      this.updateSlidePosition(AnimationState.closed);
      this.updateclipPosition(AnimationState.closed);
      this.props.reloadSFX?.as(AudioGizmo)?.play();
    } else {
      this.ammoOutFX();
    }
    this.updateAmmoDisplay();
  }

  private updateclipPosition(state: AnimationState): void {
    if (!this.props.clip || this.clipPositionState === state)
      return;

    switch (state) {
      case AnimationState.open:
        this.props.clip.visible.set(false);
        break;
      case AnimationState.closed:
        this.props.clip.visible.set(true);
        break;
    }
    this.clipPositionState = state;
  }

  private kickbackEffect() {
    this.upwardsRecoilVel = this.gunConfig.upwardsRecoilVel!;
    this.backwardsRecoilVel = this.gunConfig.backwardsRecoilVel!;

    this.upwardsRecoilAcc = this.gunConfig.upwardsRecoilAcc!;
    this.backwardsRecoilAcc = this.gunConfig.backwardsRecoilAcc!;
  }

  private updateSlidePosition(state: AnimationState): void {
    if (!this.props.slide) return;
    if (this.slidePosition === state) return;

    this.slidePosition = state;

    const animationParams: AnimationParams =
      state === AnimationState.open
        ? {
          entity: this.props.slide,
          targetLocalPosition: this.props.slidePosition!,
          targetLocalRotation: Quaternion.zero,
          durationMS: 40,
        }
        : {
          entity: this.props.slide,
          targetLocalPosition: this.slideOriginalPosition!,
          durationMS: 90,
        };

    if (!animationParams.targetLocalPosition) return;

    this.AnimateTo.startAnimation(animationParams);
  }

  private triggerDown(player: Player) {
    this.triggerHeld = true;
    this.currentBurstCount = 0;
    if (!this.fireWait) {
      this.currentBurstCount++;
      this.fireWeapon();
    }
  }

  private triggerReleased(player: Player) {
    this.triggerHeld = false;
  }

  private updateAmmoDisplay() {
    const ammoDisplay = this.props.ammoDisplay?.as(TextGizmo);

    if (ammoDisplay && ammoDisplay.text) {
      const color = this.currentAmmo > 0 ? Color.green : Color.red;
      ammoDisplay.color.set(color);
      ammoDisplay.text.set(this.currentAmmo.toString());
    }

    if (this.isHeld) {
      this.updateclipPosition(this.currentAmmo > 0 ? AnimationState.closed : AnimationState.open);
    }
  }
}
Component.register(GunCore);
