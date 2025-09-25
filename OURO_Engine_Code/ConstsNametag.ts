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
import { ImageStyle } from 'horizon/ui';

export const UI_CANVAS_WIDTH = 1000;
export const UI_CANVAS_HEIGHT = 700;

export const NAMETAG_TITLE_FONT_SIZE = 32;
export const NAMETAG_TITLE_MAX_LENGTH = 22;
export const NAMETAG_PLAYER_NAME_FONT_SIZE = 40;
export const NAMETAG_PLAYER_NAME_MAX_LENGTH = 14;
export const NAMETAG_POS_OFFSET_FROM_TORSO_METERS = new Vec3(0, 0.8, 0);
export const NAMETAG_POS_OFFSET_FROM_HEAD_METERS = new Vec3(0, 0.25, 0);
export const NAMETAG_DISTANCE_NEAR = 4;
export const NAMETAG_DISTANCE_FAR = 100;
export const NAMETAG_MAX_SIZE = Vec3.one.mul(12);
export const NAMETAG_MIN_SIZE = Vec3.one;

export const NAMETAG_CONTAINER_COLOR = 'rgba(0, 0, 0, 0.8)';
export const NAMETAG_CONTAINER_MIN_WIDTH = 460;
export const NAMETAG_CONTAINER_MAX_WIDTH = 640;
export const NAMETAG_CONTAINER_PADDING = 12;
export const NAMETAG_CONTAINER_PADDING_HORIZONAL = 90;
export const NAMETAG_CONTAINER_MARGIN_TOP = 16;
export const NAMETAG_CONTAINER_BORDER_RADIUS = 14;

export const TEXT_SHADOW_COLOR_ALLY = '#000000';
export const TEXT_SHADOW_COLOR_ENEMY = '#ff0000';

/*---------------------------------------- HEALTH BAR ----------------------------------------*/
export const HEALTH_BAR_HEIGHT = 70;
export const HEALTH_BAR_WIDTH = 392;
export const HEALTH_BAR_BORDER_COLOR = '#000000';
export const HEALTH_BAR_BORDER_WIDTH = 10;
export const HEALTH_BAR_FILL_COLOR_ALLY = '#19EE2B';
export const HEALTH_BAR_FILL_COLOR_ENEMY = '#ff0000';
export const ENEMY_DAMAGED_SHOW_TIME_MS = 2000;

/*----------------------------------------- STICKERS -----------------------------------------*/
const NAMETAG_SIZE = 166;
export const NAMETAG_STICKER_STYLE: ImageStyle = {
    height: NAMETAG_SIZE,
    width: NAMETAG_SIZE,
    position: 'absolute',
    resizeMode: 'center',
    zIndex: 100,
};
export const NAMETAG_STICKER_HORIZONTAL_OFFSET = NAMETAG_SIZE * -0.45;
export const NAMETAG_STICKER_VERTICAL_OFFSET = '-25%';

/*--------------------------------------- FRIEND STATUS ---------------------------------------*/
export const FRIEND_STATUS_TEXT_SIZE = 36;
export const FRIEND_STATUS_TEXT_COLOR = 'rgba(25, 129, 255, 1)';
export const FRIEND_STATUS_TEXT_PADDING_HORIZONTAL = 60;
export const FRIEND_STATUS_COLOR = 'rgba(255, 255, 255, 0.9)';
export const FRIEND_STATUS_HEIGHT = 50;
export const FRIEND_STATUS_BORDER_RADIUS = 50;

/*--------------------------------------- DEBUG ---------------------------------------*/
export const DEBUG_NAMETAGS_ON_UI_GIZMO = false;
export const DEBUG_NAMETAG_TITLE = 'Super-Master-At-Arms' // 20 characters
export const DEBUG_NAMETAG_NAME = 'UNVERYLONGNAME' // 14 characters
