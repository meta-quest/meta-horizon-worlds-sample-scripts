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
import { ColorWithAlpha, Vec2 } from 'UtilsFX';

export const RETICLE_HIT_COLOR_BODY = new ColorWithAlpha(1, 1, 0, 1);
export const RETICLE_HIT_COLOR_CRIT = new ColorWithAlpha(1, 0, 0, 1);

export const DAMAGE_NUMBER_COLOR_BODY = new ColorWithAlpha(1, 1, 1, 1);
export const DAMAGE_NUMBER_COLOR_CRIT = new ColorWithAlpha(1, 1, 0, 1); // 6-4 was 1, 0.4, 0.4, 1

export const DAMAGE_NUMBER_SIZE_BODY = 0.0275;
export const DAMAGE_NUMBER_SIZE_CRIT = 0.04; // 6-4 was 0.0275

// Adjusts direction and distance the number flies on camera aligned plane.
// X and Y control 2D direction (horizontal, vertical). Z controls distance (magnitude).
export const DAMAGE_NUMBER_VELOCITY_CRIT = new Vec3(0.5, 0.5, 1.5); // 6-4 was 1, 1, 1.5
export const DAMAGE_NUMBER_VELOCITY_BODY = new Vec3(0.5, 0.5, 1.5); // 6-4 was 1, 1, 1.5

export const DAMAGE_NUMBER_LIFE_SECONDS_CRIT = 1.35; // 6-4 was 1.25
export const DAMAGE_NUMBER_LIFE_SECONDS_BODY = 1.25;

// Adjusts velocity distance. Selects a random value between X(min) and Y(max).
export const DAMAGE_NUMBER_VELOCITY_RANDOMNESS_SCALAR_CRIT: Vec2 = new Vec2(0.5,3);
export const DAMAGE_NUMBER_VELOCITY_RANDOMNESS_SCALAR_BODY: Vec2 = new Vec2(0.5,3);

export const AUTO_TRIGGER_VFX_SCALE = 0.04;
export const AUTO_TRIGGER_VFX_COLOR = new ColorWithAlpha(1,1,1,1);

// These VFX were originally designed for VR, they can work for Mobile/Desktop so we're using them.
export const HUD_LEGACY_VFX_2D_SCALE = new Vec2(1.3, 0.9);
