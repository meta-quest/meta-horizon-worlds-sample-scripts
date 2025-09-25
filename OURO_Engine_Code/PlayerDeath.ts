// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

// Original code by OURO Interactive
//------------------------------------
//
//                   @
//                   @@@@
//                    @@@@@
//             @@@      @@@@@
//           @@@@@@      @@@@@
//          @@@@@         @@@@@@
//        @@@@@              @@@@@
//         @@@@@@           @@@@@
//           @@@@@         @@@@@
//             @@@@@@   @@@@@
//               @@@@@ @@@@@
//                 @@OURO@@
//                   @@@
//
//------------------------------------

import * as Events from 'Events';

import { PrespawnedAssetId } from 'AssetPools';
import { AnimationId } from 'ConstsIdsAnimation';
import { EntityOrPlayer } from 'ConstsObj';
import { SourceData } from 'EventData';
import { DeathEventData, setPlayerInputIsBlocked } from 'Events';
import * as EventsNetworked from 'EventsNetworked';
import { playAnimationSequence, setReticleVisibility, stopAllAnimationSequences } from 'EventsNetworked';
import { Game } from 'Game';
import { CameraMode } from 'horizon/camera';
import { Component, Entity, Player, PropTypes, Quaternion, Vec3 } from 'horizon/core';
import { ServerPlayerAsset } from 'PlayerAsset';
import { GameFX, playGameFXAt, playVFXForPlayer, stopVFXForPlayer } from 'UtilsFX';
import { doOrDelayOneFrame } from 'UtilsGameplay';
import { angleBetweenVecsRadiansAroundAxis, normalizeAngleDeg, RADIANS_TO_DEGREES } from 'UtilsMath';

import { MOMENTUM_HEAL_ORB_TRAVEL_TIME_SECONDS } from 'ConstsGame';

export class PlayerDeath extends ServerPlayerAsset<typeof PlayerDeath> {
    static propsDefinition = {
        VFX: {type: PropTypes.Entity},
        killerVFX: {type: PropTypes.Entity},
        killerMomentumHealVFX: {type: PropTypes.Entity},
    };

    override readonly prespawnedAssetId: PrespawnedAssetId = 'PlayerDeath';

    private deathFX!: GameFX;
    private killerMomentumVfxIsPlayingFor?: Player;

    override onPreStart() {
        this.connectEvents();
        this.buildGameFXs();
    }

    private connectEvents() {
        this.connectLocalBroadcastEvent(Events.onDeath, (data) => {
            if (this.virtualOwner == data.targetData) {
                this.sendLocalBroadcastEvent(setPlayerInputIsBlocked, {isBlocked: true, player: this.virtualOwner});
                doOrDelayOneFrame(false, ()=> {
                    // delay death animation so input is blocked first to prevent player locomotion from causing movement animations to override
                    this.playDeathAnimBasedOnImpactSource(data.sourceData.pos, data.isHeadShot);
                });
                this.playKillerVfx(data.sourceData.obj)
                this.sendNetworkEvent(this.virtualOwner, setReticleVisibility, {visible: false});
                this.setDeathCameraMode(data.sourceData);
            }

            this.handleMomentumHealFeedback(data);
        });

        this.connectLocalBroadcastEvent(Events.onRevive, (data) => {
            if (this.virtualOwner == data.targetData) {
                this.sendLocalBroadcastEvent(setPlayerInputIsBlocked, {isBlocked: false, player: this.virtualOwner});
                this.sendNetworkEvent(this.virtualOwner, setReticleVisibility, {visible: true});
                this.removeDeathCameraMode();
                this.sendNetworkEvent(this.virtualOwner, stopAllAnimationSequences, {});
            }
        });
    }

    private buildGameFXs() {
        this.deathFX = {
            allVFX: this.props.VFX,
        };
    }

    override onStart() {
    }

    override onAssignVirtualOwner() {
    }

    override onUnassignVirtualOwner() {
    }

    private setDeathCameraMode(sourceData: SourceData) {
        this.sendNetworkEvent(this.virtualOwner, EventsNetworked.enableDeathCamera, this.getDeathCameraSettings());
    }

    private removeDeathCameraMode() {
        this.sendNetworkEvent(this.virtualOwner, EventsNetworked.disableDeathCamera, this.getDeathCameraSettings());
    }

    private getDeathCameraSettings() {
            const cameraSettings = Game.instance.gameMode!.state.config.deathData.cameraSettings;
            return {...cameraSettings, isFollowCam: cameraSettings.cameraMode == CameraMode.Attach};
        }

    private playDeathAnimBasedOnImpactSource(deathSource: Vec3, isHeadshot: boolean) {
        const deathDirection = deathSource.sub(this.virtualOwner.position.get());
        const angle = normalizeAngleDeg(angleBetweenVecsRadiansAroundAxis(this.virtualOwner.forward.get(), deathDirection, Vec3.up) * RADIANS_TO_DEGREES + 45);
        if (angle < 90) {
            this.playDeathSequence(isHeadshot ? 'death_front_headshot' : 'death_front', 0);
        } else if (angle < 180) {
            this.playDeathSequence(isHeadshot ? 'death_right_headshot' : 'death_right', 90);
        } else if (angle < 270) {
            this.playDeathSequence(isHeadshot ? 'death_back_headshot' : 'death_back', 180);
        } else {
            this.playDeathSequence(isHeadshot ? 'death_left_headshot' : 'death_left', 270);
        }
    }

    private playDeathSequence(animSequenceId: AnimationId, fxRotation: number) {
        this.sendNetworkEvent(this.virtualOwner, playAnimationSequence, {sequence: animSequenceId});
        const rot = Quaternion.fromEuler(new Vec3(0, fxRotation, 0)).mulInPlace(this.virtualOwner.rootRotation.get());
        playGameFXAt(this.deathFX, this.virtualOwner.position.get(), {player: this.virtualOwner, rot: rot});
    }

    private playKillerVfx(killer: EntityOrPlayer | undefined) {
        if (killer instanceof Player) {
            playVFXForPlayer(this.props.killerVFX, killer, {position: this.virtualOwner.position.get()});
        }
    }

    private handleMomentumHealFeedback(deathData: DeathEventData) {
        if (deathData.targetData instanceof Entity) return;

        if (this.virtualOwner == deathData.targetData) {
            const killer = deathData.sourceData.obj;
            if (killer instanceof Entity || !killer) return;

            playVFXForPlayer(this.props.killerMomentumHealVFX, killer, {position: this.virtualOwner.position.get()});
            this.killerMomentumVfxIsPlayingFor = killer;
            this.async.setTimeout(() => this.killerMomentumVfxIsPlayingFor = undefined, MOMENTUM_HEAL_ORB_TRAVEL_TIME_SECONDS * 1000);

        } else if (deathData.targetData == this.killerMomentumVfxIsPlayingFor) {
            stopVFXForPlayer(this.props.killerMomentumHealVFX, deathData.targetData);
            this.killerMomentumVfxIsPlayingFor = undefined;
        }
    }

}

Component.register(PlayerDeath);
