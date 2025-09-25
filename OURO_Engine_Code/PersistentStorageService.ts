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

import { CompStatusEffects } from 'CompStatusEffects';
import { PersistentStorage } from 'ConstsPVar';
import { EntitlementUIState } from 'ConstsUIPlayerHomeMenu';
import { UnlockableData } from 'ConstsUnlockables';
import { Component, Player } from 'horizon/core';
import { PlayerCurrenciesDao } from 'PlayerCurrenciesDao';
import { PlayerDataDao } from 'PlayerDataDao';
import { PlayerEntitlementsDao } from 'PlayerEntitlementsDao';
import { PlayerPlaytimeService } from 'PlayerPlaytimeService';
import { PlayerQuestsService } from 'PlayerQuestsService';
import { PlayerStatsService } from 'PlayerStatsService';
import { PlayerUnlockablesService } from 'PlayerUnlockablesService';
import { PlayerXFNStatsService } from 'PlayerXFNStatsService';
import { logEx } from 'UtilsConsoleEx';

import { disableBypassSetPlayerRateLimit, enableBypassSetPlayerRateLimit } from 'EventsCore';
import { PlayerSeenStateDao } from 'PlayerSeenStateDao';

export const PERSISTENT_DATA_RESET_TIMESTAMP_MILLIS = [
    Date.parse('2025-09-17T00:00:00Z'),
    Date.parse('2025-09-15T00:00:00Z'),
    Date.parse('2025-09-10T00:00:00Z'),
];

export class PersistentStorageService {
    public playerData = new PlayerDataDao(this.player, this.persistentStorage, this.horizonApiProvider);
    public currencies = new PlayerCurrenciesDao(this.player, this.persistentStorage, this.horizonApiProvider);
    public seenState = new PlayerSeenStateDao(this.player, this.persistentStorage, this.horizonApiProvider);
    public entitlements = new PlayerEntitlementsDao(this.player, this.persistentStorage, this.horizonApiProvider);
    public unlockables = new PlayerUnlockablesService(this.player, this.entitlements, this.seenState, this.currencies, this.horizonApiProvider);
    public stats = new PlayerStatsService(this.player, this.persistentStorage, this.unlockables, this.statusEffects, this.playerData, this.horizonApiProvider);
    public xfnStats = new PlayerXFNStatsService(this.player, this.persistentStorage, this.stats, this.horizonApiProvider);
    public quests = new PlayerQuestsService(this.player, this.entitlements, this.currencies, this.stats, this.unlockables, this.seenState, this.playerData, this.horizonApiProvider);
    public playtime = new PlayerPlaytimeService(this.player, this.playerData, this.horizonApiProvider);

    constructor(
        private player: Player,
        private persistentStorage: PersistentStorage,
        private horizonApiProvider: Component<any>,
        private statusEffects: CompStatusEffects
    ) {
        this.resetIfResetTimestampOccurred();
    }

    public initialize() {
        this.stats.initialize();
        this.playtime.onLogin();
    }

    public removePlayer() {
        this.playtime.onLogout();
        this.horizonApiProvider.sendLocalBroadcastEvent(enableBypassSetPlayerRateLimit, {player: this.player});
        this.saveAll();
        this.horizonApiProvider.sendLocalBroadcastEvent(disableBypassSetPlayerRateLimit, {player: this.player});
    }

    // Prefer to use this as often as possible, except when iterating over multiple players at once. It caches and has a dirty flag, so will no-op if no changes
    public saveAll() {
        this.saveImportant();
        this.saveMehImportant();
        this.saveLessImportant();
    }

    public saveImportant() {
        this.playerData.save();
        this.entitlements.save();
        this.currencies.save();
    }

    public saveMehImportant() {
        this.stats.save();
    }

    public saveLessImportant() {
        this.seenState.save();
        this.xfnStats.save();
    }

    public reset() {
        this.playerData.reset();
        this.entitlements.reset();
        this.currencies.reset();
        this.seenState.reset();
        this.stats.reset();
        this.xfnStats.reset();
        this.quests.timeBasedQuestsHandlers.forEach((handler) => handler.assignNewQuestsIfNeeded());
    }

    public getEntitlementUIStateForUnlockable(unlockableData?: UnlockableData, isEquipped: boolean = false): EntitlementUIState {
        if (isEquipped) {
            return EntitlementUIState.EQUIPPED;
        }

        if (unlockableData == undefined || this.unlockables.isOwned(unlockableData)) {
            return EntitlementUIState.OWNS;
        }

        if (this.unlockables.hasRequiredEntitlements(unlockableData)) {
            return EntitlementUIState.UNLOCKED;
        }

        if (unlockableData.isHiddenWhenUnowned) {
            return EntitlementUIState.HIDDEN;
        }

        return EntitlementUIState.LOCKED;
    }

    private resetIfResetTimestampOccurred() {
        if (PERSISTENT_DATA_RESET_TIMESTAMP_MILLIS.some(dataResetTimestamp =>
            this.playerData.data.timeBasedContentData.firstLoginUtcMilliseconds < dataResetTimestamp &&
            dataResetTimestamp < Date.now()
        )) {
            logEx(`Persistent data reset time has passed, resetting all data for ${this.player.name.get()}`);
            this.reset();
        }
    }
}
