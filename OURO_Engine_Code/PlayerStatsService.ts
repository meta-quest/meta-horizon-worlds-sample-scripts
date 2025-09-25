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
import { ABILITY_DATA_REGISTRY, ABILITY_DATA_SAMPLE } from 'ConstsAbility';
import { AbilityId, isValidAbilityId, LAUNCH_ABILITY_IDS, LAUNCH_GADGET_IDS } from 'ConstsIdsAbility';
import { ALL_GAME_MODE_IDS, GameModeId } from 'ConstsIdsGameMode';
import { StatId } from 'ConstsIdsStat';
import { BASE_SUFFIX, isValidWeaponId, LAUNCH_WEAPON_IDS, validWeaponId, WeaponId } from 'ConstsIdsWeapon';
import { getPlayerStatsPVarKey, PersistentStorage, PlayerPVarDao, ResettingLeaderboardDao } from 'ConstsPVar';
import { ALL_REWARD_BG_CARD_DATA, ALL_REWARD_STICKER_DATA, ALL_REWARD_TITLE_DATA, REWARD_WEAPON_SKINS_DATA_REGISTRY, STICKER_ID_EMPTY } from 'ConstsRewards';
import { StatSourceData } from 'ConstsStats';
import * as ConstsStatusEffect from 'ConstsStatusEffect';
import { WEAPON_DATA_REGISTRY } from 'ConstsWeapon';
import { SourceData } from 'EventData';
import { onCurrencyAmountChanged, onDamageForStats, OnDamageForStatsData, onKillForStats, OnKillForStatsData } from 'Events';
import { getCurrentGameMode, onGetCurrentGameMode } from 'EventsCrossWorld';
import * as EventsNetworked from 'EventsNetworked';
import { Component, Player } from 'horizon/core';
import { PlayerDataDao } from 'PlayerDataDao';
import { getRoundPlayerStats, mutateAggregateRegularStats, mutatePlayerStat, mutateRoundPlayerStat, mutateWinStreakStats, newPlayerStats, PlayerStats } from 'PlayerStats';
import { PlayerUnlockablesService } from 'PlayerUnlockablesService';
import { TIME_UNITS } from 'UtilsMath';

const ELIMINATION_MULTI_THRESHOLD_MILLIS = 20 * TIME_UNITS.MILLIS_PER_SECOND;
const ELIMINATION_TO_STAT_MAPPING = new Map<number, {multi: StatId, simultaneous: StatId}>([
    [2, {multi: 'eliminations_multi_two', simultaneous: 'eliminations_simultaneous_two'}],
    [3, {multi: 'eliminations_multi_three', simultaneous: 'eliminations_simultaneous_three'}],
    [4, {multi: 'eliminations_multi_four', simultaneous: 'eliminations_simultaneous_four'}],
    [5, {multi: 'eliminations_multi_five', simultaneous: 'eliminations_simultaneous_five'}],
    [6, {multi: 'eliminations_multi_six', simultaneous: 'eliminations_simultaneous_six'}],
]);

export class PlayerStatsDao extends PlayerPVarDao<PlayerStats> {
    constructor(
        pVarKey: string,
        player: Player,
        persistentStorage: PersistentStorage,
        horizonApiProvider: Component<any>,
    ) {
        super(pVarKey, player, persistentStorage, horizonApiProvider);
    }

    protected default(): PlayerStats {
        return newPlayerStats();
    }

    public addStats(stats: PlayerStats, statSource: StatSourceData) {
        mutateAggregateRegularStats(stats, this.data, statSource);
    }
}

export class PlayerGameModeStats {
    private gameModeStats: PlayerStatsDao;

    constructor(
        gameMode: GameModeId,
        player: Player,
        persistentStorage: PersistentStorage,
        horizonApiProvider: Component<any>,
    ) {
        this.gameModeStats = new PlayerStatsDao(
            getPlayerStatsPVarKey(gameMode),
            player,
            persistentStorage,
            horizonApiProvider
        );

    }

    save() {
        this.gameModeStats.save();
    }

    reset() {
        this.gameModeStats.reset();
    }

