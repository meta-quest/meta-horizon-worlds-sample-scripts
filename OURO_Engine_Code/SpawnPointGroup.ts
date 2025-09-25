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

import { registerSpawnPoint, SpawnPointData } from 'EventsCrossWorld';
import { Component, PropTypes, SpawnPointGizmo } from 'horizon/core';

export class SpawnPointGroup extends Component<typeof SpawnPointGroup> {
    static propsDefinition = {
        location: {type: PropTypes.String},
        team: {type: PropTypes.Number, default: -1},
    };

    start() {
    }

    registerSpawns(spawnPoint: SpawnPointGizmo, index?: number) {
        const spawnPointData: SpawnPointData = {spawnPoint: spawnPoint, locationName: this.props.location, team: this.props.team, index: index};
        this.sendLocalBroadcastEvent(registerSpawnPoint, {data: spawnPointData});
    }
}

Component.register(SpawnPointGroup);
