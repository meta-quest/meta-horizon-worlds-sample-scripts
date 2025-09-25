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


import { AssetEx } from 'AssetEx';
import { Color, Player } from 'horizon/core';
import { fetchAsData } from 'UtilsObj';

//** OPEN BETA */
export const IS_OPEN_BETA_BUILD = true; // NOTE: FLIP THIS BEFORE BETA <<<<<<<<<<<<<<<<<<<
export const ELIMINATION_MODE_RELEASED = !IS_OPEN_BETA_BUILD;
export const PREMIUM_SHOP_RELEASED = true;

const OPEN_BETA_START_UTC_MILLISECONDS = 0;
const OPEN_BETA_END_UTC_MILLISECONDS = 1;
export function isOpenBetaActive(during: number = Date.now()) {
    return during >= OPEN_BETA_START_UTC_MILLISECONDS && during <= OPEN_BETA_END_UTC_MILLISECONDS;
}

//** PLAYER */
export const TEAM_REVIVE_ALLOWED = false;

export const PLAYER_GRAVITY_DEFAULT = 9.81;
export const PLAYER_SPEED_DEFAULT = 6.0; // Jeff changed to from 6.5 to 6.0 on 4/23/25

// The amount of air control that a player has via inputs while they're in the air, as a percent of their maximum speed.
//
// For movement actions that don't allow a player to move above their maximum speed (such as Jump, or the end of
// Blink Dash while in-air), the player will be locked into a maximum velocity of (1 - PLAYER_AIR_SPEED_PERCENT)%,
// such that they are able to reach their maximum speed while inputting movement.
export const DEFAULT_PLAYER_AIR_SPEED_PERCENT = 0.6; // changed from 0.3 to 0.6 by JL on 4/21/25

// The smoothing factor of the smoothed point velocity, in the range [0, 1].
// The larger the value, the more weight is placed on the EXISTING point velocity value.
// The smaller the value, the more weight is placed on the NEW point velocity value.
// Therefore, the larger the value, the "smoother" the point velocity changes over time.
export const POINT_VELOCITY_SMOOTHING_FACTOR = 0.8; // changed from 0.9 to 0.8 by JL on 4/21/25

// Whether the first jump should use the Horizon default jump.
// All jumps beyond the first jump (e.g. PLAYER_JUMP_COUNT_DEFAULT > 1) will use the manual jump system.
export const PLAYER_USE_HORIZON_JUMP = false;
export const PLAYER_JUMP_COUNT_DEFAULT = 1; // Jeff changed to 1 on 1/16/25
export const PLAYER_JUMP_VERTICAL_SPEED_DEFAULT = 7; // Jeff changed to 7 on 1/6/25
// A multiplier on top of PLAYER_JUMP_SPEED_DEFAULT, previously used to match Horizon default jump.
export const PLAYER_MANUAL_JUMP_FORCE_MULTIPLIER = 1;
// When multiple jumps are enabled (e.g. PLAYER_JUMP_COUNT_DEFAULT > 1), this is the delay
// that you must wait between jumps in order to activate the next jump.
export const PLAYER_MULTIPLE_JUMP_AIR_TIME_DELAY = 0;
// The rate (in deltaTime) at which jump's update() ticks.
export const PLAYER_JUMP_UPDATE_RATE = 0; // used to be 0.15

export const PLAYER_HEAD_SHOT_RADIUS = 0.4;
export const PLAYER_AOE_HIT_RADIUS = 0.4;

export const PLAYER_HEALTH_CRITICAL_THRESHOLD = 0.25;

// Time it will take for momentum heal vfx orb to travel to player regaining health.
export const MOMENTUM_HEAL_ORB_TRAVEL_TIME_SECONDS = 0.5;
// Time it will take for final color of health bar to finish animation after heal orb has reached player.
export const MOMENTUM_HEAL_HEALTH_BAR_ANIM_TIME_SECONDS = 0.2;

// Distance spawn point system will dictate as having a ally nearby
export const SPAWN_POINT_TEAMMATE_RADIUS = 15;

//** COLOR */
export const POSITIVE_COLOR = new Color(0.49, 1.0, 0.6);
export const WARNING_COLOR = new Color(1, 1, 0);
export const NEGATIVE_COLOR = new Color(1, 0, 0);

export const WIN_COLOR = new Color(1, 1, 0);

//** NUX */
// Wait this long before showing the hint
export const NUX_MOVE_HINT_TIME_S = 5;
export const NUX_ROTATION_HINT_TIME_S = 2;
export const NUX_AIM_HINT_TIME_S = 5;
export const NUX_ABILITY_HINT_TIME_S = 5;
export const NUX_SWAP_HINT_TIME_S = 5;

// How long a player must hold clapback to dismiss the nux
export const NUX_MIN_CLAPBACK_HOLD_TIME_MS = 1000;

export const POINTS_MODE_WORLD_ID = '0'; // Super Broadside

//** DEV */
const TEAM_SUPER_USER_ALLOW_LIST: string[] = [
];

// This is used to silence VO and music for the purpose of video recording. They add them in post
export const TEAM_VIDEO_CAPTURE_TEAM: string[] = [
];

// This is a test asset to let us dynamically load them in
const TEAM_SUPER_USER_LIST_ASSET = AssetEx.latest('0');

export async function loadTeamMembers() {
    try {
        const result = await fetchAsData(TEAM_SUPER_USER_LIST_ASSET.getAsset());
        const data = result.asText();
        console.log(`Registering team members:\n${data}`);
        data.split('\n').forEach((member) => {
            const trimmedName = member.trim();
            if (TEAM_SUPER_USER_ALLOW_LIST.includes(trimmedName)) {
                return;
            }
            TEAM_SUPER_USER_ALLOW_LIST.push(trimmedName);
        });
    } catch (error) {
        console.error(`Failed to load, defaulting to hard coded list ${error}`);
        throw error as Error;
    }
}

export function isDeveloper(player: Player) {
    return TEAM_SUPER_USER_ALLOW_LIST.includes(player.name.get());
}

export function isNotOptedOutOfVOAndMusic(player: Player) {
    return !TEAM_VIDEO_CAPTURE_TEAM.includes(player.name.get());
}
