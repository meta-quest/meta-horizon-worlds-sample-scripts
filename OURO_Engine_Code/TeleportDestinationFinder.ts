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


import { Color, Entity, LayerType, RaycastHit, Vec3 } from 'horizon/core';
import { raycast, setLine, setPos, setPosScale, setTrimeshTintColor, setVisible } from 'UtilsGameplay';

const PLAYER_CAPSULE_WIDTH = 0.8;
const PLAYER_HEIGHT_ERROR_MARGIN = 0.75;

export class TeleportDestinationFinder {
    private debugVisibility = false;
    private deltaYFromFeetToTorso: number = 0;
    private deltaYFromHeadToTorso: number = 0;

    constructor(
        private readonly rayCast: Entity,
        private readonly teleportDistance: number,
        private readonly debugLine?: Entity,
        private readonly rayOriginDebugPoint?: Entity,
        private readonly startPosDebugPoint?: Entity,
        private readonly adjustedDestinationDebugPoint?: Entity,
        private readonly standingDestinationDebugPoint?: Entity,
    ) {
    }

    public setDebugVisibility(visibility: boolean) {
        this.debugVisibility = visibility;
        [this.debugLine, this.rayOriginDebugPoint, this.startPosDebugPoint, this.adjustedDestinationDebugPoint, this.standingDestinationDebugPoint].forEach(entity => setVisible(entity, visibility));
    }

    public findIdealTeleportViaRaycast(startPos: Vec3, rayDirection: Vec3, deltaYFromFeetToTorso: number = 0.5, deltaYFromHeadToTorso: number = 0) {
        this.deltaYFromFeetToTorso = deltaYFromFeetToTorso;
        this.deltaYFromHeadToTorso = deltaYFromHeadToTorso;

        // FYI: Edge cases of blinking into tight concave geo can happen - talk to steve or dio about edge cases.
        const rayOrigin = startPos.sub(rayDirection.mul(PLAYER_CAPSULE_WIDTH));
        const rayDistance = this.teleportDistance + PLAYER_CAPSULE_WIDTH + PLAYER_CAPSULE_WIDTH;
        const rayHit = raycast(this.rayCast, rayOrigin, rayDirection, rayDistance, LayerType.Objects);

        if (!rayHit) {
            // We're blinking into open space.
            const blinkVector = rayDirection.mul(this.teleportDistance);
            const destination = startPos.add(blinkVector);
            const safeDestination = this.findNearestSafeStandingPosition(destination);
            this.drawDebugs(rayOrigin, startPos, destination, safeDestination);
            return {destination: safeDestination, hitWall: false};
        } else {
            const safeDestination = this.getSafeDestination(rayHit);
            const standingDestination = this.findNearestSafeStandingPosition(safeDestination);
            this.drawDebugs(rayOrigin, startPos, rayHit.hitPoint, safeDestination, standingDestination);
            return {destination: standingDestination, hitWall: true};
        }
    }

    private findNearestSafeStandingPosition(destination: Vec3) {
        // Raycast downwards to make sure that we don't teleport the player's feet below geo
        const computedPlayerHeight = this.deltaYFromFeetToTorso + PLAYER_HEIGHT_ERROR_MARGIN;
        const rayHit = raycast(this.rayCast, destination, Vec3.down, computedPlayerHeight, LayerType.Objects);

        if (rayHit) {
            // Found some standable geo below our blink destination
            destination = this.getSafeDestination(rayHit);
        } else {
            // Teleporting into open space, so we adjust for the height from the player's head/camera
            destination.addInPlace(new Vec3(0, this.deltaYFromHeadToTorso, 0));
        }
        return destination;
    }

    // offsets destination by playerHeight when hit is parallel to ground, and normal hit direction when hit is perpendicular to the ground.
    private getSafeDestination(rayHit: RaycastHit) {
        const dot = rayHit.normal.dot(Vec3.up);

        const heightWeight = Math.max(0, dot);
        const heightOffsetVec = this.getHeightOffsetVec().mul(heightWeight);

        const horizontalWeight = (1 - Math.abs(dot));
        const normalOffset = rayHit.normal.mul(PLAYER_CAPSULE_WIDTH * horizontalWeight);

        return rayHit.hitPoint.add(heightOffsetVec).add(normalOffset);
    }

    private getHeightOffsetVec(): Vec3 {
        return new Vec3(0, this.deltaYFromFeetToTorso, 0);
    }

    private drawDebugs(rayOrigin: Vec3, startPos: Vec3, destination: Vec3, adjustedDestination: Vec3, optStandingDestination?: Vec3) {
        if (!this.debugVisibility) return;

        setLine(this.debugLine, startPos, destination);

        setPosScale(this.rayOriginDebugPoint, rayOrigin, Vec3.one.mul(.05));
        setTrimeshTintColor(this.rayOriginDebugPoint, Color.red);

        setPosScale(this.startPosDebugPoint, startPos, Vec3.one.mul(.1));
        setTrimeshTintColor(this.startPosDebugPoint, Color.black);

        setPosScale(this.adjustedDestinationDebugPoint, adjustedDestination, Vec3.one.mul(.15));
        setTrimeshTintColor(this.adjustedDestinationDebugPoint, Color.green);

        if (!optStandingDestination) return;
        setPos(this.standingDestinationDebugPoint, optStandingDestination);
        setTrimeshTintColor(this.standingDestinationDebugPoint, Color.blue);
    }
}
