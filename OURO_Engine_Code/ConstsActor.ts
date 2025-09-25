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

import * as ConstsAttack from 'ConstsAttack';
import * as ConstsAttributes from 'ConstsAttributes';
import * as ConstsObj from 'ConstsObj';
import * as EventData from 'EventData';
import { BehaviorTreeIds } from 'IdBehaviorTree';
import { AssetEx } from 'AssetEx';
import * as UtilsMath from 'UtilsMath';

export const DEBUG_LOG_ENABLED = true;

//** --------------------------------------------  WEAK POINT DATA ------------------------------------ */
export enum WeakpointDamageMultiplierScheme {
    /** adds a raw value to the source's damage multiplier i.e. if player hits weakpoints for 2x damage, if you set the value to 0.5, this would result in 2.5x damage */
    ADD_RAW = 0,
    /** multiplies the value to the source's damage multiplier i.e. if player hits weakpoints for 2x damage, if you set the value to 0.5, this would result in 1.0x damage */
    SCALE_SOURCE,
    /** overrides the source's damage multiplier, i.e. if player hits weakpoints for 2x damage, if you set the value to 0.5, this would result in 0.5x damage */
    OVERRIDE,
}

export interface ActorWeakPointData {
    /** id that maps this data to a weakpoint object inside the actor's group */
    id: number,
    /** which bone on the model that the weakpoint will be attached to. FYI: NOT FUNCTIONAL YET */
    boneId: string,

    radiusOverride?: number,
    hasCollision: boolean,
    isVisible: boolean,

    /** added to the attacker's multiplier */
    additionalDamageMultiplier: number,
    additionalDamageMultiplierScheme: WeakpointDamageMultiplierScheme,

    /** multiplier to aggro when this weakpoint is hit */
    aggroMultiplier: number,

    /** whether or not this weakpoint is active and can be hit by default */
    activeByDefault: boolean,
    /** how much damage before the 'OnWeakPointDestroyed" event is fired, set to -1 for unlimited */
    hp: number,
    /** 0 to 360 value, 360 means full spherical, values closer to 0 means the incoming hit has to be coming from the weakpoint's forward direction */
    directionalAngle: number,

    /** which weakpoints to enable when this weakpoint is destroyed */
    onDestroyActiveWeakPoints: number[],
}

export const ACTOR_WEAKPOINT_DATA_DEFAULT: ActorWeakPointData = {
    id: 0,
    boneId: '',

    hasCollision: false,
    isVisible: false,

    additionalDamageMultiplier: 0,
    additionalDamageMultiplierScheme: WeakpointDamageMultiplierScheme.ADD_RAW,

    aggroMultiplier: 2,

    activeByDefault: true,
    hp: -1,
    directionalAngle: 360,

    onDestroyActiveWeakPoints: []
};


//** --------------------------------------------  MOVEMENT DATA ------------------------------------ */
export enum ActorMovementType {
    DEFAULT,
    FLYING,
    STATIONARY,
}

export interface ActorMovementData {
    movementType: ActorMovementType;
    minFlightHeight: number,
    maxFlightHeight: number,
}

//** --------------------------------------------  VISUAL DATA ------------------------------------ */
export interface ActorAnimData {
    deathAnimDuration: number,
}

export interface ActorBodyPartData {
    centerRadius: number,
    headRadius?: number,
    feetRadius?: number,
}

//** --------------------------------------------  ACTOR DATA ------------------------------------ */
export interface ActorData {
    id: bigint,
    asset: AssetEx | undefined

    displayName: string,
    description: string,

    material: ConstsObj.ObjMaterial,
    meshMaterialName?: string,

    postSpawnActionDelay: UtilsMath.NumberRange,

    initialAttributeOverrides: Map<ConstsAttributes.AttributeId, ConstsAttributes.Attribute>;
    behaviorTreeId: BehaviorTreeIds;

    attacks: ConstsAttack.AttackData[];

    movementData: ActorMovementData;
    animData: ActorAnimData;

    bodyPartData: ActorBodyPartData;

    weakPoints: ActorWeakPointData[];

    /** how much aggro is decayed per rate tick */
    aggroDecayPercent: number;
    /** number of seconds between decay tick */
    aggroDecayTickRate: number;
    /** time is seconds before re-evaluating aggro targets, if the current target has not been attacked */
    aggroReevaluationTime: number;
}

export const ACTOR_DATA_DEFAULT: ActorData = {
    id: EventData.UNDEFINED_BIGINT,
    asset: undefined,
    displayName: 'Undefined',
    description: '',

    material: ConstsObj.ObjMaterial.UNDEFINED,
    meshMaterialName: undefined,

    postSpawnActionDelay: new UtilsMath.NumberRange(0.5, 1.5),

    initialAttributeOverrides: new Map<ConstsAttributes.AttributeId, ConstsAttributes.Attribute>(),
    behaviorTreeId: BehaviorTreeIds.UNDEFINED,

    attacks: [],

    movementData: {
        movementType: ActorMovementType.DEFAULT,
        minFlightHeight: 2,
        maxFlightHeight: 5,
    },
    animData: {
        deathAnimDuration: 1.0
    },

    bodyPartData: {
        centerRadius: 1,
        headRadius: 0.2
    },

    weakPoints: [],

    aggroDecayPercent: 0.1,
    aggroDecayTickRate: 1,
    aggroReevaluationTime: 2.5,
};

export const ACTOR_DATA_REGISTRY = new EventData.DataRegistry<bigint, ActorData>('Actor');


/**------------------------------------- TEST ENEMIES -------------------------------------*/
export const ACTOR_DATA_DUMMY = {
    ...ACTOR_DATA_DEFAULT,
    id: UtilsMath.hashString('dummy'),
    displayName: 'Dummy',

    initialAttributeOverrides: new Map<ConstsAttributes.AttributeId, ConstsAttributes.Attribute>([
        [ConstsAttributes.AttributeId.MAX_HP, {value: 200}],
        [ConstsAttributes.AttributeId.MOVEMENT_SPEED, {value: 0}]
    ]),
    weakPoints: [
        {
            ...ACTOR_WEAKPOINT_DATA_DEFAULT,
            id: 0,
            hp: 0,
            hasCollision: true,
            directionalAngle: 180
        },
        {
            ...ACTOR_WEAKPOINT_DATA_DEFAULT,
            id: 1, // head
            hp: 0,
            hasCollision: true,
            directionalAngle: 360
        },
        {
            ...ACTOR_WEAKPOINT_DATA_DEFAULT,
            id: 2, // head
            hp: 0,
            hasCollision: true,
            directionalAngle: 360
        },
        {
            ...ACTOR_WEAKPOINT_DATA_DEFAULT,
            id: 3, // head
            hp: 0,
            hasCollision: true,
            directionalAngle: 360
        },
        {
            ...ACTOR_WEAKPOINT_DATA_DEFAULT,
            id: 4, // head
            hp: 0,
            hasCollision: true,
            directionalAngle: 360
        }
    ],
    animData: {
        deathAnimDuration: 0
    }
};
ACTOR_DATA_REGISTRY.register(ACTOR_DATA_DUMMY);

export const ACTOR_DATA_ENEMY_DEFAULT: ActorData = {
    ...ACTOR_DATA_DEFAULT,
    behaviorTreeId: BehaviorTreeIds.DEFAULT
};
ACTOR_DATA_REGISTRY.register(ACTOR_DATA_ENEMY_DEFAULT);
