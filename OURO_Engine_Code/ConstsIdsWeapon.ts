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

import {isValidId, validId} from 'ConstsIds';
import {UNDEFINED_STRING} from 'EventData';

export const LAUNCH_WEAPON_IDS = [
    'weapon1',
] as const;
export type LaunchWeaponId = typeof LAUNCH_WEAPON_IDS[number];

const PLAYER_WEAPON_IDS = [
    ...LAUNCH_WEAPON_IDS,
    'weapon2',
] as const;

export function isValidPlayerWeaponId(value: string) {
    return isValidId('PLAYER_WEAPON_IDS', PLAYER_WEAPON_IDS, value);
}

export const BASE_SUFFIX = '_base';
// Unfortunately, to do the cool thing we're doing with IDs, these need to be array literals, and we can't define a const array from the VALID_WEAPONS_IDS
const BASE_WEAPON_IDS = [
    'weapon1_base',
    'weapon2_base',
] as const;

const ALL_WEAPON_IDS = [...PLAYER_WEAPON_IDS, ...BASE_WEAPON_IDS] as const;
const ALL_WEAPON_IDS_WITH_UNDEFINED = [UNDEFINED_STRING, ...ALL_WEAPON_IDS] as const;
export type WeaponId = typeof ALL_WEAPON_IDS_WITH_UNDEFINED[number];

export function validWeaponId(value: string): WeaponId {
    return validId('ALL_WEAPON_IDS', ALL_WEAPON_IDS, value);
}

export function isValidWeaponId(value: string) {
    return isValidId('ALL_WEAPON_IDS', ALL_WEAPON_IDS, value);
}
