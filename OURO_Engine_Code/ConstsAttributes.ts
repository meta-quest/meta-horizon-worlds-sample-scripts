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

import * as ConstsGame from 'ConstsGame';

export enum AttributeId {
    UNDEFINED = 0,

    //** HEALTH */
    MAX_HP,

    //** UNDER SHIELD */
    MAX_UNDER_SHIELD_HP,
    UNDER_SHIELD_DAMAGE_REDUCTION_PRECENT, // multiplier on how much damage is reduced by under shield

    UNDER_SHIELD_REGEN_DELAY,
    UNDER_SHIELD_REGEN_DELAY_MULTIPLIER,

    UNDER_SHIELD_REGEN_SPEED, // HP per second
    UNDER_SHIELD_REGEN_SPEED_MULTIPLIER,

    //** OVER SHIELD */
    SHIELD_DAMAGE_REDUCTION_PERCENT, // multiplier on how much damage is reduced by over shield

    //** UTILITY ABILITY */
    UTILITY_ABILITY_ENERGY_PER_DAMAGE_DEALT,
    UTILITY_ABILITY_ENERGY_PER_HEALTH_HEALED,

    UTILITY_ABILITY_ENERGY_PER_DAMAGE_TAKEN,

    UTILITY_ABILITY_ENEMY_DEATH_ENERGY_CAPTURE_RANGE, // range from enemy death that this player can capture energy
    UTILITY_ABILITY_ENEMY_DEATH_ENERGY_CAPTURE_MULTIPLIER,

    UTILITY_ABILITY_DEATH_ENERGY_AMOUNT, // how much energy this object provides when it dies

    //** STATUS */
    IS_INVULNERABLE,
    IS_ASLEEP,

    //** ABILITY STATUS */
    ABILITY_PRIMARY_IS_DISABLED,
    ABILITY_MELEE_IS_DISABLED,
    ABILITY_ULTIMATE_IS_DISABLED,
    ABILITY_UTILITY_IS_DISABLED,

    //** HEALING */
    HEAL_MULTIPLIER_PERCENT,
    HEAL_RECIEVE_MULTIPLIER_PRECENT,

    //** DAMAGE */
    DAMAGE_MULTIPLIER_PERCENT,
    DAMAGE_REDUCTION_PERCENT,

    DAMAGE_NORMAL_ATTACK_MULTIPLIER_PERCENT,
    DAMAGE_PRIMARY_ABILITY_MULTIPLIER_PERCENT,
    DAMAGE_SECONDARY_ABILITY_MULTIPLER_PERCENT,
    DAAMGE_ULTIMATE_ABILITY_MULTIPLIER_PERCENT,

    //** DAMAGE EXTRA */
    DAMAGE_MULTIPLIER_HEAD_DAMAGE_PERCENT, // multiplier when dealing damage against head
    DAMAGE_MULTIPLIER_WEAKPOINT_DAMAGE_PERCENT, // multiplier when dealing damage against weakpoints
    DAMAGE_MULTIPLIER_SHIELD_DAMAGE_PERCENT, // multiplier when dealing damage against shields

    //** CRITICAL DAMAGE */
    DAMAGE_MULTIPLIER_CRITICAL_DAMAGE_PERCENT, // multiplier when dealing critical damage
    CRITICAL_DAMAGE_CHANCE, // chance to land a critical hit

    CRITICAL_DAMAGE_REDUCTION_PERCENT, // percent to reduce incoming critical damage, can go negative to increase chance of taking crit damage
    CRITICAL_DAMAGE_CHANCE_REDUCTION, // amount to reduce the chance of receiving a critical hit, can go negative to cause enemies to take additional crit damage

    //** AGGRO */
    AGGRO_MULTIPLIER_PERCENT, // multiplier when applying aggro from any source
    AGGRO_CRIT_MULTIPLIER_PERCENT, // multiplier when applying aggro from any crit source, replaces non-crit version when crit occurs

    //** MOVEMENT */
    MOVEMENT_SPEED,
    MOVEMENT_SPEED_MULTIPLIER,

    MOVEMENT_GRAVITY,
    MOVEMENT_GRAVITY_MULTIPLIER,

    MOVEMENT_MAX_JUMP_COUNT,
    MOVEMENT_JUMP_FORCE,
    MOVEMENT_JUMP_FORCE_MULTIPLIER,

    MOVEMENT_ROCKET_JUMP_FORCE_MULTIPLIER,

    //** ATTACKING */
    ATTACK_SPEED_MULTIPLIER,
    FORCE_ENABLE_AUTO_FIRE,

