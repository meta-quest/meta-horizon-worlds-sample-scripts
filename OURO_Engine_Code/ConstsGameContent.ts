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

import { TextureImageAssetEx } from 'AssetEx';
import { AbilityId } from 'ConstsIdsAbility';
import { KillLogSpriteId } from 'ConstsIdsHUDLogSprites';
import { WeaponId } from 'ConstsIdsWeapon';
import { LoadoutSlot } from 'ConstsLoadout';
import { UnlockableData } from 'ConstsUnlockables';
import { DataRegistry, IRegisterableData } from 'EventData';

export interface GameContentUIImages {
    default: TextureImageAssetEx,
    locked: TextureImageAssetEx,
}

export interface GameContentData<Id> {
    id: Id,

    displayName: string,
    description: string,
    icon: TextureImageAssetEx,
    killLogSprite?: KillLogSpriteId,

    unlockableData?: UnlockableData,
    images: GameContentUIImages,

    loadoutSlot?: LoadoutSlot,

    isReleased: boolean,
}

export function getDataSet<Id, Data extends GameContentData<Id>>(
    dataRegistry: DataRegistry<Id, Data>,
    ids: Id[],
) {
    const dataSet: Data[] = [];
    ids.forEach((id) => {
        const data = dataRegistry.get(id);
        if (!data) {
            return;
        }

        dataSet.push(data);
    });
    return dataSet;
}

export interface RewardContentData {
    id: string,
    displayName: string,
    description: string,
    unlockableData?: UnlockableData,
}

export function getMostUsedDisplayName<T extends WeaponId | AbilityId>(ids: T[], registry: DataRegistry<T, GameContentData<T>>, getUseCount: (id: T) => number): GameContentData<T> | undefined {
    let best: IRegisterableData<T> | undefined = undefined;
    let bestUseCount = 0;
    ids.forEach((id) => {
        const useCount = getUseCount(id);
        if (useCount > bestUseCount) {
            bestUseCount = useCount;
            best = registry.get(id);
        }
    });

    return best;
}
