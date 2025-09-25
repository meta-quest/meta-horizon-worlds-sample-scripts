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

import { Entity, Player, Vec3 } from 'horizon/core';

export enum ObjMaterial {
    UNDEFINED = -1,
    STONE,
}

export enum ObjTargetPart {
    UNDEFINED = -1,
    POS,
    TORSO,
    HEAD,
    FOOT,
    WEAKPOINT,
}

export type ObjHitResult = {
    didHit: boolean,
    hitPos: Vec3,
    bodyPart: ObjTargetPart,
    pos: Vec3,
    radius: number,
}

/** Priority list of parts to check*/
export const DAMAGE_TARGET_PARTS = [
    ObjTargetPart.WEAKPOINT,
    ObjTargetPart.HEAD,
    ObjTargetPart.TORSO,
    ObjTargetPart.FOOT,
];

export function doesBodyPartUseMinRadius(bodyPart: ObjTargetPart) {
    switch (bodyPart) {
        case ObjTargetPart.WEAKPOINT:
        case ObjTargetPart.HEAD:
            return true;
    }
    return false;
}

export type EntityOrPlayer = Entity | Player;
