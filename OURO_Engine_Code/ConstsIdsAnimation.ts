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

export const ALL_ANIMATIONS = [
    'third_place_pose',
    'second_place_pose',
    'first_place_pose',
    'death_front',
    'death_back',
    'death_right',
    'death_left',
    'death_front_headshot',
    'death_back_headshot',
    'death_right_headshot',
    'death_left_headshot',
] as const;
export type AnimationId = typeof ALL_ANIMATIONS[number];

export function validAnimationId(value: string): AnimationId {
    return validId('ALL_ANIMATIONS', ALL_ANIMATIONS, value);
}
