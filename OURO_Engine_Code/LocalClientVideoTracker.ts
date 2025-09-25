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

import { nuxPlayWelcomeVideo, nuxSetVideoVolume, nuxWelcomeVideoFinished, nuxWelcomeVideoSkipped } from 'EventsNetworked';
import { PropTypes } from 'horizon/core';
import { VideoGizmo } from 'horizon/video_gizmo';
import { LocalPlayerComponent } from 'LocalPlayerComponent';
import { WELCOME_VIDEO_LENGTH_MS } from 'PlayerConditionalNuxWelcomeVideoHint';

export const PlayerVideoPlayerProps = {
    videoPlayer: {type: PropTypes.Entity},
};
type Props = typeof PlayerVideoPlayerProps;

export class LocalClientVideoTracker extends LocalPlayerComponent<Props> {
    private videoGizmo?: VideoGizmo;
    private videoIsPlaying: boolean = false;
    private lastVideoTime: number = -1;

    localPreStart(): void {
        this.hzObj.connectNetworkEvent(this.owner, nuxPlayWelcomeVideo, this.onPlayWelcomeVideo.bind(this));
        this.hzObj.connectNetworkEvent(this.owner, nuxWelcomeVideoSkipped, this.onWelcomeVideoSkipped.bind(this));
    }

    localStart(): void {
        this.videoGizmo = this.props.videoPlayer?.as(VideoGizmo);
        this.muteVideo();
    }

    localUpdate(deltaTimeSeconds: number): void {
        this.sendEventWhenVideoIsDone();
    }

    localDispose(): void {
    }

    private sendEventWhenVideoIsDone() {
        if (!this.videoGizmo || !this.videoIsPlaying) {
            return;
        }
        const currentVideoTime = this.videoGizmo.getCurrentTime() ?? 0;
        if (this.lastVideoTime > currentVideoTime || currentVideoTime > WELCOME_VIDEO_LENGTH_MS) {
            this.videoIsPlaying = false;
            this.hzObj.sendNetworkEvent(this.owner, nuxWelcomeVideoFinished, {});
            this.muteVideo();
        }
        this.lastVideoTime = currentVideoTime;
    }

    private onPlayWelcomeVideo() {
        this.lastVideoTime = -1;
        this.videoIsPlaying = true;
        this.videoGizmo?.setVolume(100, 0, this.owner);
        this.hzObj.sendNetworkBroadcastEvent(nuxSetVideoVolume, {player: this.owner, volume: 100});
    }

    private onWelcomeVideoSkipped() {
        this.videoIsPlaying = false;
        this.muteVideo();
    }

    private muteVideo() {
        this.videoGizmo?.setVolume(0, 0, this.owner);
        this.hzObj.sendNetworkBroadcastEvent(nuxSetVideoVolume, {player: this.owner, volume: 0});
    }
}
