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

import {validId} from 'ConstsIds';
import {UNDEFINED_STRING} from 'EventData';

const ALL_CLASS_IDS = [
    UNDEFINED_STRING,
    'super_strike_player',
] as const;
export type ClassId = typeof ALL_CLASS_IDS[number];

export function validClassId(value: string): ClassId {
    return validId('ALL_CLASS_IDS', ALL_CLASS_IDS, value);
}
