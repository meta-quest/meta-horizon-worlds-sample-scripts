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

import { AbilitySlot, AbilityState } from 'ConstsAbility';
import { DEBUG_UI_SHOW_LOCKOUT_TIME } from 'ConstsDebugging';
import { isDeveloper } from 'ConstsGame';
import { AbilityId } from 'ConstsIdsAbility';
import * as Events from 'Events';
import { OnWeaponReleasePayload } from 'Events';
import * as EventsNetworked from 'EventsNetworked';
import { setDominantHand } from 'EventsNetworked';
import { toggleDebugUI, useAbility } from 'EventsPlayerControls';
import { Handedness } from 'horizon/core';
import { LocalPlayerComponent } from 'LocalPlayerComponent';
import { AbilityStateController } from 'PlayerAbilityHandlerStates';

export class PlayerAbilityHandler extends LocalPlayerComponent {
    controllers = new Map<AbilitySlot, AbilityStateController>([
        [AbilitySlot.PRIMARY, new AbilityStateController(this.hzObj, AbilitySlot.PRIMARY, this.isRightHanded)],
        [AbilitySlot.UTILITY, new AbilityStateController(this.hzObj, AbilitySlot.UTILITY, this.isRightHanded)],
    ]);

    private handedness: Handedness = Handedness.Right;
    private highestMessageCounterId: number = 0;
    private canShowDebugUIMutex = true;

    localPreStart() {
        this.hzObj.connectNetworkEvent(this.owner, setDominantHand, (data) => {
            this.handedness = data.isRightHand ? Handedness.Right : Handedness.Left;
        });

        this.hzObj.connectNetworkEvent(this.owner, EventsNetworked.equipAbility, (data) => {
            if (data.messageCounterId < this.highestMessageCounterId) return;
            this.highestMessageCounterId = data.messageCounterId;
            this.equipAbility(data.abilitySlot, data.abilityId, data.playFX);
        })

        this.hzObj.connectNetworkEvent(this.owner, EventsNetworked.setAbilityState, (data) => this.setState(data.abilitySlot, data.state));

        this.hzObj.connectLocalBroadcastEvent(Events.onWeaponGrab, (data) =>
            this.doIfOwner(data.player, () => {
                this.controllers.forEach(controller => controller.setHeldWeapon(data.baseWeapon.weaponData));
            }));

        this.hzObj.connectLocalBroadcastEvent(Events.onWeaponRelease, (data) => this.doIfOwner(data.player, () => this.unequipWeaponIfNeeded(data)));
        this.hzObj.connectLocalBroadcastEvent(Events.onWeaponDisposed, (data) => this.doIfOwner(data.player, () => this.unequipWeaponIfNeeded(data)));

        this.controllers.forEach((controller) => controller.setOwner(this.owner));

        this.hzObj.sendNetworkBroadcastEvent(EventsNetworked.onAbilityHandlerInitialized, {player: this.owner, handler: this.hzObj.entity});

        this.hzObj.connectLocalBroadcastEvent(toggleDebugUI, () => this.handleToggleDebugUIInput());
        this.hzObj.connectLocalBroadcastEvent(useAbility, (payload) => this.controllers.get(payload.slot)?.setButtonPressed(payload.pressed));
        this.hzObj.connectNetworkEvent(this.owner, EventsNetworked.setCanUseLoadout, (data) => this.controllers.forEach((controller, slot) => {
            // Utility Slot is always usable unless interacting with UI
            controller.canUseLoadout = data.canUseLoadout || (!data.isInteractingWithUI && slot == AbilitySlot.UTILITY);
        }));
    }

    localStart() {
    }

    localUpdate(deltaTimeSeconds: number) {
    }

    localDispose() {
    }

    private handleToggleDebugUIInput() {
        if (!this.canShowDebugUIMutex || !isDeveloper(this.owner)) {
            return;
        }
        this.canShowDebugUIMutex = false;
        this.hzObj.sendNetworkBroadcastEvent(EventsNetworked.toggleDebugUIForPlayer, {playerId: this.owner.id});
        this.hzObj.async.setTimeout(() => this.canShowDebugUIMutex = true, DEBUG_UI_SHOW_LOCKOUT_TIME);
    }

    private equipAbility(slot: AbilitySlot, abilityId?: AbilityId, playFX: boolean = true) {
        this.controllers.get(slot)?.equipAbility(abilityId, playFX);
    }

    private setState(slot: AbilitySlot, state: AbilityState) {
        this.controllers.get(slot)?.setState(state);
    }

    private unequipWeaponIfNeeded(data: OnWeaponReleasePayload) {
        this.controllers.forEach(controller => {
            if (controller.heldWeaponData?.id == data.weaponId) {
                controller.setHeldWeapon(undefined);
            }
        });
    }

    private isRightHanded(): boolean {
        return this.handedness == Handedness.Right;
    }
}
