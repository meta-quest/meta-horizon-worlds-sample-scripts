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

import { CameraModeSettings, CAMERA_PRIORITY_WELCOMEVIDEO } from 'ConstsCamera';
import { HUDControlSchemeType } from 'ConstsMobileButtons';
import { setCanUseHomeMenu } from 'ConstsUIPlayerHomeMenu';
import { setPlayerInputIsBlocked, SpawnPointLocation } from 'Events';
import {
    addCameraOverride,
    addHUDControlSchemeOverride,
    nuxPlayWelcomeVideo,
    nuxWelcomeVideoFinished,
    nuxWelcomeVideoSkipped,
    onLocalPlayerHUDControlsReady,
    removeCameraOverride,
    removeHUDControlSchemeOverride,
    setDefaultHUDControlScheme
} from 'EventsNetworked';
import { Game } from 'Game';
import { CameraMode } from 'horizon/camera';
import { CodeBlockEvents, Player, PropTypes } from 'horizon/core';
import { MetricTypes } from 'horizon/in_world_analytics';
import { ServerAnalyticsService, ServerVideoPlayerService } from 'PlatformServices';
import { Hint } from 'PlayerConditionalNuxHints';


// TODO: Update with the actual length of the welcome video
export const WELCOME_VIDEO_LENGTH_MS = 35000 // 32s for temp asset

// Wait a small amount before releasing the video camera to hide the teleport ugliness
const TELEPORT_CAMERA_RELEASE_DELAY_MS = 500;

const WELCOME_VIDEO_CAMERA_SETTINGS: CameraModeSettings = {
    priority: CAMERA_PRIORITY_WELCOMEVIDEO,
    cameraMode: CameraMode.Fixed,
    transition: 0,
    position: null,
    rotation: null,
    fovOverride: 50,
}

export const WelcomeVideoHintProps = {
    videoPlayer: {type: PropTypes.Entity},
    videoCameraTarget: {type: PropTypes.Entity},
};
type Props = typeof WelcomeVideoHintProps;

export class WelcomeVideoHint extends Hint<Props> {
    private isActive = false;
    private videoSeen = false;

    protected override onInitialize() {
        this.subscriptions.push(
            this.hzObj.connectNetworkEvent(this.virtualOwner, nuxWelcomeVideoFinished, this.onWelcomeVideoFinished.bind(this)),
            this.hzObj.connectNetworkEvent(this.virtualOwner, nuxWelcomeVideoSkipped, this.onWelcomeVideoSkipped.bind(this)),
            this.hzObj.connectCodeBlockEvent(this.virtualOwner, CodeBlockEvents.OnPlayerExitWorld, this.onPlayerQuit.bind(this)),
            this.hzObj.connectNetworkEvent(this.virtualOwner, onLocalPlayerHUDControlsReady, this.sendControlSchemeIfNeeded.bind(this)),
        );
    }

    private sendControlSchemeIfNeeded() {
        // If we're active when the local hud wakes up, then we need to send our control scheme, because it wasn't listening
        // We send it as the default scheme here (instead of add/remove) because we want to avoid unbalanced add/remove events
        if (this.isActive) {
            this.hzObj.sendNetworkEvent(this.virtualOwner, setDefaultHUDControlScheme, {scheme: HUDControlSchemeType.WELCOME_VIDEO});
        }
    }

    override shouldHide(): boolean {
        return this.videoSeen;
    }

    protected override onShow() {
        this.isActive = true;
        ServerVideoPlayerService().playNuxVideoFor(this.virtualOwner);
        // Send the player to the jail while they watch the video
        Game.instance.gameMode.phase?.teleportPlayer(this.virtualOwner, SpawnPointLocation.NUXJAIL, 0);
        this.hzObj.sendLocalBroadcastEvent(setCanUseHomeMenu, {player: this.virtualOwner, canUseHomeMenu: false});
        this.hzObj.sendNetworkEvent(this.virtualOwner, addHUDControlSchemeOverride, {scheme: HUDControlSchemeType.WELCOME_VIDEO});
        this.hzObj.sendNetworkEvent(this.virtualOwner, nuxPlayWelcomeVideo, {});
        this.hzObj.sendLocalBroadcastEvent(setPlayerInputIsBlocked, {player: this.virtualOwner, isBlocked: true});
        this.addCameraSettings();
    }

    protected override onHide() {
        if (!this.isActive) {
            return;
        }
        this.isActive = false;
        // Note: Intentionally not stopping/pausing the video to work around a bug where the client audio repeats when a video is stopped
        // this.nuxVideoGizmo.pause();
        // Instead of stopping, we mute the video
        ServerVideoPlayerService().setNuxVolumeForPlayer(this.virtualOwner, 0);
        this.hzObj.sendNetworkEvent(this.virtualOwner, removeHUDControlSchemeOverride, {scheme: HUDControlSchemeType.WELCOME_VIDEO});
        this.hzObj.sendLocalBroadcastEvent(setPlayerInputIsBlocked, {player: this.virtualOwner, isBlocked: false});
        this.removeCameraSettings();
    }

    private onWelcomeVideoFinished(payload: {}) {
        ServerAnalyticsService().getPlayerAnalytics(this.virtualOwner).nuxVideoFinishedMetricEvent();
        this.onVideoDone();
    }

    private onWelcomeVideoSkipped(payload: {}) {
        ServerAnalyticsService().getPlayerAnalytics(this.virtualOwner).nuxVideoSkippedMetricEvent();
        this.onVideoDone();
    }

    private onVideoDone() {
        this.videoSeen = true;
    }

    private addCameraSettings() {
        this.hzObj.sendNetworkEvent(this.virtualOwner, addCameraOverride, this.getCameraSettings());
    }

    private removeCameraSettings() {
        this.hzObj.async.setTimeout(() => this.hzObj.sendNetworkEvent(this.virtualOwner, removeCameraOverride, this.getCameraSettings()), TELEPORT_CAMERA_RELEASE_DELAY_MS);
    }

    private getCameraSettings(): CameraModeSettings {
        return {
            ...WELCOME_VIDEO_CAMERA_SETTINGS,
            position: this.props.videoCameraTarget!.position.get(),
            rotation: this.props.videoCameraTarget!.rotation.get(),
        }
    }

    private onPlayerQuit(player: Player) {
        if (player == this.virtualOwner) {
            // Player quit, so we should stop our video
            console.log(`player quit, nux video hiding`)
            this.hide();
        }
    }
}
