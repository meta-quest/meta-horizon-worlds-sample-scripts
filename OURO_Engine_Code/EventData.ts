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

import { AbilityId } from 'ConstsIdsAbility';
import { StatusEffectId } from 'ConstsIdsStatusEffect';
import { WeaponId } from 'ConstsIdsWeapon';
import { EntityOrPlayer } from 'ConstsObj';
import { Vec3 } from 'horizon/core';
import * as UtilsMath from 'UtilsMath';
import { getStringFromHash } from 'UtilsMath';

export const UNDEFINED = 0;
export const UNDEFINED_STRING = 'UNDEFINED';
export const UNDEFINED_BIGINT = BigInt(0);

export const IS_NOT_UNDEFINED_STRING = (id: any) => id != UNDEFINED_STRING;

export enum ChangeType {
    UNDEFINED = 0,

    MELEE,
    PROJECTILE,
    AOE,
    CONE,
    BEAM,
}

export enum ChangeAction {
    UNDEFINED = 0,

    DAMAGE,
    HEAL,
    STATUS_EFFECT_FROM_WEAPON,
    AGGRO,
}

export enum ChangeElement {
    UNDEFINED = 0,
    FIRE,
    FIRE_BURN,
    POISON,
}

export enum ChangeScheme {
    RAW = 0,
    PERCENT,
}

/** Scheme of which type of targets it should affect */
export enum TargetScheme {
    UNDEFINED = 0,
    ALL,
    ALL_INCLUDING_OWNER,
    OWNER_ONLY,
    PLAYERS_ONLY,
    PLAYERS_ONLY_INCLUDING_OWNER,
    ENTITIES_ONLY,
    ENTITIES_ONLY_INCLUDING_OWNER,
    TEAM_ONLY,
    ENEMY_TEAM_ONLY,
}

export enum TargetSelectionScheme {
    UNDEFINED,
    ALL,
    RANDOM_N,
    CLOSEST_N,
}

export enum AmountCalculationScheme {
    UNDEFINED,
    USE_AMOUNT,
    USE_MIN_AMOUNT,
    RANDOM_RANGE,
    LINEAR_FALLOFF,
    THRESHOLD, // use max if t value is 0, otherwise use min
}

export function calculateAmount(scheme: AmountCalculationScheme, minAmount: number, maxAmount: number, fallOff01: number = 0) {
    switch (scheme) {
        case AmountCalculationScheme.USE_AMOUNT:
            return maxAmount;
        case AmountCalculationScheme.USE_MIN_AMOUNT:
            return minAmount;
        case AmountCalculationScheme.RANDOM_RANGE:
            return UtilsMath.randomRangeInt(minAmount, maxAmount);
        case AmountCalculationScheme.LINEAR_FALLOFF:
            return UtilsMath.lerp(maxAmount, minAmount, fallOff01);
        case AmountCalculationScheme.THRESHOLD:
            return fallOff01 <= 0 ? maxAmount : minAmount;
    }

    console.error('getAmount - scheme: ' + AmountCalculationScheme[scheme] + ', missing scheme');
    return 0;
}

export function calculateAmountFromChangeData(data: ChangeData, isAOE: boolean = false, fallOff01: number = 0) {
    return calculateAmount(isAOE ? data.aoeAmountCalculationScheme : data.amountCalculationScheme, data.minAmount, data.amount, fallOff01);
}

export type TargetingSelectionData = {
    selectionScheme: TargetSelectionScheme,
    count?: number,
    pos?: Vec3,
}

export const TARGETING_SELECTION_DATA_DEFAULT: TargetingSelectionData = {
    selectionScheme: TargetSelectionScheme.ALL
};

//** CHANGE DATA */
export type ChangeData = {
    // max amount dmg/heal/etc
    amount: number,
    // min amount dmg/heal/etc
    minAmount: number,
    // headshot amount
    headshotAmount: number,
    // Amount of time UI/UX components will use to react to this change.
    animationTimeSeconds: number,
    // scheme used in regular cases i.e. bullet hit
    amountCalculationScheme: AmountCalculationScheme,
    // scheme used in aoe cases i.e. splash damage
    aoeAmountCalculationScheme: AmountCalculationScheme,
    changeScheme: ChangeScheme,
    changeAction: ChangeAction,
    changeType: ChangeType,
    changeElement: ChangeElement,
    targetScheme: TargetScheme,
}

