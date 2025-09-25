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
import { AbilitySlot } from 'ConstsAbility';
import { Component, PropTypes } from 'horizon/core';
import { BasePlayerAbility } from 'BasePlayerAbility';

export class AbilitySample extends BasePlayerAbility<typeof AbilitySample> {
    static propsDefinition = {
        ...BasePlayerAbility.propsDefinition,
        abilitySFX_player: {type: PropTypes.Entity},
        abilitySFX_other: {type: PropTypes.Entity},
    };

    override readonly prespawnedAssetId: PrespawnedAssetId = 'AbilitySample';

    protected getSlot(): AbilitySlot {
        return AbilitySlot.PRIMARY;
    }

    override buildGameFXs() {
        super.buildGameFXs();

    }

    override onPreStart() {
        super.onPreStart();

   }

    override activate(activationIndex: number) {
        super.activate(activationIndex);
    }

    override deactivate() {
        super.deactivate();
    }


}
Component.register(AbilitySample);
