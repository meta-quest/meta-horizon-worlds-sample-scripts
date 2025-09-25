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

import {validId} from 'ConstsIds';

export const ALL_STAT_IDS = [
    'damage_dealt',
    'damage_dealt_by_headshot',
    'most_damage_dealt_in_round',
    'most_damage_dealt_in_match',
    'damage_taken',
    'damage_mitigated',
    'average_damage_dealt_per_match',

    'weapon_fire_count',
    'projectile_fire_count',
    'projectiles_hit',
    'projectiles_hit_headshot',
    'projectiles_accuracy',
    'projectiles_accuracy_headshot',

    'abilities_activated',

    'eliminations',
    'eliminations_by_headshot',
    'eliminations_in_goblin_mode',
    'elimination_streak',
    'best_elimination_streak',
    'assists',
    'most_assists_in_round',
    'most_assists_in_match',
    'deaths',
    'eliminations_deaths_ratio',

    'matches_won',
    'matches_lost',
    'matches_played',
    'matches_played_during_open_beta',
    'matches_played_beta_skin',
    'matches_won_with_friends',
    'matches_lost_with_friends',
    'matches_played_with_friends',
    'matches_win_rate',

    'rounds_won',
    'rounds_lost',
    'rounds_played',
    'rounds_win_rate',

    'eliminations_multi_two',
    'eliminations_multi_three',
    'eliminations_multi_four',
    'eliminations_multi_five',
    'eliminations_multi_six',
    'eliminations_multi_highest',

    'eliminations_simultaneous_two',
    'eliminations_simultaneous_three',
    'eliminations_simultaneous_four',
    'eliminations_simultaneous_five',
    'eliminations_simultaneous_six',

    'matches_aced',
    'matches_won_under_30s',
    'matches_won_under_10s_remaining',
    'matches_won_as_last_hit',
    'matches_won_as_last_survivor',
    'matches_won_under_10hp',

    'gold_earned',
    'gold_spent',

    'time_alive_seconds',
    'time_in_game_seconds',
    'time_won_round_total_seconds',
    'time_lost_round_total_seconds',
    'time_won_round_average_seconds',
    'time_lost_round_average_seconds',

    'days_logged_in',

    'played_30_mins_in_a_day',
    'played_game_33',

    'win_streak_current',
    'win_streak_longest',

    'unlocked_launch_weapons',
    'unlocked_launch_powers',
    'unlocked_launch_gadgets',

    'owned_bg_cards',
    'owned_stickers',
    'owned_titles',

    'owned_weapon_skins_bronze',
    'owned_weapon_skins_silver',
    'owned_weapon_skins_gold',
    'owned_weapon_skins_diamond',
    'owned_weapon_skins_rhinestone',
    'owned_weapon_skins_all',
] as const;
export type StatId = typeof ALL_STAT_IDS[number];

export function validStatId(value: string): StatId {
    return validId('ALL_STAT_IDS', ALL_STAT_IDS, value);
}
