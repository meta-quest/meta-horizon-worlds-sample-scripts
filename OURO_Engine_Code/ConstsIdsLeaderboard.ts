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

const ALL_LEADERBOARD_IDS = [
    'Current Win Streak',
    'Elo',
    'Daily Eliminations',
    'Lifetime Eliminations'
] as const;
export type LeaderboardId = typeof ALL_LEADERBOARD_IDS[number];

export function validLeaderboardId(value: string): LeaderboardId {
    return validId('ALL_LEADERBOARD_IDS', ALL_LEADERBOARD_IDS, value);
}
