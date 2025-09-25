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

import { NUX_ROTATION_HINT_TIME_S } from 'ConstsGame';
import { nuxRotationHintAmountExceeded, nuxShowRotateHintUI } from 'EventsNetworked';
import { Hint } from 'PlayerConditionalNuxHints';

export class RotateHint extends Hint {
    didRotateEnough: boolean = false;

    protected onInitialize() {
        this.subscriptions.push(
            this.hzObj.connectNetworkEvent(this.virtualOwner, nuxRotationHintAmountExceeded, this.onRotationAmountExceeded.bind(this)),
        );
    }

    override shouldShow(): boolean {
        return super.shouldShow() && !this.playerKnowsHowToRotate();
    }

    override shouldHide(): boolean {
        return super.shouldHide() && this.playerKnowsHowToRotate();
    }

    override shouldSkip(): boolean {
        return this.playerKnowsHowToRotate();
    }

    protected getTimeBeforeShowingHint(): number {
        return NUX_ROTATION_HINT_TIME_S;
    }

    private onRotationAmountExceeded() {
        this.didRotateEnough = true;
    }

    private playerKnowsHowToRotate() {
        // TODO: Analytics to show player looked around
        return this.didRotateEnough;
    }

    protected override onShow() {
        this.hzObj.sendNetworkEvent(this.virtualOwner, nuxShowRotateHintUI, {show: true});
    }

    protected override onHide() {
        this.hzObj.sendNetworkEvent(this.virtualOwner, nuxShowRotateHintUI, {show: false});
    }
}
