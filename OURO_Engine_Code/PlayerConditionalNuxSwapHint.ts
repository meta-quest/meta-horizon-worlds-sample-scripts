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

import { NUX_SWAP_HINT_TIME_S } from 'ConstsGame';
import { nuxShowSwapHintUI, nuxWeaponSwapped } from 'EventsNetworked';
import { Hint } from 'PlayerConditionalNuxHints';

export class SwapHint extends Hint {
    private weaponSwapped: boolean = false;

    override shouldShow(): boolean {
        return super.shouldShow() && !this.playerKnowsHowToSwap();
    }

    override shouldHide(): boolean {
        return super.shouldHide() && this.playerKnowsHowToSwap();
    }

    override shouldSkip(): boolean {
        return this.playerKnowsHowToSwap();
    }

    protected override onInitialize() {
        this.subscriptions.push(
            this.hzObj.connectNetworkEvent(this.virtualOwner, nuxWeaponSwapped, this.onWeaponSwapped.bind(this)),
        );
    }

    protected getTimeBeforeShowingHint(): number {
        return NUX_SWAP_HINT_TIME_S;
    }

    private playerKnowsHowToSwap() {
        return this.weaponSwapped;
    }

    protected override onShow() {
        this.hzObj.sendNetworkEvent(this.virtualOwner, nuxShowSwapHintUI, {show: true});
    }

    protected override onHide() {
        this.hzObj.sendNetworkEvent(this.virtualOwner, nuxShowSwapHintUI, {show: false});
    }

    private onWeaponSwapped() {
        // TODO: Analytics to show player successfully swapped their weapon
        this.weaponSwapped = true;
    }
}
