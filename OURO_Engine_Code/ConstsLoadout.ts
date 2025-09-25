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

import { TextureImageAssetEx } from 'AssetEx';
import * as ConstsUI from 'ConstsUI';

/**
 * Literally what you can select from UI
 * Shotgun
 * Rocket Launcher
 * Sword
 * Super Jump
 */

export enum LoadoutSlot {
    UNDEFINED = 0,
    WEAPON_PRIMARY,
    WEAPON_SECONDARY,
    ABILITY_PRIMARY,
    ABILITY_UTILITY,
}

export function isWeaponSlot(loadoutSlot?: LoadoutSlot) {
    switch (loadoutSlot) {
        case LoadoutSlot.WEAPON_PRIMARY:
        case LoadoutSlot.WEAPON_SECONDARY:
            return true;
    }

    return false;
}

export type LoadoutSlotMetaData = {
    displayName: string,
    description: string,
    iconImg: TextureImageAssetEx;
}

export const LOADOUT_SLOT_META_DATA_DEFAULT: LoadoutSlotMetaData = {
    displayName: '',
    description: '',
    iconImg: ConstsUI.PLACEHOLDER_IMAGE,
};

export const LOADOUT_SLOT_META_DATA_MAP = new Map<LoadoutSlot, LoadoutSlotMetaData>(
    [
        [LoadoutSlot.WEAPON_PRIMARY, {
            ...LOADOUT_SLOT_META_DATA_DEFAULT,
            displayName: 'Primary',
        }],
        [LoadoutSlot.WEAPON_SECONDARY, {
            ...LOADOUT_SLOT_META_DATA_DEFAULT,
            displayName: 'Secondary',
        }],
        [LoadoutSlot.ABILITY_PRIMARY, {
            ...LOADOUT_SLOT_META_DATA_DEFAULT,
            displayName: 'Ability',
        }],
        [LoadoutSlot.ABILITY_UTILITY, {
            ...LOADOUT_SLOT_META_DATA_DEFAULT,
            displayName: 'Gadget',
        }],
    ],
);
