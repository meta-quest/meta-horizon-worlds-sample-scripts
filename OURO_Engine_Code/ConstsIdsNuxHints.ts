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

export const NUX_MAKE_FIRST_PURCHASE_SEEN_ID = 'nux_first_purchase';
export const NUX_USE_EQUIPMENT_SEEN_ID = 'nux_use_equipment';

export const ALL_HINT_IDS = [
    'nux_video',
    'nux_move',
    'nux_rotate',
    'nux_aim',
    'nux_ability',
    'nux_swap',
    'nux_hold_and_release',
    NUX_MAKE_FIRST_PURCHASE_SEEN_ID,
    NUX_USE_EQUIPMENT_SEEN_ID,
] as const;
export type HintId = typeof ALL_HINT_IDS[number];

export function validHintId(value: string): HintId {
    return validId('ALL_HINT_IDS', ALL_HINT_IDS, value);
}

export function isValidHintId(value: string) {
    return isValidId('ALL_HINT_IDS', ALL_HINT_IDS, value);
}
