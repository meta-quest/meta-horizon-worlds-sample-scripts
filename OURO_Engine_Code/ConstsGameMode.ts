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

import { CameraModeSettings, CAMERA_PRIORITY_DEATH, CAMERA_PRIORITY_LOBBY, CAMERA_PRIORITY_MATCH, DEFAULT_CAMERA_SETTINGS } from 'ConstsCamera';
import { GameModeId } from 'ConstsIdsGameMode';
import { HUDControlSchemeType } from 'ConstsMobileButtons';
import { DeathCameraSettings } from 'EventsNetworked';
import { CameraMode } from 'horizon/camera';

export const LOBBY_CAMERA_SETTINGS: CameraModeSettings = {
    ...DEFAULT_CAMERA_SETTINGS,
    cameraMode: CameraMode.ThirdPerson,
    transition: 0,
    priority: CAMERA_PRIORITY_LOBBY,
};

export const ROUND_CAMERA_SETTINGS: CameraModeSettings = {
    ...DEFAULT_CAMERA_SETTINGS,
    cameraMode: CameraMode.FirstPerson,
    transition: 0,
    priority: CAMERA_PRIORITY_MATCH,
};

export const ELIMINATION_DEATH_CAMERA: DeathCameraSettings = {
    ...DEFAULT_CAMERA_SETTINGS,
    cameraMode: CameraMode.Attach,
    priority: CAMERA_PRIORITY_DEATH,
    isFollowCam: true,
};

export const POINTS_DEATH_CAMERA: DeathCameraSettings = {
    ...DEFAULT_CAMERA_SETTINGS,
    cameraMode: CameraMode.Orbit,
    priority: CAMERA_PRIORITY_DEATH,
    isFollowCam: false,
};

/** ------------------------------------------- GAME MODE CONFIG ----------------------------------------------- */

export interface GameModeDeathData {
    respawnTime: number, // <= 0 means indefinitely
    popupDisplayTime: number, // <= 0 means indefinitely
    killerIndicatorDisplayTime: number, // <= 0 means indefinitely
    cameraSettings: CameraModeSettings,
}

export const GAME_MODE_DEATH_DATA_DEFAULT: GameModeDeathData = {
    respawnTime: 0,
    popupDisplayTime: 0,
    killerIndicatorDisplayTime: 0,
    cameraSettings: POINTS_DEATH_CAMERA,
};

export interface GameModeRankDisplaySettings {
    winningTeamOnly: boolean,
    numCrowns: number,
}

export const GAME_MODE_RANKING_SETTINGS_DEFAULT: GameModeRankDisplaySettings = {
    winningTeamOnly: false,
    numCrowns: 0,
};

export interface GameModeConfig {
    gameModeId: GameModeId,
    respawnTimeSeconds: number,
    allowNux: boolean,
    requiresMatchmaking: boolean,

    deathData: GameModeDeathData,
    rankDisplaySettings: GameModeRankDisplaySettings,
}

export const GAME_MODE_CONFIG_DEFAULT = {
    gameMode: 'UNDEFINED',
    respawnTimeSeconds: 0, // <= 0 means no respawn

    deathData: GAME_MODE_DEATH_DATA_DEFAULT,
};

/** -------------------------------------------STRIKE CONFIG ----------------------------------------------- */
export type StrikePhaseName = 'LOBBY' | 'ROUND' | 'ROUND RESOLUTION' | 'MATCH RESOLUTION';

export const TEAM_A_ID = 0;
export const TEAM_B_ID = 1;

export const POST_TELEPORT_REVIVE_DELAY_SECONDS = 1.0;
export const ELIMINATION_ROUND_RESULTS_SHOW_DELAY_MILLISECONDS = 1000;

export type GameModeConfigStrike = GameModeConfig & {
    teamVoipEnabled: boolean;
    maxPlayersPerTeam: number,
    roundsToWin: number,
    maxRounds?: number,
    lobby: {
        matchStartDelaySeconds: number,
        cameraSettings: CameraModeSettings,
        hudControlScheme: HUDControlSchemeType,
        canUseHomeMenu: boolean,
    },
    round: {
        minDurationSeconds?: number,
        durationSeconds: number
        startInvulnerableDurationSeconds: number,
        afterDeathTeleportDelaySeconds: number,
        onEndAfterAllDeathTransportsDelaySeconds: number
        pointsToWin?: number, // TODO: These configs are currently merged, should probably split this out
        deathLoadoutAccessTimeSeconds?: number,
        cameraSettings: CameraModeSettings,
        hudControlScheme: HUDControlSchemeType,
        rankDisplaySettings: GameModeRankDisplaySettings,
        roundIntroBannerDisplayTimeSeconds: number,
        roundResultsBannerDisplayTimeSeconds: number,
    },
    roundResolution: {
        durationSeconds: number
        nextMatchStartDelaySeconds: number,
        cameraSettings: CameraModeSettings,
    },
    matchResolution: {
        durationSeconds: number
        showResultsBanner: boolean,
        showProgressionDelaySeconds: number,
        hudControlScheme: HUDControlSchemeType,
    },
}

