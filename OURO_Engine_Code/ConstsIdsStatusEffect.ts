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

import {validId} from 'ConstsIds';
import {UNDEFINED_STRING} from 'EventData';

const ALL_STATUS_EFFECT_IDS = [
    UNDEFINED_STRING,
    'sample_ability_effect',
    'sample_status_debuff',

    // SYSTEM UTILS
    'player_state_dead',
] as const;
export type StatusEffectId = typeof ALL_STATUS_EFFECT_IDS[number];

export function validStatusEffectId(value: string): StatusEffectId {
    return validId('ALL_STATUS_EFFECT_IDS', ALL_STATUS_EFFECT_IDS, value);
}


const ALL_STATUS_EFFECT_CATEGORY_IDS = [
    UNDEFINED_STRING,

    'positive_health_modifier',
    'positive_speed_modifier',
    'positive_shield_modifier',
    'positive_weapon_modifier',
    'positive_vision_modifier',
    'positive_movement_modifier',

    'special_movement',
    'special_attack',

    'negative_speed_modifier',
    'negative_defense_modifier',

    'dot_burn',

    'info',
] as const;
export type StatusEffectCategoryId = typeof ALL_STATUS_EFFECT_CATEGORY_IDS[number];

export function validStatusEffectCategoryId(value: string): StatusEffectCategoryId {
    return validId('ALL_STATUS_EFFECT_CATEGORY_IDS', ALL_STATUS_EFFECT_CATEGORY_IDS, value);
}
