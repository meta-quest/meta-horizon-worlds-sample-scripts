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

import { AbilityId } from 'ConstsIdsAbility';
import { ALL_STAT_IDS, StatId } from 'ConstsIdsStat';
import { WeaponId } from 'ConstsIdsWeapon';
import { getStatData, StatSourceData } from 'ConstsStats';
import { IS_NOT_UNDEFINED_STRING } from 'EventData';
import { Player } from 'horizon/core';
import { checkIfServer } from 'UtilsGameplay';
import { getOrDefaultMap, getOrDefaultObject, parseWithBigInt, stringifyWithBigInt } from 'UtilsTypescript';

/**
 * PlayerStats is the overall shape of stats and is scoped to different game lifecycles.
 *
 * Round PlayerStats - Stats generated during a round of play
 * Match PlayerStats - Stats aggregated across rounds of play
 * Lifetime PlayerStats - Stats aggregated across matches of play
 *
 * There are also comprehensive stats, which are computed/derived based on other stats on the fly. Examples of this are accuracy (where it makes less sense to combined 95%, 20% and 50% accuracy
 * games due to not having the total number of shots attempted). Instead store the raw values where appropriate and calculate for UI display
 */

const DEBUG_MUTATE_STATS = false;

export type Stats = { [key in StatId]?: number }

export type PlayerStats = {
    total: Stats
    weapons: { [key in WeaponId]?: Stats }
    abilities: { [key in AbilityId]?: Stats }
}

export function newPlayerStats(): PlayerStats {
    return {total: {}, weapons: {}, abilities: {}};
}

let isRoundStatsMutationEnabled: boolean | undefined = undefined;

export function enableRoundStatsMutation() {
    isRoundStatsMutationEnabled = true;
}

export function disableRoundStatsMutation() {
    isRoundStatsMutationEnabled = false;
}

const ROUND_PLAYER_STATS = new Map<Player, PlayerStats>();
const MATCH_PLAYER_STATS = new Map<Player, PlayerStats>();

export function getRoundPlayerStats(player: Player) {
    return getOrDefaultMap(ROUND_PLAYER_STATS, player, () => newPlayerStats());
}

export function getMatchPlayerStats(player: Player) {
    return getOrDefaultMap(MATCH_PLAYER_STATS, player, () => newPlayerStats());
}

export function getCopyOfComprehensiveMatchPlayerStats(player: Player) {
    return getCopyOfComprehensiveStats(getMatchPlayerStats(player));
}

export function getCopyOfComprehensiveRoundPlayerStats(player: Player) {
    return getCopyOfComprehensiveStats(getRoundPlayerStats(player));
}

export function getCopyOfComprehensiveStats(playerStats: PlayerStats) {
    const copyOfPlayerStats = parseWithBigInt<PlayerStats>(stringifyWithBigInt(playerStats));

    const allPlayerStats = getAllPlayerStats(copyOfPlayerStats);

    allPlayerStats.forEach(stats => {
        for (const key of ALL_STAT_IDS) {
            const statData = getStatData(key);
            if (statData.optOutOfComprehensive || statData.derive == undefined) {
                continue;
            }

            const value = statData.derive(stats);
            if (value != undefined) {
                stats[key] = value;
            }
        }
    });

    return copyOfPlayerStats;
}

export function mutateRoundStatToOtherStat(player: Player, statIdToMutate: StatId, statIdToTake: StatId) {
    if (!isRoundStatsMutationEnabled) return;

    mutateStatToOtherStat(getRoundPlayerStats(player), statIdToMutate, statIdToTake);
}

export function mutateMatchStatToOtherStat(player: Player, statIdToMutate: StatId, statIdToTake: StatId) {
    mutateStatToOtherStat(getMatchPlayerStats(player), statIdToMutate, statIdToTake);
}

export function mutateStatToOtherStat(playerStats: PlayerStats, statIdToMutate: StatId, statIdToTake: StatId) {
    const allPlayerStats = getAllPlayerStats(playerStats);

    allPlayerStats.forEach(stats => {
        const value = stats[statIdToTake];

        if (value == undefined) {
            return;
        }

        mutateStat(stats, statIdToMutate, value!);
    });
}

function getAllPlayerStats(playerStats: PlayerStats) {
    const allPlayerStats: Stats[] = [playerStats.total];

    for (const weaponId in playerStats.weapons) {
        allPlayerStats.push(playerStats.weapons[weaponId as WeaponId]!);
    }
    for (const abilityId in playerStats.abilities) {
        allPlayerStats.push(playerStats.abilities[abilityId as AbilityId]!);
    }

    return allPlayerStats;
}

export function mutateRoundPlayerStat(player: Player, statId: StatId, value: number, statSourceData?: StatSourceData) {
    // if (!isRoundStatsMutationEnabled) return;

    mutatePlayerStat(getRoundPlayerStats(player), statId, value, statSourceData);
}

export function mutateMatchPlayerStat(player: Player, statId: StatId, value: number, loadoutStatSourceData: StatSourceData) {
    mutatePlayerStat(getMatchPlayerStats(player), statId, value, loadoutStatSourceData);
}

