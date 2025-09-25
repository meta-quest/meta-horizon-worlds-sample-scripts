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

import { AbilitySlot } from 'ConstsAbility';
import { LoadoutSlot } from 'ConstsLoadout';
import { EntityOrPlayer } from 'ConstsObj';
import { LocalEvent } from 'horizon/core';

export type InputEventData = { pressed: boolean };

export const onFirePressed = new LocalEvent<{ autoAimTarget?: EntityOrPlayer }>('onFirePressed');
export const onFireReleased = new LocalEvent<{}>('onFireReleased');
export const updateAutoAimTarget = new LocalEvent<{ autoAimTarget?: EntityOrPlayer }>('updateAutoAimTarget');
export const reload = new LocalEvent<{}>('reload');

export type JumpEventPayload = InputEventData;
export const jump = new LocalEvent<JumpEventPayload>('jump');

export const swapToWeapon = new LocalEvent<{ loadoutSlot: LoadoutSlot }>('swapToWeapon');

export const useAbility = new LocalEvent<{ slot: AbilitySlot, pressed: boolean }>('useAbility');

export const toggleDebugUI = new LocalEvent<{}>('toggleDebugUI');

export const nextFollowTarget = new LocalEvent<InputEventData>('nextFollowTarget');
