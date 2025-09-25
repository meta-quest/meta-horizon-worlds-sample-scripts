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

import {AMMO_COLOR_DATA_VR, AMMO_WARNING_PERCENT, AmmoColorData, WEAPON_DATA_REGISTRY} from 'ConstsWeapon';

export function getAmmoTextColor(ammoPercent: number, colorData: AmmoColorData = AMMO_COLOR_DATA_VR, isReloading: boolean = false) {
    if (isReloading) {
        return colorData.reloading;
    }
    if (ammoPercent >= AMMO_WARNING_PERCENT) {
        return colorData.default;
    } else if (ammoPercent <= AMMO_WARNING_PERCENT && ammoPercent > 0) {
        return colorData.warning;
    } else {
        return colorData.depleted;
    }
}

export function getLongestActivationRangeOfAllWeapons() {
    return Array.from(WEAPON_DATA_REGISTRY.dataMapping.values())
        .reduce((max, data) => Math.max(max, data.screensTargetingConfig.targetingActivationRangeMeters), -Infinity);
}
