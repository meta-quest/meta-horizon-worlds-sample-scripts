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

import { Color, PopupOptions, Vec3 } from "horizon/core";



export const SEQUENTIAL_POP_UP_DELAY = 0.1;

export const POP_UP_POS_DEFAULT: Vec3 = new Vec3(0, -0.6, -0.2);
export const POP_UP_TEXT_SIZE_DEFAULT: number = 3;
export const POP_UP_TEXT_SIZE_SMALL: number = 2;

export const WIN_COLOR = new Color(1, 1, 0);
export const NEGATIVE_COLOR = Color.red;
export const WARNING_COLOR = new Color(1, 1, 0);

export const POP_UP_OPTIONS_DEFAULT: PopupOptions = {
    position: POP_UP_POS_DEFAULT,
    fontSize: POP_UP_TEXT_SIZE_DEFAULT,
    fontColor: Color.black,
    backgroundColor: Color.white,
    playSound: true,
    showTimer: false,
};

export const POP_UP_OPTIONS_DEFAULT_WITH_TIMER: PopupOptions = {
    ...POP_UP_OPTIONS_DEFAULT,
    showTimer: true,
};

export const POP_UP_OPTIONS_DEFAULT_SMALL: PopupOptions = {
    ...POP_UP_OPTIONS_DEFAULT,
    fontSize: POP_UP_TEXT_SIZE_SMALL,
};

export const POP_UP_OPTIONS_ABIILITY_READY_SMALL: PopupOptions = {
    ...POP_UP_OPTIONS_DEFAULT_SMALL,
    fontColor: Color.white,
    backgroundColor: Color.green,
};

export const POP_UP_OPTIONS_POINT_GAIN_SINGLE: PopupOptions = {
    ...POP_UP_OPTIONS_DEFAULT_SMALL,
    fontColor: WIN_COLOR,
    backgroundColor: Color.blue,
};

export const POP_UP_OPTIONS_POINT_GAIN_MULTI: PopupOptions = {
    ...POP_UP_OPTIONS_DEFAULT_SMALL,
    fontColor: Color.blue,
    backgroundColor: WIN_COLOR,
};

export const POP_UP_OPTIONS_DEATH: PopupOptions = {
    ...POP_UP_OPTIONS_DEFAULT,
    fontColor: Color.white,
    backgroundColor: Color.red,
    showTimer: true,
};

export const POP_UP_OPTIONS_DEATH_NO_COUNTDOWN: PopupOptions = {
    ...POP_UP_OPTIONS_DEATH,
    showTimer: false,
};

export const POP_UP_OPTIONS_ERROR: PopupOptions = {
    ...POP_UP_OPTIONS_DEFAULT,
    fontColor: Color.white,
    backgroundColor: Color.red,
};

export const POP_UP_OPTIONS_ERROR_SMALL: PopupOptions = {
    ...POP_UP_OPTIONS_ERROR,
    fontSize: POP_UP_TEXT_SIZE_SMALL,
};

export const POP_UP_OPTIONS_END_EARLY: PopupOptions = {
    ...POP_UP_OPTIONS_DEFAULT,
    fontColor: Color.white,
    backgroundColor: Color.black,
    showTimer: true,
};

export const POP_UP_OPTIONS_CELEBRATION: PopupOptions = {
    ...POP_UP_OPTIONS_DEFAULT,
    fontColor: Color.black,
    backgroundColor: WIN_COLOR,
};

export const POP_UP_OPTIONS_CELEBRATION_SMALL: PopupOptions = {
    ...POP_UP_OPTIONS_DEFAULT_SMALL,
    fontColor: Color.black,
    backgroundColor: WIN_COLOR,
};
