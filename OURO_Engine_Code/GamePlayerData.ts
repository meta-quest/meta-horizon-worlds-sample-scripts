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

import { ABILITY_DATA_SAMPLE } from 'ConstsAbility';
import { REVOLVER } from 'ConstsArenaWeapons';
import { ALL_ENTITLEMENT_IDS, EntitlementId } from 'ConstsEntitlements';
import { AbilityId } from 'ConstsIdsAbility';
import { WeaponId } from 'ConstsIdsWeapon';
import { Handedness } from 'horizon/core';

//**-------------------------------------------------------- LEVEL SAVE DATA --------------------------------------------------------*/
//**-------------------------------------------------------- LEVEL SAVE DATA --------------------------------------------------------*/
export type LevelSaveData = {
    level: number;
    xp: number;
}

export const LEVEL_SAVE_DATA_DEFAULT: LevelSaveData = {
    level: 1,
    xp: 0,
};

//**-------------------------------------------------------- CLASS SAVE DATA --------------------------------------------------------*/
export type ClassData = {
    // Loadout
    primaryWeaponId?: WeaponId
    secondaryWeaponId?: WeaponId

    primaryAbilityId?: AbilityId
    utilityAbilityId?: AbilityId
}

// NOTE: The player MUST be entitled to these weapons in DEFAULT_ENTITLEMENTS below.
export const CLASS_DATA_DEFAULT: ClassData = {
    primaryWeaponId: REVOLVER.id,
    secondaryWeaponId: REVOLVER.id,
    primaryAbilityId: ABILITY_DATA_SAMPLE.id,
    utilityAbilityId: ABILITY_DATA_SAMPLE.id,
};

//**-------------------------------------------------------- EQUIPMENT SAVE DATA --------------------------------------------------------*/
export type EquipmentSaveData = {
    levelData: LevelSaveData;
}

export type WeaponSaveData = EquipmentSaveData & {
    skinId: string
}

export const WEAPON_SAVE_DATA_DEFAULT: WeaponSaveData = {
    levelData: LEVEL_SAVE_DATA_DEFAULT,
    skinId: 'DEFAULT',
};

export type AbilitySaveData = EquipmentSaveData & {
    // empty for now
}

export const ABILITY_SAVE_DATA_DEFAULT: AbilitySaveData = {
    levelData: LEVEL_SAVE_DATA_DEFAULT,
};

export type WeaponSaveDataMap = { [id in WeaponId]?: WeaponSaveData }
export type AbilitySaveDataMap = { [id in AbilityId]?: AbilitySaveData }

//**-------------------------------------------------------- PLAYER CUSTOMIZATION DATA --------------------------------------------------------*/
export type TitleData = {
    id: string,
}

export const TITLE_DATA_DEFAULT: TitleData = {
    id: 'DEFAULT_0',
};

export type BgCardData = {
    id: string,
}

export const BG_CARD_DATA_DEFAULT: BgCardData = {
    id: 'DEFAULT_0',
};

export type stickerData = {
    id: string,
}

export const STICKER_DATA_DEFAULT: stickerData = {
    id: 'EMPTY',
};

export type GamePlayerCustomizationData = {
    title: TitleData,
    bgCard: BgCardData,
    stickerSlot1: stickerData,
    stickerSlot2: stickerData,
}

export const GAME_PLAYER_CUSTOMIZATION_DATA_DEFAULT: GamePlayerCustomizationData = {
    title: TITLE_DATA_DEFAULT,
    bgCard: BG_CARD_DATA_DEFAULT,
    stickerSlot1: STICKER_DATA_DEFAULT,
    stickerSlot2: STICKER_DATA_DEFAULT,
};

//**-------------------------------------------------------- PLAYER TIME DATA --------------------------------------------------------*/
export type TimedQuestTrackingData = {
    id: string,
    progressValue: number,
}

export type TimedQuestsSetTrackingData = {
    assignmentDateId: number,
    questDatas: TimedQuestTrackingData[];
}

export const TIMED_QUESTS_SET_DATA_DEFAULT: TimedQuestsSetTrackingData = {
    assignmentDateId: 0,
    questDatas: [],
};

export type LoginRewardTrackingData = {
    claimedDays: number,
    lastClaimedDateId: number,
}

