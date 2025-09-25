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

import { playerEnteredOutOfBoundsArea, playerExitedOutOfBoundsArea } from 'EventsCrossWorld';
import { CodeBlockEvents, Component } from 'horizon/core';

export class TriggerOutOfBounds extends Component<typeof TriggerOutOfBounds> {
    static propsDefinition = {};

    preStart() {
        this.connectCodeBlockEvent(this.entity, CodeBlockEvents.OnPlayerEnterTrigger, (player) => {
            this.sendLocalBroadcastEvent(playerEnteredOutOfBoundsArea, {player: player});
        });

        this.connectCodeBlockEvent(this.entity, CodeBlockEvents.OnPlayerExitTrigger, (player) => {
            this.sendLocalBroadcastEvent(playerExitedOutOfBoundsArea, {player: player});
        });
    }

    start() {
    }
}

Component.register(TriggerOutOfBounds);
