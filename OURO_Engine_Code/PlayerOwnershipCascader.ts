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
import { onPlayerObjSpawned } from 'EventsCore';
import { Component, PropTypes } from 'horizon/core';

export class PlayerOwnershipCascader extends Component<typeof PlayerOwnershipCascader> {
    static propsDefinition = {
        entity: {type: PropTypes.Entity}
    };

    preStart() {
        if (!this.props.entity) {
            throw Error(`${this.entity.name.get()}: entity prop needs to be set on`);
        }

        this.connectLocalEvent(this.entity, onPlayerObjSpawned, (data) => this.sendLocalEvent(this.props.entity!, onPlayerObjSpawned, data));
    }

    start() {

    }
}
Component.register(PlayerOwnershipCascader)
