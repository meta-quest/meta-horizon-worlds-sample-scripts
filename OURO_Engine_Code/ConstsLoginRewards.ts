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
import { registerEntitlementId } from 'ConstsEntitlements';
import { RewardContentTypes } from 'ConstsRewards';
import { UI_CURRENCY_IMAGE_MONEY_S } from 'ConstsUIStrike';
import { getCleanCSVArray, loadAndProcessTSVAsset } from 'UtilsGameplay';

const LOGIN_REWARD_SPREADSHEET = AssetEx.new('0');

export interface LoginRewardData {
    day: number,
    icon: TextureImageAssetEx,
    rewardedXpBoostTimeHours: number,
    rewardedGoldBoostTimeHours: number,
    rewardedGold: number,
    rewardedEntitlementIds: string[],
    rewardedContentTypes: RewardContentTypes[],
}

export const ALL_LOGIN_REWARD_DATA: LoginRewardData[] = [];

export async function loadLoginRewardData() {
    await loadAndProcessTSVAsset(
        LOGIN_REWARD_SPREADSHEET,
        (lineData) => {
            const data: LoginRewardData = {
                day: Number.parseInt(lineData.getOrThrow('day')!),
                icon: lineData.getOrThrowNullableValue('icon') ? TextureImageAssetEx.latest(lineData.getOrThrow('icon')!) : UI_CURRENCY_IMAGE_MONEY_S,
                rewardedXpBoostTimeHours:  Number.parseIntOrDefault(lineData.getOrThrowNullableValue('rewarded_xp_boost_time_hours'), 0),
                rewardedGoldBoostTimeHours: Number.parseIntOrDefault(lineData.getOrThrowNullableValue('rewarded_gold_boost_time_hours'), 0),
                rewardedGold: Number.parseIntOrDefault(lineData.getOrThrowNullableValue('rewarded_gold'), 0),
                rewardedEntitlementIds: getCleanCSVArray(lineData.getOrThrowNullableValue('rewarded_entitlement_ids')),
                rewardedContentTypes: getCleanCSVArray(lineData.getOrThrowNullableValue('rewarded_content_types')) as RewardContentTypes[], // TODO fooj: @Vu this isn't safe, should use our isValid pattern.
            };
            ALL_LOGIN_REWARD_DATA.push(data);
            data.rewardedEntitlementIds.forEach((entitlementId) => {
                registerEntitlementId(entitlementId);
            });
        },
        'LoginRewardData',
    );
}


export const DATE_ID_START_TIMESTAMP_MILLISECONDS = 1752480000000; // Mon Jul 14 2025 01:00:00 GMT-0700 (Pacific Daylight Time)

export function getUtcMillisecondsFromDateId(dateId: number, timeRangeMilliseconds: number) {
    return DATE_ID_START_TIMESTAMP_MILLISECONDS + dateId*timeRangeMilliseconds;
}

export function getDateId(utcMilliseconds: number, timeRangeMilliseconds: number) {
    // NOTE: convert to seconds because milliseconds caused precision issues when dividing
    const seconds = (utcMilliseconds - DATE_ID_START_TIMESTAMP_MILLISECONDS) / 1000;
    const timeRangeSeconds = timeRangeMilliseconds/1000;
    return Math.floor(seconds / timeRangeSeconds);
}
