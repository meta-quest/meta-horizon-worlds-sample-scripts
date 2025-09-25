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
import { StatId } from 'ConstsIdsStat';
import { WeaponId } from 'ConstsIdsWeapon';
import { Stats } from 'PlayerStats';
import { getTimeString } from 'UtilsGameplay';

export type StatSourceData = {
    weaponIds: WeaponId[]
    abilityIds: AbilityId[]
}

const DISPLAY_DEFAULT = (value: number) => `${value}`;
const DISPLAY_PERCENTAGE = (value: number) => `${Math.round(value * 100)}%`;
const DISPLAY_TIME = (value: number) => `${getTimeString(value, {showHours: true, showMilliseconds: true})}`;
const DISPLAY_CEIL = (value: number) => `${Math.ceil(value)}`;
const DISPLAY_SIG_FIG_2 = (value: number) => `${value.toFixed(2)}`;

export interface StatData {
    readonly id: StatId,
    readonly displayName: string,
    readonly initialValue: number,

    // If true, this stat will only be mutated if the weapon or ability has a value for the stat at the end of the Round or Match.
    // If false, this stat will be mutated for every weapon or ability in the loadout according to the total value for the Round or Match.
    // Has no effect on:
    //  (1) Properties calculated with comprehensive
    //  (2) Account-wide properties
    readonly usePerWeaponOrAbilityStats: boolean,

    readonly toDisplayString: (value: number) => string,

    // If neither mutate nor derive exists, this value is being manually set elsewhere.
    readonly mutate?: (previousValue: number, newValue: number) => number,
    readonly derive?: (stats: Stats) => number | undefined,
    readonly optOutOfComprehensive?: boolean
}

// Mutate functions
const MAX = (max: number, newValue: number) => Math.max(max, newValue);
const SET = (_: number, newValue: number) => newValue;
const SUM = (accumulatedSum: number, newValue: number) => accumulatedSum + newValue;

const DEFAULT_STAT_DATA = {
    initialValue: 0,
    toDisplayString: DISPLAY_DEFAULT,
    usePerWeaponOrAbilityStats: false,
};

