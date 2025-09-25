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

import { EntitlementId } from 'ConstsEntitlements';
import { validId } from 'ConstsIds';
import { ALL_HINT_IDS } from 'ConstsIdsNuxHints';

export const DAILIES_SEEN_ID = 'NEW_DAILIES';
export const WEEKLIES_SEEN_ID = 'NEW_WEEKLIES';

export const ALL_SEEN_IDS = [
    DAILIES_SEEN_ID,
    WEEKLIES_SEEN_ID,
    ...ALL_HINT_IDS,
];
export type SeenId = string;

export function validSeenId(value: string): EntitlementId {
    return validId('ALL_SEEN_IDS', ALL_SEEN_IDS, value);
}