    WEAPON_INFINITE_AMMO,
    WEAPON_AMMO_REGEN_RATE_MULTIPLIER,
    WEAPON_RELOAD_TIME_REDUCTION_PERCENT,
    WEAPON_EXTRA_MAX_AMMO,
    WEAPON_PROJECTILE_SPEED_METERS_PER_SEC_MULTIPLIER,
    WEAPON_PROJECTILE_RANGE_METERS_MULTIPLIER,

    WEAPON_SPLASH_RADIUS_MULTIPLIER,
}

export interface Attribute {
    value: number,
    min?: number,
    max?: number,
}

export enum AttributeDisplayUnitType {
    RAW = 0,
    PERCENT,
    BOOL,
}

export interface AttributeMetaData {
    displayName: string,
    description: string,
    unitDisplayType: AttributeDisplayUnitType,
    fixedDigits: number,

    showInInfoDisplay: boolean,
}

export const ATTRIBUTE_META_DATA_DEFAULT: AttributeMetaData = {
    displayName: 'Undefined',
    description: '',
    unitDisplayType: AttributeDisplayUnitType.RAW,
    fixedDigits: 0,
    showInInfoDisplay: true
};

export enum AttributeModScheme { // this defines the order and behavior
    /**Adds to base value*/
    BASE_ADD,
    /**BaseValue * (1.0 + sum of multiplies)*/
    MULTIPLY,
    /**Added after multiply*/
    ADD,
    /**Forces a value, takes the max if there are multiple competing values from other status effects using 'SET_TAKE_MAX'.*/
        // TODO: DO NOT USE. SET_TAKE_MAX is currently bugged and does not revert
    SET_TAKE_MAX,
    // TODO: Implement SET_TAKE_MIN
}

export interface AttributeMod {
    id: AttributeId,
    scheme: AttributeModScheme,
    amount: number,
}

export function createAttributeMod(id: AttributeId, scheme: AttributeModScheme, amount: number) {
    return {id: id, scheme: scheme, amount: amount};
}

export class AttributeModManager {
    attributeModsList: AttributeMod[];
    attributeMods = new Map<AttributeId, Map<AttributeModScheme, AttributeMod[]>>();

    constructor(attributeMods: AttributeMod[] = []) {
        this.attributeModsList = attributeMods;
        this.attributeModsList.forEach((value: AttributeMod) => {
            this.addAttributeMod(value);
        });
    }


    addAttributeMod(mod: AttributeMod) {
        const mods = this.attributeMods.get(mod.id);
        if (mods) {
            const scheme = mods.get(mod.scheme);
            if (scheme) {
                scheme.push(mod);
            } else {
                mods.set(mod.scheme, [mod]);
            }
        } else {
            this.attributeMods.set(mod.id, new Map<AttributeModScheme, AttributeMod[]>([[mod.scheme, [mod]]]));
        }
    }

    hasAttributeMods(id: AttributeId, scheme: AttributeModScheme) {
        const mods = this.attributeMods.get(id);
        if (mods) {
            const modScheme = mods.get(scheme);
            if (modScheme && modScheme.length > 0) {
                return true;
            }
        }
        return false;
    }

    getAttributeMods(id: AttributeId, scheme: AttributeModScheme) {
        const mods = this.attributeMods.get(id);
        let amount = 0;
        if (mods) {
            const modScheme = mods.get(scheme);
            if (modScheme) {
                for (let i = 0; i < modScheme.length; ++i) {
                    switch (scheme) {
                        case AttributeModScheme.SET_TAKE_MAX:
                            amount = Math.max(amount, modScheme[i].amount);
                            break;
                        default:
                            amount += modScheme[i].amount;
                            break;
                    }
                }
            }
        }
        return amount;
    };
}

