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

import { PrespawnedAssetId } from 'AssetPools';
import { BaseWeapon } from 'BaseWeapon';
import { REVOLVER } from 'ConstsArenaWeapons';
import { Component } from 'horizon/core';

export class AutoRifleWeapon extends BaseWeapon {
    override readonly prespawnedAssetId: PrespawnedAssetId = REVOLVER.prespawnedAssetId;
}
Component.register(AutoRifleWeapon);
