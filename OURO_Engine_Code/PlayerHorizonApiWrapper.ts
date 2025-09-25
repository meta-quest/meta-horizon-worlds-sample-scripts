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

import { areMutuallyFollowing, onAreMutuallyFollowing } from 'EventsNetworked';
import { LocalPlayerComponent } from 'LocalPlayerComponent';
import { logEx } from 'UtilsConsoleEx';
import { waitUntil } from 'UtilsGameplay';
import { TIME_UNITS } from 'UtilsMath';
import { gameplayObjExists } from 'UtilsObj';

export class PlayerHorizonApiWrapper extends LocalPlayerComponent {
    localPreStart(): void {
        this.hzObj.connectNetworkEvent(this.owner, areMutuallyFollowing, async (data) => {
            // Sometimes the player objects are invalid on the client but valid on the server (symptom: Player.name.get() throws an error),
            // so we wait until the objects exist. The player may leave the world while we're waiting for their name - set a timeout as a band-aid.
            // Ideally, we had a "safe player list" or "unsafe player list" on the client instead of using timeouts.
            // For player entities for existing players that are created on new clients, it can take 10 or more seconds for this to happen in an empty world - so timeouts are long.

            // This shouldn't happen for this.owner, but we don't trust it.
            const ownerSuccess = await waitUntil(() => gameplayObjExists(this.owner), 100, TIME_UNITS.MILLIS_PER_MINUTE);
            if (!ownerSuccess) {
                logEx(`PlayerHorizonApiWrapper - areMutuallyFollowing timed out waiting for owner ${this.owner.id} to exist, responseKey: ${data.responseKey}`, `error`)
                return;
            }

            const candidateSuccess = await waitUntil(() => gameplayObjExists(data.candidate), 100, TIME_UNITS.MILLIS_PER_MINUTE);
            if (!candidateSuccess) {
                logEx(`PlayerHorizonApiWrapper - areMutuallyFollowing timed out waiting for candidate ${data.candidate.id} to exist, responseKey: ${data.responseKey}`, `error`)
                return;
            }
        });
    }

    localStart(): void {

    }

    localUpdate(deltaTimeSeconds: number): void {

    }

    localDispose(): void {

    }
}
