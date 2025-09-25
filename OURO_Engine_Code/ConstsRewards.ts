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

import { AssetEx, TextureImageAssetEx } from 'AssetEx';
import { CurrencyId } from 'ConstsCurrencies';
import { RewardContentData } from 'ConstsGameContent';
import { validWeaponId, WeaponId } from 'ConstsIdsWeapon';
import { getTimeRemainingText } from 'ConstsPlaytimeRewards';
import { PLACEHOLDER_IMAGE_EMPTY } from 'ConstsUI';
import {
    RewardUIData, REWARD_TEXT_GOLD_BOOST_ACQUIRED,
    REWARD_TEXT_NEW_BG_CARD_AVAILABLE,
    REWARD_TEXT_NEW_STICKER_AVAILABLE,
    REWARD_TEXT_NEW_TITLE_AVAILABLE,
    REWARD_TEXT_NEW_WEAPON_WRAP_AVAILABLE,
    REWARD_TEXT_XP_BOOST_ACQUIRED
} from 'ConstsUIPlayerHomeMenu';
import { registerUnlockableDataEntitlementIds } from 'ConstsUnlockables';
import { DataRegistry, IRegisterableData, UNDEFINED_STRING } from 'EventData';
import { Entity, MaterialAsset } from 'horizon/core';
import { getCleanCSVArray, loadAndProcessTSVAsset } from 'UtilsGameplay';

/** -----------------------------------------------------  GENERAL  ----------------------------------------------------- */
export type RewardContentTypes = 'title' | 'card' | 'skin' | 'sticker' | 'pop1xpromo';

async function loadRewardDataFromSpreadsheetAsset<RewardDataT extends RewardContentData>(
    dataAsset: AssetEx,
    registry: DataRegistry<string, RewardDataT>,
    allArray: RewardDataT[],
    dataMappingFunc: (spreadSheetlineData: Map<string, string | undefined>) => RewardDataT,
    errorDebugString: string,
) {
    await loadAndProcessTSVAsset(
        dataAsset,
        (lineData) => {
            const data = dataMappingFunc(lineData);
            if (data.unlockableData) {
                registerUnlockableDataEntitlementIds(data.unlockableData);
            }
            registry.register(data);
            allArray.push(data);
        },
        errorDebugString,
    );
}

export async function loadAllRewardData() {
    await Promise.all([
        loadTitleCardData(),
        loadStickerData(),
        loadBgCardData(),
        loadWeaponSkinData(),
    ]);
}

export function getAllRewardDataUnlockedBy<T extends RewardContentData>(entitlementIds: string[], allDataArray: T[]) {
    if (entitlementIds.length <= 0) {
        return [];
    }

    return allDataArray.filter((data) => {
        if (!data.unlockableData || !data.unlockableData.requiredEntitlements || data.unlockableData.requiredEntitlements.length <= 0) {
            return false;
        }

        for (const id of data.unlockableData.requiredEntitlements) {
            if (!entitlementIds.includes(id)) {
                return false;
            }
        }
        return true;
    });
}

export function getRewardUIDatas(goldAmount: number, entitlements: string[], sfx?: Entity) {
    const rewardUIDatas: RewardUIData[] = [];
    if (goldAmount > 0) {
        rewardUIDatas.push(getRewardUIDataForGoldReward(goldAmount, sfx));
    }
    rewardUIDatas.push(...getRewardUIDatasForUnlockedTitles(entitlements, sfx));
    rewardUIDatas.push(...getRewardUIDatasForUnlockedStickers(entitlements, sfx));
    rewardUIDatas.push(...getRewardUIDatasForUnlockedBgCards(entitlements, sfx));
    rewardUIDatas.push(...getRewardUIDatasForUnlockedWeaponSkins(entitlements, sfx));
    return rewardUIDatas;
}

export function getRewardUIDataForGoldReward(amount: number, sfx?: Entity): RewardUIData {
    return {
        money: amount,
        text: `+${amount}`,
        sfx: sfx,
    };
}

export const REWARD_IMAGE_XP_BOOST = TextureImageAssetEx.new('0');

export function getRewardUIDataForXpBoost(durationSeconds: number, sfx?: Entity): RewardUIData {
    return {
        weaponImage: REWARD_IMAGE_XP_BOOST,
        text: REWARD_TEXT_XP_BOOST_ACQUIRED + `\n${getTimeRemainingText(durationSeconds / 60, 0)}`,
        sfx: sfx,
    };
}

export const REWARD_IMAGE_GOLD_BOOST = TextureImageAssetEx.new('0');

export function getRewardUIDataForGoldBoost(durationSeconds: number, sfx?: Entity): RewardUIData {
    return {
        weaponImage: REWARD_IMAGE_GOLD_BOOST,
        text: REWARD_TEXT_GOLD_BOOST_ACQUIRED + `\n${getTimeRemainingText(durationSeconds / 60, 0)}`,
        sfx: sfx,
    };
}

/** -----------------------------------------------------  TITLES  ----------------------------------------------------- */
export const STRING_TITLE_PLACEHOLDER = 'Recruit';

const TITLE_DATA_SPREADSHEET = AssetEx.new('0');

