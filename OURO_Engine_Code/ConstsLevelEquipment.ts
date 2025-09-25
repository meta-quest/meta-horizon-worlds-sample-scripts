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
import { EntitlementId } from 'ConstsEntitlements';
import { GameContentData } from 'ConstsGameContent';
import { AbilityId, validAbilityId } from 'ConstsIdsAbility';
import { validWeaponId, WeaponId } from 'ConstsIdsWeapon';
import { isWeaponSlot } from 'ConstsLoadout';
import { RewardContentTypes } from 'ConstsRewards';
import { registerEntitlementIds } from 'ConstsUnlockables';
import { UNDEFINED_STRING } from 'EventData';
import { getCleanCSVArray, loadAndProcessTSVAsset } from 'UtilsGameplay';

/** -----------------------------------------------------  GENERAL  ----------------------------------------------------- */
export interface BaseEquipmentLevelData<T> {
    id: T,
    level: number,
    xpRequirement: number,
    rewardedGold: number,
    rewardedEntitlementIds: EntitlementId[],
    rewardedContentTypes: RewardContentTypes[],
}

async function loadEquipmentDataFromSpreadsheetAsset<idT, DataT extends BaseEquipmentLevelData<idT>>(
    dataAsset: AssetEx,
    allMap: Map<idT, DataT[]>,
    dataMappingFunc: (spreadSheetlineData: Map<string, string | undefined>) => DataT,
    errorDebugString: string,
) {
    await loadAndProcessTSVAsset(
        dataAsset,
        (lineData) => {
            const data = dataMappingFunc(lineData);

            const datas = allMap.get(data.id) ?? [];
            datas.push(data);
            allMap.set(data.id, datas);

            if (data.rewardedEntitlementIds) {
                registerEntitlementIds(data.rewardedEntitlementIds);
            }
        },
        errorDebugString,
    );
}


export async function loadAllEquipmentLevelData() {
    await Promise.all([
        loadWeaponLevelData(),
        loadAbilityLevelData()
    ]);
}

export function getEquipmentLevelData(data: GameContentData<any>, level: number) {
    const isWeapon = isWeaponSlot(data.loadoutSlot);
    return isWeapon ? getWeaponLevelData(data.id as WeaponId, level) : getAbilityLevelData(data.id as AbilityId, level);
}

/** -----------------------------------------------------  WEAPONS  ----------------------------------------------------- */
const WEAPON_LEVEL_SPREADSHEET = AssetEx.new('0');

export interface WeaponLevelData extends BaseEquipmentLevelData<WeaponId> {
}

export const WEAPON_LEVEL_DATA_DEFAULT: WeaponLevelData = {
    id: UNDEFINED_STRING,
    level: 0,
    xpRequirement: 0,
    rewardedGold: 0,
    rewardedEntitlementIds: [],
    rewardedContentTypes: [],
};

// NOTE: should contain data for all possible levels starting with level 1
export const ALL_WEAPON_LEVEL_DATA = new Map<WeaponId, WeaponLevelData[]>();

async function loadWeaponLevelData() {
    await loadEquipmentDataFromSpreadsheetAsset<WeaponId, WeaponLevelData>(
        WEAPON_LEVEL_SPREADSHEET,
        ALL_WEAPON_LEVEL_DATA,
        (spreadSheetLineData) => {
            return {
                ...WEAPON_LEVEL_DATA_DEFAULT,
                id: validWeaponId(spreadSheetLineData.getOrThrow('weapon_id')!),
                xpRequirement: Number.parseInt(spreadSheetLineData.getOrThrow('xp_requirement')!),
                rewardedGold: Number.parseIntOrDefault(spreadSheetLineData.getOrThrowNullableValue('rewarded_gold'), 0),
                rewardedEntitlementIds: getCleanCSVArray(spreadSheetLineData.getOrThrowNullableValue('rewarded_entitlement_ids')),
                rewardedContentTypes: getCleanCSVArray(spreadSheetLineData.getOrThrowNullableValue('rewarded_content_types')) as RewardContentTypes[],
            };
        },
        'WeaponLevelData',
    );
}

export function getWeaponLevelData(weaponId: WeaponId, currentLevel: number) {
    const weaponLevelDatas = ALL_WEAPON_LEVEL_DATA.get(weaponId);
    if (!weaponLevelDatas || currentLevel - 1 >= weaponLevelDatas.length) {
        return;
    }

    return weaponLevelDatas[Math.max(currentLevel - 1, 0)];
}

/** -----------------------------------------------------  ABILITIES  ----------------------------------------------------- */
const ABILITY_LEVEL_SPREADSHEET = AssetEx.new('0');

export interface AbilityLevelData extends BaseEquipmentLevelData<AbilityId> {
}

export const ABILITY_LEVEL_DATA_DEFAULT: AbilityLevelData = {
    id: UNDEFINED_STRING,
    level: 0,
    xpRequirement: 0,
    rewardedGold: 0,
    rewardedEntitlementIds: [],
    rewardedContentTypes: [],
};

// NOTE: should contain data for all possible levels starting with level 1
export const ALL_ABILITY_LEVEL_DATA = new Map<AbilityId, AbilityLevelData[]>();

async function loadAbilityLevelData() {
    await loadEquipmentDataFromSpreadsheetAsset<AbilityId, AbilityLevelData>(
        ABILITY_LEVEL_SPREADSHEET,
        ALL_ABILITY_LEVEL_DATA,
        (spreadSheetLineData) => {
            return {
                ...ABILITY_LEVEL_DATA_DEFAULT,
                id: validAbilityId(spreadSheetLineData.getOrThrow('ability_id')!),
                xpRequirement: Number.parseInt(spreadSheetLineData.getOrThrow('xp_requirement')!),
                rewardedGold: Number.parseIntOrDefault(spreadSheetLineData.getOrThrowNullableValue('rewarded_gold'), 0),
                rewardedEntitlementIds: getCleanCSVArray(spreadSheetLineData.getOrThrowNullableValue('rewarded_entitlement_ids')),
                rewardedContentTypes: getCleanCSVArray(spreadSheetLineData.getOrThrowNullableValue('rewarded_content_types')) as RewardContentTypes[], // TODO fooj: @Vu this isn't safe, should use our isValid pattern.
            };
        },
        'AbilityLevelData',
    );
}

export function getAbilityLevelData(abilityId: AbilityId, currentLevel: number) {
    const levelDatas = ALL_ABILITY_LEVEL_DATA.get(abilityId);
    if (!levelDatas || currentLevel - 1 >= levelDatas.length) {
        return;
    }

    return levelDatas[Math.max(currentLevel - 1, 0)];
}
