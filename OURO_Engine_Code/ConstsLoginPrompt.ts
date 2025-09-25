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
import { getCleanCSVArray, loadAndProcessTSVAsset } from 'UtilsGameplay';

const LOGIN_PROMPT_SPREADSHEET = AssetEx.new('0');

export interface LoginPromptData {
    date_utc_milliseconds: number,
    id: string,
    images: TextureImageAssetEx[],
}

export const ALL_LOGIN_PROMPT_DATA: LoginPromptData[] = [];

export async function loadLoginPromptData() {
    await loadAndProcessTSVAsset(
        LOGIN_PROMPT_SPREADSHEET,
        (lineData) => {
            const images:TextureImageAssetEx[] = [];
            getCleanCSVArray(lineData.get('images')).forEach((imageAssetId)=>{
                images.push(TextureImageAssetEx.latest(imageAssetId));
            });

            const data: LoginPromptData = {
                date_utc_milliseconds:  Number.parseFloatOrDefault(lineData.getOrThrow('date_utc_milliseconds'), 0),
                id: lineData.getOrThrow('id')!,
                images: images,
            };
            ALL_LOGIN_PROMPT_DATA.push(data);
        },
        'LoginPromptData',
    );
}

export function getLastestPromptData():LoginPromptData | undefined {
    let latest = undefined;
    let latestTime = 0;
    ALL_LOGIN_PROMPT_DATA.forEach((data) => {
        if(data.date_utc_milliseconds > latestTime) {
            latest = data;
            latestTime = data.date_utc_milliseconds ;
        }
    });

    return latest;
}