export const GAME_MODE_CONFIG_STRIKE_COMMON = {
    ...GAME_MODE_CONFIG_DEFAULT,
    maxPlayersPerTeam: 0,
    roundsToWin: 0,
    allowNux: true,
    requiresMatchmaking: false,

    lobby: {
        matchStartDelaySeconds: 0,
        cameraSettings: LOBBY_CAMERA_SETTINGS,
        hudControlScheme: HUDControlSchemeType.LOBBY,
        canUseHomeMenu: true,
    },
    round: {
        //minDurationSeconds: 15,
        durationSeconds: 60 * 5,
        startInvulnerableDurationSeconds: 3,
        afterDeathTeleportDelaySeconds: 0.5,
        onEndAfterAllDeathTransportsDelaySeconds: 1,
        cameraSettings: ROUND_CAMERA_SETTINGS,
        hudControlScheme: HUDControlSchemeType.ROUND,
        rankDisplaySettings: GAME_MODE_RANKING_SETTINGS_DEFAULT,
        roundIntroBannerDisplayTimeSeconds: 5,
        roundResultsBannerDisplayTimeSeconds: 3,
    },
    roundResolution: {
        durationSeconds: 5,
        nextMatchStartDelaySeconds: 0,
        cameraSettings: ROUND_CAMERA_SETTINGS,
        hudControlScheme: HUDControlSchemeType.ROUND,
    },
    matchResolution: {
        durationSeconds: 10,
        showResultsBanner: true,
        showProgressionDelaySeconds: 1,
        hudControlScheme: HUDControlSchemeType.PODIUM,
    },
    deathData: {
        ...GAME_MODE_CONFIG_DEFAULT.deathData,
        killerIndicatorDisplayTime: 5,
    },
};

export const GAME_MODE_CONFIG_STRIKE_ELIMINATION: GameModeConfigStrike = {
    ...GAME_MODE_CONFIG_STRIKE_COMMON,
    gameModeId: 'ELIMINATION',
    respawnTimeSeconds: 0,
    allowNux: false,
    requiresMatchmaking: true,

    teamVoipEnabled: true,
    maxPlayersPerTeam: 3,
    roundsToWin: 3,

    lobby: {
        ...GAME_MODE_CONFIG_STRIKE_COMMON.lobby,
        canUseHomeMenu: false,
    },
    round: {
        ...GAME_MODE_CONFIG_STRIKE_COMMON.round,
        roundIntroBannerDisplayTimeSeconds: 3,
        roundResultsBannerDisplayTimeSeconds: 3,
    },
    deathData: {
        ...GAME_MODE_CONFIG_STRIKE_COMMON.deathData,
        cameraSettings: ELIMINATION_DEATH_CAMERA,
    },
    rankDisplaySettings: {
        ...GAME_MODE_RANKING_SETTINGS_DEFAULT,
        winningTeamOnly: true,
        numCrowns: 3,
    },
};

export const GAME_MODE_CONFIG_STRIKE_POINTS: GameModeConfigStrike = {
    ...GAME_MODE_CONFIG_STRIKE_COMMON,
    gameModeId: 'POINTS',
    respawnTimeSeconds: 3,

    teamVoipEnabled: false,
    maxPlayersPerTeam: 6,
    roundsToWin: 1,
    maxRounds: 1,

    deathData: {
        ...GAME_MODE_CONFIG_STRIKE_COMMON.deathData,
        cameraSettings: POINTS_DEATH_CAMERA,
    },
    rankDisplaySettings: {
        ...GAME_MODE_RANKING_SETTINGS_DEFAULT,
        numCrowns: 1,
    },

    round: {
        ...GAME_MODE_CONFIG_STRIKE_COMMON.round,
        durationSeconds: 60 * 5,
        //pointsToWin: 40,
        roundIntroBannerDisplayTimeSeconds: 0,
        afterDeathTeleportDelaySeconds: 0,
        onEndAfterAllDeathTransportsDelaySeconds: 1,
        deathLoadoutAccessTimeSeconds: 6,
        rankDisplaySettings: GAME_MODE_RANKING_SETTINGS_DEFAULT,
    },
    matchResolution: {
        ...GAME_MODE_CONFIG_STRIKE_COMMON.matchResolution,
        showResultsBanner: false,
        durationSeconds: 6,
        showProgressionDelaySeconds: 0,
    },
};
