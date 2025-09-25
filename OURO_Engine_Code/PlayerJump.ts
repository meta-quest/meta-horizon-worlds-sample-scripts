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


import { AbilitySlot } from 'ConstsAbility';
import * as ConstsGame from 'ConstsGame';
import { onPlayerJumped, onPlayerLanded } from 'Events';
import * as EventsNetworked from 'EventsNetworked';
import * as EventsPlayerControls from 'EventsPlayerControls';
import { JumpEventPayload, useAbility } from 'EventsPlayerControls';
import * as libCam from 'horizon/camera';
import { AttachablePlayerAnchor, Component, Player, PropsFromDefinitions, PropTypes, Vec3 } from 'horizon/core';
import { LocalPlayerComponent } from 'LocalPlayerComponent';
import { PlayerLocomotion } from 'PlayerLocomotion';
import { GameFX, playGameFXAt, setOwnerGameFX } from 'UtilsFX';
import * as UtilsGameplay from 'UtilsGameplay';


const MIN_TIME_BETWEEN_JUMPS_MS: number = 500;

export const PlayerJumpProps = {
    PJ_jumpVFX: {type: PropTypes.Entity},
    PJ_jumpSFX_player: {type: PropTypes.Entity},
    PJ_jumpSFX_other: {type: PropTypes.Entity},
}
type Props = typeof PlayerJumpProps;

export class PlayerJump extends LocalPlayerComponent<Props> {
    camera!: libCam.Camera;
    lastJumpTime: number = 0;

    jumpCounter = 0;
    maxJumpCount = ConstsGame.PLAYER_JUMP_COUNT_DEFAULT;
    jumpForces = [new Vec3(0, ConstsGame.PLAYER_JUMP_VERTICAL_SPEED_DEFAULT, 0)];

    timer = 0;
    airTimer = 0;

    jumpFX!: GameFX;
    gameFXs: GameFX[] = [];

    abilityEventSent: boolean = false;

    constructor(hzObj: Component, owner: Player, props: PropsFromDefinitions<Props>, private locomotion: PlayerLocomotion) {
        super(hzObj, owner, props);
    }

    localPreStart() {
        this.camera = libCam.default;
        this.initializeFX();
        UtilsGameplay.attachToPlayer(this.hzObj.entity, this.owner, AttachablePlayerAnchor.Torso);
        this.connectEvents();
    }

    localStart() {
    }

    localUpdate(deltaTimeSeconds: number) {
        this.timer += deltaTimeSeconds;

        if (this.timer < ConstsGame.PLAYER_JUMP_UPDATE_RATE) {
            return;
        }

        this.timer -= ConstsGame.PLAYER_JUMP_UPDATE_RATE;
        const isOnGround = this.owner.isGrounded.get();

        if (isOnGround) {
            if (this.airTimer > 0) this.onLand();
            this.airTimer = 0;
            this.jumpCounter = 0;
        } else {
            if (this.airTimer <= 0) this.onAirborne();
            this.airTimer += deltaTimeSeconds;
        }
    }

    localDispose() {
    }

    private initializeFX() {
        this.jumpFX = {
            allVFX: this.props.PJ_jumpVFX,
            playerSFX: this.props.PJ_jumpSFX_player,
            otherSFX: this.props.PJ_jumpSFX_other,
        };
        this.gameFXs.push(this.jumpFX);

        this.gameFXs.forEach((value) => setOwnerGameFX(value, this.owner));
    }

    private connectEvents() {
        this.hzObj.connectNetworkBroadcastEvent(EventsNetworked.setJumpData, this.onSetJumpData.bind(this));
        this.hzObj.connectLocalBroadcastEvent(EventsPlayerControls.jump, this.onJumpEvent.bind(this));
    }

    private onAirborne(){
        if (this.jumpCounter == 0) {
            this.jumpCounter++;
            this.hzObj.sendLocalEvent(this.owner, onPlayerJumped, {jumpCount: this.jumpCounter});
        }
    }

    private onLand() {
        this.hzObj.sendLocalEvent(this.owner, onPlayerLanded, {});
    }

    private onSetJumpData(data: { player: Player, maxJumpCount: number, jumpForces: Vec3[] }) {
        this.doIfOwner(data.player, () => {
            this.maxJumpCount = data.maxJumpCount;
            this.jumpForces = data.jumpForces;
        });
    }

    private onJumpEvent(data: JumpEventPayload) {
        if (!data.pressed) {
            this.sendJumpAbilityEventsIfNeeded(data.pressed);
            return;
        }

        if (this.jumpCounter > 0) {
            this.sendJumpAbilityEventsIfNeeded(data.pressed);
        }

        if (this.jumpCounter >= this.maxJumpCount) {
            return;
        }
        if (this.jumpCounter == 0 && Date.now() - this.lastJumpTime < MIN_TIME_BETWEEN_JUMPS_MS) {
            return;
        }
        if (!ConstsGame.PLAYER_USE_HORIZON_JUMP || this.isJumping()) {
            this.jump();
        }
    }

    jump() {
        this.playJumpFX();
        this.jumpCounter++;
        this.lastJumpTime = Date.now();
        this.applyJumpForce();
        this.hzObj.sendLocalEvent(this.owner, onPlayerJumped, {jumpCount: this.jumpCounter});
    }

    private applyJumpForce() {
        if (this.jumpCounter == 0) {
            this.owner.applyForce(this.calculateJumpForce());
        } else {
            this.locomotion.setVelocity(this.calculateMidairJumpVelocity());
        }
    }

    private calculateMidairJumpVelocity() {
        const horizontalInput = this.locomotion.getScaledInputOnXZPlane();
        const horizontalVelocity = horizontalInput.mulInPlace(this.locomotion.getMaximumAirVelocityXZForHorizonLocomotion());
        return horizontalVelocity.addInPlace(this.calculateJumpForce());
    }

    private calculateJumpForce() {
        return this.getFixedJumpForce(this.jumpCounter);
    }

    // Applies a fixed jump force (vertical-only).
    getFixedJumpForce(jumpIndex: number) {
        if (this.jumpForces.length == 0) {
            return Vec3.zero;
        }

        const jumpForceIndex = Math.min(jumpIndex, this.jumpForces.length - 1);
        const jumpForce = this.jumpForces[jumpForceIndex];
        return Vec3.mul(jumpForce, ConstsGame.PLAYER_MANUAL_JUMP_FORCE_MULTIPLIER);
    }

    private playJumpFX() {
        if (!this.isJumping()) {
            playGameFXAt(this.jumpFX, this.owner.foot.position.get(), {player: this.owner});
        }
    }

    private isJumping() {
        return this.jumpCounter > 0;
    }

    private sendJumpAbilityEventsIfNeeded(pressed: boolean) {
        if (!pressed) {
            // We don't want to send a depressed event until we've sent the corresponding pressed event
            if (this.abilityEventSent) {
                this.hzObj.sendLocalBroadcastEvent(useAbility, {slot: AbilitySlot.UTILITY, pressed: false});
                this.abilityEventSent = false;
            }
            return;
        }
        this.abilityEventSent = true;
        this.hzObj.sendLocalBroadcastEvent(useAbility, {slot: AbilitySlot.UTILITY, pressed: true});
    }
}
