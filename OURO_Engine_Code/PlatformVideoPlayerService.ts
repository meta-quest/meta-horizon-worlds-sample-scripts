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

import { nuxSetVideoVolume } from 'EventsNetworked';
import { Component, Player, PropsFromDefinitions, PropTypes } from 'horizon/core';
import { VideoGizmo } from 'horizon/video_gizmo';
import { ServerPlatformService } from 'PlatformServices';

export const PlatformVideoPlayerServiceProps = {
    nuxVideoPlayer: {type: PropTypes.Entity},
};
type Props = typeof PlatformVideoPlayerServiceProps;

export class PlatformVideoPlayerService implements ServerPlatformService {
    private nuxVideoGizmo!: VideoGizmo;
    private nuxVideoViewers = new Set<Player>();

    constructor(private horizonApiProvider: Component, private props: PropsFromDefinitions<Props>) {
    }

    serverPreStart(): void {
        this.horizonApiProvider.connectNetworkBroadcastEvent(nuxSetVideoVolume, data => this.setNuxVolumeForPlayer(data.player, data.volume));
    }

    serverStart(): void {
    }

    serverPostStart(): void {
        if (this.props.nuxVideoPlayer == undefined) {
            throw Error(`PlatformVideoPlayerService requires a VideoGizmo`);
        }
        this.nuxVideoGizmo = this.props.nuxVideoPlayer.as(VideoGizmo);
    }

    serverUpdate(deltaTimeSeconds: number): void {
    }

    playNuxVideoFor(player: Player) {
        this.nuxVideoViewers.add(player);
        this.nuxVideoGizmo.play();
    }

    setNuxVolumeForPlayer(player: Player, volume: number) {
        this.nuxVideoGizmo?.setVolume(volume, 0, player);
    }
}