export const CHANGE_DATA_DEFAULT: ChangeData = {
    amount: 0,
    minAmount: 0,
    headshotAmount: 0,
    animationTimeSeconds: 0,
    amountCalculationScheme: AmountCalculationScheme.USE_AMOUNT,
    aoeAmountCalculationScheme: AmountCalculationScheme.LINEAR_FALLOFF,
    changeScheme: ChangeScheme.RAW,
    changeAction: ChangeAction.UNDEFINED,
    changeType: ChangeType.UNDEFINED,
    changeElement: ChangeElement.UNDEFINED,
    targetScheme: TargetScheme.UNDEFINED,
};

//** SOURCE DATA */
export type SourceData = {
    weaponId: WeaponId,
    abilityId: AbilityId,
    statusEffectId: StatusEffectId,
    obj?: EntityOrPlayer,
    pos: Vec3,
    targetRelativePos?: Vec3,
}

export const SOURCE_DATA_DEFAULT: SourceData = {
    weaponId: UNDEFINED_STRING,
    abilityId: UNDEFINED_STRING,
    statusEffectId: UNDEFINED_STRING,
    obj: undefined,
    pos: Vec3.zero,
};

//** CHANGE DATA WITH SOURCE */
export type ChangeDataWithSource = {
    changeData: ChangeData,
    sourceData: SourceData,
}

export const CHANGE_DATA_WITH_SOURCE_DEFAULT: ChangeDataWithSource = {
    changeData: CHANGE_DATA_DEFAULT,
    sourceData: SOURCE_DATA_DEFAULT
};

export type ChangeDataTarget = ChangeDataWithSource & {
    targetData: EntityOrPlayer,
};

export type ChangeDataSplash = ChangeDataWithSource & {
    minRadius: number,            // where damage fall off begins
    radius: number,              // aoe radius
    targetSelectionData: TargetingSelectionData,
};

export const CHANGE_DATA_SPLASH_DEFAULT: ChangeDataSplash = {
    ...CHANGE_DATA_WITH_SOURCE_DEFAULT,
    changeData: {
        ...CHANGE_DATA_WITH_SOURCE_DEFAULT.changeData,
        changeType: ChangeType.AOE
    },
    minRadius: 0,
    radius: 0,
    targetSelectionData: TARGETING_SELECTION_DATA_DEFAULT
};

export type ChangeDataCone = ChangeDataWithSource & {
    dir: Vec3,                // cone direction
    minRadius: number,            // where damage fall off begins
    radius: number,              // cone base radius
    range: number,               // cone height
    targetSelectionData: TargetingSelectionData,
};

export const CHANGE_DATA_CONE_DEFAULT: ChangeDataCone = {
    ...CHANGE_DATA_WITH_SOURCE_DEFAULT,
    changeData: {
        ...CHANGE_DATA_WITH_SOURCE_DEFAULT.changeData,
        changeType: ChangeType.CONE
    },
    dir: Vec3.zero,
    minRadius: 0,
    radius: 0,
    range: 0,
    targetSelectionData: TARGETING_SELECTION_DATA_DEFAULT
};

export const CHANGE_DATA_BEAM_DEFAULT: ChangeDataCone = {
    ...CHANGE_DATA_WITH_SOURCE_DEFAULT,
    changeData: {
        ...CHANGE_DATA_WITH_SOURCE_DEFAULT.changeData,
        changeType: ChangeType.BEAM
    },
    dir: Vec3.zero,
    minRadius: 0,
    radius: 0,
    range: 0,
    targetSelectionData: TARGETING_SELECTION_DATA_DEFAULT
};

