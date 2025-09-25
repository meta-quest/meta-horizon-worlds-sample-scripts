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

import { AbilitySlot, ABILITY_DATA_REGISTRY } from 'ConstsAbility';
import { NUX_ABILITY_HINT_TIME_S } from 'ConstsGame';
import { AbilityActivatedData, activateAbility, nuxShowAbilityHintUI } from 'EventsNetworked';
import { Hint } from 'PlayerConditionalNuxHints';

export class AbilityHint extends Hint {
    private didUseAbility = false;

    override shouldShow(): boolean {
        return super.shouldShow() && !this.playerKnowsHowToUseAbilities();
    }

    override shouldHide(): boolean {
        return super.shouldHide() && this.playerKnowsHowToUseAbilities();
    }

    override shouldSkip(): boolean {
        return this.playerKnowsHowToUseAbilities();
    }

    protected override onInitialize() {
        this.subscriptions.push(
            this.hzObj.connectNetworkBroadcastEvent(activateAbility, this.onAbilityActivated.bind(this)),
        );
    }

    protected getTimeBeforeShowingHint(): number {
        return NUX_ABILITY_HINT_TIME_S;
    }

    private playerKnowsHowToUseAbilities() {
        return this.didUseAbility;
    }

    protected override onShow() {
        this.hzObj.sendNetworkEvent(this.virtualOwner, nuxShowAbilityHintUI, {show: true});
    }

    protected override onHide() {
        this.hzObj.sendNetworkEvent(this.virtualOwner, nuxShowAbilityHintUI, {show: false});
    }

    private onAbilityActivated(data: AbilityActivatedData) {
        if (data.player != this.virtualOwner) {
            return;
        }
        if (data.abilitySlot != AbilitySlot.PRIMARY) {
            return;
        }
        const abilityData = ABILITY_DATA_REGISTRY.get(data.abilityId);
        if (abilityData?.isPassive) {
            // Passive abilities get 'activated' but shouldn't trigger the nux
            return;
        }
        // TODO: Analytics to show player used their first primary ability
        this.didUseAbility = true;
    }
}
