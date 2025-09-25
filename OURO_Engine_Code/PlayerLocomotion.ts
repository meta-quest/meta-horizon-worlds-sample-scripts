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


import {Component, Player, PlayerDeviceType, Vec3} from 'horizon/core';
import * as EventsNetworked from 'EventsNetworked';
import * as ConstsGame from 'ConstsGame';
import {DEFAULT_PLAYER_AIR_SPEED_PERCENT, PLAYER_SPEED_DEFAULT} from 'ConstsGame';
import * as UtilsMath from 'UtilsMath';
import {vecIsZero} from 'UtilsMath';
import {LocalPlayerComponent} from 'LocalPlayerComponent';
import {PlayerControlHandler} from 'PlayerControlHandler';

const CUSTOM_HORIZONTAL_DAMPING_FACTOR: number = 0.03;

const MAX_ALLOWED_SPEED = 30;

type Props = {}

// TODO: Should this happen on the server instead?
export class PlayerLocomotion extends LocalPlayerComponent<Props> {
    public playerSpeed = PLAYER_SPEED_DEFAULT;
    public airSpeedPercent = DEFAULT_PLAYER_AIR_SPEED_PERCENT;
    public playerAirSpeed = PLAYER_SPEED_DEFAULT * this.airSpeedPercent;

    // WARNING: Because this is updated in PlayerLocomotion's update(), this value might behind a frame.
    private pointVelocity = Vec3.zero;
    // WARNING: Because this is updated in PlayerLocomotion's update(), this value might behind a frame
    // (i.e. the current frame's velocity may not be included in the smoothed average).
    public pointVelocitySmoothed = Vec3.zero;
    private lastPosition = Vec3.zero;

    // Player.locomotionSpeed is write-only, so we cache the value here to read
    private currentLocomotionSpeed = -1; // -1 forces an initial write
    private isLocomotionEnabled = true;

    private setAirVelocityWhenInputEnds = false;
    private setAirVelocityWhenInputBegins = false;
    private counterInputAirVelocityXZ = Vec3.zero;

    private wasGrounded: boolean = false;

    constructor(hzObj: Component, owner: Player, props: Props, private controlHandler: PlayerControlHandler) {
        super(hzObj, owner, props);
    }

    localPreStart() {
        this.hzObj.connectNetworkBroadcastEvent(EventsNetworked.setSpeed, this.onSetSpeed.bind(this));
        this.hzObj.connectNetworkBroadcastEvent(EventsNetworked.setGravity, this.onSetGravity.bind(this));
        this.hzObj.connectNetworkBroadcastEvent(EventsNetworked.setJumpData, this.onSetJumpData.bind(this));
    }

    localStart() {
    }

    localUpdate(deltaTimeSeconds: number) {
        this.updatePointVelocity(deltaTimeSeconds);
        this.applyAirVelocityForLocomotionInput();
        this.dampHorizontalGroundSpeedIfNeeded(deltaTimeSeconds);
        this.resetAirSpeedIfGrounded();
        this.applyLiftoffVelocityIfNeeded();
        this.updateHorizonLocomotion();

        this.wasGrounded = this.owner.isGrounded.get();
    }

    localDispose() {
    }

    // Returns a vector pointing in the direction of player input scaled to the magnitude of the input
    // (which is normalized to the range [0, 1]). In essence, this answers the question: "How far is the player
    // pointing the control stick, from center, and in which direction?" If inputs are digital (instead of analogue),
    // the magnitude of the vector will always be 0 (not pressed) or 1 (pressed).
    public getScaledInputOnXZPlane() {
        const direction = this.controlHandler.getInputDirectionOnXZPlane();
        const magnitude = this.controlHandler.getInputMagnitude();
        return direction.mul(magnitude);
    }

    public setVelocity(velocity: Vec3) {
        this.owner.velocity.set(velocity);
    }

    public getPointVelocity(): Vec3 {
        return this.pointVelocity;
    }

    private applyAirVelocityForLocomotionInput() {
        if (!this.owner.isGrounded.get()) {
            const inputDirection = this.controlHandler.getInputDirectionOnXZPlane();

            // If locomotion is disabled, act as if we have no inputs.
            if (!this.isLocomotionEnabled || vecIsZero(inputDirection)) {
                this.counterInputAirVelocityXZ = this.owner.velocity.get().clone();
                this.counterInputAirVelocityXZ.y = 0;

                this.setAirVelocityWhenInputBegins = true;
                this.applyAirVelocityWhenInputEnds();
            } else {
                this.setAirVelocityWhenInputEnds = true;
                this.applyAirVelocityWhenInputBegins();
            }
        } else {
            this.setAirVelocityWhenInputEnds = false;
            this.setAirVelocityWhenInputBegins = false;
        }
    }

    private applyAirVelocityWhenInputBegins() {
        if (this.setAirVelocityWhenInputBegins) {
            this.setAirVelocityWhenInputBegins = false;

            const velocity = this.owner.velocity.get();

            velocity.x = this.counterInputAirVelocityXZ.x;
            velocity.z = this.counterInputAirVelocityXZ.z;

            this.owner.velocity.set(velocity);
        }
    }

    private applyAirVelocityWhenInputEnds() {
        if (this.setAirVelocityWhenInputEnds) {
            this.setAirVelocityWhenInputEnds = false;
            this.setVelocitySuchThatLocomotionCantPutYouOverTheXZAirspeedLimit(this.pointVelocitySmoothed);
        }
    }

