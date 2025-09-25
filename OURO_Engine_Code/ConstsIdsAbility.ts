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

export const LAUNCH_ABILITY_IDS = [
    'ability_sample',
] as const;

export const LAUNCH_GADGET_IDS = [
    'ability_gadget_sample',
] as const;

const ALL_ABILITY_IDS = [
    ...LAUNCH_ABILITY_IDS,
    ...LAUNCH_GADGET_IDS,
    UNDEFINED_STRING,
] as const;
export type AbilityId = typeof ALL_ABILITY_IDS[number];

export function validAbilityId(value: string): AbilityId {
    return validId('ALL_ABILITY_IDS', ALL_ABILITY_IDS, value);
}

export function isValidAbilityId(value: string) {
    return isValidId('ALL_ABILITY_IDS', ALL_ABILITY_IDS, value);
}
