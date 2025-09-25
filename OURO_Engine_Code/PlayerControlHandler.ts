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
import { LoadoutSlot } from 'ConstsLoadout';
import { nuxSwapButtonPressed } from 'Events';
import * as EventsNetworked from 'EventsNetworked';
import { requestDominantHand, setCanEnterSocialMode, setDominantHand, setSocialMode } from 'EventsNetworked';
import { jump, nextFollowTarget, onFirePressed, onFireReleased, reload, swapToWeapon, toggleDebugUI, useAbility } from 'EventsPlayerControls';
import libCam from 'horizon/camera';
import { ButtonIcon, Component, Handedness, Player, PlayerControls, PlayerDeviceType, PlayerInput, PlayerInputAction, PropsFromDefinitions, Vec3 } from 'horizon/core';
import { LocalPlayerComponent } from 'LocalPlayerComponent';
import { getButtonMappingForEntityOwner, InputAction, ScreenButtonManager, ScreenInput } from 'PlayerControlButtonMapping';
import { isServerPlayer } from 'UtilsGameplay';
import { clampVecInPlace, projectVecOntoPlane } from 'UtilsMath';

type InputConfig = {
    mobileInputAction?: InputAction
    nonMobileButton?: PlayerInputAction
}

type InputFunc = (pressed: boolean) => void;

/**
 * This class is the seam between physical controller inputs and mapping to game logic. Try not to add any playerInput registration anywhere except this file.
 * Keep adding more logical groupings here as needed.
 */
export class PlayerControlHandler extends LocalPlayerComponent {
    private currentHeldWeaponSlot = LoadoutSlot.WEAPON_PRIMARY;

    private moveVerticalAxis!: PlayerInput;
    private moveHorizontalAxis!: PlayerInput;

    private isInSocialMode = false;
    private canEnterSocialMode = true;

    private canUseLoadout = true;

    private handedness: Handedness = Handedness.Right;
    private inputSubscriptions: (PlayerInput | ScreenInput)[] = [];

    constructor(hzObj: Component, owner: Player, props: PropsFromDefinitions<{}>, private deviceType: PlayerDeviceType) {
        super(hzObj, owner, props);
    }


    localPreStart() {
        this.configureItIsNeverTimeToNotFast();

        this.hzObj.connectNetworkEvent(this.owner, setDominantHand, (data) => {
            const dominantHand = data.isRightHand ? Handedness.Right : Handedness.Left;
            if (this.handedness == dominantHand) return;

            this.handedness = dominantHand;
            this.disconnectInputs();
            this.connectInputs();
        });

        this.connectInputs();

        this.hzObj.sendNetworkEvent(this.owner, requestDominantHand, {});
    }

    localStart() {
        this.hzObj.connectNetworkEvent(this.owner, EventsNetworked.setCanUseLoadout, (data) => {
            this.canUseLoadout = data.canUseLoadout;
            this.isInSocialMode = data.isInSocialMode;
        });
    }

    localUpdate(deltaTimeSeconds: number) {
    }

    localDispose() {
        // This particular component explicitly should NOT run on servers, unhook the dispose
        if (isServerPlayer(this.owner, this.hzObj.world)) return;

        this.disconnectInputs();
    }

    getPlayersPreferredHand(hand: Handedness): Handedness {
        if (this.isRightHanded()) {
            return hand;
        } else {
            return hand == Handedness.Right ? Handedness.Left : Handedness.Right;
        }
    }

    isRightHanded(): boolean {
        return this.handedness == Handedness.Right;
    }

    getMovementInputAxisXZ(): Vec3 {
        return new Vec3(this.moveHorizontalAxis.axisValue.get(), 0, this.moveVerticalAxis.axisValue.get());
    }

    // Returns a normalized vector pointing in the direction of player input, or the zero vector.
    public getInputDirectionOnXZPlane() {
        const input = this.getMovementInputAxisXZ();
        if (input.x == 0 && input.z == 0) {
            return Vec3.zero;
        }

        return this.transformInputToCameraForwardXZPlane(input);
    }

    // Returns the magnitude of player input normalized to the range [0, 1].
    // In essence, this answers the question: "How far is the player pointing the control stick, from center?"
    // If inputs are digital (instead of analogue), this will always return 0 (not pressed) or 1 (pressed).
    public getInputMagnitude() {
        const input = this.getMovementInputAxisXZ();
        clampVecInPlace(input, 1);
        return input.magnitude();
    }

    private configureItIsNeverTimeToNotFast() {

    }

    private transformInputToCameraForwardXZPlane(input: Vec3): Vec3 {
        clampVecInPlace(input, 1);

        const forwardXZ = projectVecOntoPlane(libCam.forward.get(), Vec3.up);
        const rightXZ = Vec3.cross(Vec3.up, forwardXZ);
        const direction = Vec3.add(rightXZ.mul(input.x), forwardXZ.mul(input.z));

        return direction.normalize();
    }

    private connectInputs() {
        this.connectMovement();

        this.inputSubscriptions = [
            this.connectSwapWeapon(),
            this.connectReload(),
            this.connectJump(),
            this.connectUseAbility(AbilitySlot.PRIMARY),
            this.connectUseAbility(AbilitySlot.UTILITY),
            this.connectFire(),
            this.connectSocialMode(),
            this.connectDebugUI(),
            this.connectNextFollowTargetButton(),
        ].filter(input => input != undefined) as (ScreenInput | PlayerInput)[];

        PlayerControls.disableSystemControls();
    }

    private disconnectInputs() {
        this.moveHorizontalAxis.disconnect();
        this.moveVerticalAxis.disconnect();
        this.inputSubscriptions.forEach(subscription => subscription.disconnect());
        this.inputSubscriptions.length = 0;
    }

