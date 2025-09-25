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


import {NetworkEvent} from 'horizon/core';
import {getHzObj, isServer} from 'UtilsGameplay';

interface FrameDistributorOptions {
    maxPerFrame: number;
    discardIfCantRunThisFrame: boolean;
}

/** We are limiting bindings separately from other functions and setting the limits based on the documentation provided by horizon to not hitch the game.
 * https://developers.meta.com/horizon-worlds/learn/documentation/performance-best-practices-and-tooling/performance-best-practices/custom-ui-optimization */
export const DISTRIBUTOR_UI_BINDING_LIMIT_SERVER = 100;
export const DISTRIBUTOR_UI_BINDING_LIMIT_LOCAL = 50;

export const ALL_FRAME_DISTRIBUTOR_KEYS = [
    'PL_Launch',
    'PLAY_FX_DISCARDABLE',
    'PLAY_FX_GUARANTEED',
] as const;
export type FrameDistributorKey = typeof ALL_FRAME_DISTRIBUTOR_KEYS[number];
export const FRAME_DISTRIBUTOR_OPTIONS: Map<FrameDistributorKey, FrameDistributorOptions> = new Map([
    ['PL_Launch', {
        maxPerFrame: 3,
        discardIfCantRunThisFrame: false
    }],
    ['PLAY_FX_DISCARDABLE', {
        maxPerFrame: 1,
        discardIfCantRunThisFrame: true
    }],
    ['PLAY_FX_GUARANTEED', {
        maxPerFrame: 10,
        discardIfCantRunThisFrame: false
    }]
]);

export const onFrameDistributorOptionUpdated = new NetworkEvent<{id: FrameDistributorKey, maxPerFrame: number}>('onFrameDistributorOptionUpdated');

export function setFrameDistributorOptionMaxPerFrame(id: FrameDistributorKey, maxPerFrame: number) {
    const existingOption = FRAME_DISTRIBUTOR_OPTIONS.get(id);
    if (!existingOption) return;

    FRAME_DISTRIBUTOR_OPTIONS.set(id, {...existingOption, maxPerFrame: maxPerFrame});

    if (getHzObj() == undefined || !isServer(getHzObj().world)) return;

    getHzObj().sendNetworkBroadcastEvent(onFrameDistributorOptionUpdated, {id: id, maxPerFrame: maxPerFrame});
}
