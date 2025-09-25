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


import { Vec3 } from 'horizon/core';
import * as UtilsMath from 'UtilsMath';

export enum AttackType {
    UNDEFINED = 0,
    MELEE,
    PORJECTILE,
    SPECIAL_1,
}

export const ATTACK_ID_UNDEFIEND = 'atk_undefined';
export const ATTACK_ID_PRIMARY = 'atk_primary';
export const ATTACK_ID_SECONDARY = 'atk_secondary';
export const ATTACK_ID_THIRD = 'atk_third';

export interface AttackStatusEffectData {
    id: number,
    duration: number,
}

export interface AttackData {
    id: string,

    displayName: string,
    animIndex: number,

    blocksMovementPreHit: boolean,
    blocksMovementDuringHit: boolean,
    blocksMovementPostHit: boolean,

    blocksTargetingPreHit: boolean,
    blocksTargetingDuringHit: boolean,
    blocksTargetingPostHit: boolean,

    minRange: number, // target must be over this range to perform
    range: number, // target must be under this range to perform

    initialCooldown: UtilsMath.NumberRange, // how long after spawning before this attack can be used

    attackType: AttackType,
    attackAmmo: number, // Number of attacks before requiring reload animation
    attackDuration: number,
    attackCooldown: UtilsMath.NumberRange, // Time between this attack being performed


    rotateWeaponTowardsTarget: boolean,

    hitFrameTime: number, // When during the animation the hit counts / projectile is fired
    hitDuration: number,

    onAttackStartStatusEffects: AttackStatusEffectData[],
    onAttackEndStatusEffects: AttackStatusEffectData[],
    onHitStartStatusEffects: AttackStatusEffectData[],
    onHitEndStatusEffects: AttackStatusEffectData[],

    recoveryTime: UtilsMath.NumberRange, // Time before any attacks can be performed

    aggroDecayPercent: number, // percent of aggro to reduce upon attempting to hit a target, range from 0.0 to 1.0, value of 1.0 should fully remove aggro

    relativeMoveDelay: number,
    relativeMoveDuration: number,
    relativeMoveDir: Vec3,
    relativeMoveSpeedScaler: number,
}

export const ATTACK_DATA_DEFAULT: AttackData = {
    id: ATTACK_ID_UNDEFIEND,

    displayName: 'Undefined',
    animIndex: 0,

    blocksMovementPreHit: true,
    blocksMovementDuringHit: true,
    blocksMovementPostHit: true,

    blocksTargetingPreHit: false,
    blocksTargetingDuringHit: true,
    blocksTargetingPostHit: true,

    minRange: 0,
    range: 5,

    initialCooldown: new UtilsMath.NumberRange(0),

    attackType: AttackType.UNDEFINED,
    attackAmmo: 1,
    attackDuration: 1,
    attackCooldown: new UtilsMath.NumberRange(1),

    rotateWeaponTowardsTarget: true,

    hitFrameTime: 0.0,
    hitDuration: 0.1,

    onAttackStartStatusEffects: [],
    onAttackEndStatusEffects: [],
    onHitStartStatusEffects: [],
    onHitEndStatusEffects: [],

    recoveryTime: new UtilsMath.NumberRange(1),

    aggroDecayPercent: 0.5,

    /**
     * NOTE - Relative movement,
     * - make sure to set blocksMovement/blocksMovementDuringHit to true/false where appropriate or else the actor may not move
     * - make sure to set blocksTargeting/blockTargetingDuringHit to true/false where approriate or else the actor may continue seeking the target
     */
    relativeMoveDelay: 0, // how much time in seconds to wait after the attack starts to begin moving
    relativeMoveDuration: 0, // how long to move for after starting
    relativeMoveDir: Vec3.zero, // which direction relative to the current facing, must be non-zero to function
    relativeMoveSpeedScaler: 1.0, // how fast to move, multiplied to the actor's speed
};

export const ATTACK_DATA_MELEE_DEFAULT: AttackData = {
    ...ATTACK_DATA_DEFAULT,
    attackType: AttackType.MELEE,
    rotateWeaponTowardsTarget: false,
};

export const ATTACK_DATA_PROJECTILE_DEFAULT: AttackData = {
    ...ATTACK_DATA_DEFAULT,
    attackType: AttackType.PORJECTILE
};
