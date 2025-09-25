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

import * as ConstsAbility from 'ConstsAbility';
import * as ConstsArenaWeapons from 'ConstsArenaWeapons';
import * as ConstsAttributes from 'ConstsAttributes';
import { AbilityId } from 'ConstsIdsAbility';
import { ClassId } from 'ConstsIdsClass';
import { WeaponId } from 'ConstsIdsWeapon';
import * as ConstsWeapon from 'ConstsWeapon';
import * as EventData from 'EventData';

export interface PlayerClassDefinition {
    id: ClassId,

    displayName: string,
    description: string,

    rangedWeaponIds: WeaponId[];

    primaryAbilityIds: AbilityId[];
    utilityAbilityIds: AbilityId[];

    initialAttributeOverrides: Map<ConstsAttributes.AttributeId, ConstsAttributes.Attribute>;
}

export const PLAYER_CLASS_DEFINITION_DEFAULT: PlayerClassDefinition = {
    id: EventData.UNDEFINED_STRING,

    displayName: 'Undefined',
    description: '',

    rangedWeaponIds: [
        ConstsWeapon.WEAPON_DATA_DEFAULT.id,
    ],

    primaryAbilityIds: [
        ConstsAbility.ABILITY_DATA_DEFAULT.id,
    ],

    utilityAbilityIds: [
        ConstsAbility.ABILITY_DATA_DEFAULT.id,
    ],

    initialAttributeOverrides: new Map<ConstsAttributes.AttributeId, ConstsAttributes.Attribute>(),
};

export const PLAYER_CLASS_DEFINITION_SUPER_STRIKE: PlayerClassDefinition = {
    ...PLAYER_CLASS_DEFINITION_DEFAULT,
    id: 'UNDEFINED',

    displayName: 'Game Player',

    rangedWeaponIds: [
        ConstsArenaWeapons.REVOLVER.id
    ],

    primaryAbilityIds: [
        ConstsAbility.ABILITY_DATA_SAMPLE.id,
    ],

    utilityAbilityIds: [
        ConstsAbility.ABILITY_DATA_DEFAULT.id,
    ],

    initialAttributeOverrides: new Map<ConstsAttributes.AttributeId, ConstsAttributes.Attribute>([])
};
