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

import { Color } from "horizon/core";

export const EMPTY_SLOT_TEXT = '[  EMPTY  ]';
export const LEADER_TEXT_COLOR = new Color(1, 1, 0);
export const EMPTY_COLOR = new Color(0.4, 0.4, 0.4);

export const PARTY_NAMES = ['Party A', 'Party B', 'Party C', 'Party D', 'Party E', 'Party F', 'Party G', 'Party H'];
export const PARTY_MAX_SIZE = 4;

export function getPartyName(partyId: number) {
    if (partyId >= 0 && partyId < PARTY_NAMES.length) {
        return PARTY_NAMES[partyId];
    }

    return 'Party' + partyId.toString();
}

export const MAX_PARTY_SIZE = 3;
export const MAX_NUMBER_OF_PARTIES = 32;