//**------------------------------------- PLAYER -------------------------------------*/
export const PLAYER_ATTRIBUTES_DEFAULT = new Map<AttributeId, Attribute>([
    //** HEALTH */
    [AttributeId.MAX_HP, {value: 200}],

    //** UNDER SHIELD */
    [AttributeId.MAX_UNDER_SHIELD_HP, {value: 0}],
    [AttributeId.UNDER_SHIELD_DAMAGE_REDUCTION_PRECENT, {value: 1.0}],

    [AttributeId.UNDER_SHIELD_REGEN_DELAY, {value: 8}],
    [AttributeId.UNDER_SHIELD_REGEN_DELAY_MULTIPLIER, {value: 1.0}],

    [AttributeId.UNDER_SHIELD_REGEN_SPEED, {value: 25}],
    [AttributeId.UNDER_SHIELD_REGEN_SPEED_MULTIPLIER, {value: 1.0}],

    //** OVER SHIELD */
    [AttributeId.SHIELD_DAMAGE_REDUCTION_PERCENT, {value: 0.0}],


    //** UTILITY ABILITY */
    [AttributeId.UTILITY_ABILITY_ENERGY_PER_DAMAGE_DEALT, {value: 1}],
    [AttributeId.UTILITY_ABILITY_ENERGY_PER_HEALTH_HEALED, {value: 30.0}],

    [AttributeId.UTILITY_ABILITY_ENERGY_PER_DAMAGE_TAKEN, {value: 100.0}],

    [AttributeId.UTILITY_ABILITY_ENEMY_DEATH_ENERGY_CAPTURE_RANGE, {value: 100.0}], // range from enemy death that this player can capture energy
    [AttributeId.UTILITY_ABILITY_ENEMY_DEATH_ENERGY_CAPTURE_MULTIPLIER, {value: 1.0}],

    [AttributeId.UTILITY_ABILITY_DEATH_ENERGY_AMOUNT, {value: 1000.0}], // how much energy this object provides when it dies

    //** STATUS */
    [AttributeId.IS_INVULNERABLE, {value: 0}],
    [AttributeId.IS_ASLEEP, {value: 0}],

    //** ABILITY STATUS */
    [AttributeId.ABILITY_PRIMARY_IS_DISABLED, {value: 0}],
    [AttributeId.ABILITY_MELEE_IS_DISABLED, {value: 0}],
    [AttributeId.ABILITY_ULTIMATE_IS_DISABLED, {value: 0}],
    [AttributeId.ABILITY_UTILITY_IS_DISABLED, {value: 0}],

    //** HEALING */
    [AttributeId.HEAL_MULTIPLIER_PERCENT, {value: 1.0}],
    [AttributeId.HEAL_RECIEVE_MULTIPLIER_PRECENT, {value: 0.0}],

    //** DAMAGE */
    [AttributeId.DAMAGE_REDUCTION_PERCENT, {value: 0.0}],
    [AttributeId.DAMAGE_MULTIPLIER_PERCENT, {value: 1.0}],

    [AttributeId.DAMAGE_NORMAL_ATTACK_MULTIPLIER_PERCENT, {value: 1.0}],
    [AttributeId.DAMAGE_PRIMARY_ABILITY_MULTIPLIER_PERCENT, {value: 1.0}],
    [AttributeId.DAMAGE_SECONDARY_ABILITY_MULTIPLER_PERCENT, {value: 1.0}],
    [AttributeId.DAAMGE_ULTIMATE_ABILITY_MULTIPLIER_PERCENT, {value: 1.0}],

    //** DAMAGE EXTRA */
    [AttributeId.DAMAGE_MULTIPLIER_HEAD_DAMAGE_PERCENT, {value: 2.0}],
    [AttributeId.DAMAGE_MULTIPLIER_WEAKPOINT_DAMAGE_PERCENT, {value: 3.0}],
    [AttributeId.DAMAGE_MULTIPLIER_SHIELD_DAMAGE_PERCENT, {value: 1.0}],

    //** CRITICAL DAMAGE */
    [AttributeId.DAMAGE_MULTIPLIER_CRITICAL_DAMAGE_PERCENT, {value: 1}], // Jeff changed to 1 from 1.5 on 1/6/25 for redundancy
    [AttributeId.CRITICAL_DAMAGE_CHANCE, {value: 0}], // Jeff changed to 0 on 1/6/25

    [AttributeId.CRITICAL_DAMAGE_REDUCTION_PERCENT, {value: 0.0}],
    [AttributeId.CRITICAL_DAMAGE_CHANCE_REDUCTION, {value: 0.0}],

    //** AGGRO */
    [AttributeId.AGGRO_MULTIPLIER_PERCENT, {value: 1}],
    [AttributeId.AGGRO_CRIT_MULTIPLIER_PERCENT, {value: 1}],

    //** MOVEMENT */
    [AttributeId.MOVEMENT_SPEED, {value: ConstsGame.PLAYER_SPEED_DEFAULT}],
    [AttributeId.MOVEMENT_SPEED_MULTIPLIER, {value: 1.0}],

    [AttributeId.MOVEMENT_GRAVITY, {value: ConstsGame.PLAYER_GRAVITY_DEFAULT}],
    [AttributeId.MOVEMENT_GRAVITY_MULTIPLIER, {value: 1.0}],

    [AttributeId.MOVEMENT_MAX_JUMP_COUNT, {value: ConstsGame.PLAYER_JUMP_COUNT_DEFAULT}],
    [AttributeId.MOVEMENT_JUMP_FORCE, {value: ConstsGame.PLAYER_JUMP_VERTICAL_SPEED_DEFAULT}], // Updated to pull from ConstsGame

    //** ATTACKING */
    [AttributeId.ATTACK_SPEED_MULTIPLIER, {value: 1.0}],
    [AttributeId.FORCE_ENABLE_AUTO_FIRE, {value: 0.0}],

    //** WEAPON */
    [AttributeId.WEAPON_INFINITE_AMMO, {value: 0.0}],
    [AttributeId.WEAPON_AMMO_REGEN_RATE_MULTIPLIER, {value: 1.0}],
    [AttributeId.WEAPON_RELOAD_TIME_REDUCTION_PERCENT, {value: 0.0}],
    [AttributeId.WEAPON_EXTRA_MAX_AMMO, {value: 0.0}],
    [AttributeId.WEAPON_PROJECTILE_SPEED_METERS_PER_SEC_MULTIPLIER, {value: 1.0}],
    [AttributeId.WEAPON_PROJECTILE_RANGE_METERS_MULTIPLIER, {value: 1.0}],
    [AttributeId.WEAPON_SPLASH_RADIUS_MULTIPLIER, {value: 1.0}]
]);

