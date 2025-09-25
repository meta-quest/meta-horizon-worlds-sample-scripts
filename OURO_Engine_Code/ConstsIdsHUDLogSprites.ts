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


import {UNDEFINED_STRING} from 'EventData';
import {validId} from 'ConstsIds';

const ALL_KILL_LOG_SPRITE_IDS = [
    UNDEFINED_STRING,
    'weapon1',
] as const;
export type KillLogSpriteId = typeof ALL_KILL_LOG_SPRITE_IDS[number];

export function validKillLogSpriteId(value: string): KillLogSpriteId {
    return validId('ALL_KILL_LOG_SPRITE_IDS', ALL_KILL_LOG_SPRITE_IDS, value);
}
