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

import { NUX_MOVE_HINT_TIME_S } from 'ConstsGame';
import { nuxMovementHintAmountExceeded, nuxShowMoveHintUI } from 'EventsNetworked';
import { Hint } from 'PlayerConditionalNuxHints';

export class MoveHint extends Hint {
    didMoveEnough = false;

    protected onInitialize() {
        this.subscriptions.push(
            this.hzObj.connectNetworkEvent(this.virtualOwner, nuxMovementHintAmountExceeded, this.onMovementAmountExceeded.bind(this)),
        )
    }

    override shouldShow(): boolean {
        return super.shouldShow() && !this.playerKnowsHowToMove();
    }

    override shouldHide(): boolean {
        return super.shouldHide() && this.playerKnowsHowToMove();
    }

    override shouldSkip(): boolean {
        return this.playerKnowsHowToMove();
    }

    protected override getTimeBeforeShowingHint(): number {
        return NUX_MOVE_HINT_TIME_S;
    }

    private playerKnowsHowToMove() {
        return this.didMoveEnough;
    }

    private onMovementAmountExceeded() {
        // TODO: Analytics to show player took a step
        this.didMoveEnough = true;
    }

    protected override onShow() {
        this.hzObj.sendNetworkEvent(this.virtualOwner, nuxShowMoveHintUI, {show: true});
    }

    protected override onHide() {
        this.hzObj.sendNetworkEvent(this.virtualOwner, nuxShowMoveHintUI, {show: false});
    }
}