//**------------------------------------- NPC -------------------------------------*/
export const ACTOR_ATTRIBUTES_DEFAULT = new Map<AttributeId, Attribute>([
    //** HEALTH */
    [AttributeId.MAX_HP, {value: 100}],

    //** UNDER SHIELD */
    [AttributeId.MAX_UNDER_SHIELD_HP, {value: 0}],
    [AttributeId.UNDER_SHIELD_DAMAGE_REDUCTION_PRECENT, {value: 1.0}],

    [AttributeId.UNDER_SHIELD_REGEN_DELAY, {value: 10}],
    [AttributeId.UNDER_SHIELD_REGEN_DELAY_MULTIPLIER, {value: 1.0}],

    [AttributeId.UNDER_SHIELD_REGEN_SPEED, {value: 10}],
    [AttributeId.UNDER_SHIELD_REGEN_SPEED_MULTIPLIER, {value: 1.0}],

    //** OVER SHIELD */
    [AttributeId.SHIELD_DAMAGE_REDUCTION_PERCENT, {value: 0.0}],

    //** UTILITY ABILITY */
    [AttributeId.UTILITY_ABILITY_ENERGY_PER_DAMAGE_DEALT, {value: 0.0}],
    [AttributeId.UTILITY_ABILITY_ENERGY_PER_HEALTH_HEALED, {value: 0.0}],

    [AttributeId.UTILITY_ABILITY_ENERGY_PER_DAMAGE_TAKEN, {value: 0.0}],

    [AttributeId.UTILITY_ABILITY_ENEMY_DEATH_ENERGY_CAPTURE_RANGE, {value: 0.0}], // range from enemy death that this player can capture energy
    [AttributeId.UTILITY_ABILITY_ENEMY_DEATH_ENERGY_CAPTURE_MULTIPLIER, {value: 0.0}],

    [AttributeId.UTILITY_ABILITY_DEATH_ENERGY_AMOUNT, {value: 200.0}], // how much energy this object provides when it dies

    //** STATUS */
    [AttributeId.IS_INVULNERABLE, {value: 0}],
    [AttributeId.IS_ASLEEP, {value: 0}],

    //** HEALING */
    [AttributeId.HEAL_MULTIPLIER_PERCENT, {value: 1.0}],
    [AttributeId.HEAL_RECIEVE_MULTIPLIER_PRECENT, {value: 0.0}],

    //** DAMAGE */
    [AttributeId.DAMAGE_MULTIPLIER_PERCENT, {value: 1.0}],
    [AttributeId.DAMAGE_REDUCTION_PERCENT, {value: 0.0}],

    //** DAMAGE EXTRA */
    [AttributeId.DAMAGE_MULTIPLIER_HEAD_DAMAGE_PERCENT, {value: 1.0}],
    [AttributeId.DAMAGE_MULTIPLIER_WEAKPOINT_DAMAGE_PERCENT, {value: 1.0}],
    [AttributeId.DAMAGE_MULTIPLIER_SHIELD_DAMAGE_PERCENT, {value: 1.0}],

    //** CRITCAL DAMAGE */
    [AttributeId.DAMAGE_MULTIPLIER_CRITICAL_DAMAGE_PERCENT, {value: 2.0}],
    [AttributeId.CRITICAL_DAMAGE_CHANCE, {value: 0.0}],

    [AttributeId.CRITICAL_DAMAGE_REDUCTION_PERCENT, {value: 0.0}],
    [AttributeId.CRITICAL_DAMAGE_CHANCE_REDUCTION, {value: 0.0}],

    //** AGGRO */
    [AttributeId.AGGRO_MULTIPLIER_PERCENT, {value: 1}],
    [AttributeId.AGGRO_CRIT_MULTIPLIER_PERCENT, {value: 1}],

    //** MOVEMENT */
    [AttributeId.MOVEMENT_SPEED, {value: 11.0}], // was 4 on 2/20/2024
    [AttributeId.MOVEMENT_SPEED_MULTIPLIER, {value: 1.0}],

    [AttributeId.MOVEMENT_GRAVITY, {value: 9.81}],
    [AttributeId.MOVEMENT_GRAVITY_MULTIPLIER, {value: 1.0}],

    [AttributeId.MOVEMENT_MAX_JUMP_COUNT, {value: 1}],
    [AttributeId.MOVEMENT_JUMP_FORCE, {value: 8.0}],
    [AttributeId.MOVEMENT_JUMP_FORCE_MULTIPLIER, {value: 1.0}],

    [AttributeId.MOVEMENT_ROCKET_JUMP_FORCE_MULTIPLIER, {value: 1.0}],

    //** ATTACKING */
    [AttributeId.ATTACK_SPEED_MULTIPLIER, {value: 1.0}],
    [AttributeId.FORCE_ENABLE_AUTO_FIRE, {value: 0.0}],

    //** WEAPON */
    [AttributeId.WEAPON_INFINITE_AMMO, {value: 0.0}],
    [AttributeId.WEAPON_AMMO_REGEN_RATE_MULTIPLIER, {value: 1.0}],
    [AttributeId.WEAPON_RELOAD_TIME_REDUCTION_PERCENT, {value: 0.0}],
    [AttributeId.WEAPON_EXTRA_MAX_AMMO, {value: 0.0}],
    [AttributeId.WEAPON_PROJECTILE_SPEED_METERS_PER_SEC_MULTIPLIER, {value: 1.0}],
    [AttributeId.WEAPON_PROJECTILE_RANGE_METERS_MULTIPLIER, {value: 1.0}],
    [AttributeId.WEAPON_SPLASH_RADIUS_MULTIPLIER, {value: 1.0}]
]);

