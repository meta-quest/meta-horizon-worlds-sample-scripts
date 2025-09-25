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

import * as UtilsGameplay from 'UtilsGameplay';
import * as ConstsAttributes from 'ConstsAttributes';

export type AttributeModificationFunction = (value: number) => number;

/** -------------------------------------- PLAYER COUNT SCALING --------------------------------------------- */
export const PLAYER_COUNT_MAX_HP_SCALER = [ // how much does enemy HP scale according to player count
    1.0,
    1.2,
    1.5,
    2.0,
];

export const PLAYER_COUNT_DAMAGE_PERCENT_SCALER = [ // how much does enemy damage scale according to player count
    1.0,
    1.2,
    1.4,
    1.6,
];

export const PLAYER_COUNT_ATTRIBUTE_MODS = new Map<ConstsAttributes.AttributeId, AttributeModificationFunction>(
    [
        [ConstsAttributes.AttributeId.MAX_HP, (playerCount) => {
            return UtilsGameplay.getFromArrayClamped(PLAYER_COUNT_MAX_HP_SCALER, playerCount);
        }],
        [ConstsAttributes.AttributeId.DAMAGE_MULTIPLIER_PERCENT, (playerCount) => {
            return UtilsGameplay.getFromArrayClamped(PLAYER_COUNT_DAMAGE_PERCENT_SCALER, playerCount);
        }],
    ]);
