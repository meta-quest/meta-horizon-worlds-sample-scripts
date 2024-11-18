// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

/**
 *  Local Player UI script that tells the player which race position they are and the race timings
 */
import * as hz from "horizon/core";
import { Events } from "Events";
import { msToMinutesAndSeconds } from "GameUtils";

class HUDLocal extends hz.Component<typeof HUDLocal> {
  static propsDefinition = {
    superIcon: { type: hz.PropTypes.Entity },
    timerText: { type: hz.PropTypes.Entity },
    positionText: { type: hz.PropTypes.Entity },
    iconColorEntity: { type: hz.PropTypes.Entity },
    vfx: { type: hz.PropTypes.Entity },
    // UIHolder: { type: hz.PropTypes.Entity },
  };

  private owner!: hz.Player;
  private localMatchTime = 0;
  private updateUI = false;

  private playerBoostSub: hz.EventSubscription | null = null;
  private stopRacePosUpdatesSub: hz.EventSubscription | null = null;
  private racePosUpdateSub: hz.EventSubscription | null = null;
  private playerUsedBoostSub: hz.EventSubscription | null = null;
  private worldUpdateSub: hz.EventSubscription | null = null;
  private racePosition: string = "";
  private matchTime: string = "";

  private boostInactiveColor = new hz.Color(1, 0, 0);
  private boostActiveColor = new hz.Color(0, 1, 0);
  private iconGroup: hz.Entity | null = null;
  private innerIcon: hz.Entity | null = null;
  private timerTextGizmo: hz.TextGizmo | null = null;
  private positionTextGizmo: hz.TextGizmo | null = null;
  private shouldSpinStar: boolean = false;
  private spinCounter: number = 0;
  private spinDuration: number = 2;
  private spinSpeed: number = 5;
  private fromRotation: hz.Quaternion = hz.Quaternion.fromEuler(new hz.Vec3(180, 0, 90), hz.EulerOrder.XYZ)
  private toRotation: hz.Quaternion = hz.Quaternion.fromEuler(new hz.Vec3(0, 0, 90), hz.EulerOrder.XYZ);

  preStart() {
    if (!this.innerIcon) {
      this.innerIcon = this.props.iconColorEntity!;
    }
    if (!this.iconGroup) {
      this.iconGroup = this.props.superIcon!;
      this.iconGroup?.transform.localRotation.set(this.fromRotation);
    }
    if (!this.timerTextGizmo) {
      this.timerTextGizmo = this.props.timerText!.as(hz.TextGizmo);
    }
    if (!this.positionTextGizmo) {
      this.positionTextGizmo = this.props.positionText!.as(hz.TextGizmo);
    }

    this.owner = this.entity.owner.get(); //get owner, init fires when ownership changes
    if (this.owner === this.world.getServerPlayer()) {
      this.cleanup();
      this.entity.as(hz.AttachableEntity)?.detach();
      this.entity.visible.set(false);
    }
    else {
      this.setInactiveBoostColor();
      this.playerBoostSub = this.connectNetworkEvent(
        this.owner,
        Events.onPlayerGotBoost,
        () => {
          this.activateBoostAbility();
        }
      );
      this.stopRacePosUpdatesSub = this.connectNetworkEvent(
        this.owner,
        Events.onStopRacePosUpdates,
        () => {
          this.updateUI = false;
        }
      );
      this.racePosUpdateSub = this.connectNetworkEvent(
        this.owner,
        Events.onRacePosUpdate,
        (data) => {
          this.updateUI = true;
          this.racePosition = `${data.playerPos} of ${data.totalRacers}`;
          this.localMatchTime = data.matchTime; //We update the local match time to follow the server's
        }
      );
      this.playerUsedBoostSub = this.connectLocalEvent(
        this.owner,
        Events.onPlayerUsedBoost,
        () => {
          this.props.vfx?.as(hz.ParticleGizmo)?.play();
          this.setInactiveBoostColor();
        }
      );
      this.worldUpdateSub = this.connectLocalBroadcastEvent(
        hz.World.onUpdate,
        (data) => {
          if (!this.updateUI) {
            return;
          }

          this.localMatchTime += data.deltaTime;
          this.timerTextGizmo?.text.set(`<line-height=75%>${msToMinutesAndSeconds(this.localMatchTime)}`);
          this.positionTextGizmo?.text.set(`<line-height=75%>${this.racePosition}`);

          /** Star spin effect in HUD */
          if (this.shouldSpinStar === true) {
            const current = this.iconGroup?.transform.localRotation.get();
            if (current != undefined) {
              if (this.spinCounter < this.spinDuration) {
                this.iconGroup?.transform.localRotation.set(hz.Quaternion.slerp(current, this.toRotation, this.spinCounter));
                this.spinCounter += data.deltaTime * this.spinSpeed;
              }
            }
            if (this.spinCounter >= this.spinDuration) {
              this.shouldSpinStar = false;
              this.iconGroup?.transform.localRotation.set(this.fromRotation);
            }
          }
        }
      );

      this.connectLocalEvent(
        this.owner,
        Events.onResetLocalObjects,
        (data) => {
          this.reset();
        }
      );

      let attachableEnt = this.entity.as(hz.AttachableEntity);

      attachableEnt?.detach();
      attachableEnt?.visible.set(true);
      attachableEnt?.setVisibilityForPlayers([this.owner], hz.PlayerVisibilityMode.VisibleTo);
      attachableEnt?.attachToPlayer(this.owner, hz.AttachablePlayerAnchor.Head);
    }
  }

  start() {
    if (this.owner === this.world.getServerPlayer()) {
      this.sendLocalBroadcastEvent(Events.onRegisterRaceHUD, {
        caller: this.entity,
      });
    }
  }

  private setActiveBoostColor(): void {
    const star = this.innerIcon?.as(hz.MeshEntity)!;
    star.style.tintColor.set(this.boostActiveColor);
    star.style.tintStrength.set(1);
    star.style.brightness.set(5);
  }

  private setInactiveBoostColor(): void {
    const star = this.innerIcon?.as(hz.MeshEntity)!;
    star.style.tintColor.set(this.boostInactiveColor);
    star.style.tintStrength.set(1);
    star.style.brightness.set(5);
  }

  private activateBoostAbility(): void {
    this.setActiveBoostColor();
    this.spinCounter = 0;
    this.iconGroup?.transform.localRotation.set(this.fromRotation);
    this.shouldSpinStar = true;
  }

  private cleanup(): void {
    this.playerBoostSub?.disconnect();
    this.stopRacePosUpdatesSub?.disconnect();
    this.racePosUpdateSub?.disconnect();
    this.playerUsedBoostSub?.disconnect();
    this.worldUpdateSub?.disconnect();

    this.playerBoostSub = null;
    this.stopRacePosUpdatesSub = null;
    this.racePosUpdateSub = null;
    this.playerUsedBoostSub = null;
    this.worldUpdateSub = null;
    this.reset();
  }

  private reset(): void {
    this.setInactiveBoostColor();
    this.racePosition = "";
    this.matchTime = "";
    this.timerTextGizmo?.text.set(`<line-height=75%>${this.matchTime}`);
    this.positionTextGizmo?.text.set(`<line-height=75%>${this.racePosition}`);
    this.entity.position.set(hz.Vec3.zero);
  }
}

hz.Component.register(HUDLocal);
