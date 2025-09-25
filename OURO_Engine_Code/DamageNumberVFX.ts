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
import { DamageNumberData } from 'ConstsDamageNumber';
import {
    DAMAGE_NUMBER_COLOR_BODY,
    DAMAGE_NUMBER_COLOR_CRIT,
    DAMAGE_NUMBER_LIFE_SECONDS_BODY,
    DAMAGE_NUMBER_LIFE_SECONDS_CRIT,
    DAMAGE_NUMBER_SIZE_BODY,
    DAMAGE_NUMBER_SIZE_CRIT,
    DAMAGE_NUMBER_VELOCITY_BODY,
    DAMAGE_NUMBER_VELOCITY_CRIT,
    DAMAGE_NUMBER_VELOCITY_RANDOMNESS_SCALAR_BODY,
    DAMAGE_NUMBER_VELOCITY_RANDOMNESS_SCALAR_CRIT
} from 'ConstsVFX';
import { showDamageNumber } from 'EventsNetworked';
import { queueFrameDistributedExecution } from 'FrameDistributor';
import { Component } from 'horizon/core';
import { LocalClientPlayerAsset } from 'PlayerAsset';
import { setVFXParametersAndPlay } from 'UtilsFX';

/** This class is our VFX variant of text damage numbers. This script component is meant to be attached to the VFX entity.*/
export class DamageNumberVFX extends LocalClientPlayerAsset<typeof DamageNumberVFX> {
    static propsDefinition = {};

    override readonly prespawnedAssetId: PrespawnedAssetId = 'DamageNumberVFX';

    override onPreStart() {
        this.connectNetworkEvent(this.entity, showDamageNumber, (data) => this.showDamageNumber(data));
    }

    override onStart(): void {
        // no-op
    }

    override onReturnFromClient() {
    }

    override onReturnToServer(): void {
        // no-op
    }

    private showDamageNumber(data: DamageNumberData) {
        if (!data.changeData) return;

        queueFrameDistributedExecution('PLAY_FX_GUARANTEED', () => {
            setVFXParametersAndPlay(
                this.entity,
                {players: [this.owner], oneShot: true, position: data.pos, localOnly: true},
                [
                    ['color', data.changeData.isHeadshotHit || data.changeData.isCrit ? DAMAGE_NUMBER_COLOR_CRIT : DAMAGE_NUMBER_COLOR_BODY],
                    ['radius', data.changeData.isHeadshotHit || data.changeData.isCrit ? DAMAGE_NUMBER_SIZE_CRIT : DAMAGE_NUMBER_SIZE_BODY],
                    ['velocity', data.changeData.isHeadshotHit || data.changeData.isCrit ? DAMAGE_NUMBER_VELOCITY_CRIT : DAMAGE_NUMBER_VELOCITY_BODY],
                    ['life', data.changeData.isHeadshotHit || data.changeData.isCrit ? DAMAGE_NUMBER_LIFE_SECONDS_CRIT : DAMAGE_NUMBER_LIFE_SECONDS_BODY],
                    ['velocity_rand_min_max', data.changeData.isHeadshotHit || data.changeData.isCrit ? DAMAGE_NUMBER_VELOCITY_RANDOMNESS_SCALAR_CRIT : DAMAGE_NUMBER_VELOCITY_RANDOMNESS_SCALAR_BODY],
                    ['number', data.changeData.changeData.amount],
                ]
            );
        });
    }
}

// @ts-ignore - "Type instantiation is excessively deep and possibly infinite"???
Component.register(DamageNumberVFX);
