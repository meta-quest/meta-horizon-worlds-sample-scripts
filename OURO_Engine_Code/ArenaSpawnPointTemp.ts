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

import { PLAYER_GRAVITY_DEFAULT, PLAYER_SPEED_DEFAULT } from 'ConstsGame';
import { registerSpawnPoint, SpawnPointData } from 'EventsCrossWorld';
import { Component, PropTypes, SpawnPointGizmo } from 'horizon/core';

export class ArenaSpawnPointTemp extends Component<typeof ArenaSpawnPointTemp> {
    static propsDefinition = {
        locationName: {type: PropTypes.String, default: ''},
        team: {type: PropTypes.Number, default: -1},
        index: {type: PropTypes.Number, default: -1},
    };

    start() {
        const spawnPoint = this.entity.as(SpawnPointGizmo);
        if (!spawnPoint) {
            console.error(`${this.entity.name.get()}: could not register spawn point because its not a gizmo.`);
            return;
        }

        spawnPoint.gravity.set(PLAYER_GRAVITY_DEFAULT);
        spawnPoint.speed.set(PLAYER_SPEED_DEFAULT);

        const spawnPointData: SpawnPointData = {
            spawnPoint: spawnPoint,
            locationName: this.props.locationName,
            team: this.props.team,
            index: this.props.index,
        };

        this.sendLocalBroadcastEvent(registerSpawnPoint, {data: spawnPointData});
    }
}

Component.register(ArenaSpawnPointTemp);
