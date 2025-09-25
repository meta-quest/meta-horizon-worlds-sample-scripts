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

import { TextureImageAssetEx } from 'AssetEx';
import * as ConstsAttributes from 'ConstsAttributes';
import { StatusEffectCategoryId, StatusEffectId } from 'ConstsIdsStatusEffect';
import * as EventData from 'EventData';
import { Color } from 'horizon/core';
import * as StatusEffectBehavior from 'StatusEffectBehavior';

export enum StatusEffectFeedbackId {
    UNDEFINED = 0,
    SPEED_BUFF = 1,
    SHIELD = 2,
    GENERIC_TARGETING = 3,
    SUPER_AMMO = 4,
}

export enum StatusEffectStackAttributeModScheme {
    COMPOUNDING = 0, // each stack provides compounding attributes
    SINGLE, // stacks do not provide any additional attribute changes
}

export enum StatusEffectStackRemovalScheme {
    REMOVE_1_ON_DURATION_COMPLETE,
    REMOVE_ALL_ON_DURATION_COMPLETE,
}

export interface StatusEffectData {
    id: StatusEffectId,
    displayName: string,
    description: string,

    iconImg: TextureImageAssetEx,
    killLogSprite?: string,

    color: Color;
    feedbackIds: Set<StatusEffectFeedbackId>,

    categoryId: StatusEffectCategoryId;

    maxStacks: number,
    stackRemovalScheme: StatusEffectStackRemovalScheme,
    stackAttributeModScheme: StatusEffectStackAttributeModScheme,

    requiresAliveToApply: boolean,
    removeOnReset: boolean,

    tickRate: number,

    attributeMods: ConstsAttributes.AttributeModManager,
    behaviors: StatusEffectBehavior.BaseStatusEffectBehavior[],

    showApplyMessage: boolean,
    showRemovedMessage: boolean,
    showCompletedMessage: boolean,

    showOnHUD: boolean,
    showOnActorLog: boolean,
    hudLogPriority: number,
}

export const STATUS_EFFECT_DATA_REGISTRY = new EventData.DataRegistry<StatusEffectId, StatusEffectData>('Status Effect');


export const STATUS_EFFECT_DATA_DEFAULT: StatusEffectData = {
    id: EventData.UNDEFINED_STRING,
    displayName: 'Undefined',
    description: '',

    iconImg: TextureImageAssetEx.new('0'),
    killLogSprite: '',

    color: Color.white,
    feedbackIds: new Set<StatusEffectFeedbackId>(),

    categoryId: EventData.UNDEFINED_STRING,

    maxStacks: 0, // 0 is unlimited
    stackRemovalScheme: StatusEffectStackRemovalScheme.REMOVE_1_ON_DURATION_COMPLETE,
    stackAttributeModScheme: StatusEffectStackAttributeModScheme.COMPOUNDING,

    requiresAliveToApply: true,
    removeOnReset: true,

    tickRate: 1.0,

    attributeMods: new ConstsAttributes.AttributeModManager([]),
    behaviors: [],

    showApplyMessage: false,
    showRemovedMessage: false,
    showCompletedMessage: false,

    showOnHUD: true,
    showOnActorLog: true,
    hudLogPriority: 0,
};
STATUS_EFFECT_DATA_REGISTRY.register(STATUS_EFFECT_DATA_DEFAULT);

// ABILITIES
export const STATUS_EFFECT_DATA_ABILITY_SAMPLE: StatusEffectData = {
    ...STATUS_EFFECT_DATA_DEFAULT,
    id: 'sample_ability_effect',
    displayName: 'Sample Ability',
    description: 'Sample Ability Description',
    categoryId: 'special_attack',
};
STATUS_EFFECT_DATA_REGISTRY.register(STATUS_EFFECT_DATA_ABILITY_SAMPLE);


// DEBUFFS
export const STATUS_EFFECT_ID_SAMPLE = 'sample';
export const STATUS_EFFECT_DATA_SAMPLE: StatusEffectData = {
    ...STATUS_EFFECT_DATA_DEFAULT,
    id: 'sample_status_debuff',
    displayName: 'Sample Debuff',
    description: 'Prevent actions until damaged or status is removed',

    color: new Color(0.2, 0.7, 1.0),

    showApplyMessage: true,

    attributeMods: new ConstsAttributes.AttributeModManager([
        {
            id: ConstsAttributes.AttributeId.IS_ASLEEP,
            scheme: ConstsAttributes.AttributeModScheme.SET_TAKE_MAX,
            amount: 1.0,
        },
    ]),

    behaviors: [new StatusEffectBehavior.RemoveStatusOnDamageTakenBehavior('sample_status_debuff')],
};
STATUS_EFFECT_DATA_REGISTRY.register(STATUS_EFFECT_DATA_SAMPLE);

// OTHERS
export const STATUS_EFFECT_PLAYER_DEAD: StatusEffectData = {
    ...STATUS_EFFECT_DATA_DEFAULT,
    id: 'player_state_dead',
    displayName: 'Sample System State',
    description: 'Sample System State Description',
};
STATUS_EFFECT_DATA_REGISTRY.register(STATUS_EFFECT_PLAYER_DEAD);
