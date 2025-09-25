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


import { SHOULD_THROTTLE_UI_BINDING_UPDATES } from 'ConstsDebugging';
import {
    DISTRIBUTOR_UI_BINDING_LIMIT_LOCAL,
    DISTRIBUTOR_UI_BINDING_LIMIT_SERVER, FrameDistributorKey, FRAME_DISTRIBUTOR_OPTIONS, onFrameDistributorOptionUpdated,
    setFrameDistributorOptionMaxPerFrame
} from 'ConstsFrameDistributor';
import { LocalPlayerComponent } from 'LocalPlayerComponent';
import { ServerPlatformService } from 'PlatformServices';
import { getOrDefaultMap } from 'UtilsTypescript';
import { UIBinding } from 'UtilsUI';

const QUEUED_FUNCTIONS = new Map<FrameDistributorKey, (() => void)[]>();

export function queueFrameDistributedExecution(frameDistributorKey: FrameDistributorKey, func: () => void): void {
    if (!FRAME_DISTRIBUTOR_OPTIONS.has(frameDistributorKey)) throw Error(`Options not configured for [${frameDistributorKey}] `);

    getOrDefaultMap(QUEUED_FUNCTIONS, frameDistributorKey, (): (() => void)[] => []).push(func);
}

export class FrameDistributor {
    constructor(private maxUiBindingsToUpdatePerFrame: number) {
    }

    public onUpdate(): void {
        QUEUED_FUNCTIONS.forEach((queuedFuncs, key) => this.runQueued(key, queuedFuncs));

        if (SHOULD_THROTTLE_UI_BINDING_UPDATES) {
            UIBinding.dirty.splice(0, Math.min(UIBinding.dirty.length, this.maxUiBindingsToUpdatePerFrame)).forEach(binding => binding.update());
        } else {
            UIBinding.dirty.forEach(binding => binding.update());
        }
    }

    private runQueued(key: FrameDistributorKey, queuedFuncs: (() => void)[]): void {
        const configuration = FRAME_DISTRIBUTOR_OPTIONS.get(key)!;
        for (let i = 0, executedCount = 0; i < queuedFuncs.length && executedCount < configuration.maxPerFrame; i++) {
            const func = queuedFuncs?.shift();
            if (!func) return;

            try {
                func();
                executedCount++;
            } catch (e) {
                console.log(`FrameDistributor failed to run: ${key}`);
            }
        }

        if (configuration.discardIfCantRunThisFrame) {
            QUEUED_FUNCTIONS.delete(key);
        }
    }
}

export class LocalClientFrameDistributor extends LocalPlayerComponent {
    private frameDistributor = new FrameDistributor(DISTRIBUTOR_UI_BINDING_LIMIT_LOCAL);

    localPreStart(): void {
        this.hzObj.connectNetworkBroadcastEvent(onFrameDistributorOptionUpdated, (data) => setFrameDistributorOptionMaxPerFrame(data.id, data.maxPerFrame));
    }

    localStart(): void {
    }

    localUpdate(deltaTimeSeconds: number) {
        this.frameDistributor.onUpdate();
    }

    localDispose() {
    }
}

export class ServerClientFrameDistributor implements ServerPlatformService {
    private frameDistributor = new FrameDistributor(DISTRIBUTOR_UI_BINDING_LIMIT_SERVER);

    serverPreStart() {
    }

    serverStart() {
    }

    serverPostStart() {
    }

    serverUpdate(deltaTimeSeconds: number) {
        this.frameDistributor.onUpdate();
    }
}
