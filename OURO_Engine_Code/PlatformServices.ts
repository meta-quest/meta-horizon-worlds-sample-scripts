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

import { AnalyticsService } from 'AnalyticsService';
import { ServerClientFrameDistributor } from 'FrameDistributor';
import { Component, PropsFromDefinitions } from 'horizon/core';
import { MusicService, PlatformMusicServiceProps } from 'MusicService';
import { PlatformVideoPlayerService, PlatformVideoPlayerServiceProps } from 'PlatformVideoPlayerService';
import { RateLimiter } from 'RateLimiter';
import { checkIfServer } from 'UtilsGameplay';

enum PlatformService {
    MATCHMAKING,
    MATCHMAKING_RATING,
    MATCHMAKING_TEAMASSEMBLY,
    SOCIAL,
    ANALYTICS,
    VIDEO_PLAYER,
    MUSIC,
    FRAME_DISTRIBUTOR,
    RATE_LIMITER,
}

export interface ServerPlatformService {
    serverPreStart(): void;

    serverStart(): void;

    serverPostStart(): void;

    serverUpdate(deltaTimeSeconds: number): void;
}

export const PlatformServicesProps = {
    ...PlatformVideoPlayerServiceProps,
    ...PlatformMusicServiceProps
};
type Props = typeof PlatformServicesProps;

export class PlatformServices {
    private static instance: PlatformServices;

    static getInstance() {
        checkIfServer();

        return this.instance;
    }

    private services: Map<PlatformService, ServerPlatformService> = new Map;

    constructor(private horizonApiProvider: Component, private props: PropsFromDefinitions<Props>) {
        PlatformServices.instance = this;
    }

    onPreStart() {
        this.services.set(PlatformService.ANALYTICS, new AnalyticsService(this.horizonApiProvider));
        this.services.set(PlatformService.VIDEO_PLAYER, new PlatformVideoPlayerService(this.horizonApiProvider, this.props));
        this.services.set(PlatformService.MUSIC, new MusicService(this.horizonApiProvider, this.props));
        this.services.set(PlatformService.FRAME_DISTRIBUTOR, new ServerClientFrameDistributor());
        this.services.set(PlatformService.RATE_LIMITER, new RateLimiter(this.horizonApiProvider));

        this.services.forEach(service => service.serverPreStart());
    }

    onStart() {
        this.services.forEach(service => service.serverStart());
    }

    onPostStart() {
        this.services.forEach(service => service.serverPostStart());
    }

    onUpdate(deltaTimeSeconds: number) {
        this.services.forEach(service => service.serverUpdate(deltaTimeSeconds));
    }

    getPlatformService(platformService: PlatformService) {
        const platformServiceInstance = this.services.get(platformService);
        if (!platformServiceInstance) {
            throw Error(`Expected PlatformService not found: ${PlatformService[platformService]}`);
        }
        return platformServiceInstance;
    }
}

export function ServerAnalyticsService() {
    return PlatformServices.getInstance().getPlatformService(PlatformService.ANALYTICS) as AnalyticsService;
}

export function ServerVideoPlayerService() {
    return PlatformServices.getInstance().getPlatformService(PlatformService.VIDEO_PLAYER) as PlatformVideoPlayerService;
}

export function ServerMusicService() {
    return PlatformServices.getInstance().getPlatformService(PlatformService.MUSIC) as MusicService;
}

export function ServerFrameDistributor() {
    return PlatformServices.getInstance().getPlatformService(PlatformService.FRAME_DISTRIBUTOR) as ServerClientFrameDistributor;
}

export function ServerRateLimiter() {
    return PlatformServices.getInstance().getPlatformService(PlatformService.RATE_LIMITER) as RateLimiter;
}