    private connectMovement() {
        // See T222673648, it's bugged on mobile
        this.moveVerticalAxis = PlayerControls.connectLocalInput(
            getButtonMappingForEntityOwner(this.hzObj.entity, this.handedness).moveVerticalAxis,
            ButtonIcon.None,
            this.hzObj
        );

        this.moveHorizontalAxis = PlayerControls.connectLocalInput(
            getButtonMappingForEntityOwner(this.hzObj.entity, this.handedness).moveHorizontalAxis,
            ButtonIcon.None,
            this.hzObj
        );
    }

    private connectFire() {
        return this.registerInputFunction(
            {
                mobileInputAction: 'fire',
                nonMobileButton: getButtonMappingForEntityOwner(this.hzObj.entity, this.handedness).fire
            },
            (pressed) => this.hzObj.sendLocalBroadcastEvent(pressed ? onFirePressed : onFireReleased, {}),
        );
    }

    private connectReload() {
        return this.registerInputFunction(
            {
                mobileInputAction: 'reload',
                nonMobileButton: getButtonMappingForEntityOwner(this.hzObj.entity, this.handedness).reload
            },
            (pressed: boolean) => {
                if (!pressed) return;
                this.hzObj.sendLocalBroadcastEvent(reload, {});
            }
        );
    }

    private connectSocialMode() {
        this.hzObj.connectNetworkBroadcastEvent(setCanEnterSocialMode, (data) => this.canEnterSocialMode = data.enabled);

        return this.registerInputFunction(
            {nonMobileButton: getButtonMappingForEntityOwner(this.hzObj.entity, this.handedness).toggleSocialMode},
            (pressed: boolean) => {
                if (!pressed) return;

                if (!this.isInSocialMode) {
                    if (!this.canEnterSocialMode) return;

                    this.currentHeldWeaponSlot = LoadoutSlot.UNDEFINED;
                }

                this.isInSocialMode = !this.isInSocialMode;
                this.hzObj.sendNetworkEvent(this.owner, setSocialMode, {enabled: this.isInSocialMode});
            }
        );
    }

    private connectJump() {
        return this.registerInputFunction(
            {
                mobileInputAction: 'jump',
                nonMobileButton: getButtonMappingForEntityOwner(this.hzObj.entity, this.handedness).jump
            },
            (pressed) => this.hzObj.sendLocalBroadcastEvent(jump, {pressed})
        );
    }

    private connectSwapWeapon() {
        return this.registerInputFunction(
            {
                mobileInputAction: 'swap',
                nonMobileButton: getButtonMappingForEntityOwner(this.hzObj.entity, this.handedness).swap
            },
            (pressed: boolean) => {
                if (!pressed || !this.canUseLoadout) return;

                const nextSlotSelection = this.currentHeldWeaponSlot == LoadoutSlot.WEAPON_PRIMARY ? LoadoutSlot.WEAPON_SECONDARY : LoadoutSlot.WEAPON_PRIMARY;
                this.currentHeldWeaponSlot = nextSlotSelection;
                this.hzObj.sendLocalBroadcastEvent(swapToWeapon, {loadoutSlot: nextSlotSelection});
                this.hzObj.sendLocalEvent(this.owner, nuxSwapButtonPressed, {});
            }
        );
    }

    private connectUseAbility(abilitySlot: AbilitySlot) {
        const slot = abilitySlot;

        const button = getButtonMappingForEntityOwner(this.hzObj.entity, this.handedness).abilities[slot];
        if (!button) {
            console.error(`${AbilitySlot[abilitySlot]} is currently unmapped. Map in PlayerControlHandler`);
            return undefined;
        }

        return this.registerInputFunction(
            {
                mobileInputAction: slot == AbilitySlot.PRIMARY ? 'abilityPrimary' : 'abilityUtility',
                nonMobileButton: button
            },
            (pressed) => this.hzObj.sendLocalBroadcastEvent(useAbility, {slot, pressed})
        );
    }

    private connectDebugUI() {
        return this.registerInputFunction(
            {nonMobileButton: getButtonMappingForEntityOwner(this.hzObj.entity, this.handedness).debugUI},
            (pressed) => {
                if (!pressed) return;

                this.hzObj.sendLocalBroadcastEvent(toggleDebugUI, {});
            }
        );
    }

    private connectNextFollowTargetButton() {
        return this.registerInputFunction(
            {
                mobileInputAction: 'nextFollowTarget',
                nonMobileButton: getButtonMappingForEntityOwner(this.hzObj.entity, this.handedness).nextFollowTarget,
            },
            (pressed) => {
                if (!pressed) return;

                this.hzObj.sendLocalBroadcastEvent(nextFollowTarget, {pressed});
            }
        );
    }

    /** Either registers the mobile controls, or the VR controls, depending on the surface being played on **/
    private registerInputFunction(config: InputConfig, func: InputFunc) {
        switch (this.deviceType) {
            case PlayerDeviceType.Mobile:
                if (config.mobileInputAction != undefined) {
                    return ScreenButtonManager.connectMobileInput(config.mobileInputAction, (pressed: boolean) => func(pressed));
                }
                break;
            case PlayerDeviceType.Desktop:
            // FALLTHROUGH
            case PlayerDeviceType.VR:
                if (config.nonMobileButton != undefined) {
                    const nonMobileInput = PlayerControls.connectLocalInput(config.nonMobileButton, ButtonIcon.None, this.hzObj);
                    // Signature is slightly different here with the unused PlayerInputAction parameter, invoke directly
                    nonMobileInput.registerCallback((_, pressed) => func(pressed));
                    return nonMobileInput;
                }
                break;
            default:
                throw new Error(`Not configured to handle PlayerDeviceType.${PlayerDeviceType[this.deviceType]}`);

        }
    }
}