    getStats() {
        return this.gameModeStats.data;
    }

    addMatchStats(matchStats: PlayerStats, statSourceData: StatSourceData) {
        this.gameModeStats.addStats(matchStats, statSourceData);
    }
}

export class PlayerStatsService {
    private _lifetimeStats?: PlayerStats;
    public get lifetimeStats(): PlayerStats {
        if (this._lifetimeStats) return this._lifetimeStats;

        this._lifetimeStats = this.computeLifetimeStats();
        this.horizonApiProvider.async.setTimeout(() => this._lifetimeStats = undefined, 1000);
        return this._lifetimeStats;
    }

    private _accountStatsCached1s?: PlayerStats;

    public get accountStats(): PlayerStats {
        if (this._accountStatsCached1s) return this._accountStatsCached1s;

        this._accountStatsCached1s = this.computeAccountStats();
        this.horizonApiProvider.async.setTimeout(() => this._accountStatsCached1s = undefined, 1000);
        return this._accountStatsCached1s;
    }

    private statsByGameMode: Map<GameModeId, PlayerGameModeStats> = new Map();
    private gameModeId?: GameModeId;

    private multiKillCount: number = 0;
    private lastKillTimestampMillis: number = 0;

    private weaponKillsAtOnce = 0;

    constructor(
        private player: Player,
        persistentStorage: PersistentStorage,
        private unlockableService: PlayerUnlockablesService,
        private statusEffects: CompStatusEffects,
        private playerData: PlayerDataDao,
        private horizonApiProvider: Component<any>
    ) {
        ALL_GAME_MODE_IDS.forEach(gameMode => {
            const stats = new PlayerGameModeStats(gameMode, player, persistentStorage, horizonApiProvider);
            this.statsByGameMode.set(gameMode, stats);
        });
    }

    public initialize() {
        this.horizonApiProvider.connectLocalBroadcastEvent(onGetCurrentGameMode, data => this.gameModeId = data.gameModeId);
        this.horizonApiProvider.sendLocalBroadcastEvent(getCurrentGameMode, {});

        this.connectStatEvents();
    }

    public updateStatsForMatch(gameMode: GameModeId, matchStats: PlayerStats, statSourceData: StatSourceData) {
        const gameModeStats = this.getStatsForOrThrow(gameMode);
        mutateWinStreakStats(matchStats, gameModeStats.getStats(), statSourceData);
        gameModeStats.addMatchStats(matchStats, statSourceData);
    }

    public getStatsForOrThrow(gameMode: GameModeId) {
        const stats = this.statsByGameMode.get(gameMode);
        if (!stats) {
            throw Error(`This shouldn't be possible, missing stats for ${gameMode}`);
        }
        return stats;
    }

    public save() {
        this.statsByGameMode.forEach((stats) => stats.save());
    }

    public reset() {
        this.statsByGameMode.forEach((stats) => stats.reset());
    }