export const ALL_STATS: StatData[] = [
    {...DEFAULT_STAT_DATA, id: 'damage_dealt', displayName: 'Damage', usePerWeaponOrAbilityStats: true, mutate: SUM},
    {...DEFAULT_STAT_DATA, id: 'damage_dealt_by_headshot', displayName: 'Headshot Damage', usePerWeaponOrAbilityStats: true, mutate: SUM},
    {...DEFAULT_STAT_DATA, id: 'most_damage_dealt_in_round', displayName: 'Most Damage Dealt in 1 Round', usePerWeaponOrAbilityStats: true, mutate: MAX},
    {...DEFAULT_STAT_DATA, id: 'most_damage_dealt_in_match', displayName: 'Most Damage Dealt in 1 Match', usePerWeaponOrAbilityStats: true, mutate: MAX},
    {...DEFAULT_STAT_DATA, id: 'damage_taken', displayName: 'Damage Taken', mutate: SUM},
    {...DEFAULT_STAT_DATA, id: 'damage_mitigated', displayName: 'Damage Mitigated', mutate: SUM},
    {
        ...DEFAULT_STAT_DATA, id: 'average_damage_dealt_per_match', displayName: 'Average Damage', toDisplayString: DISPLAY_CEIL,
        derive: (stats) => {
            if (stats.matches_played != undefined) return (stats.damage_dealt ?? 0) / (stats.matches_played ?? 1);
        }
    },

    {...DEFAULT_STAT_DATA, id: 'weapon_fire_count', displayName: 'Shots Fired', usePerWeaponOrAbilityStats: true, mutate: SUM},
    {...DEFAULT_STAT_DATA, id: 'projectile_fire_count', displayName: 'Shots Fired (Total Projectile Count)', usePerWeaponOrAbilityStats: true, mutate: SUM},
    {...DEFAULT_STAT_DATA, id: 'projectiles_hit', displayName: 'Shots Hit', usePerWeaponOrAbilityStats: true, mutate: SUM},
    {...DEFAULT_STAT_DATA, id: 'projectiles_hit_headshot', displayName: 'Headshots Hit', usePerWeaponOrAbilityStats: true, mutate: SUM},
    {
        ...DEFAULT_STAT_DATA, id: 'projectiles_accuracy', displayName: 'Accuracy', toDisplayString: DISPLAY_PERCENTAGE,
        derive: (stats) => {
            if (stats.projectile_fire_count != undefined) return (stats.projectiles_hit ?? 0) / (stats.projectile_fire_count ?? 1);
        }
    },
    {
        ...DEFAULT_STAT_DATA, id: 'projectiles_accuracy_headshot', displayName: 'Headshot Accuracy', toDisplayString: DISPLAY_PERCENTAGE,
        derive: (stats) => {
            if (stats.projectile_fire_count != undefined) return (stats.projectiles_hit_headshot ?? 0) / (stats.projectile_fire_count ?? 1);
        }
    },

    {...DEFAULT_STAT_DATA, id: 'abilities_activated', displayName: 'Abilities Fired', usePerWeaponOrAbilityStats: true, mutate: SUM},

    {...DEFAULT_STAT_DATA, id: 'eliminations', displayName: 'Eliminations', usePerWeaponOrAbilityStats: true, mutate: SUM},
    {...DEFAULT_STAT_DATA, id: 'eliminations_by_headshot', displayName: 'Headshot Eliminations', usePerWeaponOrAbilityStats: true, mutate: SUM},
    {...DEFAULT_STAT_DATA, id: 'eliminations_in_goblin_mode', displayName: 'Goblin Mode Eliminations', usePerWeaponOrAbilityStats: true, mutate: SUM},
    {...DEFAULT_STAT_DATA, id: 'elimination_streak', displayName: 'Elimination Streak', usePerWeaponOrAbilityStats: true, mutate: SET},
    {...DEFAULT_STAT_DATA, id: 'best_elimination_streak', displayName: 'Best Elimination Streak', usePerWeaponOrAbilityStats: true, mutate: MAX},
    {...DEFAULT_STAT_DATA, id: 'assists', displayName: 'Assists', usePerWeaponOrAbilityStats: true, mutate: SUM},
    {...DEFAULT_STAT_DATA, id: 'most_assists_in_round', displayName: 'Most Assists in 1 Round', usePerWeaponOrAbilityStats: true, mutate: MAX},
    {...DEFAULT_STAT_DATA, id: 'most_assists_in_match', displayName: 'Most Assists in 1 Match', usePerWeaponOrAbilityStats: true, mutate: MAX},
    {...DEFAULT_STAT_DATA, id: 'deaths', displayName: 'Deaths', mutate: SUM},
    {
        ...DEFAULT_STAT_DATA, id: 'eliminations_deaths_ratio', displayName: 'Elim/Deaths Ratio', toDisplayString: DISPLAY_SIG_FIG_2,
        derive: (stats) => {
            if (stats.eliminations != undefined || stats.deaths != undefined) return (stats.eliminations ?? 0) / (stats.deaths ?? 1);
        }
    },

    {...DEFAULT_STAT_DATA, id: 'matches_won', displayName: 'Matches Won', usePerWeaponOrAbilityStats: true, mutate: SUM},
    {...DEFAULT_STAT_DATA, id: 'matches_lost', displayName: 'Matches Lost', usePerWeaponOrAbilityStats: true, mutate: SUM},
    {...DEFAULT_STAT_DATA, id: 'matches_played', displayName: 'Matches Played', usePerWeaponOrAbilityStats: true, mutate: SUM},
    {...DEFAULT_STAT_DATA, id: 'matches_played_during_open_beta', displayName: 'Open Beta Matches Played', usePerWeaponOrAbilityStats: true, mutate: SUM},
    {...DEFAULT_STAT_DATA, id: 'matches_played_beta_skin', displayName: 'Matches Played During Beta Skin Period', usePerWeaponOrAbilityStats: true, mutate: SUM},
    {...DEFAULT_STAT_DATA, id: 'matches_won_with_friends', displayName: 'Matches Won with Friends', usePerWeaponOrAbilityStats: true, mutate: SUM},
    {...DEFAULT_STAT_DATA, id: 'matches_lost_with_friends', displayName: 'Matches Lost with Friends', usePerWeaponOrAbilityStats: true, mutate: SUM},
    {...DEFAULT_STAT_DATA, id: 'matches_played_with_friends', displayName: 'Matches Played with Friends', usePerWeaponOrAbilityStats: true, mutate: SUM},
    {
        ...DEFAULT_STAT_DATA, id: 'matches_win_rate', displayName: 'Matches Win Rate %', toDisplayString: DISPLAY_PERCENTAGE,
        derive: (stats) => {
            if (stats.matches_played != undefined) return (stats.matches_won ?? 0) / (stats.matches_played ?? 1);
        }
    },

    {...DEFAULT_STAT_DATA, id: 'rounds_won', displayName: 'Rounds Won', usePerWeaponOrAbilityStats: true, mutate: SUM},
    {...DEFAULT_STAT_DATA, id: 'rounds_lost', displayName: 'Rounds Lost', usePerWeaponOrAbilityStats: true, mutate: SUM},
    {...DEFAULT_STAT_DATA, id: 'rounds_played', displayName: 'Rounds Played', usePerWeaponOrAbilityStats: true, mutate: SUM},
    {
        ...DEFAULT_STAT_DATA, id: 'rounds_win_rate', displayName: 'Round Win Rate %', toDisplayString: DISPLAY_PERCENTAGE,
        derive: (stats) => {
            if (stats.rounds_played != undefined) return (stats.rounds_won ?? 0) / (stats.rounds_played ?? 1);
        }
    },

    {...DEFAULT_STAT_DATA, id: 'eliminations_multi_two', displayName: 'Multi-Eliminations (2)', usePerWeaponOrAbilityStats: true, mutate: SUM},
    {...DEFAULT_STAT_DATA, id: 'eliminations_multi_three', displayName: 'Multi-Eliminations (3)', usePerWeaponOrAbilityStats: true, mutate: SUM},
    {...DEFAULT_STAT_DATA, id: 'eliminations_multi_four', displayName: 'Multi-Eliminations (4)', usePerWeaponOrAbilityStats: true, mutate: SUM},
    {...DEFAULT_STAT_DATA, id: 'eliminations_multi_five', displayName: 'Multi-Eliminations (5)', usePerWeaponOrAbilityStats: true, mutate: SUM},
    {...DEFAULT_STAT_DATA, id: 'eliminations_multi_six', displayName: 'Multi-Eliminations (6)', usePerWeaponOrAbilityStats: true, mutate: SUM},
    {...DEFAULT_STAT_DATA, id: 'eliminations_multi_highest', displayName: 'Highest Multi-Elimination', usePerWeaponOrAbilityStats: true, mutate: MAX},

    {...DEFAULT_STAT_DATA, id: 'eliminations_simultaneous_two', displayName: 'Simultaneous Eliminations (2)', usePerWeaponOrAbilityStats: true, mutate: SUM},
    {...DEFAULT_STAT_DATA, id: 'eliminations_simultaneous_three', displayName: 'Simultaneous Eliminations (3)', usePerWeaponOrAbilityStats: true, mutate: SUM},
    {...DEFAULT_STAT_DATA, id: 'eliminations_simultaneous_four', displayName: 'Simultaneous Eliminations (4)', usePerWeaponOrAbilityStats: true, mutate: SUM},
    {...DEFAULT_STAT_DATA, id: 'eliminations_simultaneous_five', displayName: 'Simultaneous Eliminations (5)', usePerWeaponOrAbilityStats: true, mutate: SUM},
    {...DEFAULT_STAT_DATA, id: 'eliminations_simultaneous_six', displayName: 'Simultaneous Eliminations (6)', usePerWeaponOrAbilityStats: true, mutate: SUM},

    {...DEFAULT_STAT_DATA, id: 'matches_aced', displayName: 'Matches Aced', usePerWeaponOrAbilityStats: true, mutate: SUM},
    {...DEFAULT_STAT_DATA, id: 'matches_won_under_30s', displayName: 'Matches Won in Under 30s', usePerWeaponOrAbilityStats: true, mutate: SUM},
    {...DEFAULT_STAT_DATA, id: 'matches_won_under_10s_remaining', displayName: 'Matches Won with Under 10s Remaining', usePerWeaponOrAbilityStats: true, mutate: SUM},
    {...DEFAULT_STAT_DATA, id: 'matches_won_as_last_hit', displayName: 'Matches Won as Last Hits', usePerWeaponOrAbilityStats: true, mutate: SUM},
    {...DEFAULT_STAT_DATA, id: 'matches_won_as_last_survivor', displayName: 'Match Won as Last Survivor', usePerWeaponOrAbilityStats: true, mutate: SUM},
    {...DEFAULT_STAT_DATA, id: 'matches_won_under_10hp', displayName: 'Matches Won Under 10hp', usePerWeaponOrAbilityStats: true, mutate: SUM},

    {...DEFAULT_STAT_DATA, id: 'gold_earned', displayName: 'Gold Earned', usePerWeaponOrAbilityStats: true, mutate: SUM},
    {...DEFAULT_STAT_DATA, id: 'gold_spent', displayName: 'Gold Spent', usePerWeaponOrAbilityStats: true, mutate: SUM},

    // TODO: NOT YET IMPLEMENTED (time_alive_seconds)
    {...DEFAULT_STAT_DATA, id: 'time_alive_seconds', displayName: 'Time Alive (seconds)', toDisplayString: DISPLAY_TIME, usePerWeaponOrAbilityStats: true, mutate: SUM},
    {...DEFAULT_STAT_DATA, id: 'time_in_game_seconds', displayName: 'Time In Game (seconds)', toDisplayString: DISPLAY_TIME, usePerWeaponOrAbilityStats: true, mutate: SUM},
    {...DEFAULT_STAT_DATA, id: 'time_won_round_total_seconds', displayName: 'Time In Winning Rounds (seconds)', toDisplayString: DISPLAY_TIME, usePerWeaponOrAbilityStats: true, mutate: SUM},
    {...DEFAULT_STAT_DATA, id: 'time_lost_round_total_seconds', displayName: 'Time In Losing Rounds (seconds)', toDisplayString: DISPLAY_TIME, usePerWeaponOrAbilityStats: true, mutate: SUM},
    {
        ...DEFAULT_STAT_DATA, id: 'time_won_round_average_seconds', displayName: 'Average Winning Time (seconds)', toDisplayString: DISPLAY_TIME,
        derive: (stats) => {
            if (stats.rounds_won != undefined) return (stats.time_won_round_total_seconds ?? 0) / (stats.rounds_won ?? 1);
        }
    },
    {
        ...DEFAULT_STAT_DATA, id: 'time_lost_round_average_seconds', displayName: 'Average Losing Time (seconds)', toDisplayString: DISPLAY_TIME,
        derive: (stats) => {
            if (stats.rounds_lost != undefined) return (stats.time_lost_round_total_seconds ?? 0) / (stats.rounds_lost ?? 1);
        }
    },

    // TODO: NOT YET IMPLEMENTED (days_logged_in)
    {...DEFAULT_STAT_DATA, id: 'days_logged_in', displayName: 'Days Logged In', mutate: SUM}, // non-consecutive days logged in

    // TODO: NOT YET IMPLEMENTED (played_game_33)
    {...DEFAULT_STAT_DATA, id: 'played_game_33', displayName: 'Played Game 33', mutate: SUM}, // played in alpha event


    //////////////////////////////////////////////////////////////// POP1 XPROMO ////////////////////////////////////////////////////////////////

    {...DEFAULT_STAT_DATA, id: 'played_30_mins_in_a_day', displayName: 'Played 30 Minutes In A Day'},

    ////////////////////////////////////////////////////////////// END POP1 XPROMO //////////////////////////////////////////////////////////////


    //////////////////////////////////////////////////////////////// WIN STREAK ////////////////////////////////////////////////////////////////

    {...DEFAULT_STAT_DATA, id: 'win_streak_current', displayName: 'Current Win Streak', mutate: SET, optOutOfComprehensive: true, usePerWeaponOrAbilityStats: true},
    {...DEFAULT_STAT_DATA, id: 'win_streak_longest', displayName: 'Longest Win Streak', mutate: MAX, optOutOfComprehensive: true, usePerWeaponOrAbilityStats: true},

    ////////////////////////////////////////////////////////////// END WIN STREAK //////////////////////////////////////////////////////////////


    //////////////////////////////////////////////////////////// ACCOUNT-WIDE STATS ////////////////////////////////////////////////////////////

    {...DEFAULT_STAT_DATA, id: 'unlocked_launch_weapons', displayName: 'Launch Weapons Unlocked', mutate: SUM}, // don't count any weapons added post-launch
    {...DEFAULT_STAT_DATA, id: 'unlocked_launch_powers', displayName: 'Launch Powers Unlocked', mutate: SUM}, // don't count any powers added post-launch
    {...DEFAULT_STAT_DATA, id: 'unlocked_launch_gadgets', displayName: 'Launch Gadgets Unlocked', mutate: SUM}, // don't count any gadgets added post-launch

    {...DEFAULT_STAT_DATA, id: 'owned_bg_cards', displayName: 'Cards Owned', mutate: SUM},
    {...DEFAULT_STAT_DATA, id: 'owned_stickers', displayName: 'Stickers Owned', mutate: SUM},
    {...DEFAULT_STAT_DATA, id: 'owned_titles', displayName: 'Titles Owned', mutate: SUM},

    {...DEFAULT_STAT_DATA, id: 'owned_weapon_skins_bronze', displayName: 'Bronze Wraps Owned', mutate: SUM},
    {...DEFAULT_STAT_DATA, id: 'owned_weapon_skins_silver', displayName: 'Silver Wraps Owned', mutate: SUM},
    {...DEFAULT_STAT_DATA, id: 'owned_weapon_skins_gold', displayName: 'Gold Wraps Owned', mutate: SUM},
    {...DEFAULT_STAT_DATA, id: 'owned_weapon_skins_diamond', displayName: 'Diamond Wraps Owned', mutate: SUM},
    {...DEFAULT_STAT_DATA, id: 'owned_weapon_skins_rhinestone', displayName: 'Rhinestone Wraps Owned', mutate: SUM},
    {...DEFAULT_STAT_DATA, id: 'owned_weapon_skins_all', displayName: 'Weapon Wraps Owned', mutate: SUM},

    ////////////////////////////////////////////////////////// END ACCOUNT-WIDE STATS //////////////////////////////////////////////////////////
];

const ALL_STATS_MAP = new Map<StatId, StatData>();
ALL_STATS.forEach(data => ALL_STATS_MAP.set(data.id, data));

export function getStatData(statId: StatId) {
    if (!ALL_STATS_MAP.has(statId)) {
        throw Error(`Stat not found: ${statId}, add it to ALL_STATS in ConstsStats`);
    }

    return ALL_STATS_MAP.get(statId)!;
}