export type ChangeDataHitInfo = ChangeDataWithSource & {
    targetData: EntityOrPlayer,
    isShieldHit: boolean,
    isHeadshotHit: boolean,
    isWeakPointHit: boolean,
    weakPointId: number,
    isCrit: boolean,
    material: number,
};

export const CHANGE_DATA_HIT_INFO_DEFAULT: Omit<ChangeDataHitInfo, "targetData"> = {
    ...CHANGE_DATA_WITH_SOURCE_DEFAULT,
    isShieldHit: false,
    isHeadshotHit: false,
    isWeakPointHit: false,
    weakPointId: 0,
    isCrit: false,
    material: -1
};

export function getEntityOrPlayerOrThrow(sourceData: {obj?: EntityOrPlayer}) {
    if (sourceData.obj == undefined)
        throw Error(`Unknown obj type`);
    return sourceData.obj;
}

//** FORCE DATA */
export enum ForceType {
    UNDEFINED = 0,
    JUMP,
    ROCKET_JUMP,
    GRAVITY,
}

export type ForceData = {
    forceType: ForceType,
    force: number,
    forceDir: Vec3,
}

export const FORCE_DATA_DEFAULT: ForceData = {
    forceType: ForceType.UNDEFINED,
    force: 0,
    forceDir: Vec3.zero
};

export type ForceDataWithSource = {
    forceData: ForceData,
    sourceData: SourceData,
}

export const FORCE_DATA_WITH_SOURCE_DEFAULT: ForceDataWithSource = {
    forceData: FORCE_DATA_DEFAULT,
    sourceData: SOURCE_DATA_DEFAULT
};

export type ForceDataTarget = ForceDataWithSource & {
    targetData: EntityOrPlayer,
}

export type ForceDataSplash = ForceDataWithSource & {
    targetScheme: TargetScheme,
    radius: number,
    horizontalOnly: boolean,
}

export const FORCE_DATA_SPLASH_DEFAULT: ForceDataSplash = {
    ...FORCE_DATA_WITH_SOURCE_DEFAULT,
    targetScheme: TargetScheme.UNDEFINED,
    radius: 0,
    horizontalOnly: false
};

export interface WeaponForceData {
    targets: TargetScheme;
    forceType: ForceType;
    strength: number;
    radius: number;
    horizontalOnly: boolean,
}

export const WEAPON_FORCE_DATA_DEFAULT: WeaponForceData = {
    targets: TargetScheme.UNDEFINED,
    forceType: ForceType.UNDEFINED,
    strength: 0,
    radius: 0,
    horizontalOnly: false
};

//** DATA REGISTRY */
function idTypeIsUndefined<IdType>(id?: IdType): boolean {
    if (!id) return false;

    switch (typeof id) {
        case 'bigint':
            return id == UNDEFINED_BIGINT;
        case 'string':
            return id == UNDEFINED_STRING;
        case 'number':
            return id == UNDEFINED;
        default:
            return false;
    }
}

export interface IRegisterableData<T> {
    id: T,
    displayName: string,
}

export class DataRegistry<IdType = bigint, T extends IRegisterableData<IdType> = IRegisterableData<IdType>> {
    dataMapping = new Map<IdType, T>(); // <nameSpaceId, <Id, Data>>
    debugLabel: string;

    constructor(debugLabel: string) {
        this.debugLabel = debugLabel;
    }

    has(id?: IdType): boolean {
        return !idTypeIsUndefined(id) && this.dataMapping.has(id!);
    }

    get(id?: IdType): T | undefined {
        if (idTypeIsUndefined(id)) {
            return;
        }

        const data = this.dataMapping.get(id!);
        if (!data) {
            console.error(`${this.debugLabel}: Missing id [${id}]`, (typeof id === 'bigint' ? `where id as string reads "${getStringFromHash(id)}"` : ''));
        }
        return data;
    }

    register(data: T) {
        const existingData = this.dataMapping.get(data.id);
        if (existingData) {
            console.error(this.debugLabel + ': Duplicate data registered - id:' + data.id + ', name:' + data.displayName + ', existing name:' + existingData.displayName);
            return;
        }
        this.dataMapping.set(data.id, data);
    }
}
