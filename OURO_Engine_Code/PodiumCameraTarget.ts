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

import { CameraModeSettings, CAMERA_PRIORITY_PODIUM } from 'ConstsCamera';
import { CameraMode } from 'horizon/camera';
import { Component, PropTypes } from 'horizon/core';

export class PodiumCameraTarget extends Component<typeof PodiumCameraTarget> {
    static propsDefinition = {
        transitionDuration: {type: PropTypes.Number},
        totalDuration: {type: PropTypes.Number},
        nextTarget: {type: PropTypes.Entity},
        // Target will be skipped if there are fewer players than this ranking (e.g. rank 3 targets are skipped if only 2 players)
        ranking: {type: PropTypes.Number, default: -1},
        // The anim sequence to play, see AnimationId class for a list
        optAnimId: {type: PropTypes.String},
        fov: {type: PropTypes.Number, default: -1},
        easing: {type: PropTypes.Number, default: 2},
    };

    priority: number = CAMERA_PRIORITY_PODIUM;
    next?: PodiumCameraTarget;

    preStart() {
    }

    start() {
    }

    getAnimSettings(): CameraModeSettings {
        return {
            cameraMode: CameraMode.Fixed,
            priority: this.priority,
            transition: this.props.transitionDuration,
            position: this.entity.position.get(),
            rotation: this.entity.rotation.get(),
            fovOverride: this.props.fov > 0 ? this.props.fov : null,
        };
    }

    getTotalAnimationDuration() {
        return this.props.totalDuration;
    }

    public initCameraTarget() {
        if (this.props.nextTarget) {
            this.props.nextTarget.getComponents(PodiumCameraTarget)?.forEach((comp) => {
                this.next = comp;
                comp.priority = this.priority + 1;
            });
        }
    }
}
