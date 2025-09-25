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


import {Component, PropTypes} from 'horizon/core';
import {isServer} from 'UtilsGameplay';

export class GlobalServerObjects extends Component<typeof GlobalServerObjects> {
    static propsDefinition = {
        raycast: {type: PropTypes.Entity},
    }
    static instance: GlobalServerObjects | undefined;

    preStart() {
        if (!isServer(this.world)) return;
        GlobalServerObjects.instance = this;
    }

    start() {}
}

Component.register(GlobalServerObjects)
