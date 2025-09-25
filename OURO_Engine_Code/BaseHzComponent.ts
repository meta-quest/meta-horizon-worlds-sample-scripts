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

import { Component, Player, PlayerDeviceType, PropTypes } from 'horizon/core';
import { IPlayerOwnedObj } from 'UtilsPlayer';

export class BaseHzComponent<T = typeof BaseHzComponent> extends Component<typeof BaseHzComponent & T> {
    static propsDefinition = {
        displayName: {type: PropTypes.String, default: ''},
        tags: {type: PropTypes.String, default: ''},
    };

    displayName = '';
    tags = new Set<string>();

    preStart() {
        this.displayName = this.props.displayName;
        this.props.tags.split(' ').forEach((value) => this.tags.add(value));
    }

    start() {
    }

    getName() {
        return this.props.displayName;
    }
}

export class BasePlayerObjHzComponent<T> extends BaseHzComponent<typeof BasePlayerObjHzComponent & T> implements IPlayerOwnedObj {
    owner!: Player;
    ownerIsPlayer: boolean = false;
    deviceType: PlayerDeviceType = PlayerDeviceType.VR;

    setOwner(player: Player) {
        this.owner = player;
        this.ownerIsPlayer = this.owner.id != this.world.getServerPlayer().id;
        this.deviceType = this.ownerIsPlayer ? this.owner.deviceType.get() : PlayerDeviceType.VR;
    }
}