//**------------------------------------- META DATA -------------------------------------*/
export const ATTRIBUTE_META_DATA_MAPPING = new Map<AttributeId, AttributeMetaData>([
    //** HEALTH */
    [AttributeId.MAX_HP, {
        ...ATTRIBUTE_META_DATA_DEFAULT,
        displayName: 'Max HP'
    }],

    //** UNDER SHIELD */
    [AttributeId.MAX_UNDER_SHIELD_HP, {
        ...ATTRIBUTE_META_DATA_DEFAULT,
        displayName: 'Max Shield'
    }],
    [AttributeId.UNDER_SHIELD_DAMAGE_REDUCTION_PRECENT, {
        ...ATTRIBUTE_META_DATA_DEFAULT,
        displayName: 'Shield Def',
        unitDisplayType: AttributeDisplayUnitType.PERCENT
    }],

    [AttributeId.UNDER_SHIELD_REGEN_DELAY, {
        ...ATTRIBUTE_META_DATA_DEFAULT,
        displayName: 'Shield Regen Delay'
    }],
    [AttributeId.UNDER_SHIELD_REGEN_DELAY_MULTIPLIER, {
        ...ATTRIBUTE_META_DATA_DEFAULT,
        displayName: 'Shield Regen Delay Mult',
        unitDisplayType: AttributeDisplayUnitType.PERCENT
    }],

    [AttributeId.UNDER_SHIELD_REGEN_SPEED, {
        ...ATTRIBUTE_META_DATA_DEFAULT,
        displayName: 'Shield Regen'
    }],
    [AttributeId.UNDER_SHIELD_REGEN_SPEED_MULTIPLIER, {
        ...ATTRIBUTE_META_DATA_DEFAULT,
        displayName: 'Shield Regen Mult',
        unitDisplayType: AttributeDisplayUnitType.PERCENT
    }],

    //** OVER SHIELD */
    [AttributeId.SHIELD_DAMAGE_REDUCTION_PERCENT, {
        ...ATTRIBUTE_META_DATA_DEFAULT,
        displayName: 'Over Shield Def',
        unitDisplayType: AttributeDisplayUnitType.PERCENT
    }],


    //** UTILITY ABILITY */
    [AttributeId.UTILITY_ABILITY_ENERGY_PER_DAMAGE_DEALT, {
        ...ATTRIBUTE_META_DATA_DEFAULT,
        displayName: 'Potion Energy from Dmg'
    }],
    [AttributeId.UTILITY_ABILITY_ENERGY_PER_HEALTH_HEALED, {
        ...ATTRIBUTE_META_DATA_DEFAULT,
        displayName: 'Potion Energy from Heal'
    }],

    [AttributeId.UTILITY_ABILITY_ENERGY_PER_DAMAGE_TAKEN, {
        ...ATTRIBUTE_META_DATA_DEFAULT,
        displayName: 'Potion Energy from Dmg Taken'
    }],

    [AttributeId.UTILITY_ABILITY_ENEMY_DEATH_ENERGY_CAPTURE_RANGE, {
        ...ATTRIBUTE_META_DATA_DEFAULT,
        displayName: 'Potion Energy from Kill Collect Range'
    }], // range from enemy death that this player can capture energy
    [AttributeId.UTILITY_ABILITY_ENEMY_DEATH_ENERGY_CAPTURE_MULTIPLIER, {
        ...ATTRIBUTE_META_DATA_DEFAULT,
        displayName: 'Potion Energy from Kill Mult',
        unitDisplayType: AttributeDisplayUnitType.PERCENT
    }],

    [AttributeId.UTILITY_ABILITY_DEATH_ENERGY_AMOUNT, {
        ...ATTRIBUTE_META_DATA_DEFAULT,
        displayName: 'Potion Energy from Kill'
    }],// how much energy this object provides when it dies

    //** STATUS */
    [AttributeId.IS_INVULNERABLE, {
        ...ATTRIBUTE_META_DATA_DEFAULT,
        displayName: 'Is Invulnerable',
        unitDisplayType: AttributeDisplayUnitType.BOOL,
        showInInfoDisplay: false
    }],
    [AttributeId.IS_ASLEEP, {
        ...ATTRIBUTE_META_DATA_DEFAULT,
        displayName: 'Is Asleep',
        unitDisplayType: AttributeDisplayUnitType.BOOL,
        showInInfoDisplay: false
    }],

    //** ABILITY STATUS */
    [AttributeId.ABILITY_PRIMARY_IS_DISABLED, {
        ...ATTRIBUTE_META_DATA_DEFAULT,
        displayName: 'Primary Ability is Disabled',
        unitDisplayType: AttributeDisplayUnitType.BOOL,
        showInInfoDisplay: false
    }],
    [AttributeId.ABILITY_MELEE_IS_DISABLED, {
        ...ATTRIBUTE_META_DATA_DEFAULT,
        displayName: 'Secondary Ability is Disabled',
        unitDisplayType: AttributeDisplayUnitType.BOOL,
        showInInfoDisplay: false
    }],
    [AttributeId.ABILITY_ULTIMATE_IS_DISABLED, {
        ...ATTRIBUTE_META_DATA_DEFAULT,
        displayName: 'Ultimate Ability is Disabled',
        unitDisplayType: AttributeDisplayUnitType.BOOL,
        showInInfoDisplay: false
    }],
    [AttributeId.ABILITY_UTILITY_IS_DISABLED, {
        ...ATTRIBUTE_META_DATA_DEFAULT,
        displayName: 'Utility Ability is Disabled',
        unitDisplayType: AttributeDisplayUnitType.BOOL,
        showInInfoDisplay: false
    }],

    //** HEALING */
    [AttributeId.HEAL_MULTIPLIER_PERCENT, {
        ...ATTRIBUTE_META_DATA_DEFAULT,
        displayName: 'Heal Mult',
        unitDisplayType: AttributeDisplayUnitType.PERCENT

    }],
    [AttributeId.HEAL_RECIEVE_MULTIPLIER_PRECENT, {
        ...ATTRIBUTE_META_DATA_DEFAULT,
        displayName: 'Heal Received Mult',
        unitDisplayType: AttributeDisplayUnitType.PERCENT
    }],

    //** DAMAGE */
    [AttributeId.DAMAGE_MULTIPLIER_PERCENT, {
        ...ATTRIBUTE_META_DATA_DEFAULT,
        displayName: 'Dmg Mult',
        unitDisplayType: AttributeDisplayUnitType.PERCENT
    }],
    [AttributeId.DAMAGE_REDUCTION_PERCENT, {
        ...ATTRIBUTE_META_DATA_DEFAULT,
        displayName: 'Def Mult',
        unitDisplayType: AttributeDisplayUnitType.PERCENT
    }],

    //** DAMAGE EXTRA */
    [AttributeId.DAMAGE_MULTIPLIER_HEAD_DAMAGE_PERCENT, {
        ...ATTRIBUTE_META_DATA_DEFAULT,
        displayName: 'HeadShot Dmg Mult',
        unitDisplayType: AttributeDisplayUnitType.PERCENT
    }],
    [AttributeId.DAMAGE_MULTIPLIER_WEAKPOINT_DAMAGE_PERCENT, {
        ...ATTRIBUTE_META_DATA_DEFAULT,
        displayName: 'Weakpoint Dmg Mult',
        unitDisplayType: AttributeDisplayUnitType.PERCENT
    }],
    [AttributeId.DAMAGE_MULTIPLIER_SHIELD_DAMAGE_PERCENT, {
        ...ATTRIBUTE_META_DATA_DEFAULT,
        displayName: 'Shield Dmg Mult',
        unitDisplayType: AttributeDisplayUnitType.PERCENT
    }],

    //** CRITICAL DAMAGE */
    [AttributeId.DAMAGE_MULTIPLIER_CRITICAL_DAMAGE_PERCENT, {
        ...ATTRIBUTE_META_DATA_DEFAULT,
        displayName: 'Crit Dmg Mult',
        unitDisplayType: AttributeDisplayUnitType.PERCENT
    }],
    [AttributeId.CRITICAL_DAMAGE_CHANCE, {
        ...ATTRIBUTE_META_DATA_DEFAULT,
        displayName: 'Crit Chance',
        unitDisplayType: AttributeDisplayUnitType.PERCENT
    }],

    [AttributeId.CRITICAL_DAMAGE_REDUCTION_PERCENT, {
        ...ATTRIBUTE_META_DATA_DEFAULT,
        displayName: 'Crit Dmg Mult Reduction',
        unitDisplayType: AttributeDisplayUnitType.PERCENT
    }],
    [AttributeId.CRITICAL_DAMAGE_CHANCE_REDUCTION, {
        ...ATTRIBUTE_META_DATA_DEFAULT,
        displayName: 'Crit Change Reduction',
        unitDisplayType: AttributeDisplayUnitType.PERCENT
    }],

    //** AGGRO */
    [AttributeId.AGGRO_MULTIPLIER_PERCENT, {
        ...ATTRIBUTE_META_DATA_DEFAULT,
        displayName: 'Aggro Mult',
        unitDisplayType: AttributeDisplayUnitType.PERCENT
    }],
    [AttributeId.AGGRO_CRIT_MULTIPLIER_PERCENT, {
        ...ATTRIBUTE_META_DATA_DEFAULT,
        displayName: 'Crit Aggro Mult',
        unitDisplayType: AttributeDisplayUnitType.PERCENT
    }],

    //** MOVEMENT */
    [AttributeId.MOVEMENT_SPEED, {
        ...ATTRIBUTE_META_DATA_DEFAULT,
        displayName: 'Move Spd'
    }], // was 6 on 2/20/2024
    [AttributeId.MOVEMENT_SPEED_MULTIPLIER, {
        ...ATTRIBUTE_META_DATA_DEFAULT,
        displayName: 'Move Spd Mult',
        unitDisplayType: AttributeDisplayUnitType.PERCENT
    }],

    [AttributeId.MOVEMENT_GRAVITY, {
        ...ATTRIBUTE_META_DATA_DEFAULT,
        displayName: 'Gravity'
    }],
    [AttributeId.MOVEMENT_GRAVITY_MULTIPLIER, {
        ...ATTRIBUTE_META_DATA_DEFAULT,
        displayName: 'Gravity Mult',
        unitDisplayType: AttributeDisplayUnitType.PERCENT
    }],

    [AttributeId.MOVEMENT_MAX_JUMP_COUNT, {
        ...ATTRIBUTE_META_DATA_DEFAULT,
        displayName: 'Max Jumps'
    }],
    [AttributeId.MOVEMENT_JUMP_FORCE, {
        ...ATTRIBUTE_META_DATA_DEFAULT,
        displayName: 'Jump Force'
    }],
    [AttributeId.MOVEMENT_JUMP_FORCE_MULTIPLIER, {
        ...ATTRIBUTE_META_DATA_DEFAULT,
        displayName: 'Jump Force Mult',
        unitDisplayType: AttributeDisplayUnitType.PERCENT
    }],

    [AttributeId.MOVEMENT_ROCKET_JUMP_FORCE_MULTIPLIER, {
        ...ATTRIBUTE_META_DATA_DEFAULT,
        displayName: 'Rocket Jump Force Mult',
        unitDisplayType: AttributeDisplayUnitType.PERCENT
    }],

    //** ATTACKING */
    [AttributeId.ATTACK_SPEED_MULTIPLIER, {
        ...ATTRIBUTE_META_DATA_DEFAULT,
        displayName: 'Atk Spd Mult',
        unitDisplayType: AttributeDisplayUnitType.PERCENT
    }],
    [AttributeId.FORCE_ENABLE_AUTO_FIRE, {
        ...ATTRIBUTE_META_DATA_DEFAULT,
        displayName: 'Auto Fire Enabled',
        unitDisplayType: AttributeDisplayUnitType.BOOL
    }],

    //** WEAPON */
    [AttributeId.WEAPON_INFINITE_AMMO, {
        ...ATTRIBUTE_META_DATA_DEFAULT,
        displayName: 'Infinite Ammo',
        unitDisplayType: AttributeDisplayUnitType.BOOL
    }],
    [AttributeId.WEAPON_AMMO_REGEN_RATE_MULTIPLIER, {
        ...ATTRIBUTE_META_DATA_DEFAULT,
        displayName: 'Ammo Regen Rate Mult',
        unitDisplayType: AttributeDisplayUnitType.PERCENT
    }],
    [AttributeId.WEAPON_RELOAD_TIME_REDUCTION_PERCENT, {
        ...ATTRIBUTE_META_DATA_DEFAULT,
        displayName: 'Reload Time Reduction Percent',
        unitDisplayType: AttributeDisplayUnitType.PERCENT
    }],
    [AttributeId.WEAPON_EXTRA_MAX_AMMO, {
        ...ATTRIBUTE_META_DATA_DEFAULT,
        displayName: 'Extra Max Ammo',
        unitDisplayType: AttributeDisplayUnitType.RAW
    }],
    [AttributeId.WEAPON_PROJECTILE_SPEED_METERS_PER_SEC_MULTIPLIER, {
        ...ATTRIBUTE_META_DATA_DEFAULT,
        displayName: 'Projectile Speed M/sec Mult',
        unitDisplayType: AttributeDisplayUnitType.PERCENT
    }],
    [AttributeId.WEAPON_PROJECTILE_RANGE_METERS_MULTIPLIER, {
        ...ATTRIBUTE_META_DATA_DEFAULT,
        displayName: 'Projectile Range Mult',
        unitDisplayType: AttributeDisplayUnitType.PERCENT
    }],
    [AttributeId.WEAPON_SPLASH_RADIUS_MULTIPLIER, {
        ...ATTRIBUTE_META_DATA_DEFAULT,
        displayName: 'Splash Radius Mult',
        unitDisplayType: AttributeDisplayUnitType.PERCENT
    }]
]);

