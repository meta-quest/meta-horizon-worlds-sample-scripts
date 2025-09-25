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

import { BaseObj } from 'BaseObj';
import { EntityOrPlayer } from 'ConstsObj';
import * as EventData from 'EventData';
import { Player } from 'horizon/core';
import { gameplayObjExists } from 'UtilsObj';

export class ServerBaseObjRegistry {
    private static s_allServerObj = new Map<EntityOrPlayer, BaseObj>();

    static registerObj(obj: BaseObj) {
        this.s_allServerObj.set(obj.gameplayObject, obj);
    }

    static unregister(obj: BaseObj) {
        return this.s_allServerObj.delete(obj.gameplayObject);
    }

    static getObjFrom(data: EventData.SourceData) {
        return ServerBaseObjRegistry.getObj(data.obj);
    }

    static getObj(targetData: EntityOrPlayer | undefined) {
        return targetData ? this.s_allServerObj.get(targetData) : undefined;
    }

    static forEachObj(func: (obj: BaseObj) => void) {
        this.s_allServerObj.forEach(func);
    }

    static forEachPlayerObj(func: (obj: BaseObj) => void) {
        return this.s_allServerObj.forEach(obj => obj.gameplayObject instanceof Player ? func(obj) : {});
    }

    static forEachTarget(targetScheme: EventData.TargetScheme, sourceData: EventData.SourceData, func: (value: BaseObj) => void) {
        this.s_allServerObj.forEach((value) => {
            try {
                if (value.health.isAlive && value.isValidTarget(targetScheme, sourceData)) {
                    // Do this late because this is really expensive for entities (on players we are highly optimized)
                    if (!gameplayObjExists(value.gameplayObject)) {
                        this.s_allServerObj.delete(value.gameplayObject);
                        return;
                    }
                    func(value);
                }
            } catch (e) {
                console.log(`ServerBaseObjRegistry.forEachTarget error:`, e);
            }
        });
    }
}
