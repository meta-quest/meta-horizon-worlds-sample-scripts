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

import { EntityOrPlayer, ObjTargetPart } from 'ConstsObj';
import { onReplicatedObjectsUpdated } from 'Events';
import { onReplicatedObjSyncerInitialized, printReplicatedObjState, ReplicatedObjData, ReplicatedObjPartData, updateReplicatedObjs } from 'EventsNetworked';
import { Entity, Player, Vec3 } from 'horizon/core';
import { IReplicatedObjectSyncer, LocalPlayerComponent, ReplicatedObject } from 'LocalPlayerComponent';
import { logEx } from 'UtilsConsoleEx';
import { gameplayObjExists, GameplayObjTargetPart } from 'UtilsObj';
import { adjustPlayerTargetPartPosition } from 'UtilsPlayer';

const DEBUG_LOG_REPLICATED_BASE_OBJECTS = false;

/**
 * Responsible for maintaining a local, client-side representation of some objects, so that we can do variable logic client
 * side without needing to make a network call
 */
export class ReplicatedObjSyncer extends LocalPlayerComponent {
    private readonly replicatedPlayers = new Map<Player, ReplicatedObjData>();
    private readonly replicatedEntities = new Map<Entity, ReplicatedObjData>();

    localPreStart() {
        this.hzObj.sendNetworkEvent(this.owner, onReplicatedObjSyncerInitialized, {eventListener: this.hzObj.entity});
        this.hzObj.connectNetworkEvent(this.hzObj.entity, updateReplicatedObjs, (data) => {
            this.updateReplicatedObjs(data);
            if (DEBUG_LOG_REPLICATED_BASE_OBJECTS) this.debugLogReplicatedBaseObjs();
        });
        this.hzObj.connectNetworkEvent(this.owner, printReplicatedObjState, () => this.debugLogReplicatedBaseObjs());
    }

    localStart() {
    }

    localUpdate(deltaTimeSeconds: number) {
    }

    localDispose() {
    }

    getLocalPlayer() {
        const localPlayerData = this.replicatedPlayers.get(this.owner);
        if (!localPlayerData) {
            throw Error(`ReplicatedObjSyncer has no local player, this shouldn't be possible`);
        }
        return localPlayerData;
    }

    get(gameplayObject: EntityOrPlayer) {
        if (gameplayObject instanceof Player) {
            return this.replicatedPlayers.get(gameplayObject);
        }

        return this.replicatedEntities.get(gameplayObject);
    }

    getPlayers(predicate: (key: Player, data: ReplicatedObjData) => boolean = () => true) {
        const results: ReplicatedObject[] = [];
        this.replicatedPlayers.forEach((_data, _key) => {
            if (predicate(_key, _data)) results.push({..._data, gameplayObject: _key});
        });
        return results;
    }

    getEntities(predicate: (key: Entity, data: ReplicatedObjData) => boolean = () => true) {
        const results: ReplicatedObject[] = [];
        this.replicatedEntities.forEach((_data, _key) => {
            if (predicate(_key, _data)) results.push({..._data, gameplayObject: _key});
        });
        return results;
    }

    getAll(predicate: (key: EntityOrPlayer, data: ReplicatedObjData) => boolean = () => true) {
        return [...this.getPlayers(predicate), ...this.getEntities(predicate)].filter((obj) => gameplayObjExists(obj.gameplayObject));
        ;
    }

    getTargetPart(gameplayObject: EntityOrPlayer, targetPartId: ObjTargetPart): GameplayObjTargetPart {
        if (gameplayObject instanceof Player) {
            switch (targetPartId) {
                case ObjTargetPart.TORSO:
                    return gameplayObject.torso;
                case ObjTargetPart.HEAD:
                    return gameplayObject.head;
                case ObjTargetPart.FOOT:
                    return gameplayObject.foot;
                default:
                    return gameplayObject;
            }
        }

        const objPartData = this.replicatedEntities.get(gameplayObject)?.objParts.filter((data) => data.targetPart == targetPartId);
        if (objPartData && objPartData?.length > 1) {
            console.warn(`Multiple matches found for target part ${ObjTargetPart[targetPartId]} on ${gameplayObject.name.get()}. Should not happen, something is likely misconfigured.`);
        }

        return objPartData ? objPartData[0].entity : undefined;
    }

    getTargetPartPos(gameplayObject: EntityOrPlayer, targetPartId: ObjTargetPart): Vec3 | undefined {
        const targetPart = this.getTargetPart(gameplayObject, targetPartId);
        return adjustPlayerTargetPartPosition(targetPartId, targetPart, gameplayObject);
    }

    checkIfPlayersExist() {
        this.replicatedPlayers.forEach((_, player) => {
            if (!gameplayObjExists(player)) {
                this.replicatedPlayers.delete(player);
            }
        });
    }

    private updateReplicatedObjs(datas: ReplicatedObjData[]) {
        this.replicatedPlayers.clear();
        this.replicatedEntities.clear();

        datas.forEach(data => {
            const obj = data.objData;
            if (obj instanceof Player) {
                this.replicatedPlayers.set(obj, data);
            } else {
                this.replicatedEntities.set(obj, data);
            }
        });

        this.hzObj.sendLocalBroadcastEvent(onReplicatedObjectsUpdated, {});
    }

    private debugLogReplicatedBaseObjs() {
        const ownerName = this.owner.name.get();
        let str = `Updating Replicated Obj Map for ${ownerName}`;

        this.replicatedPlayers.forEach((obj) => {
            str += `\n  Player -- ${obj.objData.name.get()}, bodyParts[${this.getPartsString(obj.objParts)}], teamId[${obj.teamId}], canTakeDamage[${obj.canTakeDamage}], isAlive[${obj.isAlive}]`;
        });

        this.replicatedEntities.forEach((obj) => {
            str += `\n  Entities -- ${obj.objData.name.get()}, bodyParts[${this.getPartsString(obj.objParts)}], teamId[${obj.teamId}], canTakeDamage[${obj.canTakeDamage}], isAlive[${obj.isAlive}]`;
        });

        logEx(`Client for ${ownerName}, produced ${str}`, 'log');
    }

    private getPartsString(partsData: ReplicatedObjPartData[]) {
        let str = '';
        partsData.forEach((part) => str += `{${ObjTargetPart[part.targetPart]}, ${part.entity?.name.get()}}`);
        return str;
    }
}
