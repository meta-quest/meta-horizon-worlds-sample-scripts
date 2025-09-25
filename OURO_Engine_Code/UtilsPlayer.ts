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
import { EntityOrPlayer, ObjTargetPart } from 'ConstsObj';
import { Entity, Player, Quaternion, Vec3 } from 'horizon/core';
import { GameplayObjTargetPart } from 'UtilsObj';

// PlayerObjPool Class
export interface IPlayerOwnedObj {
    owner: Player;
    ownerIsPlayer: boolean;

    setOwner(player: Player): void;
}

export function playerObjShouldAcceptBroadcast(obj: IPlayerOwnedObj, broadcastTarget: Player): boolean {
    return obj.ownerIsPlayer && obj.owner.id == broadcastTarget.id;
}

export function getPlayer(targetData: EntityOrPlayer | undefined) {
    if (targetData instanceof Player) return targetData;
    return undefined;
}

type PlayerTargetPartOffset = {
    direction: Vec3,
    magnitude: number,
}

const PLAYER_TARGET_PART_POSITION_ADJUSTMENTS = new Map<ObjTargetPart, PlayerTargetPartOffset>([
    [ObjTargetPart.HEAD, {direction: Vec3.forward, magnitude: -0.15}],
    [ObjTargetPart.TORSO, {direction: Vec3.forward, magnitude: -0.1}],
    [ObjTargetPart.FOOT, {direction: Vec3.up, magnitude: 0.3}],
]);

/**Horizon's Player reports inaccurate player body part positions.
 * This method adjusts them based on defined data we have found to be more accurate for targeting.
 * <br>See {@link PLAYER_TARGET_PART_POSITION_ADJUSTMENTS} for data definitions.*/
export function adjustPlayerTargetPartPosition(targetPartId: ObjTargetPart, targetPart: GameplayObjTargetPart, targetObject: EntityOrPlayer) {
    // Filtering out adjustments if target part is not PlayerTargetPart or target is not a Player.
    if (!targetPart || targetPart instanceof Entity || targetPart instanceof Player || targetObject instanceof Entity) {
        return targetPart?.position.get();
    }

    const adjustmentData = PLAYER_TARGET_PART_POSITION_ADJUSTMENTS.get(targetPartId) ?? {direction: Vec3.zero, magnitude: 0};
    const adjustmentOffset = getOffsetDirection(targetObject, adjustmentData.direction).mulInPlace(adjustmentData.magnitude);
    return targetPart.position.get().addInPlace(adjustmentOffset);
}

function getOffsetDirection(gameplayObject: Player, direction: Vec3) {
    switch (direction) {
        case Vec3.forward:
            return gameplayObject.forward.get();
        case Vec3.backward:
            return gameplayObject.forward.get().mulInPlace(-1);
        case Vec3.left:
            return Quaternion.mulVec3(gameplayObject.rotation.get(), Vec3.right).mulInPlace(-1);
        case Vec3.right:
            return Quaternion.mulVec3(gameplayObject.rotation.get(), Vec3.right);
        case Vec3.up:
            return gameplayObject.up.get();
        case Vec3.down:
            return gameplayObject.up.get().mul(-1);
        default:
            return Vec3.zero;
    }
}