    private computeAccountStats() {
        const accountStats = newPlayerStats();

        accountStats.total.unlocked_launch_weapons = LAUNCH_WEAPON_IDS.map(id => WEAPON_DATA_REGISTRY.get(id)).filter(data => this.unlockableService.isOwned(data?.unlockableData)).length;
        accountStats.total.unlocked_launch_powers = LAUNCH_ABILITY_IDS.map(id => ABILITY_DATA_REGISTRY.get(id)).filter(data => this.unlockableService.isOwned(data?.unlockableData)).length;
        accountStats.total.unlocked_launch_gadgets = LAUNCH_GADGET_IDS.map(id => ABILITY_DATA_REGISTRY.get(id)).filter(data => this.unlockableService.isOwned(data?.unlockableData)).length;

        accountStats.total.owned_titles = ALL_REWARD_TITLE_DATA.filter(data => this.unlockableService.isOwned(data.unlockableData)).length;
        accountStats.total.owned_bg_cards = ALL_REWARD_BG_CARD_DATA.filter(data => this.unlockableService.isOwned(data.unlockableData)).length;
        accountStats.total.owned_stickers = ALL_REWARD_STICKER_DATA.filter(data => data.id != STICKER_ID_EMPTY).filter(data => this.unlockableService.isOwned(data.unlockableData)).length;

        const allWeaponSkinsData = Array.from(REWARD_WEAPON_SKINS_DATA_REGISTRY.dataMapping.values()).flatMap(registry => Array.from(registry.skinMap.dataMapping.values()));

        accountStats.total.owned_weapon_skins_bronze = allWeaponSkinsData.filter(data => this.unlockableService.isOwned(data.unlockableData) && data.id.trim() == 'BRONZE').length;
        accountStats.total.owned_weapon_skins_silver = allWeaponSkinsData.filter(data => this.unlockableService.isOwned(data.unlockableData) && data.id.trim() == 'SILVER').length;
        accountStats.total.owned_weapon_skins_gold = allWeaponSkinsData.filter(data => this.unlockableService.isOwned(data.unlockableData) && data.id.trim() == 'GOLD').length;
        accountStats.total.owned_weapon_skins_diamond = allWeaponSkinsData.filter(data => this.unlockableService.isOwned(data.unlockableData) && data.id.trim() == 'DIAMOND').length;
        accountStats.total.owned_weapon_skins_rhinestone = allWeaponSkinsData.filter(data => this.unlockableService.isOwned(data.unlockableData) && data.id.trim() == 'RHINESTONE').length;
        accountStats.total.owned_weapon_skins_all = allWeaponSkinsData.filter(data => this.unlockableService.isOwned(data.unlockableData)).length;

        accountStats.total.played_30_mins_in_a_day = this.playerData.data.timeBasedContentData.played30MinutesInADay ? 1 : 0;

        return accountStats;
    }

    // calculate lifetime stats by aggregating all match stats
    private computeLifetimeStats() {
        const lifetimeStats = newPlayerStats();

        this.statsByGameMode.forEach(stats => {
            const gameStats = stats.getStats();

            // Only aggregate weapons and abilities that actually have data
            const weaponIds = Object.keys(gameStats.weapons) as WeaponId[];
            const abilityIds = Object.keys(gameStats.abilities) as AbilityId[];

            const statSourceData: StatSourceData = {
                weaponIds,
                abilityIds,
            };

            mutateAggregateRegularStats(gameStats, lifetimeStats, statSourceData);
        });

        return lifetimeStats;
    }

    private connectStatEvents() {
        this.horizonApiProvider.connectLocalBroadcastEvent(onCurrencyAmountChanged, (data) => {
            if (this.player != data.player) {
                return;
            }
            if (data.currencyId != 'GOLD') {
                return;
            }

            const gameMode = this.gameModeId;
            if (!gameMode) return;

            const gameModeStats = this.getStatsForOrThrow(gameMode).getStats();

            if (data.currentAmount > data.previousAmount) {
                mutatePlayerStat(gameModeStats, 'gold_earned', data.currentAmount - data.previousAmount);
            }
            if (data.previousAmount > data.currentAmount) {
                mutatePlayerStat(gameModeStats, 'gold_spent', data.previousAmount - data.currentAmount);
            }
        });

        this.horizonApiProvider.connectLocalEvent(this.player, onDamageForStats, (data) => {
            if (data.sourceData.obj == this.player && data.isValidTarget) this.addDamagerStats(data);
            if (data.targetData == this.player) this.addTargetStats(data);
        });

        this.horizonApiProvider.connectLocalEvent(this.player, onKillForStats, (data) => {
            if (data.sourceData.obj == this.player && data.isValidTarget) this.addKillerStats(data);
            if (data.targetData == this.player) this.addVictimStats();
        });

        this.horizonApiProvider.connectNetworkEvent(this.player, EventsNetworked.onWeaponFired, data => {
            this.weaponKillsAtOnce = 0;

            const statSourceData: StatSourceData = {
                weaponIds: [data.weaponId],
                abilityIds: []
            };

            statSourceData.weaponIds.push(validWeaponId(`${data.weaponId}${BASE_SUFFIX}`));

            mutateRoundPlayerStat(this.player, 'weapon_fire_count', 1, statSourceData);

            const weaponData = WEAPON_DATA_REGISTRY.get(data.weaponId);
            if (!weaponData) throw Error(`Could not log weapon_fire_count, no corresponding WeaponId found: ${data.weaponId}`);

            mutateRoundPlayerStat(this.player, 'projectile_fire_count', weaponData.firingData.volleyBulletCount, statSourceData);
        });
    }

