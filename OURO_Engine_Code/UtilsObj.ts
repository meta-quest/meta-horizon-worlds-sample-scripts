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

import * as BaseObj from 'BaseObj';
import { EntityOrPlayer } from 'ConstsObj';
import * as EventData from 'EventData';
import { Asset, Entity, Player, PlayerBodyPart } from 'horizon/core';
import * as UtilsMath from 'UtilsMath';

export type GameplayObjTargetPart = Entity | Player | PlayerBodyPart | undefined | null;

export function getDebugName(obj?: EntityOrPlayer): string {
    if (obj == undefined) return getFixedNameLength('undefined'); // this is now 10 characters
    let name = 'Server';
    try {
        // unfortunately, this is expected. Don't have any other way without passing in a component every time...
        name = obj.name.get();
    } catch (e) {
        // expected throw for server
    }

    if (obj instanceof Entity) return `${getFixedNameLength(name)}[id:${obj.id}]`;
    return `#${obj.index.get()} ${getFixedNameLength(name)}[id:${obj.id}]`;
}

export function getFixedNameLength(name: string) {
    const fixedNameLength = 10;
    if (name.length < fixedNameLength) return name.padEnd(fixedNameLength);
    if (name.length > fixedNameLength) return name.slice(0, 5) + '..' + name.slice(name.length - 3, name.length);
    return name;
}

export function gameplayObjExists(obj?: EntityOrPlayer): boolean {
    if (!obj) return false;
    try {
        obj.position.get();
        obj.name.get();
        return true;
    } catch (e) {
        return false;
    }
}

export function forEachInSelection(objs: BaseObj.BaseObj[], selectionData: EventData.TargetingSelectionData, callback: (obj: BaseObj.BaseObj, index: number) => void) {
    switch (selectionData.selectionScheme) {
        case EventData.TargetSelectionScheme.ALL:
            objs.forEach(callback);
            break;
        case EventData.TargetSelectionScheme.RANDOM_N:
            if (selectionData.count) {
                if (selectionData.count < objs.length) {
                    const candidates = Array.from(objs);
                    for (let i = 0; i < selectionData.count; ++i) {
                        const rand = UtilsMath.randomRangeInt(0, objs.length);
                        const selected = candidates[rand];
                        candidates.splice(rand, 1);
                        callback(selected, i);
                    }
                } else {
                    objs.forEach(callback);
                }
            }
            break;
        case EventData.TargetSelectionScheme.CLOSEST_N:
            if (selectionData.count && selectionData.pos) {
                const refPos = selectionData.pos;
                const candidates = Array.from(objs);
                candidates.sort((a, b) => {
                    return UtilsMath.sqrDist(a.getPos(), refPos) - UtilsMath.sqrDist(b.getPos(), refPos);
                });

                if (selectionData.count < candidates.length) {
                    for (let i = 0; i < selectionData.count; ++i) {
                        callback(candidates[i], i);
                    }
                } else {
                    candidates.forEach(callback);
                }
            }
            break;
    }
}

export function getAllChildrenRecursively(obj?: Entity): Entity[] {
    const children: Entity[] = [];
    const childrenNode = obj?.children.get();

    if (childrenNode != undefined && childrenNode.length > 0) {
        children.push(...childrenNode);
        for (const child of childrenNode) {
            children.push(...getAllChildrenRecursively(child));
        }
    }
    return children;
}

export async function fetchAsData(asset: Asset) {
    try {
        return await asset.fetchAsData();
    } catch (e) {
        const error = new Error();
        console.error(`Failed to load asset: ${asset.id}[v=${asset.versionId}]: ${e}\n${error.stack}`);
        throw e;
    }
}
