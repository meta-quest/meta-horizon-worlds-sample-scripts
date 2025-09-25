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

import { CodeBlockEvents, Component, PropTypes, SpawnPointGizmo } from 'horizon/core';

export class TriggerTeleport extends Component<typeof TriggerTeleport> {
    static propsDefinition = {
        destination: {type: PropTypes.Entity},
    };

    preStart() {
        this.connectCodeBlockEvent(this.entity, CodeBlockEvents.OnPlayerEnterTrigger, (player) => {
            this.props.destination?.as(SpawnPointGizmo)?.teleportPlayer(player);
        });
    }

    start() {
    }
}

Component.register(TriggerTeleport);
