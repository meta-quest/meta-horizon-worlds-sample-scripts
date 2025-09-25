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

import {BaseAbilityObj} from 'BaseAbilityObj';
import * as ConstsStatusEffect from 'ConstsStatusEffect';
import * as EventData from 'EventData';
import {ChangeAction, ChangeElement, TargetScheme} from 'EventData';
import * as ConstsWeapon from 'ConstsWeapon';
import {WeaponId} from 'ConstsIdsWeapon';
import {AbilityId} from 'ConstsIdsAbility';
import {StatusEffectId} from 'ConstsIdsStatusEffect';
import {DEFAULT_PLAYER_AIR_SPEED_PERCENT, IS_OPEN_BETA_BUILD} from 'ConstsGame';
import {AssetData, AssetEx, TextureImageAssetEx} from 'AssetEx';
import {GameContentData} from 'ConstsGameContent';
import {LoadoutSlot} from 'ConstsLoadout';
import {HapticsSettings} from 'ConstsHaptics';
import {JUMP_BUTTON_ICON} from 'ConstsMobileButtons';
import { PrespawnedAssetId } from 'AssetPools';
import {HintId} from 'ConstsIdsNuxHints';
import { Color, Handedness, HapticSharpness, HapticStrength, Quaternion, Vec3 } from 'horizon/core';

export enum AbilityState {
    UNDEFINED = -1,
    DISABLED = 0,
    READY = 1,
    PRIMED,
    ACTIVE,
    COOLDOWN,
}

export enum AbilitySlot {
    UNDEFINED = -1,
    PRIMARY,
    UTILITY,
}

export enum AbilityHandlerBehavior {
    PRIME,
    ACTIVATE,
    REACTIVATE,
    DEACTIVATE,
}

export interface AbilityUseWeaponData {
    handOffset: Vec3,
    handRotOffset: Quaternion,

    hitStartDelay: number,
    stopSyncWhileHitActive: boolean,
}

export interface AbilityMorphWeaponData {
    weaponIdsMap: Map<WeaponId, WeaponId>,
    startAttackOnMorph: boolean,
    /** When should it auto-fire after weapon has been morphed.*/
    hitStartDelay: number,
    unmorphOnEnd: boolean,
    unmorphOnRelease: boolean,
}

export interface AbilityChargesData {
    maxChargesCount: number,
    initialChargeCount: number,
    energyRequirementPerCharge: number,
    energyRegenRate: number,
}

export const ABILITY_CHARGE_DATA_DEFAULT: AbilityChargesData = {
    maxChargesCount: 0, // max charges
    initialChargeCount: 0, // initial starting charges
    energyRequirementPerCharge: 0, // how much energy is required to regenerate a charge
    energyRegenRate: 0., // how much energy is regenerated per second
};

export const ABILITY_HAPTICS_SETTINGS_DEFAULT: HapticsSettings = {
    strength: HapticStrength.Strong,
    sharpness: HapticSharpness.Coarse,
    duration: 500,
    handedness: Handedness.Right,
};

export const ABILITY_HAPTICS_DATA_DEFAULT_OFFHAND: HapticsSettings = {
    ...ABILITY_HAPTICS_SETTINGS_DEFAULT,
    handedness: Handedness.Left,
};

export interface AbilityStateHapticsSettings {
    disabled: HapticsSettings[] | undefined,
    primed: HapticsSettings[] | undefined,
    ready: HapticsSettings[] | undefined,
    activated: HapticsSettings[] | undefined,
    deactivated: HapticsSettings[] | undefined,
}

export const ABILITY_STATE_HAPTICS_SETTINGS_DEFAULT: AbilityStateHapticsSettings = {
    disabled: undefined,
    primed: undefined,
    ready: [ABILITY_HAPTICS_SETTINGS_DEFAULT, ABILITY_HAPTICS_DATA_DEFAULT_OFFHAND],
    activated: undefined,
    deactivated: undefined,
};

export interface AbilityStateSharedAudioSettings {
    disabled: boolean,
    primed: boolean,
    ready: boolean,
    activated: boolean,
    deactivated: boolean,
}

export const ABILITY_STATE_SHARED_AUDIO_SETTINGS_DEFAULT: AbilityStateSharedAudioSettings = {
    disabled: true,
    primed: true,
    ready: true,
    activated: true,
    deactivated: true,
};

export interface AbilityObjData {
    onStartAttack: ((abiltyObj: BaseAbilityObj<typeof BaseAbilityObj>) => void) | undefined;
    onStartHit: ((abiltyObj: BaseAbilityObj<typeof BaseAbilityObj>) => void) | undefined;
    onTick: ((abiltyObj: BaseAbilityObj<typeof BaseAbilityObj>) => void) | undefined;
    onStopHit: ((abiltyObj: BaseAbilityObj<typeof BaseAbilityObj>) => void) | undefined;
    onStopAttack: ((abiltyObj: BaseAbilityObj<typeof BaseAbilityObj>) => void) | undefined;
}

