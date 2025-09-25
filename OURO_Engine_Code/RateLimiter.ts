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
import { PersistentStorage } from 'ConstsPVar';
import { disableBypassSetPlayerRateLimit, enableBypassSetPlayerRateLimit, onSetPlayerVariable, setPlayerVariable } from 'EventsCore';
import { Component, Player } from 'horizon/core';
import { ServerPlatformService } from 'PlatformServices';
import { TIME_UNITS } from 'UtilsMath';

const DEBUG_LOGS_ENABLED = true;

// There's a hardcoded limit per client for GraphQL endpoints of 64 QPS.
const GRAPHQL_QUERIES_PER_SECOND_LIMIT = 64;

const RateLimitId = ['setPlayerVariable'] as const;
type RateLimitKey = typeof RateLimitId[number];

export class RateLimiter implements ServerPlatformService {
    private persistentStorage: PersistentStorage;
    private rateLimitedCalls = new Map<RateLimitKey, (() => void)[]>();

    public readonly bypassSetPlayerVariableRateLimiter = new Set<Player>();

    constructor(private horizonApiProvider: Component) {
        this.persistentStorage = new PersistentStorage(horizonApiProvider.world);

        this.horizonApiProvider.connectLocalBroadcastEvent(enableBypassSetPlayerRateLimit, (data) => this.bypassSetPlayerVariableRateLimiter.add(data.player));
        this.horizonApiProvider.connectLocalBroadcastEvent(disableBypassSetPlayerRateLimit, (data) => this.bypassSetPlayerVariableRateLimiter.delete(data.player));
    }

    serverPreStart(): void {
        this.horizonApiProvider.connectLocalBroadcastEvent(setPlayerVariable, (event) => {
            const setFunc = () => {
                try {
                    // Academically, async should be better. Practically, it sometimes just doesn't save, and the promise never resolves or rejects.
                    this.persistentStorage.setPlayerVariable(event.player, event.pVarKey, event.data!);
                    this.horizonApiProvider.sendLocalEvent(event.player, onSetPlayerVariable, {pVarKey: event.pVarKey, data: event.data!});
                } catch (e) {
                    console.log(`[${event.player.name.get()}]PVar[${event.pVarKey}] failed to save. ${e}`);
                }
            };

            if (this.bypassSetPlayerVariableRateLimiter.has(event.player)) {
                setFunc();
            } else {
                this.queueFunc('setPlayerVariable', setFunc);
            }
        });
    }

    serverStart(): void {
        this.horizonApiProvider.async.setInterval(() => Array.from(this.rateLimitedCalls.keys()).forEach(
                key => {
                    this.rateLimitedCalls.get(key)!.splice(0, GRAPHQL_QUERIES_PER_SECOND_LIMIT).forEach(f => f());

                    let remainingCalls = this.rateLimitedCalls.get(key)!.length;
                    if (remainingCalls > 0 && DEBUG_LOGS_ENABLED) console.log(`${key} queue exceeded ${GRAPHQL_QUERIES_PER_SECOND_LIMIT}, delaying to send ${remainingCalls}`);
                }
            ),
            1 * TIME_UNITS.MILLIS_PER_SECOND
        );

    }

    serverPostStart(): void {
    }

    serverUpdate(deltaTimeSeconds: number): void {
    }

    queueFunc(key: RateLimitKey, func: () => void) {
        this.rateLimitedCalls.getOrDefault(key, () => []).push(func);
    }
}
