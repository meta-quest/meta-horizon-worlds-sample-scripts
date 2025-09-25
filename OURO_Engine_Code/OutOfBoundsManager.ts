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

import {playerEnteredOutOfBoundsArea, playerExitedOutOfBoundsArea, playerOutOfBoundsTimedOut} from 'EventsCrossWorld';
import { Component, Player } from 'horizon/core';

const OUT_OF_BOUNDS_GRACE_TIME_MS = 100;

export class OutOfBoundsManager {
    hzObj: Component;
    trackedPlayers: Player[] = [];
    outOfBoundsTimeoutIds = new Map<Player, number>();
    private playerIsInTriggerCount = new Map<Player, number>();

    constructor(hzObj: Component) {
        this.hzObj = hzObj;

        this.hzObj.connectLocalBroadcastEvent(playerEnteredOutOfBoundsArea, (data) => {
            if (!this.trackedPlayers.includes(data.player)) {
                return;
            }

            const currentCount = this.playerIsInTriggerCount.get(data.player) || 0;
            this.playerIsInTriggerCount.set(data.player, currentCount + 1);
            this.startOutOfBoundsTimer(data.player);
        });

        this.hzObj.connectLocalBroadcastEvent(playerExitedOutOfBoundsArea, (data) => {
            if (!this.trackedPlayers.includes(data.player)) {
                return;
            }

            const currentCount = this.playerIsInTriggerCount.get(data.player) || 0;
            if (currentCount === 0) {
                return;
            }
            this.playerIsInTriggerCount.set(data.player, currentCount - 1);
            if (currentCount - 1 === 0) {
                this.clearOutOfBoundsTimer(data.player);
            }
        });
    }

    addTrackedPlayer(player: Player) {
        if (this.trackedPlayers.includes(player)) {
            return;
        }
        this.trackedPlayers.push(player);
    }

    removeTrackedPlayer(player: Player) {
        if (!this.trackedPlayers.includes(player)) {
            return;
        }

        const i = this.trackedPlayers.indexOf(player);
        this.trackedPlayers.splice(i, 1);

        if (!this.outOfBoundsTimeoutIds.has(player)) {
            return;
        }
        this.clearOutOfBoundsTimer(player);
    }

    startOutOfBoundsTimer(player: Player) {
        if (this.outOfBoundsTimeoutIds.has(player)) {
            return;
        }
        this.outOfBoundsTimeoutIds.set(player, this.hzObj.async.setTimeout(() => {
            this.outOfBoundsTimeoutIds.delete(player);
            this.playerIsInTriggerCount.delete(player);
            this.hzObj.sendLocalBroadcastEvent(playerOutOfBoundsTimedOut, {player: player});
        }, OUT_OF_BOUNDS_GRACE_TIME_MS));
    }

    clearOutOfBoundsTimer(player: Player) {
        const intervalId = this.outOfBoundsTimeoutIds.get(player);
        if (intervalId != undefined) {
            this.outOfBoundsTimeoutIds.delete(player);
            this.hzObj.async.clearTimeout(intervalId);
        }
    }
}
