// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

// MAKE THIS SCRIPT RUN LOCAL

import {
  AudioGizmo,
  ButtonIcon,
  CodeBlockEvents,
  Component,
  EventSubscription,
  LayerType,
  ParticleGizmo,
  Player,
  PlayerInput,
  PlayerInputAction,
  PlayerControls,
  PropTypes,
  RaycastGizmo,
  RaycastTargetType,
  World,
  PhysicalEntity,
  PhysicsForceMode,
  Vec3,
} from 'horizon/core';

class LaserGun extends Component<typeof LaserGun> {
  static propsDefinition = {
    maxLaserLength: { type: PropTypes.Number, default: 10 },
    laserProjector: { type: PropTypes.Entity },
    laserBeam: { type: PropTypes.Entity },
    laserBeamWidth: { type: PropTypes.Number, default: 0.2 },
    laserBeamPushPower: { type: PropTypes.Number, default: 100 },
    laserBeamSFX: { type: PropTypes.Entity },
    laserBeamHitSFX: { type: PropTypes.Entity },
    laserBeamHitVFX: { type: PropTypes.Entity },
  };

  private connectedFireInput!: PlayerInput;
  private firingEventSub!: EventSubscription;
  private firingAudioEventSub!: EventSubscription;
  private hitAudioEventSub!: EventSubscription;
  private grabbingEventSub!: EventSubscription;
  private droppingEventSub!: EventSubscription;
  private isHitting: boolean = false;

  start() {
    const owner = this.entity.owner.get();
    //When the server owns the weapon, ignore the script
    if (owner === this.world.getServerPlayer()) {
      console.log("Script owned by Server Player");
    }
    else {

      // Initialize the weapon when grabbging it
      this.grabbingEventSub = this.connectCodeBlockEvent(
        this.entity,
        CodeBlockEvents.OnGrabStart,
        this.onWeaponGrabbed.bind(this)
      );

      // Connect to the grab event to cleanup when the weapon is dropped
      this.droppingEventSub = this.connectCodeBlockEvent(
        this.entity,
        CodeBlockEvents.OnGrabEnd,
        (player: Player) => {
          this.cleanupSubscriptions();
        }
      );
    }
  }

  private onWeaponGrabbed(isRightHand: boolean, player: Player) {
    console.log(`${this.entity.name.get()}> was grabbed by <${player.name.get()}`);

    //Connect to the player's shooting input
    this.connectedFireInput = PlayerControls.connectLocalInput(
      PlayerInputAction.RightTrigger,
      ButtonIcon.Fire,
      this,
    );
    this.connectedFireInput.registerCallback(this.onPlayerFire.bind(this));

    // Connect to audio end event to loop sounds
    // Shooting loop
    var laserSoundGizmo = this.props.laserBeamSFX?.as(AudioGizmo);
    if (laserSoundGizmo) {
      this.firingAudioEventSub = this.connectCodeBlockEvent(
        laserSoundGizmo, // Make sure this Entity is an AudioGizmo.
        CodeBlockEvents.OnAudioCompleted,
        this.playLaserSound.bind(this)
      );
    }

    // Hitting loop
    var laserHitSoundGizmo = this.props.laserBeamHitSFX?.as(AudioGizmo);
    if (laserHitSoundGizmo) {
      this.hitAudioEventSub = this.connectCodeBlockEvent(
        laserHitSoundGizmo, // Make sure this Entity is an AudioGizmo.
        CodeBlockEvents.OnAudioCompleted,
        this.playLaserHitSound.bind(this)
      );
    }
  }

  private cleanupSubscriptions() {
    // Disconnect event subscriptions so we don't get events
    // when the player is not holding this weapon
    console.log("Cleaning after dropping the laser weapon");
    this.connectedFireInput?.disconnect();
    this.firingEventSub?.disconnect();
    this.firingAudioEventSub?.disconnect();
    this.hitAudioEventSub?.disconnect();
  }

  private onPlayerFire(action: PlayerInputAction, pressed: boolean) {
    this.props.laserBeam?.visible.set(pressed);
    this.playLaserSound();
    if (pressed) {
      this.firingEventSub = this.connectLocalBroadcastEvent(World.onUpdate, this.onLaserUpdate.bind(this));
    }
    else {
      this.firingEventSub?.disconnect();
      this.props.laserBeamHitVFX?.as(ParticleGizmo)?.stop();
    }
  }

  private onLaserUpdate(data: { deltaTime: number }) {
    if (this.props.laserProjector) {
      // Get position and orientation directly from the raycast gizmo and use the raycast to get a target
      const raycastPosition = this.props.laserProjector.position.get();
      const raycastForward = this.props.laserProjector.forward.get();
      const laserGizmo = this.props.laserProjector.as(RaycastGizmo);
      var raycastHit = laserGizmo?.raycast(raycastPosition, raycastForward, {layerType: LayerType.Both});

      var laserLength = this.props.maxLaserLength;

      if (raycastHit && raycastHit.distance <= this.props.maxLaserLength) {
        laserLength = raycastHit.distance;

        if (!this.isHitting) {
          this.isHitting = true;
          this.props.laserBeamHitVFX?.as(ParticleGizmo)?.play();
          this.props.laserBeamHitSFX?.as(AudioGizmo)?.play();
        }

        if (raycastHit.targetType == RaycastTargetType.Entity) {
          this.props.laserBeamHitVFX?.position.set(raycastHit.hitPoint);
          this.props.laserBeamHitSFX?.position.set(raycastHit.hitPoint);

          var hitEntity = raycastHit.target.as(PhysicalEntity);
          if (hitEntity) {
            hitEntity.applyForce(raycastHit.normal.mulInPlace(-data.deltaTime * this.props.laserBeamPushPower), PhysicsForceMode.VelocityChange);
          }
        }

        if (raycastHit.targetType == RaycastTargetType.Player) {
          // Don't do anything for now
        }
      }
      else {
        this.isHitting = false;
        this.props.laserBeamHitVFX?.as(ParticleGizmo)?.stop();
      }

      if (this.props.laserBeam) {

        var thisEntityScaleZ = this.entity.scale.get().z
        var laserBeamScale = this.props.laserBeam.scale.get();
        laserBeamScale.x = this.props.laserBeamWidth;
        laserBeamScale.y = this.props.laserBeamWidth;
        laserBeamScale.z = laserLength / thisEntityScaleZ;
        this.props.laserBeam.scale.set(laserBeamScale);

        this.props.laserBeam.moveRelativeTo(this.entity, new Vec3(0, 0, laserLength / (2 * thisEntityScaleZ)));
      }
    }
  }

  private playLaserSound() {
    if (this.props.laserBeam?.visible.get()) {
      this.props.laserBeamSFX?.as(AudioGizmo)?.play();
    }
    else {
      this.props.laserBeamHitSFX?.as(AudioGizmo)?.stop();
    }
  }

  private playLaserHitSound() {
    if (this.isHitting) {
      this.props.laserBeamSFX?.as(AudioGizmo)?.play();
    }
    else {
      this.props.laserBeamSFX?.as(AudioGizmo)?.stop();
    }
  }
}
Component.register(LaserGun);
