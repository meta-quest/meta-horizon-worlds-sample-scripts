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

import {CameraMode} from 'horizon/camera';
import {CAMERA_FOV_FIRST_PERSON_HZ_DEFAULT, CAMERA_FOV_THIRD_PERSON_HZ_DEFAULT} from 'PlayerCameraHandler';

/**Returns a scale factor to scale vfx elements based on camera's default FOV's.
 * Returns scale factor of 1 in first-person since we are a first-person shooter.
 * */
export function getCameraFOVScaleFactor(cameraMode: CameraMode) : number {
    if (cameraMode == CameraMode.ThirdPerson) return CAMERA_FOV_THIRD_PERSON_HZ_DEFAULT / CAMERA_FOV_FIRST_PERSON_HZ_DEFAULT;
    // TODO: Add camera mode FOV(s) for attached camera and orbit camera when we have default const's.
    return 1;
}
