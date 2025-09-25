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

import { validId } from 'ConstsIds';
import { UNDEFINED_STRING } from 'EventData';

const ALL_BUTTON_IDS = [
    UNDEFINED_STRING,
    'jump',
    'abilityPrimary',
    'abilityUtility',
    'reload',
    'fire', // manual fire
    'swap',
    'nextFollowTarget',
] as const;
export type ButtonId = typeof ALL_BUTTON_IDS[number];

export function validButtonId(value: string): ButtonId {
    return validId('ALL_BUTTON_IDS', ALL_BUTTON_IDS, value);
}
