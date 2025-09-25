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

import { AbilityHandlerBehavior, AbilitySlot, AbilityState, ABILITY_DATA_DEFAULT, ABILITY_DATA_REGISTRY } from 'ConstsAbility';
import * as EventsNetworked from 'EventsNetworked';

import { AbilityId } from 'ConstsIdsAbility';
import { WeaponData } from 'ConstsWeapon';
import { Component, Player } from 'horizon/core';
import * as UtilsGameplay from 'UtilsGameplay';

// Controller

export class AbilityStateController {
    owner!: Player;

    state: HandlerState;
    allStates: Map<AbilityState, HandlerState>;

    abilityData = ABILITY_DATA_DEFAULT;

    heldWeaponData?: WeaponData;
    canUseLoadout = true;

    activationIndex = 0;

    constructor(private networkProvider: Component, private slot: AbilitySlot, private isRightHanded: () => boolean) {
        this.allStates = new Map<AbilityState, HandlerState>([
            [AbilityState.DISABLED, new HandlerState_Disabled(this)],
            [AbilityState.READY, new HandlerState_Ready(this)],
            [AbilityState.PRIMED, new HandlerState_Primed(this)],
            [AbilityState.ACTIVE, new HandlerState_Active(this)],
            [AbilityState.COOLDOWN, new HandlerState_Cooldown(this)],
        ]);
        this.state = this.allStates.get(AbilityState.READY)!;
    }

    setOwner(owner: Player) {
        this.owner = owner;
    }

    setHeldWeapon(heldWeaponData: WeaponData | undefined) {
        this.heldWeaponData = heldWeaponData;
    }

    setButtonPressed(pressed: boolean) {
        if (this.abilityData.id == ABILITY_DATA_DEFAULT.id || this.abilityData.isPassive) {
            return;
        }

        if (pressed) {
            this.state.onButtonPressed();
        } else {
            this.state.onButtonReleased();
        }
    }

    setState(state: AbilityState) {
        this.switchToState(this.allStates.get(state)!);
    }

    private switchToState(state: HandlerState) {
        this.state.onExit();
        this.state = state;
        this.state.onEnter();
    }

    equipAbility(abilityId?: AbilityId, playFX: boolean = true) {
        this.abilityData = ABILITY_DATA_REGISTRY.get(abilityId) ?? ABILITY_DATA_DEFAULT;
        this.setState(AbilityState.READY);
        if (this.abilityData.isPassive) {
            this.activateAbility();
        }
        this.activationIndex = 0;
    }

    primeAbility() {
        this.setState(AbilityState.PRIMED);
        this.networkProvider.sendNetworkBroadcastEvent(EventsNetworked.primeAbility, {
            player: this.owner,
            abilitySlot: this.slot,
            abilityId: this.abilityData.id,
            isRight: this.isRightHanded(),
        });
        this.activationIndex = 0;
    }

    activateAbility() {
        UtilsGameplay.playHaptics(this.owner, false);
        this.setState(AbilityState.ACTIVE);
        this.networkProvider.sendNetworkBroadcastEvent(EventsNetworked.activateAbility, {
            player: this.owner,
            abilitySlot: this.slot,
            abilityId: this.abilityData.id,
            isRight: this.isRightHanded(),
            activationIndex: this.activationIndex,
            success: true
        });
        this.activationIndex++;
    }

    deactivateAbility() {
        this.networkProvider.sendNetworkBroadcastEvent(EventsNetworked.deactivateAbility, {
            player: this.owner,
            abilitySlot: this.slot,
            abilityId: this.abilityData.id
        });
        this.activationIndex = 0;
    }

    canActivateAbility(): boolean {
        if (this.abilityData.morphWeaponData && !this.heldWeaponData) {
            this.sendActivationFailEvent(this.abilityData.displayName + '<br>requires a held weapon.');
            return false;
        }

        return this.canUseLoadout && this.isAllowedByHeldWeapon();
    }

    isAllowedByHeldWeapon() {
        if (this.abilityData.requiredWeaponIds.length == 0) {
            return true;
        }

        if (!this.heldWeaponData) {
            console.error(`ability requires a weapon but user is not holding a weapon`);
            return false;
        }

        const heldWeaponId = this.heldWeaponData.id;
        const matchingWeaponId = this.abilityData.requiredWeaponIds.find(requiredWeaponId => heldWeaponId == requiredWeaponId);
        return matchingWeaponId != undefined;
    }

    sendActivationFailEvent(errorText?: string) {
        this.networkProvider.sendNetworkBroadcastEvent(EventsNetworked.activateAbility, {
            player: this.owner,
            abilitySlot: this.slot,
            abilityId: this.abilityData.id,
            isRight: this.isRightHanded(),
            activationIndex: this.activationIndex,
            success: false,
            errorText: errorText,
        });
    }
}

// States

class HandlerState {
    controller: AbilityStateController;

    constructor(controller: AbilityStateController) {
        this.controller = controller;
    }

    onEnter() {
    }

    onExit() {
    }

    onButtonPressed() {
    }

    onButtonReleased() {
    }

    protected doButtonBehavior(behavior?: AbilityHandlerBehavior) {
        if (behavior == undefined) return;

        switch (behavior) {
            case AbilityHandlerBehavior.PRIME:
                this.controller.primeAbility();
                break;
            case AbilityHandlerBehavior.ACTIVATE:
                this.controller.activateAbility();
                break;
            case AbilityHandlerBehavior.REACTIVATE:
                this.controller.activateAbility();
                break;
            case AbilityHandlerBehavior.DEACTIVATE:
                this.controller.deactivateAbility();
                break;
        }
    }
}

class HandlerState_Disabled extends HandlerState {
    override onEnter() {
        this.controller.deactivateAbility();
    }

    override onButtonPressed() {
        // TODO: Legacy, is this still desired?
        this.controller.sendActivationFailEvent();
    }
}

class HandlerState_Ready extends HandlerState {

    override onButtonPressed() {
        if (!this.controller.canActivateAbility()) {
            return;
        }
        this.doButtonBehavior(this.controller.abilityData.onButtonDown);
    }

    override onButtonReleased() {
        if (!this.controller.canActivateAbility()) {
            return;
        }
        this.doButtonBehavior(this.controller.abilityData.onButtonUp);
    }
}

class HandlerState_Primed extends HandlerState {
    override onButtonPressed() {
        this.doButtonBehavior(this.controller.abilityData.onButtonDown);
    }

    override onButtonReleased() {
        this.doButtonBehavior(this.controller.abilityData.onButtonUp);
    }
}

class HandlerState_Active extends HandlerState {
    override onButtonPressed() {
        this.doButtonBehavior(this.controller.abilityData.onButtonDown2);
    }

    override onButtonReleased() {
        this.doButtonBehavior(this.controller.abilityData.onButtonUp);
    }
}

class HandlerState_Cooldown extends HandlerState {
    override onEnter() {
        this.controller.deactivateAbility();
    }

    override onButtonPressed() {
        this.controller.sendActivationFailEvent();
    }
}
