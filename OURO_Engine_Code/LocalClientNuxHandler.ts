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

import { nuxSwapButtonPressed } from 'Events';
import { nuxMovementHintAmountExceeded, nuxRotationHintAmountExceeded, nuxTrackLocalClient, nuxWeaponSwapped } from 'EventsNetworked';
import LocalCamera from 'horizon/camera';
import { EventSubscription, Quaternion, Vec3 } from 'horizon/core';
import { LocalPlayerComponent } from 'LocalPlayerComponent';
import { clearAsyncInterval } from 'UtilsGameplay';
import { clamp, RADIANS_TO_DEGREES } from 'UtilsMath';

// Player needs to have moved a total of 2 meters
const NUX_MIN_MOVEMENT_AMOUNT_M = 2;
// Move more than 1m per frame then we don't count it (player might have been teleported)
const MAX_MOVE_PER_UPDATE_M = 1;

// Player needs to have a cumulative rotation of this amount
const NUX_MIN_ROTATION_AMOUNT_DEG = 15;
// Rotate more than 2deg per frame then we don't count it (player might have been teleported)
const MAX_ROTATE_PER_UPDATE_DEG = 2;

class PositionMovementTracker {
    totalDistanceMoved: number = 0;
    private lastPosition?: Vec3;

    public updatePosition(position: Vec3) {
        if (this.lastPosition) {
            const positionDelta = position.distance(this.lastPosition);
            if (positionDelta < MAX_MOVE_PER_UPDATE_M) {
                this.totalDistanceMoved += positionDelta;
            }
        }
        this.lastPosition = position;
    }
}

class RotationMovementTracker {
    totalDistanceRotated: number = 0;
    private lastRotation?: Quaternion;

    public updateRotation(rotation: Quaternion) {
        if (this.lastRotation) {
            const rotationDelta = this.lastRotation.mul(rotation.inverse());
            const rotationDeltaDeg = Math.abs(2 * Math.acos(clamp(rotationDelta.w, -1, 1)) * RADIANS_TO_DEGREES);
            if (rotationDeltaDeg < MAX_ROTATE_PER_UPDATE_DEG) {
                this.totalDistanceRotated += rotationDeltaDeg;
            }
        }
        this.lastRotation = rotation;
    }
}

// We have to track local camera movement from a client context
export class LocalClientNuxHandler extends LocalPlayerComponent<{}> {
    positionTracker = new PositionMovementTracker();
    rotationTracker = new RotationMovementTracker();

    private movementTrackerIntervalId?: number;
    private rotationTrackerIntervalId?: number;
    private weaponSwappedSubscription?: EventSubscription;
    private tracking: boolean = false;

    localPreStart(): void {
        this.hzObj.connectNetworkEvent(this.owner, nuxTrackLocalClient, data => this.startTracking());
        this.hzObj.connectLocalEvent(this.owner, nuxSwapButtonPressed, this.onWeaponSwapped.bind(this));
    }

    localStart(): void {
    }
    localUpdate(deltaTimeSeconds: number): void { }

    localDispose(): void {
    }

    private startTracking() {
        this.stopTracking();
        this.positionTracker = new PositionMovementTracker();
        this.rotationTracker = new RotationMovementTracker();
        this.movementTrackerIntervalId = this.hzObj.async.setInterval(this.trackMovementAndAlert.bind(this));
        this.rotationTrackerIntervalId = this.hzObj.async.setInterval(this.trackRotationAndAlert.bind(this));
        this.tracking = true;
    }

    private stopTracking() {
        clearAsyncInterval(this.hzObj, this.movementTrackerIntervalId);
        clearAsyncInterval(this.hzObj, this.rotationTrackerIntervalId);
        this.tracking = false;
    }

    private trackMovementAndAlert() {
        this.positionTracker.updatePosition(LocalCamera.position.get());
        if (this.positionTracker.totalDistanceMoved > NUX_MIN_MOVEMENT_AMOUNT_M) {
            this.hzObj.sendNetworkEvent(this.owner, nuxMovementHintAmountExceeded, {});
            clearAsyncInterval(this.hzObj, this.movementTrackerIntervalId);
        }
    }

    private trackRotationAndAlert() {
        this.rotationTracker.updateRotation(LocalCamera.rotation.get());
        if (this.rotationTracker.totalDistanceRotated > NUX_MIN_ROTATION_AMOUNT_DEG) {
            this.hzObj.sendNetworkEvent(this.owner, nuxRotationHintAmountExceeded, {});
            clearAsyncInterval(this.hzObj, this.rotationTrackerIntervalId);
        }
    }

    private onWeaponSwapped() {
        if (!this.tracking) return;
        this.hzObj.sendNetworkEvent(this.owner, nuxWeaponSwapped, {});
    }
}
