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

import { Component, PropTypes, SpawnPointGizmo } from 'horizon/core';
import { SpawnPointGroup } from 'SpawnPointGroup';
import { getFirstAncestorOfTypedScript } from 'UtilsGameplay';

export class SpawnPoint extends Component<typeof SpawnPoint> {
    static propsDefinition = {
        index: {type: PropTypes.Number, default: -1}
    };

    start() {
        const spawnPoint = this.entity.as(SpawnPointGizmo);
        if (!spawnPoint) return;

        const spawnPointGroup = getFirstAncestorOfTypedScript(this.entity, SpawnPointGroup);
        if (!spawnPointGroup) {
            console.error(`${this.entity.name.get()}[${this.entityId}]: IS MISCONFIGURED AND WILL NOT BE REGISTERED BECAUSE IT HAS NO SPAWN POINT GROUP PARENT.`)
            return;
        }

        spawnPointGroup.registerSpawns(spawnPoint, this.props.index < 0 ? undefined : this.props.index);
    }
}

Component.register(SpawnPoint);