export const LOGIN_REWARD_TRACKING_DATA_DEFAULT: LoginRewardTrackingData = {
    claimedDays: 0,
    lastClaimedDateId: 0,
};

export type PlaytimeRewardTrackingData = {
    assignmentDateId: number,
    rewardablePlaytimeSeconds: number,
    lastClaimedRewardablePlaytimeSeconds: number,
}

export const PLAYTIME_REWARD_TRACKING_DATA_DEFAULT: PlaytimeRewardTrackingData = {
    assignmentDateId: 0,
    rewardablePlaytimeSeconds: 0,
    lastClaimedRewardablePlaytimeSeconds: 0,
};

export type BoostTrackerData = {
    durationSeconds: number,
}

export const BOOST_TRACKER_DATA_DEFAULT: BoostTrackerData = {
    durationSeconds: 0,
};

export type GamePlayerTimeBaseContentData = {
    firstLoginUtcMilliseconds: number,
    loginUtcMilliseconds: number,
    logoutUtcMilliseconds: number,

    lastLoginPromptShownDateId: number,
    played30MinutesInADay: boolean,

    dailyQuestsData: TimedQuestsSetTrackingData,
    weeklyQuestsData: TimedQuestsSetTrackingData,

    loginRewardTrackingData: LoginRewardTrackingData,
    playtimeRewardTrackingData: PlaytimeRewardTrackingData,

    xpBoostTrackingData: BoostTrackerData,
    goldBoostTrackingData: BoostTrackerData,
}


export const GAME_PLAYER_TIME_BASED_CONTENT_DATA_DEFAULT = {
    lastLoginPromptShownDateId: 0,

    dailyQuestsData: TIMED_QUESTS_SET_DATA_DEFAULT,
    weeklyQuestsData: TIMED_QUESTS_SET_DATA_DEFAULT,

    loginRewardTrackingData: LOGIN_REWARD_TRACKING_DATA_DEFAULT,
    playtimeRewardTrackingData: PLAYTIME_REWARD_TRACKING_DATA_DEFAULT,

    xpBoostTrackingData: BOOST_TRACKER_DATA_DEFAULT,
    goldBoostTrackingData: BOOST_TRACKER_DATA_DEFAULT,
};

//**-------------------------------------------------------- PLAYER SETTINGS DATA --------------------------------------------------------*/
export type GamePlayerSettingsData = {
    gameAnnouncersEnabled: boolean,
}

export const GAME_PLAYER_SETTINGS_DATA_DEFAULT = {
    gameAnnouncersEnabled: true,
};

//**-------------------------------------------------------- PLAYER SAVE DATA --------------------------------------------------------*/
export type GamePlayerData = {
    version: number,
    class: ClassData,
    handedness: Handedness,
    nuxStarted: boolean,

    timeBasedContentData: GamePlayerTimeBaseContentData,

    customizationData: GamePlayerCustomizationData,

    accountLevelData: LevelSaveData,
    weaponSaveDataMap: WeaponSaveDataMap,
    abilitySaveDataMap: AbilitySaveDataMap,

    settingsData: GamePlayerSettingsData,
}

export const GAME_PLAYER_DATA_DEFAULT = {
    version: 0,
    class: CLASS_DATA_DEFAULT,
    handedness: Handedness.Right,
    nuxStarted: false,

    timeBasedContentData: GAME_PLAYER_TIME_BASED_CONTENT_DATA_DEFAULT,

    customizationData: GAME_PLAYER_CUSTOMIZATION_DATA_DEFAULT,

    accountLevelData: LEVEL_SAVE_DATA_DEFAULT,
    weaponSaveDataMap: {},
    abilitySaveDataMap: {},

    settingsData: GAME_PLAYER_SETTINGS_DATA_DEFAULT,
};

//**-------------------------------------------------------- PLAYER ENTITLEMENTS --------------------------------------------------------*/
export const DEFAULT_ENTITLEMENTS: EntitlementId[] = [
    // Default Loadout
    'WEAPON_AUTO_RIFLE',
    'WEAPON_SHOTGUN',
    'ABILITY_ROCKET_JUMP',
    'ABILITY_DOUBLE_JUMP',
];

export const NON_DEFAULT_ENTITLEMENTS = ALL_ENTITLEMENT_IDS.filter(id => !DEFAULT_ENTITLEMENTS.includes(id));