export function getAttributeChangeString(id: AttributeId, mod: AttributeMod, current: number) {
    const attributeMetaData = ATTRIBUTE_META_DATA_MAPPING.get(id);
    if (!attributeMetaData) {
        return;
    }

    let newValue = current;
    switch (mod.scheme) {
        case AttributeModScheme.ADD:
            newValue += mod.amount;
            break;
        case AttributeModScheme.MULTIPLY:
            newValue *= mod.amount;
            break;
        case AttributeModScheme.SET_TAKE_MAX:
            newValue = Math.max(newValue, mod.amount);
            break;
    }

    return getAttributeDisplayString(id, current) + ' -> ' + getAttributeFormattedValueString(id, newValue);
}

export function getAttributeDisplayString(id: AttributeId, current: number, truncateDisplayName: boolean = false) {
    const attributeMetaData = ATTRIBUTE_META_DATA_MAPPING.get(id);
    if (!attributeMetaData) {
        return;
    }
    return (truncateDisplayName ? attributeMetaData.displayName.substring(0, 10) : attributeMetaData.displayName) + ': ' + getAttributeFormattedValueString(id, current);
}

export function getAttributeFormattedValueString(id: AttributeId, value: number) {
    const attributeMetaData = ATTRIBUTE_META_DATA_MAPPING.get(id);
    if (!attributeMetaData) {
        return;
    }

    let currentStr = '';
    let unitsStr = '';
    switch (attributeMetaData.unitDisplayType) {
        case AttributeDisplayUnitType.PERCENT:
            currentStr = Math.round(value * 100).toString();
            unitsStr = '%';
            break;
        case AttributeDisplayUnitType.BOOL:
            currentStr = value > 0 ? 'True' : 'False';
            break;
        default:
            currentStr = value.toFixed(attributeMetaData.fixedDigits);
            break;
    }
    return currentStr + unitsStr;
}