export interface RewardTitleData extends RewardContentData {
}

export const REWARD_TITLE_DATA_DEFAULT: RewardTitleData = {
    id: '',
    displayName: '',
    description: '', // displayed on the tooltip, should explain how to unlock
};
export const REWARD_TITLE_DATA_REGISTRY = new DataRegistry<string, RewardTitleData>('Reward Title');

export function getTitle(titleId: string) {
    return REWARD_TITLE_DATA_REGISTRY.get(titleId);
}

export const ALL_REWARD_TITLE_DATA: RewardTitleData[] = [];

function getBaseRewardData(spreadSheetData: Map<string, string | undefined>) {
    return {
        id: spreadSheetData.getOrThrow('id')!,
        displayName: spreadSheetData.getOrThrow('display_name')!,
        description: spreadSheetData.getOrThrowNullableValue('description') ?? REWARD_BG_CARD_DATA_DEFAULT.description,
        unlockableData: {
            requiredCurrencies: new Map<CurrencyId, number>([['GOLD', Number.parseIntOrDefault(spreadSheetData.getOrThrowNullableValue('gold_cost'), 0)]]),
            ownershipEntitlements: getCleanCSVArray(spreadSheetData.getOrThrowNullableValue('ownership_entitlements')),
            requiredEntitlements: getCleanCSVArray(spreadSheetData.getOrThrowNullableValue('required_entitlements')),
        },
    };
}

async function loadTitleCardData() {
    await loadRewardDataFromSpreadsheetAsset<RewardTitleData>(
        TITLE_DATA_SPREADSHEET,
        REWARD_TITLE_DATA_REGISTRY,
        ALL_REWARD_TITLE_DATA,
        (spreadSheetData) => getBaseRewardData(spreadSheetData),
        'RewardTitleData',
    );
}

export function getRewardUIDatasForUnlockedTitles(entitlementIds: string[], sfx?: Entity): RewardUIData[] {
    const rewardUIDatas: RewardUIData[] = [];
    const rewardDatas = getAllRewardDataUnlockedBy(entitlementIds, ALL_REWARD_TITLE_DATA);
    rewardDatas.forEach((data) => {
        rewardUIDatas.push({
            title: data.displayName,
            text: REWARD_TEXT_NEW_TITLE_AVAILABLE,
            sfx: sfx,
        });
    });
    return rewardUIDatas;
}

/** -----------------------------------------------------  STICKERS  ----------------------------------------------------- */

export const STICKER_ID_EMPTY = 'EMPTY';

const STICKER_DATA_SPREADSHEET = AssetEx.new('0');

export interface RewardStickerData extends RewardContentData {
    image: TextureImageAssetEx,
}

export const REWARD_STICKER_DATA_DEFAULT: RewardBgCardData = {
    id: '',
    displayName: '',
    description: '',
    image: PLACEHOLDER_IMAGE_EMPTY,
};

export const REWARD_STICKER_DATA_REGISTRY = new DataRegistry<string, RewardStickerData>('Reward sticker');

export function getSticker(stickerId: string) {
    return REWARD_STICKER_DATA_REGISTRY.get(stickerId);
}

export const ALL_REWARD_STICKER_DATA: RewardBgCardData[] = [];

async function loadStickerData() {
    await loadRewardDataFromSpreadsheetAsset<RewardStickerData>(
        STICKER_DATA_SPREADSHEET,
        REWARD_STICKER_DATA_REGISTRY,
        ALL_REWARD_STICKER_DATA,
        (spreadSheetData) => {
            return {
                ...getBaseRewardData(spreadSheetData),
                image: TextureImageAssetEx.latest(spreadSheetData.getOrThrow('image')!),
            };
        },
        'RewardStickerData',
    );
}

export function getRewardUIDatasForUnlockedStickers(entitlementIds: string[], sfx?: Entity): RewardUIData[] {
    const rewardUIDatas: RewardUIData[] = [];
    const rewardDatas = getAllRewardDataUnlockedBy(entitlementIds, ALL_REWARD_STICKER_DATA);
    rewardDatas.forEach((data) => {
        rewardUIDatas.push({
            stickerImage: data.image,
            text: REWARD_TEXT_NEW_STICKER_AVAILABLE + `\n${data.displayName}`,
            sfx: sfx,
        });
    });
    return rewardUIDatas;
}

/** -----------------------------------------------------  BG CARDS  ----------------------------------------------------- */
export const IMAGE_BG_CARD_PLACEHOLDER = TextureImageAssetEx.new('0');

const BG_CARD_DATA_SPREADSHEET = AssetEx.new('0');

export interface RewardBgCardData extends RewardContentData {
    image: TextureImageAssetEx,
}

export const REWARD_BG_CARD_DATA_DEFAULT: RewardBgCardData = {
    id: '',
    displayName: '',
    description: '',
    image: IMAGE_BG_CARD_PLACEHOLDER,
};
export const REWARD_BG_CARD_DATA_REGISTRY = new DataRegistry<string, RewardBgCardData>('Reward Bg Card');
export const ALL_REWARD_BG_CARD_DATA: RewardBgCardData[] = [];

