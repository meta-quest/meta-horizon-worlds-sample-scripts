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

import { AbilitySlot } from 'ConstsAbility';
import { Entity, Handedness, PlayerDeviceType, PlayerInputAction } from 'horizon/core';
import { UIInteractable } from 'UtilsUI';

const ALL_INPUT_ACTIONS = [
    'fire',
    'reload',
    'toggleSocialMode',
    'moveVerticalAxis',
    'moveHorizontalAxis',
    'jump',
    'swap',
    'abilityPrimary',
    'abilityUtility',
    'nextFollowTarget',
] as const;
export type InputAction = typeof ALL_INPUT_ACTIONS[number];

export type ButtonMapping = {
    fire: PlayerInputAction,
    reload: PlayerInputAction,

    toggleSocialMode: PlayerInputAction,

    moveVerticalAxis: PlayerInputAction,
    moveHorizontalAxis: PlayerInputAction,

    jump: PlayerInputAction,

    swap: PlayerInputAction,

    abilities: {
        [key in AbilitySlot]?: PlayerInputAction
    },

    debugUI: PlayerInputAction,

    nextFollowTarget: PlayerInputAction,
}

export const VR_BUTTON_MAPPING_RIGHT_DOMINANT: ButtonMapping = {
    fire: PlayerInputAction.RightTrigger, // Right trigger
    reload: PlayerInputAction.RightSecondary, // B (right upper button)

    toggleSocialMode: PlayerInputAction.LeftPrimary, // X (left lower button)

    moveVerticalAxis: PlayerInputAction.LeftYAxis, // Left stick vertical axis
    moveHorizontalAxis: PlayerInputAction.LeftXAxis, // Left stick horizontal axis

    jump: PlayerInputAction.Jump, // A (right lower button)

    swap: PlayerInputAction.RightGrip, // Right Grip

    abilities: {
        [AbilitySlot.PRIMARY]: PlayerInputAction.RightPrimary, // Right thumbstick click
        [AbilitySlot.UTILITY]: PlayerInputAction.LeftTertiary, // Left thumbstick click
    },

    debugUI: PlayerInputAction.LeftSecondary, // Y (left higher button)

    nextFollowTarget: PlayerInputAction.RightTrigger,
};

export const VR_BUTTON_MAPPING_LEFT_DOMINANT: ButtonMapping = {
    ...VR_BUTTON_MAPPING_RIGHT_DOMINANT,

    fire: PlayerInputAction.LeftTrigger, // Left trigger
    reload: PlayerInputAction.LeftSecondary, // Y (Left upper button)
    swap: PlayerInputAction.LeftGrip, // Left Grip
    debugUI: PlayerInputAction.RightSecondary, // B (right higher button)
    nextFollowTarget: PlayerInputAction.LeftTrigger,
};

// These are gross. Ignore them for now, it just... doesn't work. A bunch of keys, at the API level, aren't mapped (like Z, X, C)
export const HWXS_BUTTON_MAPPING: ButtonMapping = {
    fire: PlayerInputAction.RightTrigger, // Left click
    reload: PlayerInputAction.RightPrimary, // R

    toggleSocialMode: PlayerInputAction.LeftPrimary, // T

    moveVerticalAxis: PlayerInputAction.LeftYAxis, // W and S
    moveHorizontalAxis: PlayerInputAction.LeftXAxis, // A and D

    jump: PlayerInputAction.Jump, // Space

    swap: PlayerInputAction.LeftSecondary, // G

    abilities: {
        [AbilitySlot.PRIMARY]: PlayerInputAction.RightSecondary, // F
        [AbilitySlot.UTILITY]: PlayerInputAction.LeftGrip, // Q
    },

    debugUI: PlayerInputAction.LeftTertiary, // H

    nextFollowTarget: PlayerInputAction.RightTrigger,
};

export function getButtonMappingForEntityOwner(entity: Entity, handedness: Handedness) {
    if (entity.owner.get().deviceType.get() == PlayerDeviceType.VR) {
        if (handedness == Handedness.Right) {
            return VR_BUTTON_MAPPING_RIGHT_DOMINANT;
        } else {
            return VR_BUTTON_MAPPING_LEFT_DOMINANT;
        }
    }

    return HWXS_BUTTON_MAPPING;
}

/**Defines a connected input for an on-screen button (overlay). Used for Mobile (and potentially future Desktop) UI.*/
export class ScreenInput {
    constructor(
        readonly action: InputAction,
        readonly id: number,
        readonly callback: (pressed: boolean) => void
    ) {
    }

    disconnect() {
        ScreenButtonManager.disconnectInputCallback(this);
    }
}

/** == SINGLETON == Manages input subscriptions for on-screen (overlaid) buttons. Used for Mobile (and potentially future Desktop) UI.*/
export class ScreenButtonManager {
    private static callbackMap = new Map<InputAction, ScreenInput[]>;
    private static registeredCallbacksCounter = 0;

    public static linkOnPressAction<T extends UIInteractable<T>>(action: InputAction, uiComponent: T) {
        uiComponent.callbacks.onPress = () => this.doAction(action, true);
        uiComponent.callbacks.onRelease = () => this.doAction(action, false);
        return uiComponent;
    }

    public static connectMobileInput(action: InputAction, callback: (pressed: boolean) => void): ScreenInput {
        const registeredCallbacks = this.callbackMap.get(action);
        const inputCallback = new ScreenInput(action, this.registeredCallbacksCounter++, callback);

        if (registeredCallbacks) {
            registeredCallbacks.push(inputCallback);
            this.callbackMap.set(action, registeredCallbacks);
            return inputCallback;
        }

        this.callbackMap.set(action, [inputCallback]);
        return inputCallback;
    }

    public static disconnectInputCallback(callback: ScreenInput) {
        const activeCallbacks = this.callbackMap.get(callback.action);

        if (!activeCallbacks) return;

        const newActiveCallbacks = activeCallbacks?.filter((obj) => obj.id != callback.id);
        this.callbackMap.set(callback.action, newActiveCallbacks);
    }

    private static doAction(action: InputAction, pressed: boolean) {
        const callbacks = this.callbackMap.get(action);
        callbacks?.forEach((input) => input.callback(pressed));
    }
}
