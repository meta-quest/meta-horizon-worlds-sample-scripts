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


import { CameraMode, CameraTransitionOptions } from 'horizon/camera';
import { Quaternion, Vec3 } from 'horizon/core';

//** CAMERAS */
export const CAMERA_PRIORITY_ABILITIES = 10;
export const CAMERA_PRIORITY_DEATH = 50;
export const CAMERA_PRIORITY_PODIUM = 100;
export const CAMERA_PRIORITY_LOBBY = 5;
export const CAMERA_PRIORITY_MATCH = 6;
export const CAMERA_PRIORITY_WELCOMEVIDEO = 150;

/** CameraMode Settings which can be serialized and sent over the wire. */
export type CameraModeSettings = {
    cameraMode: CameraMode,
    priority: number,
    transition: number | null,
    position: Vec3 | null,
    rotation: Quaternion | null,
    fovOverride: number | null
}

export const DEFAULT_CAMERA_TRANSITION_PAYLOAD: CameraModeSettings = {
    cameraMode: CameraMode.ThirdPerson,
    priority: 1,
    transition: null,
    position: null,
    rotation: null,
    fovOverride: null,
}

/** Dictates the camera animation properties for when we play a camera shake.
 * <br> Currently animates to and back from ({@link shakeFOV}, {@link rollAngle}) using CameraTransitionOptions.
 * <br> See {@link CameraTransitionOptions} for start and end animation properties.
 * */
export interface CameraShakeAnimation {
    /**Delta FOV change when weapon is fired*/
    shakeFOV: number;
    shakeStartAnimation: CameraTransitionOptions,
    shakeEndAnimation: CameraTransitionOptions,

    /**Delta Camera Roll change when weapon is fired*/
    rollAngle: number;
    rollStartAnimOptions: CameraTransitionOptions,
    rollEndAnimOptions: CameraTransitionOptions,
}


export const DEFAULT_CAMERA_SETTINGS: CameraModeSettings = {
    ...DEFAULT_CAMERA_TRANSITION_PAYLOAD,
    cameraMode: CameraMode.ThirdPerson,
    priority: 0,
}

export function cameraSettingsValueComparer(a: CameraModeSettings, b: CameraModeSettings)  {
    return a.cameraMode == b.cameraMode &&
        a.transition == b.transition &&
        // ignore position/rotation for now
        // a.position == b.position &&
        // a.rotation == b.rotation &&
        a.fovOverride == b.fovOverride;
}
