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

import * as ConstsGame from 'ConstsGame';
import * as EventsCore from 'EventsCore';
import { AttachablePlayerAnchor, CodeBlockEvents, Component, Player, PropsFromDefinitions, PropTypes } from 'horizon/core';
import { LocalPlayerComponent } from 'LocalPlayerComponent';
import { PlayerLocomotion } from 'PlayerLocomotion';
import { GameFX, playGameFX, setOwnerGameFX, stopGameFX } from 'UtilsFX';
import { attachToPlayer, clearAsyncTimeOut, connectLocalEvent } from 'UtilsGameplay';

enum PlayerFootStepState {
    STILL,
    SNEAKING,
    RUNNING,
    IN_AIR,
}

const FOOT_STEP_TRANSITION_FADE_TIME = 0.05;

const SNEAK_THRESHOLD = 0.05;
const SNEAK_THRESHOLD_SQR = SNEAK_THRESHOLD * SNEAK_THRESHOLD;
const RUN_THRESHOLD = ConstsGame.PLAYER_SPEED_DEFAULT * 0.7;
const RUN_THRESHOLD_SQR = RUN_THRESHOLD * RUN_THRESHOLD;

export const PlayerFootstepsProps = {
    PF_sneakSFX_player: {type: PropTypes.Entity},
    PF_sneakSFX_other: {type: PropTypes.Entity},
    PF_runSFX_player: {type: PropTypes.Entity},
    PF_runSFX_other: {type: PropTypes.Entity},
};
type Props = typeof PlayerFootstepsProps;

export class PlayerFootSteps extends LocalPlayerComponent<Props> {
    movementState!: PlayerFootStepState; // undefined forces initial write

    sneakFX!: GameFX;
    runFX!: GameFX;
    gameFXs: GameFX[] = [];

    private lastFXStateChangeTime: number = 0;
    private setFootStepStateTimeoutId: number | undefined;

    constructor(hzObj: Component, owner: Player, props: PropsFromDefinitions<Props>, private locomotion: PlayerLocomotion) {
        super(hzObj, owner, props);
    }

    localPreStart() {
        this.connectEvents();
        this.initializeFX();
        this.gameFXs.forEach((value) => setOwnerGameFX(value, this.owner));

        attachToPlayer(this.hzObj.entity, this.owner, AttachablePlayerAnchor.Torso);

        this.setFootStepState(PlayerFootStepState.STILL);
        this.stopFX();
    }

    localStart() {
    }

    localUpdate(deltaTime: number) {
        if (!this.owner.isGrounded.get()) {
            this.setFootStepState(PlayerFootStepState.IN_AIR);
            return;
        }
        this.updateFootstepStateByGroundVelocity();
    }

    localDispose() {
        // this.stopFX(); Jordan: I don't think we need this, since it should despawn properly now that it's part of the spawned objects for the player? Uncomment if we need to
    }

    private initializeFX() {
        this.sneakFX = {
            playerSFX: this.props.PF_sneakSFX_player,
            playerSFXFade: FOOT_STEP_TRANSITION_FADE_TIME,
            otherSFX: this.props.PF_sneakSFX_other,
            otherSFXFade: FOOT_STEP_TRANSITION_FADE_TIME,
        };
        this.gameFXs.push(this.sneakFX);

        this.runFX = {
            playerSFX: this.props.PF_runSFX_player,
            playerSFXFade: FOOT_STEP_TRANSITION_FADE_TIME,
            otherSFX: this.props.PF_runSFX_other,
            otherSFXFade: FOOT_STEP_TRANSITION_FADE_TIME,
        };
        this.gameFXs.push(this.runFX);
    }

    private stopFX() {
        stopGameFX(this.sneakFX, this.owner, this.hzObj);
        stopGameFX(this.runFX, this.owner, this.hzObj);
    }

    private connectEvents() {
        connectLocalEvent(this.hzObj, this.hzObj.entity, EventsCore.onPlayerObjSpawned, _ => this.setFootStepState(PlayerFootStepState.STILL));
        this.hzObj.connectCodeBlockEvent(this.hzObj.entity, CodeBlockEvents.OnPlayerEnterWorld, player => this.resetForEnterExit(player));
        this.hzObj.connectCodeBlockEvent(this.hzObj.entity, CodeBlockEvents.OnPlayerExitWorld, player => this.resetForEnterExit(player));
        this.hzObj.connectCodeBlockEvent(this.hzObj.entity, CodeBlockEvents.OnPlayerEnterAFK, player => this.resetForEnterExit(player));
        this.hzObj.connectCodeBlockEvent(this.hzObj.entity, CodeBlockEvents.OnPlayerExitAFK, player => this.resetForEnterExit(player));
    }

    private resetForEnterExit(player: Player) {
        this.doIfOwner(player, () => {
            this.setFootStepState(PlayerFootStepState.STILL);
            this.stopFX();
        });
    }

    private updateFootstepStateByGroundVelocity() {
        const velocity = this.locomotion.getPointVelocity().clone();
        velocity.y = 0;
        const groundSpeedSqr = velocity.magnitudeSquared();

        if (groundSpeedSqr >= RUN_THRESHOLD_SQR) {
            this.setFootStepState(PlayerFootStepState.RUNNING);
        } else if (groundSpeedSqr >= SNEAK_THRESHOLD_SQR) {
            this.setFootStepState(PlayerFootStepState.SNEAKING);
        } else {
            this.setFootStepState(PlayerFootStepState.STILL);
        }
    }

    private setFootStepState(state: PlayerFootStepState) {
        if (state == this.movementState) {
            return;
        }

        this.movementState = state;

        const timeSinceLastStateChange = Date.now() - this.lastFXStateChangeTime;
        const lastTransitionWasTooSoon = timeSinceLastStateChange < FOOT_STEP_TRANSITION_FADE_TIME * 1000;
        if (lastTransitionWasTooSoon) {
            clearAsyncTimeOut(this.hzObj, this.setFootStepStateTimeoutId);
            this.setFootStepStateTimeoutId = this.hzObj.async.setTimeout(() => this.playOrStopFXBasedOnMovementState(),
                FOOT_STEP_TRANSITION_FADE_TIME * 1000 - timeSinceLastStateChange);
            return;
        }

        this.playOrStopFXBasedOnMovementState();
    }

    private playOrStopFXBasedOnMovementState() {
        this.lastFXStateChangeTime = Date.now();
        switch (this.movementState) {
            case PlayerFootStepState.SNEAKING:
                stopGameFX(this.runFX, this.owner, this.hzObj);
                playGameFX(this.sneakFX, {player: this.owner});
                break;
            case PlayerFootStepState.RUNNING:
                stopGameFX(this.sneakFX, this.owner, this.hzObj);
                playGameFX(this.runFX, {player: this.owner});
                break;
            default:
                this.stopFX();
                break;
        }
    }
}
