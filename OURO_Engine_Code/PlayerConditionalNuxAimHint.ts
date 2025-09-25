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

import { NUX_AIM_HINT_TIME_S } from 'ConstsGame';
import { nuxShowAimHintUI, onWeaponFired } from 'EventsNetworked';
import { Hint } from 'PlayerConditionalNuxHints';

export class AimHint extends Hint {
    private didShoot = false;

    override shouldShow(): boolean {
        return super.shouldShow() && !this.playerKnowsHowToAim();
    }

    override shouldHide(): boolean {
        return super.shouldHide() && this.playerKnowsHowToAim();
    }

    override shouldSkip(): boolean {
        return this.playerKnowsHowToAim();
    }

    protected override onInitialize() {
        this.subscriptions.push(
            this.hzObj.connectNetworkEvent(this.virtualOwner, onWeaponFired, _ => this.onWeaponFired()),
        );
    }

    protected override getTimeBeforeShowingHint(): number {
        return NUX_AIM_HINT_TIME_S;
    }

    private playerKnowsHowToAim() {
        return this.didShoot;
    }

    protected override onShow() {
        this.hzObj.sendNetworkEvent(this.virtualOwner, nuxShowAimHintUI, {show: true});
    }

    protected override onHide() {
        this.hzObj.sendNetworkEvent(this.virtualOwner, nuxShowAimHintUI, {show: false});
    }

    private onWeaponFired() {
        // TODO: Analytics to show player successfully shot at somebody
        this.didShoot = true;
    }
}
