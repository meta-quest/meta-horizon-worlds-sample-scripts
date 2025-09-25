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

import { EntityOrPlayer } from 'ConstsObj';
import { Component, Entity, Player, Vec3 } from 'horizon/core';
import { LocalPlayerComponent } from 'LocalPlayerComponent';
import { ReplicatedObjSyncer } from 'ReplicatedObjSyncer';

type PredictionData = {
    lastPosition: Vec3;
    pointVelocity: Vec3;
}

type Props = {}

export class PlayerActorVelocities extends LocalPlayerComponent {
    private predictionDatas = new Map<EntityOrPlayer, PredictionData>();

    constructor(hzObj: Component, owner: Player, props: Props, private replicatedObjectSyncer: ReplicatedObjSyncer) {
        super(hzObj, owner, props);
    }

    localPreStart(): void {
    }

    localStart(): void {
    }

    localUpdate(deltaTimeSeconds: number): void {
        this.replicatedObjectSyncer.getAll()
            .forEach((replicatedObject) => {
                const predictionData = this.predictionDatas.get(replicatedObject.gameplayObject);
                if (predictionData == undefined) {
                    this.predictionDatas.set(replicatedObject.gameplayObject, {lastPosition: replicatedObject.gameplayObject.position.get(), pointVelocity: Vec3.zero});
                    return;
                }

                const currentPosition = replicatedObject.gameplayObject.position.get();
                const pointVelocity = Vec3.div(Vec3.sub(currentPosition, predictionData.lastPosition), deltaTimeSeconds);
                if (this.dontStoreZeroValuesForEntities(pointVelocity, replicatedObject.gameplayObject)) {
                    return;
                }

                predictionData.pointVelocity = pointVelocity;
                predictionData.lastPosition = currentPosition;
            });

    }

    localDispose(): void {
    }

    // Getting some really strange 0 values for entities when accessing them on the client.
    // See @Jon moving around - https://pxl.cl/7Glmj vs Dummy moving around - https://pxl.cl/7GlmM.
    // Creating this helper to ignore zero values if the actor is an entity to reduce noise in the data.
    private dontStoreZeroValuesForEntities(pointVelocity: Vec3, actor: EntityOrPlayer) {
        return pointVelocity.equals(Vec3.zero) && actor instanceof Entity;
    }

    public getActorPointVelocity(actor: EntityOrPlayer) {
        return this.predictionDatas.get(actor)?.pointVelocity;
    }
}
