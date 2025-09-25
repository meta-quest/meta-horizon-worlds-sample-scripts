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

export const ALL_GAME_MODE_IDS = [
    'POINTS',
    'ELIMINATION',
] as const;
export type GameModeId = typeof ALL_GAME_MODE_IDS[number];

export function validGameModeId(value: string): GameModeId {
    return validId('ALL_GAME_MODE_IDS', ALL_GAME_MODE_IDS, value);
}
