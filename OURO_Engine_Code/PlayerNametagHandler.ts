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

import { NAMETAG_DISTANCE_FAR, NAMETAG_DISTANCE_NEAR, NAMETAG_MAX_SIZE, NAMETAG_MIN_SIZE, NAMETAG_POS_OFFSET_FROM_HEAD_METERS, NAMETAG_POS_OFFSET_FROM_TORSO_METERS } from 'ConstsNametag';
import { TAG_IGNORE_NAMETAG_RAYCAST } from 'ConstsTags';
import { trackNametag } from 'EventsNetworked';
import * as libCam from 'horizon/camera';
import { CodeBlockEvents, Entity, Player, PropTypes, RaycastTargetType, Vec3 } from 'horizon/core';
import { LocalPlayerComponent } from 'LocalPlayerComponent';
import { raycastIgnoreTags, setPosScale } from 'UtilsGameplay';
import { clamp01, inverseLerp, lerp } from 'UtilsMath';
import { gameplayObjExists } from 'UtilsObj';

const OVERLAY_CAMERA_DISTANCE_MIN = 2; // How close to the camera we can get before we start modifying hit direction offset
const HIT_DIR_OFFSET_DEFAULT = -0.5; // Default value of how far we offset the nametags from geometry in the direction towards the camera
const HIT_DIR_OFFSET_NEAR = 0.065; // Smallest value when near geometry that doesn't seem to clip nametag (most of the time)

export const PlayerNametagHandlerProps = {
    raycast: {type: PropTypes.Entity},
};
type Props = typeof PlayerNametagHandlerProps;

/**
 * This class tracks player name tags on the owning client to super-impose them on top of map geometry and/or dynamically scale them.
 */

type TrackedNametag = {
    entity: Entity;
    overlaid: boolean;
}

export class PlayerNametagHandler extends LocalPlayerComponent<Props> {
    private trackedNametags = new Map<Player, TrackedNametag>();

    localPreStart() {
        if (!this.props.raycast) throw Error('MISCONFIGURATION: THINGS WILL BE BROKEN. Missing raycast property');

        this.hzObj.connectNetworkEvent(this.owner, trackNametag, data => {
            if (data.nametag == null) return;
            // NOTE: tracking nametag even if it might not exist right now, since exist checks pos and name. Pos data should eventually become available if the player hasn't left the world.
            this.trackedNametags.set(data.player, {entity: data.nametag, overlaid: data.overlaid});
        });

        this.hzObj.connectCodeBlockEvent(this.hzObj.entity, CodeBlockEvents.OnPlayerExitWorld, (player) => {
            this.untrackPlayer(player);
        });
    }

    localStart() {
        // no-op
    }

    localUpdate(deltaTimeSeconds: number) {
        const cameraPos = libCam.default.position.get();

        this.trackedNametags.forEach((nametag, player) => {
            if (!gameplayObjExists(player)) {
                // NOTE: early out without untracking, since data should eventually become available if the player hasn't left the world.
                return;
            }

            const targetHeadPos = player.head.position.get();
            const distance = targetHeadPos.distance(cameraPos);

            let targetPos = player.position.get().add(NAMETAG_POS_OFFSET_FROM_TORSO_METERS);
            let scale = distance > 0 ? this.getScaleBasedOnDistance(distance) : NAMETAG_MIN_SIZE;

            if (nametag.overlaid && distance > 0) {
                const hit = raycastIgnoreTags(this.props.raycast, cameraPos, targetHeadPos.sub(cameraPos), distance + 1, [TAG_IGNORE_NAMETAG_RAYCAST]);
                if (hit) {
                    switch (hit.targetType) {
                        case RaycastTargetType.Player:
                            // If you hit the player we're looking for, don't render on top.
                            if (player.id == hit.target.id) {
                                break;
                            }
                        // FALLTHROUGH
                        case RaycastTargetType.Entity:
                        // FALLTHROUGH
                        case RaycastTargetType.Static:
                            const offsetScalar = this.getOffsetScalarBasedDistanceToHitPoint(cameraPos, hit.hitPoint);
                            const direction = targetHeadPos.sub(cameraPos).normalize();
                            targetPos = hit.hitPoint.add(direction.mul(offsetScalar));

                            const adjustedDistance = targetPos.distance(cameraPos);
                            const distanceRatio = adjustedDistance / distance;

                            targetPos.addInPlace(NAMETAG_POS_OFFSET_FROM_HEAD_METERS.mul(distanceRatio));
                            scale.mulInPlace(distanceRatio);
                            break;
                    }
                }
            }

            setPosScale(nametag.entity, targetPos, scale, true);
        });
    }

    localDispose() {
    }

    private untrackPlayer(player: Player) {
        this.trackedNametags.delete(player);
    }

    private getOffsetScalarBasedDistanceToHitPoint(cameraPosition: Vec3, hitPoint: Vec3) {
        const distanceFromHit = cameraPosition.distance(hitPoint);
        const alpha = Math.min(1, distanceFromHit / OVERLAY_CAMERA_DISTANCE_MIN);
        return lerp(HIT_DIR_OFFSET_NEAR, HIT_DIR_OFFSET_DEFAULT, alpha);
    }

    private getScaleBasedOnDistance(distance: number): Vec3 {
        const alpha = clamp01(inverseLerp(distance, NAMETAG_DISTANCE_NEAR, NAMETAG_DISTANCE_FAR));
        return Vec3.lerp(NAMETAG_MIN_SIZE, NAMETAG_MAX_SIZE, alpha);
    }
}
