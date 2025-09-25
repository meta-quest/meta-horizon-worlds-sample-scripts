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
import { getRewardUIDataForGoldBoost, getRewardUIDataForGoldReward, getRewardUIDataForXpBoost } from 'ConstsRewards';
import { RewardUIData } from 'ConstsUIPlayerHomeMenu';
import { Entity } from 'horizon/core';
import { loadAndProcessTSVAsset, removeWhiteSpace } from 'UtilsGameplay';
import { TIME_UNITS } from 'UtilsMath';

const PREMIUM_SHOP_PREADSHEET = AssetEx.new('0');

export interface PremiumShopItemData {
    id: string,
    hzIwpItemSku: string,
    purchasableSkuExists: boolean,
    description: string,
    metaCreditsCost: number,
    imageAssetId: string,
    rewardedGold: number,
    rewardedXpBoostTimeDays: number,
    rewardedGoldBoostTimeDays: number,
}

export const PREMIUM_SHOP_ITEM_IMAGE_PLACEHOLDER = TextureImageAssetEx.new('0');

export const PREMIUM_SHOP_ITEM_DATA_DEFAULT = {
    id: '',
    hz_iwp_item_sku: '',
    purchasableSkuExists: false,
    description: 'Description',
    metaCreditsCost: 0,
    rewardedGold: 0,
    rewardedXpBoostTimeDays: 0,
    rewardedGoldBoostTimeDays: 0,
};

export const ALL_PREMIUM_SHOP_ITEM_DATA: PremiumShopItemData[] = [];

export async function loadPremiumShopItemData() {
    await loadAndProcessTSVAsset(
        PREMIUM_SHOP_PREADSHEET,
        (lineData) => {
            const data: PremiumShopItemData = {
                ...PREMIUM_SHOP_ITEM_DATA_DEFAULT,
                id: removeWhiteSpace(lineData.getOrThrow('id')!),
                hzIwpItemSku: removeWhiteSpace(lineData.getOrThrow('hz_iwp_item_sku')!),
                description: lineData.getOrThrow('description')!,
                metaCreditsCost: Number.parseFloatOrDefault(lineData.getOrThrowNullableValue('meta_credits_cost'), 0),
                imageAssetId: removeWhiteSpace(lineData.getOrThrowNullableValue('image')!),
                rewardedGold: Number.parseFloatOrDefault(lineData.getOrThrowNullableValue('rewarded_gold'), 0),
                rewardedXpBoostTimeDays: Number.parseFloatOrDefault(lineData.getOrThrowNullableValue('rewarded_xp_boost_time_days'), 0),
                rewardedGoldBoostTimeDays: Number.parseFloatOrDefault(lineData.getOrThrowNullableValue('rewarded_gold_boost_time_days'), 0),
            };
            ALL_PREMIUM_SHOP_ITEM_DATA.push(data);
        },
        'PremiumShopItemData',
    );
}


export function getRewardUIDatasForPremiumShopItem(data: PremiumShopItemData, sfx?: Entity) {
    const rewardUIDatas: RewardUIData[] = [];
    if (data.rewardedGold > 0) {
        rewardUIDatas.push(getRewardUIDataForGoldReward(data.rewardedGold, sfx));
    }
    if (data.rewardedXpBoostTimeDays > 0) {
        rewardUIDatas.push(getRewardUIDataForXpBoost(data.rewardedXpBoostTimeDays * TIME_UNITS.SECONDS_PER_DAY, sfx));
    }
    if (data.rewardedGoldBoostTimeDays > 0) {
        rewardUIDatas.push(getRewardUIDataForGoldBoost(data.rewardedGoldBoostTimeDays * TIME_UNITS.SECONDS_PER_DAY, sfx));
    }
    return rewardUIDatas;
}
