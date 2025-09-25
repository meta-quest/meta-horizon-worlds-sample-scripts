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

import { AssetEx } from 'AssetEx';
import { EntitlementId, registerEntitlementId } from 'ConstsEntitlements';
import { REWARD_TITLE_DATA_REGISTRY } from 'ConstsRewards';
import { RewardUIData, REWARD_TEXT_NEW_TITLE_ACQUIRED } from 'ConstsUIPlayerHomeMenu';
import { Entity } from 'horizon/core';
import { getCleanCSVArray, loadAndProcessTSVAsset } from 'UtilsGameplay';

const ACCOUNT_LEVEL_SPREADSHEET = AssetEx.new('0');

export interface AccountLevelData {
    level: number,
    xpRequirement: number,
    rewardedTitleId: string,
    rewardedEntitlementIds: EntitlementId[],
}

// NOTE: this array will contain a sparse set of level data that have rewards/entitlements associated with it
export const ALL_ACCOUNT_LEVEL_DATA: AccountLevelData[] = [];
export const ACCOUNT_LEVEL_DATA_MAP = new Map<number, AccountLevelData>();

export async function loadAccountLevelData() {
    await loadAndProcessTSVAsset(
        ACCOUNT_LEVEL_SPREADSHEET,
        (lineData) => {
            const data: AccountLevelData = {
                level: Number.parseInt(lineData.getOrThrow('level')!),
                xpRequirement: Number.parseInt(lineData.getOrThrow('xp_requirement')!),
                rewardedTitleId: lineData.getOrThrowNullableValue('rewarded_title_id') ?? '',
                rewardedEntitlementIds: getCleanCSVArray(lineData.getOrThrowNullableValue('rewarded_entitlement_ids')),
            };
            ALL_ACCOUNT_LEVEL_DATA.push(data);
            ACCOUNT_LEVEL_DATA_MAP.set(data.level, data);
            data.rewardedEntitlementIds.forEach((entitlementId) => registerEntitlementId(entitlementId));
        },
        'AccountLevelData'
    );
}

export function getAccountLevelFallbackXpRequirement() {
    return ALL_ACCOUNT_LEVEL_DATA[ALL_ACCOUNT_LEVEL_DATA.length - 1].xpRequirement;
}

export function getNextAccountLevelXpRequirement(currentLevel: number) {
    const nextLevelData = getNextAccountLevelWithData(currentLevel);
    return nextLevelData ? nextLevelData.xpRequirement : getAccountLevelFallbackXpRequirement();
}

export function getNextAccountLevelWithData(currentLevel: number) {
    for (let i = 0; i < ALL_ACCOUNT_LEVEL_DATA.length; i++) {
        const data = ALL_ACCOUNT_LEVEL_DATA[i];
        if (data.level > currentLevel) {
            return data;
        }
    }
}

export function getNextAccountLevelDataWithTitleReward(currentLevel: number) {
    for (let i = 0; i < ALL_ACCOUNT_LEVEL_DATA.length; i++) {
        const data = ALL_ACCOUNT_LEVEL_DATA[i];
        if (data.level > currentLevel && data.rewardedTitleId) {
            return data;
        }
    }
}

export function getRewardUIDatasForLevel(level: number, sfx?: Entity) {
    const rewardUIDatas: RewardUIData[] = [];
    const levelData = ACCOUNT_LEVEL_DATA_MAP.get(level);
    if (levelData && levelData.rewardedTitleId) {
        const titleReward = REWARD_TITLE_DATA_REGISTRY.get(levelData.rewardedTitleId);
        if (titleReward) {
            rewardUIDatas.push({
                title: titleReward.displayName,
                text: REWARD_TEXT_NEW_TITLE_ACQUIRED,
                sfx: sfx,
            });
        }
    }
    return rewardUIDatas;
}