    private addDamagerStats(data: OnDamageForStatsData) {
        const statSourceData = this.getStatSourceData(data.sourceData);

        statSourceData.weaponIds.push(validWeaponId(`${data.sourceData.weaponId}${BASE_SUFFIX}`));

        mutateRoundPlayerStat(this.player, 'damage_dealt', data.actualDamage, statSourceData);
        mutateRoundPlayerStat(this.player, 'projectiles_hit', 1, statSourceData);

        if (data.isHeadshotHit) {
            mutateRoundPlayerStat(this.player, 'damage_dealt_by_headshot', data.actualDamage, statSourceData);
            mutateRoundPlayerStat(this.player, 'projectiles_hit_headshot', 1, statSourceData);
        }
    }

    private addTargetStats(data: OnDamageForStatsData) {
        mutateRoundPlayerStat(this.player, 'damage_taken', data.actualDamage);
        if (data.damageMitigated > 0) {
            mutateRoundPlayerStat(this.player, 'damage_mitigated', data.damageMitigated, {
                weaponIds: [],
                abilityIds: []
            });
        }
    }

    private addKillerStats(data: OnKillForStatsData) {
        const statSourceData = this.getStatSourceData(data.sourceData);

        data.damagers.forEach(([assister, assisterStatSourceData]) => {
            if (assister == this.player) return;
            mutateRoundPlayerStat(assister, 'assists', 1, assisterStatSourceData);
        });

        const elimStreak = (getRoundPlayerStats(this.player).total.elimination_streak ?? 0) + 1;
        mutateRoundPlayerStat(this.player, 'elimination_streak', elimStreak);
        mutateRoundPlayerStat(this.player, 'best_elimination_streak', elimStreak);

        const nowMillis = Date.now();
        const millisSinceLastElimination = nowMillis - this.lastKillTimestampMillis;
        this.lastKillTimestampMillis = nowMillis;


        if (millisSinceLastElimination <= ELIMINATION_MULTI_THRESHOLD_MILLIS) {
            const multiStat = ELIMINATION_TO_STAT_MAPPING.get(++this.multiKillCount)?.multi;
            if (multiStat) {
                mutateRoundPlayerStat(this.player, multiStat, 1, statSourceData);
            }
            mutateRoundPlayerStat(this.player, 'eliminations_multi_highest', this.multiKillCount, statSourceData);
        } else {
            this.multiKillCount = 1;
        }

        // GOBLIN MODE STATS BELOW

        // Weapon stats ONLY
        if (isValidWeaponId(data.sourceData.weaponId)) {
            const simultaneousStat = ELIMINATION_TO_STAT_MAPPING.get(++this.weaponKillsAtOnce)?.simultaneous;
            if (simultaneousStat) {
                mutateRoundPlayerStat(this.player, simultaneousStat, 1, {weaponIds: [data.sourceData.weaponId], abilityIds: []});
            }

            statSourceData.weaponIds.push(validWeaponId(`${data.sourceData.weaponId}${BASE_SUFFIX}`));
        }

        mutateRoundPlayerStat(this.player, 'eliminations', 1, statSourceData);
        if (data.isHeadshotHit) {
            mutateRoundPlayerStat(this.player, 'eliminations_by_headshot', 1, statSourceData);
        }
    }

    private addVictimStats() {
        mutateRoundPlayerStat(this.player, 'deaths', 1);
        mutateRoundPlayerStat(this.player, 'elimination_streak', 0);
    }

    private getStatSourceData(data: SourceData): StatSourceData {
        const weaponIds: WeaponId[] = [];
        if (isValidWeaponId(data.weaponId)) weaponIds.push(data.weaponId);

        const abilityIds: AbilityId[] = [];
        if (isValidAbilityId(data.abilityId)) abilityIds.push(data.abilityId);

        return {weaponIds, abilityIds};
    }
}
