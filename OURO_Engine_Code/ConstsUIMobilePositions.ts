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


import {Vec2} from 'UtilsFX';
import {TextureImageAssetEx} from 'AssetEx';

export const TEMPLATE_IMAGE_TEXTURE = TextureImageAssetEx.new('0');
export const TEMPLATE_IMAGE_OPACITY = 0;

/** IMPORTANT: Position definitions are anchored to corners. This file will have sections for each corner. */

/*** BOTTOM RIGHT ANCHORED COMPONENTS ****/
export const BUTTON_POSITION_RELOAD = new Vec2(438, 64);
export const BUTTON_POSITION_SWAP = new Vec2(372, 134);
export const BUTTON_POSITION_JUMP = new Vec2(128, 118);
export const BUTTON_POSITION_GADGET = new Vec2(96, 258);
export const BUTTON_POSITION_ABILITY = new Vec2(258, 68);
export const BUTTON_POSITION_SETTINGS = new Vec2(0, 0);
export const BUTTON_POSITION_QUEST_QA = new Vec2(0, 0);
export const BUTTON_POSITION_DEBUG_FIRE = new Vec2(68, 400);

/*** TOP LEFT ANCHORED COMPONENTS ****/
/*** TOP RIGHT ANCHORED COMPONENTS ****/
