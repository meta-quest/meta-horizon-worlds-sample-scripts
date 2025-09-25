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

import { LoadoutSlot } from 'ConstsLoadout';
import { AttachablePlayerAnchor, EulerOrder, Quaternion, Vec3 } from 'horizon/core';

export type HolsterAnchorData = {
    anchor: AttachablePlayerAnchor.Torso,
    pos: Vec3,
    posXS: Vec3,
    rot: Quaternion,
}

export type HolsterSlotData = {
    primaryHolster: HolsterAnchorData,
    secondaryHolster: HolsterAnchorData,
}

export const HOLSTER_SLOT_DATA_DEFAULT: HolsterSlotData = {
    primaryHolster: {
        anchor: AttachablePlayerAnchor.Torso,
        pos: new Vec3(0.15, 0.3, -0.3),
        posXS: new Vec3(0.15, 0.3, -0.3),
        rot: Quaternion.fromEuler(new Vec3(90, 270, 0), EulerOrder.YXZ),
    },

    secondaryHolster: {
        anchor: AttachablePlayerAnchor.Torso,
        pos: new Vec3(-0.15, 0.3, -0.3),
        posXS: new Vec3(-0.15, 0.3, -0.3),
        rot: Quaternion.fromEuler(new Vec3(90, 90, 0), EulerOrder.YXZ),
    },
};

export function holsterDataForLoadoutSlot(slot: LoadoutSlot, slotData: HolsterSlotData): HolsterAnchorData {
    switch (slot) {
        case LoadoutSlot.WEAPON_PRIMARY:
            return slotData.primaryHolster;
        case LoadoutSlot.WEAPON_SECONDARY:
            return slotData.secondaryHolster;
        default:
            return slotData.primaryHolster;
    }
}
