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
import { loadAndProcessTSVAsset } from 'UtilsGameplay';

export const MAX_PLAYTIME_REWARD_MINUTES = 60;
export const PLAYTIME_REWARD_INTERVAL_MINUTES = 5;

const PLAYTIME_REWARD_SPREADSHEET = AssetEx.new('0');

export interface PlaytimeRewardData {
    timeThresholdMinutes: number,
    minRewardedGold: number,
    maxRewardedGold: number,
}

export const PLAYTIME_REWARD_DATA_DEFAULT: PlaytimeRewardData = {
    timeThresholdMinutes: 0,
    minRewardedGold: 0,
    maxRewardedGold: 0,
};

export const ALL_PLAYTIME_REWARD_DATA: PlaytimeRewardData[] = [];

export async function loadPlaytimeRewardData() {
    await loadAndProcessTSVAsset(
        PLAYTIME_REWARD_SPREADSHEET,
        (lineData) => {
            const data: PlaytimeRewardData = {
                ...PLAYTIME_REWARD_DATA_DEFAULT,
                timeThresholdMinutes: Number.parseInt(lineData.getOrThrow('time_threshold_minutes')!),
                minRewardedGold: Number.parseInt(lineData.getOrThrow('min_rewarded_gold')!),
                maxRewardedGold: Number.parseInt(lineData.getOrThrow('max_rewarded_gold')!),
            };
            ALL_PLAYTIME_REWARD_DATA.push(data);
        },
        'PlaytimeRewardData',
    );
}

export function getTimeRemainingText(thresholdMinutes:number, timeSpentMinutes:number) {
    const remainingMinutes = thresholdMinutes - timeSpentMinutes;
    if(remainingMinutes > 1440) {
        return `${Math.ceil(remainingMinutes/1440)}d`;
    }
    else if (remainingMinutes > 60) {
        return `${Math.ceil(remainingMinutes/60)}h`;
    }
    else if (remainingMinutes > 1) {
        return `${Math.ceil(remainingMinutes)}m`;
    } else {
        return `${Math.ceil(remainingMinutes * 60)}s`;
    }
}
