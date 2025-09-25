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

import { ABILITY_DATA_REGISTRY } from 'ConstsAbility';
import { NUX_MIN_CLAPBACK_HOLD_TIME_MS } from 'ConstsGame';
import { AbilityId } from 'ConstsIdsAbility';
import {
    AbilityActivatedData, AbilityDeactivatedData,
    activateAbility,
    deactivateAbility,
    nuxShowHoldAndReleaseUI
} from 'EventsNetworked';
import { GamePlayer } from 'GamePlayer';
import { Hint } from 'PlayerConditionalNuxHints';
import { clearAsyncInterval } from 'UtilsGameplay';

export class HoldAndReleaseAbilityHint extends Hint {
    private heldLongEnoughTimeoutId?: number;

    override shouldShow(): boolean {
        return super.shouldShow() && !this.playerKnowsHowToHoldAndRelease();
    }

    override shouldHide(): boolean {
        return super.shouldHide() && this.playerKnowsHowToHoldAndRelease();
    }

    override shouldSkip(): boolean {
        return this.playerKnowsHowToHoldAndRelease();
    }

    private playerKnowsHowToHoldAndRelease() {
        const gp = GamePlayer.getGamePlayer(this.virtualOwner);
        if (!gp) return true;
        return gp.persistentStorageService.seenState.isSeen(this.seenId);
    }

    private onAbilityActivated(data: AbilityActivatedData) {
        if (data.player != this.virtualOwner) return;
        if (!this.isHoldAndReleaseAbility(data.abilityId)) return;
        clearAsyncInterval(this.hzObj, this.heldLongEnoughTimeoutId);
        this.heldLongEnoughTimeoutId = this.hzObj.async.setTimeout(() => this.markComplete(), NUX_MIN_CLAPBACK_HOLD_TIME_MS);
    }

    private onAbilityDeactivated(data: AbilityDeactivatedData) {
        if (data.player != this.virtualOwner) return;
        if (!this.isHoldAndReleaseAbility(data.abilityId)) return;
        clearAsyncInterval(this.hzObj, this.heldLongEnoughTimeoutId);
    }

    private isHoldAndReleaseAbility(abilityId: AbilityId) {
        return ABILITY_DATA_REGISTRY.get(abilityId)?.nuxConditionalText == this.seenId;
    }

    private markComplete() {
        const gp = GamePlayer.getGamePlayer(this.virtualOwner);
        gp?.persistentStorageService.seenState.setIsSeen(this.seenId, true);
    }

    protected onShow(): void {
        this.subscriptions.push(
            this.hzObj.connectNetworkBroadcastEvent(activateAbility, this.onAbilityActivated.bind(this)),
            this.hzObj.connectNetworkBroadcastEvent(deactivateAbility, this.onAbilityDeactivated.bind(this)),
        );
        this.hzObj.sendNetworkEvent(this.virtualOwner, nuxShowHoldAndReleaseUI, {show: true});
    }

    protected onHide(): void {
        this.hzObj.sendNetworkEvent(this.virtualOwner, nuxShowHoldAndReleaseUI, {show: false});
    }
}