async function loadBgCardData() {
    await loadRewardDataFromSpreadsheetAsset<RewardBgCardData>(
        BG_CARD_DATA_SPREADSHEET,
        REWARD_BG_CARD_DATA_REGISTRY,
        ALL_REWARD_BG_CARD_DATA,
        (spreadSheetData) => {
            return {
                ...getBaseRewardData(spreadSheetData),
                image: TextureImageAssetEx.latest(spreadSheetData.getOrThrow('image')!),
            };
        },
        'RewardBgCardData',
    );
}

export function getRewardUIDatasForUnlockedBgCards(entitlementIds: string[], sfx?: Entity): RewardUIData[] {
    const rewardUIDatas: RewardUIData[] = [];
    const rewardDatas = getAllRewardDataUnlockedBy(entitlementIds, ALL_REWARD_BG_CARD_DATA);
    rewardDatas.forEach((data) => {
        rewardUIDatas.push({
            bgCard: data.image,
            text: REWARD_TEXT_NEW_BG_CARD_AVAILABLE + `\n${data.displayName}`,
            sfx: sfx,
        });
    });
    return rewardUIDatas;
}

/** ----------------------------------------------------- WEAPON SKINS  ----------------------------------------------------- */
export const IMAGE_WEAPON_SKIN_PLACEHOLDER = TextureImageAssetEx.new('0');
export const MATERIAL_ASSET_WEAPON_SKIN_PLACEHOLDER = new MaterialAsset(BigInt('0'));

const WEAPON_SKIN_DATA_SPREADSHEET = AssetEx.new('0');

export interface RewardWeaponSkinData extends RewardContentData {
    weaponId: WeaponId,
    image: TextureImageAssetEx,
    skinAsset: MaterialAsset,
}

export const REWARD_WEAPON_SKIN_DATA_DEFAULT: RewardWeaponSkinData = {
    id: '',
    displayName: '',
    description: '',
    weaponId: UNDEFINED_STRING,
    image: IMAGE_WEAPON_SKIN_PLACEHOLDER,
    skinAsset: MATERIAL_ASSET_WEAPON_SKIN_PLACEHOLDER,
};

export interface RewardWeaponSkinRegistryData extends IRegisterableData<WeaponId> {
    skinMap: DataRegistry<string, RewardWeaponSkinData>,
    allSkins: RewardWeaponSkinData[],
}

export const REWARD_WEAPON_SKINS_DATA_REGISTRY = new DataRegistry<WeaponId, RewardWeaponSkinRegistryData>('Reward Weapon Skin');

async function loadWeaponSkinData() {
    await loadAndProcessTSVAsset(
        WEAPON_SKIN_DATA_SPREADSHEET,
        (spreadSheetData) => {
            const weaponId = validWeaponId(spreadSheetData.getOrThrow('weapon_id')!);

            if (!REWARD_WEAPON_SKINS_DATA_REGISTRY.has(weaponId)) {
                REWARD_WEAPON_SKINS_DATA_REGISTRY.register({
                    id: weaponId,
                    displayName: `${weaponId} skins`,
                    skinMap: new DataRegistry<string, RewardWeaponSkinData>(`${weaponId} skins`),
                    allSkins: [],
                });
            }
            let registryData = REWARD_WEAPON_SKINS_DATA_REGISTRY.get(weaponId)!;

            const skinData: RewardWeaponSkinData = {
                ...getBaseRewardData(spreadSheetData),
                image: TextureImageAssetEx.latest(spreadSheetData.getOrThrow('image')!),
                weaponId: weaponId,
                skinAsset: spreadSheetData.getOrThrowNullableValue('skin_asset') ? new MaterialAsset(BigInt(spreadSheetData.getOrThrow('skin_asset')!)) : MATERIAL_ASSET_WEAPON_SKIN_PLACEHOLDER,
            };

            if (skinData.unlockableData) {
                registerUnlockableDataEntitlementIds(skinData.unlockableData);
            }

            registryData.skinMap.register(skinData);
            registryData.allSkins.push(skinData);
        },
        'RewardWeaponSkinData',
    );
}

export function getRewardWeaponSkinData(weaponId: WeaponId, skinId: string) {
    const registryData = REWARD_WEAPON_SKINS_DATA_REGISTRY.get(weaponId);
    if (!registryData) {
        return;
    }
    return registryData.skinMap.get(skinId);
}

export function getRewardUIDatasForUnlockedWeaponSkins(entitlementIds: string[], sfx?: Entity): RewardUIData[] {
    const rewardUIDatas: RewardUIData[] = [];

    REWARD_WEAPON_SKINS_DATA_REGISTRY.dataMapping.forEach((registryData) => {
        const rewardDatas = getAllRewardDataUnlockedBy(entitlementIds, registryData.allSkins);
        rewardDatas.forEach((data) => {
            rewardUIDatas.push({
                weaponImage: data.image,
                text: REWARD_TEXT_NEW_WEAPON_WRAP_AVAILABLE + `\n${data.displayName}`,
                sfx: sfx,
            });
        });
    });


    return rewardUIDatas;
}
