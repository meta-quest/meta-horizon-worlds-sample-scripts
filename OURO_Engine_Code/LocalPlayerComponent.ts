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

import {Component, Entity, Player, PropsFromDefinitions, Vec3} from 'horizon/core';
import {ReplicatedObjData} from 'EventsNetworked';
import {EntityOrPlayer} from 'ConstsObj';


export interface ReplicatedObject extends Omit<ReplicatedObjData, 'objData'> {
    gameplayObject: EntityOrPlayer;
}

export abstract class LocalPlayerComponent<Props = {}> {
    static propsDefinition: {};

    constructor(
        protected readonly hzObj: Component,
        protected readonly owner: Player,
        protected readonly props: PropsFromDefinitions<Props>,
    ) { }

    abstract localPreStart(): void

    abstract localStart(): void

    abstract localUpdate(deltaTimeSeconds: number): void

    abstract localDispose(): void

    doIfOwner(player: Player, func: () => void) {
        if (this.owner != player) return;

        func();
    }
}
