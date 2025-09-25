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

import * as BaseObj from 'BaseObj';
import * as ConstsAttributes from 'ConstsAttributes';
import * as EventData from 'EventData';
import * as EventsNetworked from 'EventsNetworked';
import { PhysicsForceMode, Vec3 } from 'horizon/core';


export interface ICompMovementListener {
    onSpeedChange(comp: CompMovement): void;

    onGravityChange(comp: CompMovement): void;

    onJumpDataChange(comp: CompMovement): void;

    onApplyForce(forceType: EventData.ForceType, force: number, forceDir: Vec3, forceMode: PhysicsForceMode, sourceData: EventData.SourceData | undefined): void;
}

export class CompMovement implements BaseObj.IObjectComponent {
    parent: BaseObj.BaseObj;

    baseSpeed = 0;
    speedMultiplier = 1.0;

    gravity = 0;
    gravityMultiplier = 1.0;

    maxJumpCount = 1;
    baseJumpForce = 0;
    jumpForceMultiplier = 1.0;

    unappliedForces: EventData.ForceDataWithSource[] = [];

    listeners: ICompMovementListener[] = [];

    constructor(parent: BaseObj.BaseObj) {
        this.parent = parent;
    }

    /* ****************************** *
     * BEGIN BaseObj.IObjectComponent *
     * ****************************** */

    initialize() {
        this.parent.horizonApiProvider.connectNetworkEvent(this.parent.gameplayObject, EventsNetworked.applyForce, (data) => {
            this.applyForce(data);
        });

        this.parent.horizonApiProvider.connectNetworkBroadcastEvent(EventsNetworked.applyForce, (data) => {
            if (this.parent.isTarget(data.targetData)) {
                this.applyForce(data);
            }
        });
    }

    update(deltaTime: number) {
        this.applyUnappliedForces();
    }

    /* **************************** *
     * END BaseObj.IObjectComponent *
     * **************************** */

    setBaseSpeed(value: number) {
        this.baseSpeed = value;
        this.handleSpeedChange();
    }

    setSpeedMultiplier(value: number) {
        this.speedMultiplier = value;
        this.handleSpeedChange();
    }

    handleSpeedChange() {
        this.listeners.forEach((value) => {
            value.onSpeedChange(this);
        });
    }

    calculateSpeed() {
        return this.baseSpeed * this.speedMultiplier;
    }

    setGravity(value: number) {
        this.gravity = value;
        this.handleGravityChange();
    }

    setGravityMultiplier(value: number) {
        this.gravityMultiplier = value;
        this.handleGravityChange();
    }

    handleGravityChange() {
        this.listeners.forEach((value) => {
            value.onGravityChange(this);
        });
    }

    calculateGravity() {
        return this.gravity * this.gravityMultiplier;
    }

    setMaxJumpCount(value: number) {
        this.maxJumpCount = value;
        this.handleJumpDataChange();
    }

    setJumpForce(value: number) {
        this.baseJumpForce = value;
        this.handleJumpDataChange();
    }

    setJumpForceMultiplier(value: number) {
        this.jumpForceMultiplier = value;
        this.handleJumpDataChange();
    }

    handleJumpDataChange() {
        this.listeners.forEach((value) => {
            value.onJumpDataChange(this);
        });
    }

    calculateJumpForce() {
        return this.baseJumpForce * this.jumpForceMultiplier;
    }

    applyUnappliedForces() {
        this.unappliedForces.forEach((data) => {
            this.applyForceInternal(data);
        });
        this.unappliedForces.length = 0;
    }

    applyForce(data: EventData.ForceDataWithSource) {
        this.unappliedForces.push(data);
    }

    applyForceInternal(data: EventData.ForceDataWithSource, forceMode: PhysicsForceMode = PhysicsForceMode.Impulse) {
        let finalForce = data.forceData.force;
        switch (data.forceData.forceType) {
            case EventData.ForceType.ROCKET_JUMP:
                finalForce *= this.parent.attributes.calculateAttributeValue(ConstsAttributes.AttributeId.MOVEMENT_ROCKET_JUMP_FORCE_MULTIPLIER);
                break;
        }

        this.listeners.forEach((value) => {
            value.onApplyForce(data.forceData.forceType, finalForce, data.forceData.forceDir, forceMode, data.sourceData); // TODO: Will we use source data in this class? or pass it on to the delegate.
        });
    }
}