    private setVelocitySuchThatLocomotionCantPutYouOverTheXZAirspeedLimit(velocity: Vec3) {
        const currentVelocity = this.owner.velocity.get();

        const y = currentVelocity.y;
        currentVelocity.y = 0;

        const currentSpeed = currentVelocity.magnitude();

        currentVelocity.x = velocity.x;
        currentVelocity.z = velocity.z;

        UtilsMath.clampVecInPlace(currentVelocity, Math.max(currentSpeed, this.getMaximumAirVelocityXZForHorizonLocomotion()));

        currentVelocity.y = y;

        this.owner.velocity.set(currentVelocity);
    }

    private updatePointVelocity(deltaTime: number) {
        const position = this.owner.foot.position.get();
        const pointVelocity = Vec3.div(Vec3.sub(position, this.lastPosition), deltaTime);
        this.pointVelocitySmoothed = Vec3.add(Vec3.mul(this.pointVelocitySmoothed, ConstsGame.POINT_VELOCITY_SMOOTHING_FACTOR), Vec3.mul(pointVelocity, 1 - ConstsGame.POINT_VELOCITY_SMOOTHING_FACTOR));
        this.pointVelocity = pointVelocity;
        this.lastPosition = position;
    }

    public getMaximumAirVelocityXZForHorizonLocomotion() {
        return this.playerSpeed - this.playerAirSpeed;
    }

    // Be careful with using this in the air. If you disable locomotion in the air, then re-enable locomotion
    // *after* you have hit the ground, the player will have their input paused for a frame.
    public disableLocomotion() {
        this.isLocomotionEnabled = false;
        this.updateHorizonLocomotion();
    }

    public enableLocomotion() {
        this.isLocomotionEnabled = true;
        this.updateHorizonLocomotion();
    }

    public setPlayerAirspeedPercent(airspeedPercent: number) {
        if (this.airSpeedPercent == airspeedPercent) {
            return;
        }
        this.airSpeedPercent = airspeedPercent;
        this.setSpeed(this.playerSpeed);
    }

    private onSetSpeed(data: { player: Player, speed: number }) {
        this.doIfOwner(data.player, () => this.setSpeed(data.speed));
    }

    private setSpeed(speed: number) {
        this.playerSpeed = speed;
        this.playerAirSpeed = speed * this.airSpeedPercent;
        this.updateHorizonLocomotion();
    }

    private applyLiftoffVelocityIfNeeded() {
        if (!this.owner.isGrounded.get() && this.wasGrounded) {
            this.applyLiftoffVelocity();
        }
    }

    private applyLiftoffVelocity() {
        const maxHorizontalVelocity = this.getMaximumAirVelocityXZForHorizonLocomotion();
        const velocityScaledByInput = this.getScaledInputOnXZPlane().mulInPlace(maxHorizontalVelocity);
        this.owner.velocity.set(velocityScaledByInput.addInPlace(new Vec3(0, this.owner.velocity.get().y, 0)));
        // SD: Added some logging to try and track down the super jump issue.
        if (this.owner.velocity.get().magnitude() > MAX_ALLOWED_SPEED) {
            console.error(`${this.owner.name.get()} traveling at ${this.owner.velocity.get().magnitude()}, which is above the max speed of ${MAX_ALLOWED_SPEED}`);
        }
    }

    private updateHorizonLocomotion() {
        if (!this.isLocomotionEnabled) {
            this.setHorizonPlayerLocomotionSpeed(0);
        } else if (this.owner.isGrounded.get()) {
            this.setHorizonPlayerLocomotionSpeed(this.playerSpeed);
        } else {
            this.setHorizonPlayerLocomotionSpeed(this.playerAirSpeed);
        }
    }

    private setHorizonPlayerLocomotionSpeed(speed: number) {
        if (speed == this.currentLocomotionSpeed) {
            return;
        }

        this.owner.locomotionSpeed.set(speed);
        this.currentLocomotionSpeed = speed;
    }

    // SD: Normally, horizon will apply damping to a player's horizontal speed when the player is grounded. However, Horizon will, by design, not do
    // this damping when the player is climbing a ramp (CharacterMotor.cs:ProcessMotionOnSurface and PlayerEntity.cs:SuppressHorizontalDampeningAndFallingFailsafeIfAppropriateForCustomVelocityChange)
    // since we don't have a mechanism to disable this behavior, we apply our own horizontal damping when the player is grounded and escalating a ramp.
    private dampHorizontalGroundSpeedIfNeeded(deltaTime: number) {
        const horizontalVelocity = new Vec3(this.pointVelocity.x, 0, this.pointVelocity.z);
        if (this.owner.isGrounded.get() && horizontalVelocity.magnitudeSquared() > 0.0001) {
            const velocity = this.owner.velocity.get().clone();
            const damping = CUSTOM_HORIZONTAL_DAMPING_FACTOR * deltaTime;
            velocity.componentMulInPlace(new Vec3(damping, 1, damping));
            this.owner.velocity.set(velocity);
        }
    }

    private resetAirSpeedIfGrounded() {
        if (this.owner.isGrounded.get()) {
            this.setPlayerAirspeedPercent(DEFAULT_PLAYER_AIR_SPEED_PERCENT);
        }
    }

    private onSetGravity(data: { player: Player, gravity: number }) {
        this.doIfOwner(data.player, () => this.owner.gravity.set(data.gravity));
    }

    private onSetJumpData(data: { player: Player, maxJumpCount: number, jumpForces: Vec3[] }) {
        this.doIfOwner(data.player, () => {
            if (ConstsGame.PLAYER_USE_HORIZON_JUMP) {
                if (data.jumpForces.length > 0) {
                    this.owner.jumpSpeed.set(data.jumpForces[0].y);
                }
            } else {
                // Turn off Jump and apply manually in PlayerJump.ts
                this.owner.jumpSpeed.set(0);
            }
        });
    }
}
