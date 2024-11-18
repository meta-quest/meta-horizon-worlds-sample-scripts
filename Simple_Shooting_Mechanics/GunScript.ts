// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

// MAKE THIS SCRIPT RUN LOCAL

import {
  AudioGizmo,
  ButtonIcon,
  CodeBlockEvents,
  Color,
  Component,
  EventSubscription,
  LayerType,
  ParticleGizmo,
  Player,
  PlayerInput,
  PlayerInputAction,
  PlayerControls,
  PlayerDeviceType,
  PlayerVisibilityMode,
  ProjectileLauncherGizmo,
  PropTypes,
  RaycastGizmo,
  RaycastTargetType,
  TextGizmo,
  World,
} from 'horizon/core';

class FiringController extends Component<typeof FiringController> {
  static propsDefinition = {
    projectileLauncher: { type: PropTypes.Entity },
    ammoPerClip: { type: PropTypes.Number, default: 17 },
    clipAmmoDisplay: { type: PropTypes.Entity },
    totalAmmo: { type: PropTypes.Number, default: 300 },
    totalAmmoDisplay: { type: PropTypes.Entity },
    laserGizmo: { type: PropTypes.Entity },
    laserPointer: { type: PropTypes.Entity },
    smokeFX: { type: PropTypes.Entity },
    gunFireSFX: { type: PropTypes.Entity },
    gunReloadSFX: { type: PropTypes.Entity },
    projectileLauncherCooldownMs: { type: PropTypes.Number, default: 1000 },
    projectileSpeed: { type: PropTypes.Number, default: 10 },
    projectileGravity: { type: PropTypes.Number, default: 0 },
    useLaserTargeting: { type: PropTypes.Boolean, default: false },
  };

  private projLaunchGizmo!: ProjectileLauncherGizmo;
  private connectedAimInput!: PlayerInput;
  private connectedFireInput!: PlayerInput;
  private connectedReloadInput!: PlayerInput;
  private lastShottimestamp!: number;
  private aimingEventSub!: EventSubscription;
  private grabbingEventSub!: EventSubscription;
  private droppingEventSub!: EventSubscription;
  private ammoLeft!: number;
  private totalAmmo!: number;

  public start() {
    const owner = this.entity.owner.get();
    //When the server owns the weapon, ignore the script
    if (owner === this.world.getServerPlayer()) {
      console.log("Script owned by Server Player");
    }
    else {
      // Connect to the grab event to cleanup when the weapon is dropped
      this.grabbingEventSub = this.connectCodeBlockEvent(
        this.entity,
        CodeBlockEvents.OnGrabStart,
        this.onWeaponGrabbed.bind(this)
      );

      // Connect to the grab event to cleanup when the weapon is dropped
      this.droppingEventSub = this.connectCodeBlockEvent(
        this.entity,
        CodeBlockEvents.OnGrabEnd,
        this.onWeaponDropped.bind(this)
      );
    }

    // Hide the laser pointer ball from everyone
    this.props.laserPointer?.setVisibilityForPlayers([], PlayerVisibilityMode.HiddenFrom);
  }

  private onWeaponGrabbed(isRightHand: boolean, player: Player) {
    console.log(`${this.entity.name.get()}> was grabbed by <${player.name.get()}`);

    // Setup local variables
    this.projLaunchGizmo = this.props.projectileLauncher?.as(ProjectileLauncherGizmo)!;
    this.projLaunchGizmo.projectileGravity.set(this.props.projectileGravity);
    this.lastShottimestamp = 0;
    this.ammoLeft = this.props.ammoPerClip;
    this.totalAmmo = this.props.totalAmmo;
    this.updateAmmoDisplay();

    // Assign the projectile launcher to the player
    this.projLaunchGizmo.owner.set(this.entity.owner.get());

    //Connect to the player's input
    // Aim
    this.connectedAimInput = PlayerControls.connectLocalInput(
      PlayerInputAction.LeftTrigger,
      ButtonIcon.Aim,
      this,
    );
    this.connectedAimInput.registerCallback(this.onPlayerAiming.bind(this));

    // Shoot
    this.connectedFireInput = PlayerControls.connectLocalInput(
      PlayerInputAction.RightTrigger,
      ButtonIcon.Fire,
      this,
    );
    this.connectedFireInput.registerCallback(this.onPlayerFire.bind(this));

    // Reload
    this.connectedReloadInput = PlayerControls.connectLocalInput(
      PlayerInputAction.RightPrimary,
      ButtonIcon.Reload,
      this,
    );
    this.connectedReloadInput.registerCallback(this.onPlayerReload.bind(this));

  }