// This is weird, but sometimes it's hard (due to not having that data at that time) we might not have stat source data.
// This largely ends up being the defensive stats (because the offensive stats, like kill weapon) comes with kill event.
// We populate this data and merge and handle it on the save function, which conveniently comes from gamePlayer.
export function mutatePlayerStat(playerStats: PlayerStats, statId: StatId, value: number, statSourceData?: StatSourceData) {
    checkIfServer();

    mutateStat(playerStats.total, statId, value);

    statSourceData?.weaponIds
        .filter(IS_NOT_UNDEFINED_STRING)
        .forEach(weaponId => mutateStat(getOrDefaultObject(playerStats.weapons, weaponId, () => ({})), statId, value));

    statSourceData?.abilityIds
        .filter(IS_NOT_UNDEFINED_STRING)
        .forEach(abilityId => mutateStat(getOrDefaultObject(playerStats.abilities, abilityId, () => ({})), statId, value));
}

export function mutateStat(stats: Stats, statId: StatId, value: number) {
    const statData = getStatData(statId);
    if (!statData.mutate) return;

    const previousValue = stats[statId];
    stats[statId] = statData.mutate(stats[statId] ?? statData.initialValue, value);
    const newValue = stats[statId];
    if (DEBUG_MUTATE_STATS && previousValue != newValue && statId == 'win_streak_current') {
        console.log(`Mutated stat: ${statId} ${previousValue} => ${newValue}`);
    }
}

export function mutateRoundIntoMatchStats(player: Player, loadoutStatSourceData: StatSourceData) {
    const matchStats = getMatchPlayerStats(player);
    mutateAggregateRegularStats(getRoundPlayerStats(player), matchStats, loadoutStatSourceData);
    return matchStats;
}

export function mutateAggregateRegularStats(toAggregate: PlayerStats, aggregationStats: PlayerStats, loadoutStatSourceData: StatSourceData) {
    for (const statId of ALL_STAT_IDS) {
        const matchTotalValue = toAggregate.total[statId];
        if (!matchTotalValue) continue;

        mutateStat(aggregationStats.total, statId, matchTotalValue);

        const statData = getStatData(statId);

        // Use data if we have it, otherwise just use the total stats. This is because we don't always
        // have the data at recording time (since we only send offensive data in payloads across the wire)
        loadoutStatSourceData.weaponIds.filter(IS_NOT_UNDEFINED_STRING).forEach(weaponId => {
            const matchWeaponValue = toAggregate.weapons[weaponId]?.[statId];
            if (!matchWeaponValue && statData.usePerWeaponOrAbilityStats) return;

            mutateStat(getOrDefaultObject(aggregationStats.weapons, weaponId, () => ({})), statId, matchWeaponValue ?? matchTotalValue);
        });

        loadoutStatSourceData.abilityIds.filter(IS_NOT_UNDEFINED_STRING).forEach(abilityId => {
            const matchAbilityValue = toAggregate.abilities[abilityId]?.[statId];
            if (!matchAbilityValue && statData.usePerWeaponOrAbilityStats) return;

            mutateStat(getOrDefaultObject(aggregationStats.abilities, abilityId, () => ({})), statId, matchAbilityValue ?? matchTotalValue);
        });
    }
}

// This one is unique, because it's mutated based on win or loss and relative
export function mutateWinStreakStats(toAggregate: PlayerStats, aggregationStats: PlayerStats, loadoutStatSourceData: StatSourceData) {
    const storedLifetimePlayerStats: Stats[] = [aggregationStats.total];
    for (const weaponId of loadoutStatSourceData.weaponIds) {
        storedLifetimePlayerStats.push(getOrDefaultObject(aggregationStats.weapons, weaponId, () => ({})));
    }
    for (const abilityId of loadoutStatSourceData.abilityIds) {
        storedLifetimePlayerStats.push(getOrDefaultObject(aggregationStats.abilities, abilityId, () => ({})));
    }

    const wonMatch = toAggregate.total.matches_won == 1;

    storedLifetimePlayerStats.forEach(lifetimePlayerStats => {
        const currentWinStreak = lifetimePlayerStats.hasOwnProperty('win_streak_current') ? lifetimePlayerStats.win_streak_current! : 0;
        const newWinStreak = wonMatch ? currentWinStreak + 1 : 0;

        mutateStat(lifetimePlayerStats, 'win_streak_current', newWinStreak);
        mutateStat(lifetimePlayerStats, 'win_streak_longest', newWinStreak);
    });
}

export function clearRoundPlayerStats() {
    clearAllPlayerStats(ROUND_PLAYER_STATS);
}

export function clearMatchPlayerStats() {
    clearAllPlayerStats(MATCH_PLAYER_STATS);
}

export function clearPlayerStats(player: Player) {
    checkIfServer();
    ROUND_PLAYER_STATS.delete(player);
    MATCH_PLAYER_STATS.delete(player);
}

function clearAllPlayerStats(map: Map<Player, PlayerStats>) {
    checkIfServer();
    map.clear();
}
