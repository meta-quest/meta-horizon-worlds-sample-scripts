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


import {EntityOrPlayer} from 'ConstsObj';
import {ChangeDataHitInfo} from 'EventData';
import { Color, Player, Vec3 } from 'horizon/core';

//** TYPE DEFINITIONS */
export enum DAMAGE_NUMBER_ANIMATION {
    DEFAULT = 0,
    STAMP
}

/**Box of where damage number can show offset from raw impact position. This flips based on direction if set.*/
export type DamageNumberSpawnMinMax = {
    min: Vec3,
    max: Vec3,
}

export interface DamageNumberProps {
    sizeDelta: number,
    colorString: string,
    subText: string,
    driftDir: Vec3 | undefined,
    lifetime: number,
    driftDistance: number,
    minMaxSpawnDistance: DamageNumberSpawnMinMax,
    flipSpawnBoundsBasedOnDir: boolean,
    animation: DAMAGE_NUMBER_ANIMATION,
}

export type DamageNumberData = {
    player: Player;
    text: string;
    color: Color;
    pos: Vec3;
    dir?: Vec3;
    lifetime: number;
    driftDistance: number;
    sizeDelta: number;
    minMaxSpawnDistance: DamageNumberSpawnMinMax;
    animation: DAMAGE_NUMBER_ANIMATION;
    relativeObj?: EntityOrPlayer;
    changeData: ChangeDataHitInfo;
}


/* ---------------- GLOBAL TUNING VARIABLES ----------------- */
export const FONT_STRING = '<font="Kallisto-Bold SDF">';
export const SCALE = 0.5;
export const FADE_START_PERCENT = 0.5; // at when, during its lifetime it begins to fade to 0 opacity.
export const FORWARD_OFFSET = 4; // Controls how far towards the player the damage number is placed (in meters?)
export const END_SCALE_PCT = 0.75; // linearly starts scaling the damage number to this scale as its lifetime expires.
export const DRIFT_DIST_RAND_MIN = .5; // random variance of drift distance
export const DRIFT_DIST_RAND_MAX = 1; // random variance of drift distance
export const ANIM_STAMP_SCALE = 2; // Scalar, multiplies current damage number scale.
export const ANIM_STAMP_DURATION = 0.05; // seconds (beware, if lifetime of damage number is too short)

/* ------------ PER-DAMAGE-TYPE TUNING VARIABLES ------------ */
export const DAMAGE_NUMBER_PROPS_DEFAULT: DamageNumberProps = {
    sizeDelta: 0,
    colorString: '#FFFFFF',
    subText: '',
    driftDir: undefined, // undefined drift direction == drift gets calculated based on damage origin and spawn location.
    lifetime: 0.5,
    driftDistance: 1.5,
    minMaxSpawnDistance: {
        min: Vec3.zero,
        max: Vec3.zero,
    },
    flipSpawnBoundsBasedOnDir: true,
    animation: DAMAGE_NUMBER_ANIMATION.DEFAULT,
};

export const DAMAGE_NUMBER_PROPS_ELEMENT_FIRE: DamageNumberProps = {
    ...DAMAGE_NUMBER_PROPS_DEFAULT,
    sizeDelta: -25,
    colorString: '#FF7F50',
};

export const DAMAGE_NUMBER_PROPS_ELEMENT_FIRE_BURN: DamageNumberProps = {
    ...DAMAGE_NUMBER_PROPS_DEFAULT,
    sizeDelta: -25,
    colorString: '#FF7F50',
    subText: '<br><size=50%>*BURN*',
};

export const DAMAGE_NUMBER_PROPS_ELEMENT_POISON: DamageNumberProps = {
    ...DAMAGE_NUMBER_PROPS_DEFAULT,
    sizeDelta: -25,
    colorString: '#556B2F',
    subText: '<br><size=50%>*POISON*',
};

export const DAMAGE_NUMBER_PROPS_WEAKNESS: DamageNumberProps = {
    ...DAMAGE_NUMBER_PROPS_DEFAULT,
    sizeDelta: 75,
    colorString: '#FFF61D',
    driftDir: new Vec3(0, 1, 0),
    lifetime: 0.75,
    driftDistance: 0.5,
    minMaxSpawnDistance: {
        min: Vec3.zero,
        max: Vec3.zero,
    },
    flipSpawnBoundsBasedOnDir: true,
    animation: DAMAGE_NUMBER_ANIMATION.STAMP,
};

export const DAMAGE_NUMBER_PROPS_CRIT: DamageNumberProps = {
    ...DAMAGE_NUMBER_PROPS_WEAKNESS,
    animation: DAMAGE_NUMBER_ANIMATION.DEFAULT,
};

//** HELPER METHODS */
export function flipMinMaxBasedOnDriftDir(minMax: DamageNumberSpawnMinMax, dir: Vec3) {
    const newXMin = dir.x < 0 ? minMax.min.x * -1 : minMax.min.x;
    const newYMin = dir.y < 0 ? minMax.min.y * -1 : minMax.min.y;
    const newXMax = dir.x < 0 ? minMax.max.x * -1 : minMax.max.x;
    const newYMax = dir.y < 0 ? minMax.max.y * -1 : minMax.max.y;
    return {min: new Vec3(newXMin, newYMin, 0), max: new Vec3(newXMax, newYMax, 0)};
}