  private onWeaponDropped(player: Player) {
    // Disconnect event subscriptions so we don't get events
    // when the player is not holding this weapon
    console.log("Cleaning after dropping the pistol");

    this.projLaunchGizmo.owner.set(this.world.getServerPlayer());
    this.connectedAimInput?.disconnect();
    this.connectedFireInput?.disconnect();
    this.aimingEventSub.disconnect();
  }

  private onPlayerAiming(action: PlayerInputAction, pressed: boolean) {
    // Only support the "laser dot" with VR controllers
    if(this.entity.owner.get().deviceType.get() != PlayerDeviceType.VR)
      return;

    // There seems to be an issue where hiding things from players only work later after load.
    // Only setting this up here to avoid it.
    this.props.laserPointer?.visible.set(pressed);

    // Hide the laser pointer if we're not aiming
    if (!pressed)
      this.props.laserPointer?.setVisibilityForPlayers([], PlayerVisibilityMode.HiddenFrom);

    if (pressed && this.props.useLaserTargeting) {
      this.aimingEventSub = this.connectLocalBroadcastEvent(World.onUpdate, this.onUpdateAim.bind(this));
    }
    else {
      this.aimingEventSub?.disconnect();
    }
  }

  private onPlayerFire(action: PlayerInputAction, pressed: boolean) {
    // Fire on button down only
    if (!pressed)
      return;

    // Check if we have ammo and if the cooldown has passed
    if (this.ammoLeft > 0 && Date.now() > this.lastShottimestamp + this.props.projectileLauncherCooldownMs) {
      this.lastShottimestamp = Date.now();
      this.projLaunchGizmo.launchProjectile(this.props.projectileSpeed);
      this.props.gunFireSFX?.as(AudioGizmo)?.play();
      this.props.smokeFX?.as(ParticleGizmo)?.play();

      this.ammoLeft -= 1;
      this.updateAmmoDisplay();
    }
    else {
      console.log("Still cooling down");
    }
  }

  private onPlayerReload(action: PlayerInputAction, pressed: boolean) {
    // Reload on button up
    if (!pressed) {
      this.props.gunReloadSFX?.as(AudioGizmo)?.play();
      var ammoToReload = Math.min(this.props.totalAmmo - this.ammoLeft, this.props.ammoPerClip - this.ammoLeft);
      this.ammoLeft += ammoToReload;
      this.totalAmmo -= ammoToReload;
      this.updateAmmoDisplay();
    }
  }

  private onUpdateAim(data: { deltaTime: number }) {
    if (this.props.projectileLauncher && this.props.laserGizmo) {

      // Get position and orientation directly from the raycast gizmo and use the raycast to get a target
      const raycastPosition = this.props.laserGizmo.position.get();
      const raycastForward = this.props.laserGizmo.forward.get();
      const laserGizmo = this.props.laserGizmo.as(RaycastGizmo);
      var raycastHit = laserGizmo?.raycast(raycastPosition, raycastForward, { layerType: LayerType.Both, maxDistance: 100 });

      if (raycastHit) {
        this.props.laserPointer?.setVisibilityForPlayers([this.entity.owner.get()], PlayerVisibilityMode.VisibleTo);
        this.props.laserPointer?.position.set(raycastHit.hitPoint);
        if (raycastHit.targetType == RaycastTargetType.Player) {
          this.props.laserPointer?.color.set(Color.red);
        }
        if (raycastHit.targetType == RaycastTargetType.Entity) {
          this.props.laserPointer?.color.set(Color.green);
        }
      }
      else {
        this.props.laserPointer?.setVisibilityForPlayers([this.entity.owner.get()], PlayerVisibilityMode.HiddenFrom);
      }
    }
  }

  private updateAmmoDisplay() {
    this.props.clipAmmoDisplay?.as(TextGizmo)?.text.set(this.ammoLeft.toString());
    this.props.totalAmmoDisplay?.as(TextGizmo)?.text.set(this.totalAmmo.toString());
  }
}
Component.register(FiringController);