export interface AbilityData extends GameContentData<AbilityId> {
    asset?: AssetEx,

    prespawnedAssetId: PrespawnedAssetId,

    secondaryActionIconImg: TextureImageAssetEx,

    color: Color,

    canBeDisabled: boolean,
    isPassive: boolean,

    onButtonDown?: AbilityHandlerBehavior,
    onButtonUp?: AbilityHandlerBehavior,
    onButtonDown2?: AbilityHandlerBehavior,

    radius: number,
    tickRate: number,

    duration: number,
    cooldown: number,

    statusEffects: StatusEffectId[],

    playActivationEffect: boolean,

    nuxConditionalText?: HintId,

    aggroRadius: number,
    onActivationAggro: number,
    onDeactivationAggro: number,

    primaryUseWeaponData: AbilityUseWeaponData | undefined,
    secondaryUseWeaponData: AbilityUseWeaponData | undefined,

    morphWeaponData: AbilityMorphWeaponData | undefined,
    abilityObjectData: AbilityObjData | undefined,

    chargesData: AbilityChargesData | undefined,

    requiredWeaponIds: WeaponId[],

    haptics: AbilityStateHapticsSettings,
    // Whether to play the shared audio in GlobalSFXBank for each state
    sharedAudio: AbilityStateSharedAudioSettings,

    showIcon: boolean,
    jumpButtonConfig?: (jumpCount: number, state: AbilityState) => {
        background?: TextureImageAssetEx,
        icon: TextureImageAssetEx,
    },
    abilityButtonConfig?: (jumpCount: number, state: AbilityState) => {
        icon: TextureImageAssetEx,
    },
}

export const ABILITY_DATA_REGISTRY = new EventData.DataRegistry<AbilityId, AbilityData>('Player Ability');

export const ABILITY_DATA_DEFAULT: AbilityData = {
    id: EventData.UNDEFINED_STRING,

    displayName: 'None',
    description: '',
    icon: TextureImageAssetEx.new('0'),
    killLogSprite: undefined,

    images: {
        default: TextureImageAssetEx.new('0'),
        locked: TextureImageAssetEx.new('0'),
    },

    loadoutSlot: undefined,

    isReleased: true,

    secondaryActionIconImg: TextureImageAssetEx.new('0'),

    asset: undefined,

    prespawnedAssetId: 'UNDEFINED',

    color: Color.white.clone(),

    canBeDisabled: true, // stops upon death or systems that prevent ability useage
    isPassive: false, // activates automatically upon equip

    onButtonDown: AbilityHandlerBehavior.ACTIVATE,
    onButtonUp: undefined,
    onButtonDown2: undefined,

    radius: 0,
    tickRate: 1,

    duration: -1,
    cooldown: 30,

    statusEffects: [],

    playActivationEffect: true,

    nuxConditionalText: undefined,

    aggroRadius: 0,
    onActivationAggro: 0,
    onDeactivationAggro: 0,

    primaryUseWeaponData: undefined,
    secondaryUseWeaponData: undefined,

    morphWeaponData: undefined,
    abilityObjectData: undefined,

    chargesData: undefined,

    requiredWeaponIds: [],

    unlockableData: {
        requiredCurrencies: new Map([
            ['GOLD', 5000],
        ]),
    },

    haptics: ABILITY_STATE_HAPTICS_SETTINGS_DEFAULT,
    sharedAudio: ABILITY_STATE_SHARED_AUDIO_SETTINGS_DEFAULT,

    showIcon: true,
    jumpButtonConfig: undefined,
    abilityButtonConfig: undefined,
};

// Abilities
/** ----------------------------------------------------------------- SAMPLE --------------------------------------------------------------- */
export const ABILITY_DATA_SAMPLE: AbilityData = {
    ...ABILITY_DATA_DEFAULT,
    id: 'UNDEFINED',

    displayName: ConstsStatusEffect.STATUS_EFFECT_DATA_ABILITY_SAMPLE.displayName,
    description: ConstsStatusEffect.STATUS_EFFECT_DATA_ABILITY_SAMPLE.description,
    icon: TextureImageAssetEx.new('0'),

    images: {
        default: TextureImageAssetEx.new('0'),
        locked: TextureImageAssetEx.new('0'),
    },

    loadoutSlot: LoadoutSlot.ABILITY_PRIMARY,

    asset: AssetEx.new('0'),

    prespawnedAssetId: 'AbilitySample',

    color: new Color(0.247, 0.725, 0.929),
    duration: 8,
    cooldown: 18,

    statusEffects: [ConstsStatusEffect.STATUS_EFFECT_DATA_ABILITY_SAMPLE.id],

    unlockableData: {
        ...ABILITY_DATA_DEFAULT.unlockableData,
        ownershipEntitlements: ['ABILITY_SAMPLE'],
    },
};
ABILITY_DATA_REGISTRY.register(ABILITY_DATA_SAMPLE);
